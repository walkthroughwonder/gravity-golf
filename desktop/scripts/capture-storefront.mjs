import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(process.argv[2] || fileURLToPath(new URL('..', import.meta.url)));
const output = resolve(process.argv[3] || join(root, 'output/playwright/storefront-2026-09-10-r3/capture-main'));
const holes = process.argv[4] ? process.argv[4].split(',').map(Number) : [1, 5, 8, 10, 11];
assert(holes.length && holes.every(hole => Number.isInteger(hole) && hole >= 1 && hole <= 19));
const executablePath = join(root, 'out/Gravity Golf Prototype-darwin-arm64/Gravity Golf Prototype.app/Contents/MacOS/gravity-golf');
const archive = join(root, 'out/Gravity Golf Prototype-darwin-arm64/Gravity Golf Prototype.app/Contents/Resources/app.asar');
const require = createRequire(join(root, 'package.json'));
const { extractFile } = require('@electron/asar');
const { _electron } = await import(process.env.PLAYWRIGHT_MODULE_PATH ?
  pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href : 'playwright');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const source = JSON.parse(extractFile(archive, 'public/build-manifest.json').toString());
const errors = [];
const requests = new Set();
const inputs = [];
const captures = [];
let app;
await mkdir(output, { recursive: true });
assert.equal(await readFile(join(output, 'capture.json')).then(() => true, () => false), false,
  'Use a new output directory; never overwrite an existing capture receipt.');
const startedAt = new Date().toISOString();
const profile = await mkdtemp(join(tmpdir(), 'gravitygolf-store-capture-'));
const record = (action, details = {}) => inputs.push({ at: new Date().toISOString(), action, ...details });
try {
  app = await _electron.launch({ executablePath, args: [`--user-data-dir=${profile}`], timeout: 30000 });
  const page = await app.firstWindow();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => requests.add(request.url()));
  await app.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    window.setContentSize(1920, 1080);
    window.webContents.setZoomFactor(1);
  });
  // macOS clamps native windows to the display. Render at 1080p without resizing pixels after capture.
  await page.setViewportSize({ width: 1920, height: 1080 });
  const nativeContentSize = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getContentSize());
  await page.reload();
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio }));
  assert.equal(viewport.width, 1920);
  assert.equal(viewport.height, 1080);
  assert.equal((await state()).desktop.courseHoles, 19);
  assert.equal((await state()).commerce.liveServices, false);
  const click = async selector => {
    record('click', { selector });
    await page.locator(selector).click();
  };
  const capture = async (name, phase) => {
    const before = await state();
    assert.equal(before.introPlaying, false);
    assert.equal(before.trainer.visible, false);
    assert.equal(await page.locator('#ballPicker').isVisible(), false);
    const bytes = await page.screenshot({ path: join(output, `${name}.png`), scale: 'css' });
    assert.equal(bytes.readUInt32BE(16), 1920);
    assert.equal(bytes.readUInt32BE(20), 1080);
    const result = { file: `${name}.png`, phase, at: new Date().toISOString(),
      title: await page.locator('#titleHoleName').innerText(),
      width: 1920, height: 1080, sha256: sha256(bytes),
      inputCount: inputs.length, before, after: await state() };
    captures.push(result);
    console.log(JSON.stringify({ captured: result.file, hole: before.hole, mode: before.mode }));
  };
  for (const hole of holes) {
    if (captures.length) { record('reload'); await page.reload(); }
    await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
    await page.evaluate(() => document.fonts.ready);
    await click('#ballGrid .ball-option:first-child');
    await click('#pickerProBtn');
    const level = page.locator('#desktopCourse .lvl-btn').nth(hole - 1);
    record('choose-hole', { hole, label: await level.innerText() });
    await level.click();
    await page.waitForTimeout(4500);
    await page.waitForFunction(h => {
      const s = JSON.parse(window.render_game_to_text());
      return s.hole === h && !s.introPlaying && !s.trainer.visible &&
        !document.getElementById('levelTitleCard').classList.contains('visible');
    }, hole);
    await page.waitForTimeout(500);
    await capture(`hole-${String(hole).padStart(2, '0')}-overview`, 'overview');
    const ready = await state();
    assert(ready.ball.screen.x > 0 && ready.ball.screen.x < 1920);
    assert(ready.ball.screen.y > 0 && ready.ball.screen.y < 1080);
    record('aim-ball', ready.ball.screen);
    await page.mouse.click(ready.ball.screen.x, ready.ball.screen.y);
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).mode === 'aiming');
    await page.waitForTimeout(600);
    await capture(`hole-${String(hole).padStart(2, '0')}-aim`, 'aim');
    await click('#fireBtn');
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).strokes > 0);
    await page.waitForTimeout(hole === 1 ? 200 : 900);
    await capture(`hole-${String(hole).padStart(2, '0')}-flight`, 'flight');
  }
  assert.deepEqual(errors, []);
  const externalRendererRequests = [...requests].filter(url => /^(?:https?|wss?|file):/.test(url));
  assert.deepEqual(externalRendererRequests, []);
  await writeFile(join(output, 'capture.json'), JSON.stringify({ startedAt, completedAt: new Date().toISOString(),
    status: 'private-review-candidates', executablePath, archiveSha256: sha256(await readFile(archive)),
    source, runtime: await app.evaluate(() => process.versions), viewport, nativeContentSize,
    method: 'Packaged macOS app, disposable profile, renderer viewport set to 1920x1080 because macOS clamps native window size. Real course-picker/mouse/fire input. Read-only state snapshots. Unretouched CSS-pixel screenshots; no post-capture upscaling, gameplay, DOM, score or camera-state injection. Built-in aim assistance remains enabled.',
    errors, externalRendererRequests, requests: [...requests], inputs, captures }, null, 2) + '\n');
} catch (error) {
  await writeFile(join(output, 'capture-failure.json'), JSON.stringify({ startedAt,
    error: error.stack, errors, inputs, captures }, null, 2) + '\n');
  throw error;
} finally {
  if (app) await app.close();
  await rm(profile, { recursive: true, force: true });
}
