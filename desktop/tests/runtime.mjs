import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const { _electron } = await import(process.env.PLAYWRIGHT_MODULE_PATH ?
  pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href : 'playwright');
const require = createRequire(import.meta.url);
const profile = await mkdtemp(join(tmpdir(), 'gravitygolf-desktop-qa-'));
const artifacts = join(root, 'qa');
await mkdir(artifacts, { recursive: true });
const executablePath = process.argv[2] || require('electron');
const packaged = !!process.argv[2];
const errors = [];
const requests = [];
let app;
async function launch() {
  const instance = await _electron.launch({ executablePath,
    args: [...(packaged ? [] : [join(root, 'app')]), `--user-data-dir=${profile}`], timeout: 30000 });
  return instance;
}
try {
  app = await launch();
  const page = await app.firstWindow();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => requests.push(request.url()));
  await page.addInitScript(() => {
    const OriginalAudio = window.Audio;
    window.Audio = function (...args) {
      const element = new OriginalAudio(...args);
      window.__qaSoundtrack = element;
      return element;
    };
  });
  await page.reload();
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  assert.equal((await state()).desktop.courseHoles, 19);
  assert.equal((await state()).commerce.proUnlocked, true);
  assert.equal((await state()).commerce.liveServices, false);
  assert.equal((await state()).usageData.active, false);
  assert.equal(await page.evaluate(() => typeof window.require), 'undefined');
  assert.equal(await page.evaluate(() => typeof window.process), 'undefined');
  assert.equal(await page.locator('#usageSettingsBtn').isVisible(), false);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(artifacts, 'picker.png') });
  await page.locator('#ballGrid .ball-option').first().click();
  await page.locator('#playBtn').click();
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).trainer.visible);
  await page.screenshot({ path: join(artifacts, 'trainer.png') });
  await page.waitForFunction(() => window.__qaSoundtrack?.currentTime > 0.25 && !window.__qaSoundtrack.paused);
  const audio = await page.evaluate(() => ({ currentTime: window.__qaSoundtrack.currentTime,
    paused: window.__qaSoundtrack.paused, readyState: window.__qaSoundtrack.readyState,
    error: window.__qaSoundtrack.error?.message || null }));
  await page.getByRole('button', { name: 'SKIP TRAINING', exact: true }).click();
  await page.waitForTimeout(4500);
  await page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).trainer.visible && !JSON.parse(window.render_game_to_text()).introPlaying);
  const ready = await state();
  assert.equal(ready.hole, 1);
  await page.screenshot({ path: join(artifacts, 'hole-1.png') });
  // Real mouse shot, not a fixture-only level-completion call.
  await page.mouse.click(ready.ball.screen.x, ready.ball.screen.y);
  await page.locator('#fireBtn').click();
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).strokes > 0);
  await page.screenshot({ path: join(artifacts, 'shot.png') });
  await page.reload();
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
  await page.locator('#pickerProBtn').click();
  assert.equal(await page.locator('#desktopCourse .lvl-btn').count(), 19);
  assert.equal(await page.evaluate(() => document.getElementById('modeDaily').getBoundingClientRect().top >=
    document.getElementById('levelSelect').getBoundingClientRect().bottom), true);
  await page.screenshot({ path: join(artifacts, 'course.png') });
  await page.locator('#desktopCourse .lvl-btn').nth(8).click();
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).hole === 9 && !JSON.parse(window.render_game_to_text()).introPlaying);
  assert.equal(await page.locator('#ballPicker').isVisible(), false);
  assert.equal((await state()).commerce.offerVisible, false);
  await page.screenshot({ path: join(artifacts, 'hole-9.png') });
  await page.reload();
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
  await page.locator('#pickerProBtn').click();
  await page.locator('#modeDaily').click();
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).desktop.dailyMode);
  assert.equal((await state()).desktop.courseHoles, 19);
  await page.screenshot({ path: join(artifacts, 'daily.png') });
  // CDP keyboard injection skips Electron's native before-input-event hook.
  const nativeFullscreen = (key, target) => app.evaluate(({ BrowserWindow }, values) => new Promise((resolve, reject) => {
    const win = BrowserWindow.getAllWindows()[0];
    const timeout = setTimeout(() => reject(new Error(`Fullscreen event timed out: ${values.key}`)), 12000);
    win.once(values.target ? 'enter-full-screen' : 'leave-full-screen', () => { clearTimeout(timeout); resolve(); });
    win.webContents.sendInputEvent({ type: 'keyDown', keyCode: values.key });
    win.webContents.sendInputEvent({ type: 'keyUp', keyCode: values.key });
  }), { key, target });
  await nativeFullscreen('F11', true);
  assert.equal(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFullScreen()), true);
  await nativeFullscreen('Escape', false);
  assert.equal(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFullScreen()), false);
  await page.evaluate(() => localStorage.setItem('gg_desktop_qa', 'persistent'));
  await page.reload();
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
  const windowPromise = app.waitForEvent('window');
  await page.locator('#ballPicker .notices-link').click();
  const notices = await windowPromise;
  await notices.waitForLoadState('load');
  assert.equal(new URL(notices.url()).pathname, '/notices.html');
  await notices.getByText('Three.js 0.172.0: MIT License').click();
  await notices.waitForURL('gg://game/licenses/three-0.172.0-LICENSE.txt');
  assert.match(await notices.locator('body').innerText(), /Permission is hereby granted/);
  await notices.close();
  assert.equal(page.isClosed(), false);
  assert.deepEqual(errors, []);
  assert.deepEqual(requests.filter(url => /^https?:|^wss?:|^file:/.test(url)), []);
  await app.close();
  app = await launch();
  const relaunched = await app.firstWindow();
  await relaunched.waitForFunction(() => typeof window.render_game_to_text === 'function');
  assert.equal(await relaunched.evaluate(() => localStorage.getItem('gg_desktop_qa')), 'persistent');
  const report = { packaged, executablePath, runtime: await app.evaluate(() => process.versions),
    courseHoles: 19, actualShot: true, hole9: true, daily: true, fullscreen: true,
    persistedAcrossRestart: true, notices: true, errors, externalRendererRequests: [],
    audioNote: 'Actual bundled MP3 decodes and advances after a click. Human speaker/headphone listening is still required.', audio };
  await writeFile(join(artifacts, 'runtime-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally {
  if (app) await app.close();
  await rm(profile, { recursive: true, force: true });
}
