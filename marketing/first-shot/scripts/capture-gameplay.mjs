import { chromium } from '/Users/edwin/.codex/skills/develop-web-game/node_modules/playwright/index.mjs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const output = process.env.GG_CAPTURE_OUTPUT || '/tmp/gravitygolf-promo/take-01';
const source = '/Users/edwin/Downloads/Gravity Golf Updates/dist/index.html';
const url = 'http://127.0.0.1:8770/';
const renderer = process.env.GG_CAPTURE_RENDERER || 'swiftshader';
if (!['swiftshader', 'metal'].includes(renderer)) throw new Error('Unsupported capture renderer');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: [
  '--use-gl=angle', `--use-angle=${renderer}`, '--enable-unsafe-swiftshader',
] });
const context = await browser.newContext({ viewport: { width: 720, height: 1280 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const report = {
  source: { url, sha256: createHash('sha256').update(await readFile(source)).digest('hex'), localWip: true },
  viewport: { width: 720, height: 1280 },
  renderer,
  capture: 'Unmodified game canvas plus its final Web Audio mix; no desktop or microphone capture.',
  inputs: [], samples: [], errors: [], requestsFailed: [],
};
page.on('pageerror', error => report.errors.push(error.message));
page.on('requestfailed', request => report.requestsFailed.push({ url: request.url(), error: request.failure() }));
await page.addInitScript(() => {
  const connect = AudioNode.prototype.connect;
  const taps = new Map();
  // Mirror only final output connections. Keep the original graph and output intact.
  AudioNode.prototype.connect = function(destination, ...rest) {
    const result = connect.call(this, destination, ...rest);
    if (destination === this.context.destination) {
      if (!taps.has(this.context)) taps.set(this.context, this.context.createMediaStreamDestination());
      connect.call(this, taps.get(this.context), ...rest);
    }
    return result;
  };
  window.__ggCapture = {
    async start() {
      const canvas = document.querySelector('body > canvas:not(#shaderBg)');
      if (!canvas || canvas.width !== innerWidth || canvas.height !== innerHeight) {
        throw new Error('Expected the full-size game renderer canvas');
      }
      const entry = [...taps.entries()][0];
      if (!entry || entry[0].state !== 'running') throw new Error('Game audio is not running');
      const stream = canvas.captureStream(30);
      stream.addTrack(entry[1].stream.getAudioTracks()[0]);
      const mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) throw new Error('Unsupported recording codec');
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6000000, audioBitsPerSecond: 128000 });
      const chunks = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      this.recorder = recorder;
      this.chunks = chunks;
      this.startedAt = performance.now();
      recorder.start(1000);
      return { startedAt: this.startedAt, audioContextState: entry[0].state,
        canvas: { width: canvas.width, height: canvas.height }, requestedFps: 30,
        mimeType };
    },
    async stop() {
      const stopped = new Promise(resolve => { this.recorder.onstop = resolve; });
      this.recorder.stop();
      await stopped;
      return Array.from(new Uint8Array(await new Blob(this.chunks, { type: this.recorder.mimeType }).arrayBuffer()));
    },
  };
});
const state = () => page.evaluate(() => ({ at: performance.now(), state: JSON.parse(window.render_game_to_text()) }));
try {
  await page.goto(url);
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
  await page.locator('#playBtn').click();
  report.inputs.push({ action: 'click', target: '#playBtn', ...(await state()) });
  await page.locator('#skipBtn').click();
  report.inputs.push({ action: 'click', target: '#skipBtn', ...(await state()) });
  await page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).introPlaying, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${output}/before.png` });
  report.recorder = await page.evaluate(() => window.__ggCapture.start());
  const first = await state();
  report.samples.push(first);
  await page.mouse.click(first.state.ball.screen.x, first.state.ball.screen.y);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).mode === 'aiming');
  report.inputs.push({ action: 'click-ball', ...(await state()) });
  await page.screenshot({ path: `${output}/aim.png` });
  await page.waitForTimeout(1500);
  await page.locator('#fireBtn').click();
  report.inputs.push({ action: 'click', target: '#fireBtn', ...(await state()) });
  for (let sample = 0; sample < 96; sample++) {
    await page.waitForTimeout(250);
    const next = await state();
    report.samples.push(next);
    if (sample === 12) await page.screenshot({ path: `${output}/flight.png` });
    if (sample > 12 && next.state.mode !== 'flight') {
      await page.waitForTimeout(4500);
      report.samples.push(await state());
      break;
    }
  }
  await page.screenshot({ path: `${output}/after.png` });
  const bytes = await page.evaluate(() => window.__ggCapture.stop());
  if (bytes.length < 10000) throw new Error('Recording is empty or unexpectedly small');
  await writeFile(`${output}/gameplay-raw.webm`, Buffer.from(bytes));
  report.finishedAt = new Date().toISOString();
} finally {
  await writeFile(`${output}/capture.json`, JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
console.log(JSON.stringify({ output, recorder: report.recorder, errors: report.errors,
  first: report.samples[0], final: report.samples.at(-1) }, null, 2));
