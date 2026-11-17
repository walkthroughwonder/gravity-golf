import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const desktop = resolve(process.argv[2]);
const output = resolve(process.argv[3]);
const holes = (process.argv[4] || '1,6,11').split(',').map(Number);
const { _electron } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH));
const executablePath = process.env.GG_EXECUTABLE || join(desktop, 'out/Gravity Golf Prototype-darwin-arm64/Gravity Golf Prototype.app/Contents/MacOS/gravity-golf');
const archive = join(desktop, 'out/Gravity Golf Prototype-darwin-arm64/Gravity Golf Prototype.app/Contents/Resources/app.asar');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
await mkdir(output, { recursive: true });
assert.equal(await readFile(join(output, 'result.json')).then(() => true, () => false), false, 'Use a new result directory');
await copyFile(fileURLToPath(import.meta.url), join(output, 'measure-source.mjs'));
const profile = await mkdtemp(join(tmpdir(), 'gg-aim-latency-'));
const result = { method: 'No video capture. PerformanceObserver and requestAnimationFrame monitoring only; normal UI input. No solver, physics, score, camera or game-clock changes.',
  startedAt: new Date().toISOString(), sourceIndexSha256: hash(await readFile(join(desktop, '../index.html'))),
  archiveSha256: hash(await readFile(archive)), samples: [], errors: [], externalRequests: [] };
let app;
try {
  app = await _electron.launch({ executablePath, args: [`--user-data-dir=${profile}`], chromiumSandbox: true });
  const page = await app.firstWindow();
  page.on('pageerror', error => result.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') result.errors.push(message.text()); });
  page.on('request', request => { if (/^(https?|wss?|file):/.test(request.url())) result.externalRequests.push(request.url()); });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.addInitScript(() => {
    const data = { frames: [], tasks: [], changes: [], inputAt: null, enabled: false };
    window.__aimTiming = data;
    new PerformanceObserver(list => {
      if (data.enabled) for (const entry of list.getEntries()) data.tasks.push({ start: entry.startTime, duration: entry.duration });
    }).observe({ type: 'longtask', buffered: true });
    function frame(time) {
      if (data.enabled) data.frames.push(time);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    addEventListener('pointerdown', () => {
      if (data.enabled && data.inputAt === null) data.inputAt = performance.now();
    }, { capture: true, passive: true });
    addEventListener('DOMContentLoaded', () => {
      const chip = document.getElementById('routeChip');
      if (!chip) return;
      new MutationObserver(() => {
        if (data.enabled) data.changes.push({ at: performance.now(), text: chip.textContent });
      }).observe(chip, { childList: true, subtree: true, characterData: true });
    });
  });
  for (const hole of holes) {
    await page.reload();
    await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
    await page.locator('#ballGrid .ball-option:first-child').click();
    await page.locator('#pickerProBtn').click();
    await page.locator('#desktopCourse .lvl-btn').nth(hole - 1).click();
    await page.waitForTimeout(5000);
    await page.waitForFunction(h => { const s = JSON.parse(window.render_game_to_text()); return s.hole === h && !s.introPlaying && !s.trainer.visible; }, hole);
    const before = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
    await page.evaluate(() => { window.__aimTiming.enabled = true; });
    await page.waitForTimeout(300);
    const inputStarted = Date.now();
    await page.mouse.click(before.ball.screen.x, before.ball.screen.y);
    const inputReturned = Date.now();
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).aim.assisted, null, { timeout: 30000 });
    await page.waitForTimeout(300);
    const timing = await page.evaluate(() => {
      window.__aimTiming.enabled = false;
      return { ...window.__aimTiming, after: JSON.parse(window.render_game_to_text()) };
    });
    const assist = timing.changes.find(change => change.text === 'ASSISTED ROUTE');
    const gaps = timing.frames.slice(1).map((time, index) => time - timing.frames[index]);
    const sample = { hole, clickCallMs: inputReturned - inputStarted,
      inputToAssistMs: assist ? assist.at - timing.inputAt : null,
      maxRafGapMs: Math.max(...gaps), longestTaskMs: Math.max(0, ...timing.tasks.map(task => task.duration)),
      frames: timing.frames.length, before, timing };
    result.samples.push(sample);
    await page.screenshot({ path: join(output, `hole-${hole}-aim.png`) });
    console.log(JSON.stringify({ hole, clickCallMs: sample.clickCallMs, inputToAssistMs: sample.inputToAssistMs,
      maxRafGapMs: sample.maxRafGapMs, longestTaskMs: sample.longestTaskMs }));
    assert.equal(timing.after.mode, 'aiming');
    assert.equal(timing.after.strokes, 0);
    assert.equal(timing.after.commerce.liveServices, false);
  }
  result.runtime = await app.evaluate(() => process.versions);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.externalRequests, []);
  result.status = 'measured';
} catch (error) {
  result.status = 'failed'; result.error = error.stack; throw error;
} finally {
  if (app) await app.close();
  await rm(profile, { recursive: true, force: true });
  result.completedAt = new Date().toISOString();
  await writeFile(join(output, 'result.json'), JSON.stringify(result, null, 2) + '\n');
}
