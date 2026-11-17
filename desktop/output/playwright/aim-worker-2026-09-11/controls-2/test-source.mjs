import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const desktop = resolve(process.argv[2] || new URL('../', import.meta.url).pathname);
const output = resolve(process.argv[3]);
const { _electron } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH));
const profile = await mkdtemp(join(tmpdir(), 'gg-aim-controls-'));
await mkdir(output, { recursive: true });
const report = { checks: [], errors: [], externalRequests: [],
  buildManifestSha256: createHash('sha256').update(await readFile(join(desktop, 'app/public/build-manifest.json'))).digest('hex') };
await copyFile(new URL(import.meta.url), join(output, 'test-source.mjs'));
let app, page;
try {
  app = await _electron.launch({ executablePath: join(desktop, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),
    args: [join(desktop, 'app'), `--user-data-dir=${profile}`], chromiumSandbox: true });
  page = await app.firstWindow();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
  page.on('request', request => { if (/^(https?|wss?|file):/.test(request.url())) report.externalRequests.push(request.url()); });
  await page.setViewportSize({ width: 1280, height: 800 });
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const wait = predicate => page.waitForFunction(predicate, null, { timeout: 30000 });
  async function select(hole) {
    await page.reload();
    await wait(() => typeof window.render_game_to_text === 'function');
    await page.locator('#ballGrid .ball-option:first-child').click();
    await page.locator('#pickerProBtn').click();
    await page.locator('#desktopCourse .lvl-btn').nth(hole - 1).click();
    await page.waitForTimeout(5000);
    assert.equal((await state()).hole, hole);
  }
  async function aim() {
    const { ball } = await state();
    await page.mouse.click(ball.screen.x, ball.screen.y);
    await wait(() => JSON.parse(window.render_game_to_text()).aim.calculating);
  }
  await select(11);
  await aim();
  const start = Date.now();
  await page.locator('#cancelBtn').click();
  assert.equal((await state()).aim.calculating, false);
  assert.equal((await state()).mode, 'ready');
  report.checks.push({ name: 'cancel during compute', inputMs: Date.now() - start });
  await page.waitForTimeout(2500);
  assert.equal((await state()).aim.assisted, false);

  await aim();
  await page.locator('#aimToggleBtn').click();
  await page.locator('#powerBar').click({ position: { x: 10, y: 30 } });
  const manualPower = await page.locator('#aimPwr').inputValue();
  assert.equal((await state()).aim.calculating, false);
  assert.equal((await state()).aim.assisted, false);
  assert.equal(await page.locator('#routeChip').innerText(), 'MANUAL AIM');
  await page.waitForTimeout(2500);
  assert.equal(await page.locator('#aimPwr').inputValue(), manualPower);
  assert.equal((await state()).aim.assisted, false);
  await page.screenshot({ path: join(output, 'manual-adjustment.png') });
  report.checks.push({ name: 'manual input cancels and is not overwritten', manualPower });
  await page.locator('#cancelBtn').click();

  await aim();
  await page.locator('#resetBtn').click();
  await page.waitForTimeout(5000);
  assert.equal((await state()).aim.calculating, false);
  assert.equal((await state()).aim.assisted, false);
  assert.equal((await state()).strokes, 0);
  report.checks.push({ name: 'reset discards old result' });

  await aim();
  await page.locator('#fireBtn').click();
  assert.equal((await state()).aim.calculating, false);
  assert.equal((await state()).strokes, 1);
  await page.waitForTimeout(2500);
  assert.notEqual((await state()).mode, 'aiming');
  assert.equal((await state()).aim.assisted, false);
  await page.screenshot({ path: join(output, 'fire-during-compute.png') });
  report.checks.push({ name: 'fire ends planning pause and prevents stale aim' });

  await select(1);
  const { ball } = await state();
  await page.mouse.click(ball.screen.x, ball.screen.y);
  await wait(() => JSON.parse(window.render_game_to_text()).aim.assisted);
  await page.screenshot({ path: join(output, 'assisted-aim.png') });
  await page.locator('#fireBtn').click();
  await wait(() => JSON.parse(window.render_game_to_text()).mode === 'hole_complete');
  assert.equal((await state()).strokes, 1);
  await page.screenshot({ path: join(output, 'hole-in-one.png') });
  report.checks.push({ name: 'worker-assisted shot still completes Hole 1 in one stroke' });
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.externalRequests, []);
  report.status = 'passed';
  console.log(JSON.stringify(report));
} catch (error) {
  report.status = 'failed'; report.error = error.stack;
  if (page) {
    report.failureState = await page.evaluate(() => JSON.parse(window.render_game_to_text())).catch(() => null);
    await page.screenshot({ path: join(output, 'failure.png') }).catch(() => {});
  }
  throw error;
} finally {
  if (app) await app.close();
  await rm(profile, { recursive: true, force: true });
  await writeFile(join(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
}
