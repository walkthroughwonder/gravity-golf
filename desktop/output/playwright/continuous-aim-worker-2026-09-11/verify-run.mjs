import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';

const root = resolve(process.argv[2]);
const output = resolve(process.argv[3]);
const bytes = await readFile(join(output, 'course-report.json'));
const report = JSON.parse(bytes);
const hash = value => createHash('sha256').update(value).digest('hex');
assert.equal(report.status, 'passed-boost-recovery-course-smoke');
assert.equal(report.scope.continuousFullRound, true);
assert.equal(report.scope.maxShots, 12);
assert.equal(report.scope.settleTimeoutMs, 90000);
assert.deepEqual(report.scope.recoveryBoostHoles, [13, 17, 18, 19]);
assert.deepEqual(report.holes.map(h => h.hole), Array.from({ length: 19 }, (_, i) => i + 1));
assert.deepEqual(report.errors, []);
assert.deepEqual(report.externalRequests, []);
assert.equal(hash(await readFile(join(output, 'course-runtime.mjs'))), report.harnessSha256);
const source = await readFile(join(root, '../index.html'), 'utf8');
assert.equal(hash(source), report.sourceIndexSha256);
const { extractFile } = createRequire(join(root, 'package.json'))('@electron/asar');
const archive = join(report.packageDir, 'Gravity Golf Prototype.app/Contents/Resources/app.asar');
assert.equal(hash(await readFile(archive)), report.archiveSha256);
const manifestBytes = extractFile(archive, 'public/build-manifest.json');
assert.equal(hash(manifestBytes), report.manifestSha256);
const manifest = JSON.parse(manifestBytes);
assert.equal(manifest.sourceIndexSha256, report.sourceIndexSha256);
for (const [name, entry] of Object.entries(manifest.files)) {
  assert.equal(hash(extractFile(archive, 'public/' + name)), entry.sha256, name);
}
const shots = report.holes.flatMap(h => h.shots);
let total = 0, par = 0;
for (const hole of report.holes) {
  assert.equal(hole.end.mode, 'hole_complete');
  assert.equal(hole.end.hole, hole.hole);
  assert.equal(hole.end.strokes, hole.shots.length);
  for (const [i, shot] of hole.shots.entries()) {
    assert.equal(shot.shot, i + 1);
    assert.equal(shot.before.strokes, i);
    assert.equal(shot.after.strokes, i + 1);
    assert.equal(shot.aim.hole, hole.hole);
    assert.equal(shot.aim.aim.assisted, true);
    assert.equal(shot.aim.aim.calculating, false);
    assert.equal(shot.settled, true);
    assert(shot.aimWaitMs > 0 && shot.aimWaitMs < 30000);
  }
  total += hole.end.strokes;
  par += hole.end.par;
}
assert.equal(report.inputs.filter(i => i.selector === '#fireBtn').length, shots.length);
assert.equal(report.inputs.filter(i => i.selector === '#nextHoleBtn').length, 19);
assert.equal(report.inputs.filter(i => i.action === 'choose-hole').length, 0);
assert.equal(par, 87);
assert.equal(report.scorecard.displayedTotal, `${total} (${total - par})`);
assert.equal(report.scorecard.heading, 'COURSE COMPLETE');
assert.deepEqual(report.scorecard.rows, report.holes.map(h => String(h.end.strokes)));
assert.equal(report.replayReset, true);
const pngs = {};
for (const name of [...report.holes.map(h => h.screenshot), 'final-scorecard.png', 'final-scorecard-narrow.png']) {
  assert(/^(?:hole-\d{2}-complete|final-scorecard(?:-narrow)?)\.png$/.test(name));
  const image = await readFile(join(output, name));
  assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  const expected = name.includes('narrow') ? [390, 844] : [1280, 800];
  assert.deepEqual([image.readUInt32BE(16), image.readUInt32BE(20)], expected);
  pngs[name] = { sha256: hash(image), width: expected[0], height: expected[1] };
}
const verification = { status: 'verified-course-smoke', reportSha256: hash(bytes),
  verifierSha256: hash(await readFile(new URL(import.meta.url))),
  sourceIndexSha256: report.sourceIndexSha256, archiveSha256: report.archiveSha256,
  scores: report.holes.map(h => h.end.strokes), total, par, difference: total - par,
  recordedShots: shots.length, obstacleLaunches: shots.filter(s => s.before.ball.onPlanetType === 'obstacle').length,
  boostAttempts: report.boostAttempts.length, maxAimWaitMs: Math.max(...shots.map(s => s.aimWaitMs)),
  longestShotMs: Math.max(...shots.map(s => s.elapsedMs)),
  elapsedSeconds: (Date.parse(report.completedAt) - Date.parse(report.startedAt)) / 1000,
  replayReset: report.replayReset, images: pngs };
await writeFile(join(output, 'verification.json'), JSON.stringify(verification, null, 2) + '\n');
console.log(JSON.stringify({ ...verification, images: Object.keys(pngs).length }));
