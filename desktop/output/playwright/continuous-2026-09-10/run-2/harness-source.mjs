import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(process.argv[2] || fileURLToPath(new URL('..', import.meta.url)));
const output = resolve(process.argv[3] || join(root, 'output/playwright/course-2026-09-10'));
const firstHole = Number(process.argv[4] || 1);
const lastHole = Number(process.argv[5] || 19);
const maxShots = Number(process.argv[6] || 6);
const recoveryBoostMs = Number(process.argv[7] || 0);
const settleTimeoutMs = Number(process.argv[8] || 45000);
assert(Number.isInteger(firstHole) && firstHole >= 1 && firstHole <= 19);
assert(Number.isInteger(lastHole) && lastHole >= firstHole && lastHole <= 19);
assert(Number.isInteger(maxShots) && maxShots >= 1 && maxShots <= 20);
assert(Number.isInteger(recoveryBoostMs) && recoveryBoostMs >= 0 && recoveryBoostMs <= 2000);
assert(Number.isInteger(settleTimeoutMs) && settleTimeoutMs >= 1000 && settleTimeoutMs <= 120000);
const recoveryBoostHoles = process.argv[9] === undefined
  ? Array.from({ length: lastHole - firstHole + 1 }, (_, i) => firstHole + i)
  : process.argv[9].split(',').map(Number);
assert(recoveryBoostHoles.every(hole => Number.isInteger(hole) && hole >= firstHole && hole <= lastHole)
  && new Set(recoveryBoostHoles).size === recoveryBoostHoles.length,
  'Recovery boost holes must be unique hole numbers within the tested range.');
const { _electron } = await import(process.env.PLAYWRIGHT_MODULE_PATH ? pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href : 'playwright');
const executablePath = join(root, 'out/Gravity Golf Prototype-darwin-arm64/Gravity Golf Prototype.app/Contents/MacOS/gravity-golf');
const archive = join(root, 'out/Gravity Golf Prototype-darwin-arm64/Gravity Golf Prototype.app/Contents/Resources/app.asar');
await mkdir(output, { recursive: true });
assert.equal(await readFile(join(output, 'course-report.json')).then(() => true, () => false), false, 'Use a fresh output directory.');
const profile = await mkdtemp(join(tmpdir(), 'gravitygolf-course-'));
const report = { startedAt: new Date().toISOString(), status: 'running',
  archiveSha256: createHash('sha256').update(await readFile(archive)).digest('hex'),
  method: 'Normal game controls with built-in aim assistance and optional Space-held recovery boost from obstacles on configured holes. No gameplay or score injection. Disposable profile. Shot count and settling window are bounded smoke-test limits, not proof a course is impossible.',
  harnessSha256: createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex'),
  scope: { firstHole, lastHole, maxShots, recoveryBoostMs, recoveryBoostHoles, settleTimeoutMs, continuousFullRound: firstHole === 1 && lastHole === 19 },
  holes: [], errors: [], externalRequests: [], inputs: [], boostAttempts: [] };
