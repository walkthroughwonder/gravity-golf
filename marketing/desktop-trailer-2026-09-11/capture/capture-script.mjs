import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile, mkdtemp, rm, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(process.argv[2]);
const output = resolve(process.argv[3]);
const holes = (process.argv[4] || '1,6,11').split(',').map(Number);
assert(holes.length > 0 && new Set(holes).size === holes.length);
assert(holes.every(hole => Number.isInteger(hole) && hole >= 1 && hole <= 19));
const { _electron } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH));
const require = createRequire(join(root, 'package.json'));
const { extractFile } = require('@electron/asar');
const executablePath = join(root, 'out/Gravity Golf Prototype-darwin-arm64/Gravity Golf Prototype.app/Contents/MacOS/gravity-golf');
const archive = join(root, 'out/Gravity Golf Prototype-darwin-arm64/Gravity Golf Prototype.app/Contents/Resources/app.asar');
const hash = value => createHash('sha256').update(value).digest('hex');
const source = JSON.parse(extractFile(archive, 'public/build-manifest.json').toString());
assert.equal(source.sourceIndexSha256, hash(await readFile(join(root, '../index.html'))), 'Package must match the current source');
await mkdir(output, { recursive: true });
assert.equal(await readFile(join(output, 'capture.json')).then(() => true, () => false), false, 'Choose a fresh output folder');
await copyFile(fileURLToPath(import.meta.url), join(output, 'capture-script.mjs'));
const report = { status: 'capture-in-progress', startedAt: new Date().toISOString(),
  archiveSha256: hash(await readFile(archive)), source,
  method: 'Native packaged Mac app. Playwright full renderer recording with original HUD. 1920x1080 renderer viewport, 25fps recording. No state, DOM, score, physics, clock, camera or audio-graph injection. Normal course picker, mouse aim and Fire inputs. Built-in assisted aim. Raw video has no audio.',
  viewport: { width: 1920, height: 1080 }, holes: [], errors: [], externalRendererRequests: [] };
try {
  for (const hole of holes) {
    const folder = join(output, `hole-${String(hole).padStart(2, '0')}`);
    await mkdir(folder, { recursive: true });
    const profile = await mkdtemp(join(tmpdir(), 'gg-trailer-capture-'));
    let app;
    const take = { hole, startedAt: new Date().toISOString(), inputs: [], samples: [] };
    report.holes.push(take);
    try {
      app = await _electron.launch({ executablePath, args: [`--user-data-dir=${profile}`],
        chromiumSandbox: true, timeout: 30000,
        recordVideo: { dir: folder, size: { width: 1920, height: 1080 } } });
      const page = await app.firstWindow();
      const video = page.video();
      assert(video, 'Video recording unavailable');
      page.on('pageerror', error => report.errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
      page.on('request', request => {
        if (/^(https?|wss?|file):/.test(request.url())) report.externalRendererRequests.push(request.url());
      });
      await app.evaluate(({ BrowserWindow }) => {
        const win = BrowserWindow.getAllWindows()[0];
        win.setContentSize(1920, 1080);
        win.webContents.setZoomFactor(1);
      });
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.reload();
      await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
      await page.evaluate(() => document.fonts.ready);
      const sample = async action => {
        const value = await page.evaluate(() => ({ timestamp: Date.now(),
          state: JSON.parse(window.render_game_to_text()) }));
        take.samples.push({ action, ...value });
        return value.state;
      };
      const click = async selector => {
        take.inputs.push({ action: 'click', selector, timestamp: Date.now() });
        await page.locator(selector).click();
      };
      await click('#ballGrid .ball-option:first-child');
      await click('#pickerProBtn');
      take.inputs.push({ action: 'course-picker', hole, timestamp: Date.now() });
      await page.locator('#desktopCourse .lvl-btn').nth(hole - 1).click();
      await page.waitForTimeout(4700);
      await page.waitForFunction(h => {
        const s = JSON.parse(window.render_game_to_text());
        return s.hole === h && !s.introPlaying && !s.trainer.visible &&
          !document.getElementById('levelTitleCard').classList.contains('visible');
      }, hole);
      const ready = await sample('ready');
      assert.equal(ready.commerce.liveServices, false);
      assert.equal(ready.strokes, 0);
      assert.equal(ready.desktop.courseHoles, 19);
      take.renderer = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio }));
      take.nativeContentSize = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getContentSize());
      assert.equal(take.renderer.width, 1920);
      assert.equal(take.renderer.height, 1080);
      await page.screenshot({ path: join(folder, 'ready.png') });
      await page.waitForTimeout(800);
      take.inputs.push({ action: 'aim-ball', screen: ready.ball.screen, timestamp: Date.now() });
      await page.mouse.click(ready.ball.screen.x, ready.ball.screen.y);
      await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).mode === 'aiming');
      await sample('aim');
      await page.screenshot({ path: join(folder, 'aim.png') });
      await page.waitForTimeout(1700);
      await click('#fireBtn');
      await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).strokes === 1);
      await sample('fire');
      for (let i = 0; i < 44; i++) {
        await page.waitForTimeout(250);
        const state = await sample('flight-observation');
        if (i === 5) await page.screenshot({ path: join(folder, 'flight.png') });
        if (state.mode === 'hole_complete' && i >= 12) break;
      }
      await page.screenshot({ path: join(folder, 'end.png') });
      take.title = await page.locator('#titleHoleName').innerText();
      take.runtime = await app.evaluate(() => process.versions);
      await page.waitForTimeout(1200);
      await app.close();
      app = null;
      await video.saveAs(join(folder, 'gameplay-raw.webm'));
      take.file = `hole-${String(hole).padStart(2, '0')}/gameplay-raw.webm`;
      take.videoSha256 = hash(await readFile(join(folder, 'gameplay-raw.webm')));
      take.completedAt = new Date().toISOString();
      console.log(JSON.stringify({ captured: take.file, final: take.samples.at(-1).state.mode,
        sourceHash: report.archiveSha256 }));
    } finally {
      if (app) await app.close();
      await rm(profile, { recursive: true, force: true });
    }
  }
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.externalRendererRequests, []);
  report.status = 'private-raw-video-captured';
} catch (error) {
  report.status = 'capture-failed';
  report.failure = error.stack;
  throw error;
} finally {
  report.completedAt = new Date().toISOString();
  await writeFile(join(output, 'capture.json'), JSON.stringify(report, null, 2) + '\n');
}