let app;
let page;
let activeHole;
const save = () => writeFile(join(output, 'course-report.json'), JSON.stringify(report, null, 2) + '\n');
try {
  app = await _electron.launch({ executablePath, args: [`--user-data-dir=${profile}`], timeout: 30000 });
  page = await app.firstWindow();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
  page.on('request', request => { if (/^(?:https?|wss?|file):/.test(request.url())) report.externalRequests.push(request.url()); });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.reload();
  await page.evaluate(() => {
    window.__qaSpaceEvents = [];
    window.addEventListener('keydown', event => {
      if (event.key !== ' ') return;
      const record = { key: event.key, target: event.target?.tagName, repeat: event.repeat,
        before: JSON.parse(window.render_game_to_text()) };
      window.__qaSpaceEvents.push(record);
    }, true);
    window.addEventListener('keydown', event => {
      if (event.key !== ' ') return;
      const record = window.__qaSpaceEvents.at(-1);
      record.afterGameHandler = JSON.parse(window.render_game_to_text());
      record.activeGlow = document.getElementById('boostActiveGlow').classList.contains('active');
    });
  });
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const click = async selector => {
    report.inputs.push({ at: new Date().toISOString(), action: 'click', selector });
    await page.locator(selector).click();
  };
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
  assert.equal((await state()).desktop.courseHoles, 19);
  assert.equal((await state()).commerce.liveServices, false);
  await click('#ballGrid .ball-option:first-child');
  if (firstHole === 1) {
    await click('#playBtn');
    await click('#skipBtn');
  } else {
    await click('#pickerProBtn');
    report.inputs.push({ at: new Date().toISOString(), action: 'choose-hole', hole: firstHole });
    await page.locator('#desktopCourse .lvl-btn').nth(firstHole - 1).click();
  }
  for (let hole = firstHole; hole <= lastHole; hole++) {
    activeHole = { hole, shots: [] };
    await page.waitForTimeout(4500);
    await page.waitForFunction(h => {
      const s = JSON.parse(window.render_game_to_text());
      return s.hole === h && !s.introPlaying && !s.trainer.visible;
    }, hole);
    activeHole.title = await page.locator('#titleHoleName').innerText();
    for (let shot = 1; shot <= maxShots; shot++) {
      let ready = await state();
      if (ready.mode === 'hole_complete') break;
      assert.equal(ready.hole, hole);
      if (ready.ball.screen.x < 50 || ready.ball.screen.x > 1230 || ready.ball.screen.y < 75 || ready.ball.screen.y > 700) {
        await click('#findBallBtn');
        await page.waitForTimeout(1800);
        ready = await state();
      }
      report.inputs.push({ at: new Date().toISOString(), action: 'aim-ball', point: ready.ball.screen });
      await page.mouse.click(ready.ball.screen.x, ready.ball.screen.y);
      await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).mode === 'aiming');
      await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).aim.assisted, undefined, { timeout: 30000 });
      const aim = await state();
      const started = Date.now();
      await click('#fireBtn');
      await page.waitForFunction(previous => JSON.parse(window.render_game_to_text()).strokes > previous, ready.strokes);
      let boost = null;
      if (recoveryBoostMs > 0 && recoveryBoostHoles.includes(hole) && ready.ball.onPlanetType === 'obstacle') {
        const beforeBoost = await state();
        if (beforeBoost.mode === 'flight' && !beforeBoost.ball.onPlanet && (beforeBoost.boosts > 0 || beforeBoost.boosts === 'infinite')) {
          report.inputs.push({ at: new Date().toISOString(), action: 'boost-key-down', key: 'Space', durationMs: recoveryBoostMs });
          await page.keyboard.down('Space');
          const keyEvent = await page.evaluate(() => window.__qaSpaceEvents.at(-1));
          try { await page.waitForTimeout(recoveryBoostMs); }
          finally { await page.keyboard.up('Space'); }
          report.inputs.push({ at: new Date().toISOString(), action: 'boost-key-up', key: 'Space' });
          const afterBoost = await state();
          boost = { durationMs: recoveryBoostMs, before: beforeBoost, keyEvent, after: afterBoost };
          report.boostAttempts.push({ hole, shot, ...boost });
          assert(keyEvent?.activeGlow, 'Normal Space input must activate the boost.');
          const expectedCharges = keyEvent.before.boosts === 'infinite' ? 'infinite' : keyEvent.before.boosts - 1;
          assert.equal(keyEvent.afterGameHandler.boosts, expectedCharges, 'Boost spends one charge before later gravity-graze rewards can recharge it.');
        }
      }
      let settled = true;
      try {
        await page.waitForFunction(() => {
          const s = JSON.parse(window.render_game_to_text());
          return s.mode === 'hole_complete' || (s.mode === 'ready' && s.ball.onPlanet && s.ball.speed === 0);
        }, undefined, { timeout: settleTimeoutMs });
      } catch (error) {
        if (error.name !== 'TimeoutError') throw error;
        settled = false;
      }
      const after = await state();
      activeHole.shots.push({ shot, before: ready, aim, boost, after, elapsedMs: Date.now() - started, settled });
      report.activeHole = activeHole;
      console.log(JSON.stringify({ hole, shot, boosted: !!boost, state: after.mode, strokes: after.strokes, speed: after.ball.speed, settled }));
      await save();
      assert(settled, `Hole ${hole}: shot did not settle within the smoke-test window.`);
      if (after.mode === 'hole_complete') break;
    }
    const end = await state();
    assert.equal(end.mode, 'hole_complete', `Hole ${hole}: not completed within ${maxShots} real attempts.`);
    await page.locator('#nextHoleBtn').waitFor({ state: 'visible' });
    activeHole.end = end;
    activeHole.nextButton = await page.locator('#nextHoleBtn').innerText();
    activeHole.screenshot = `hole-${String(hole).padStart(2, '0')}-complete.png`;
    await page.screenshot({ path: join(output, activeHole.screenshot), scale: 'css' });
    report.holes.push(activeHole);
    await save();
    if (hole < lastHole || lastHole === 19) await click('#nextHoleBtn');
  }
  if (lastHole === 19) {
    await page.locator('#gameCompleteScreen.visible').waitFor({ state: 'visible' });
    const rows = await page.locator('#gcScorecardBody .sc-row:not(.header) .sc-score').allTextContents();
    const expectedRows = Array(19).fill('\u2014');
    for (const hole of report.holes) expectedRows[hole.hole - 1] = String(hole.end.strokes);
    assert.deepEqual(rows, expectedRows);
    const expectedTotal = report.holes.reduce((total, hole) => total + hole.end.strokes, 0);
    const expectedPar = report.holes.reduce((total, hole) => total + hole.end.par, 0);
    const expectedDiff = expectedTotal - expectedPar;
    const displayedTotal = await page.locator('#gcTotal').innerText();
    assert.equal(displayedTotal, `${expectedTotal} (${expectedDiff >= 0 ? '+' : ''}${expectedDiff})`);
    const heading = await page.locator('#gameCompleteScreen .gc-title').innerText();
    const summary = await page.locator('#gcScore').innerText();
    assert.equal(heading, firstHole === 1 ? 'COURSE COMPLETE' : 'ROUND SUMMARY');
    if (firstHole > 1) assert(summary.includes(`${report.holes.length}/19 HOLES PLAYED`));
    assert.equal(await page.locator('#gcUnlockBtn').isVisible(), false);
    await page.screenshot({ path: join(output, 'final-scorecard.png'), scale: 'css' });
    report.scorecard = { rows, expectedTotal, expectedPar, expectedDiff, displayedTotal, heading, summary, includesUnplayedHoles: firstHole > 1 };
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    report.scorecard.narrowLayout = await page.evaluate(() => {
      const panel = document.getElementById('gameCompleteScreen');
      return { viewport: innerWidth, panelWidth: panel.clientWidth, panelScrollWidth: panel.scrollWidth,
        pageWidth: document.documentElement.scrollWidth };
    });
    await page.screenshot({ path: join(output, 'final-scorecard-narrow.png'), scale: 'css' });
    assert(report.scorecard.narrowLayout.panelScrollWidth <= report.scorecard.narrowLayout.panelWidth + 1);
    assert(report.scorecard.narrowLayout.pageWidth <= report.scorecard.narrowLayout.viewport + 1);
    await page.setViewportSize({ width: 1280, height: 800 });
    await click('#gcPlayAgain');
    await page.waitForTimeout(4500);
    await page.waitForFunction(() => {
      const s = JSON.parse(window.render_game_to_text());
      return s.hole === 1 && s.strokes === 0 && !s.introPlaying;
    });
    assert.equal(await page.locator('#totalScore').innerText(), '0');
    report.replayReset = true;
  }
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.externalRequests, []);
  report.status = report.scope.continuousFullRound ? 'passed-assisted-course-smoke' : 'passed-assisted-segment-smoke';
  if (recoveryBoostMs > 0) report.status = report.scope.continuousFullRound ? 'passed-boost-recovery-course-smoke' : 'passed-boost-recovery-segment-smoke';
  report.completedAt = new Date().toISOString();
  await save();
  console.log(JSON.stringify({ status: report.status, holesCompleted: report.holes.length, scorecard: report.scorecard, replayReset: report.replayReset || false }));
} catch (error) {
  report.status = 'needs-investigation';
  report.failure = error.stack;
  report.activeHole = activeHole;
  if (page && !page.isClosed()) {
    report.spaceEvents = await page.evaluate(() => window.__qaSpaceEvents || []).catch(() => []);
    report.lastState = await page.evaluate(() => window.render_game_to_text?.()).catch(() => null);
    await page.screenshot({ path: join(output, 'failure.png'), scale: 'css' }).catch(() => {});
  }
  await save();
  throw error;
} finally {
  if (page && !page.isClosed()) {
    report.spaceEvents = await page.evaluate(() => window.__qaSpaceEvents || []).catch(() => []);
    await save();
  }
  if (app) await app.close();
  await rm(profile, { recursive: true, force: true });
}
