import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { runInNewContext } from 'node:vm';
import * as THREE from 'three';
import { aimSolverSource, buildAimWorker } from '../../scripts/build-aim-worker.mjs';

const root = process.env.GG_SOURCE_ROOT || resolve(import.meta.dirname, '../..');
const source = await readFile(join(root, 'index.html'), 'utf8');
const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const runnerCode = section('function createAimTaskRunner(', 'const aimTaskRunner =');
function runnerFixture({ fallback = null, creationFails = false } = {}) {
  const workers = [], timers = new Map(), frames = new Map();
  let handle = 0;
  const create = runInNewContext(`${runnerCode}; createAimTaskRunner`, {
    setTimeout: callback => { const id = ++handle; timers.set(id, callback); return id; },
    clearTimeout: id => timers.delete(id),
    requestAnimationFrame: callback => { const id = ++handle; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id),
  });
  const runner = create(() => {
    if (creationFails) throw new Error('not available');
    const worker = { messages: [], terminated: false,
      postMessage(message) { this.messages.push(message); }, terminate() { this.terminated = true; },
      reply(result, id = this.messages.at(-1).id) { this.onmessage({ data: { id, result } }); } };
    workers.push(worker);
    return worker;
  }, fallback);
  return { runner, workers, timers, frames };
}

test('worker is reused after success and cancellation settles without a stale result', async () => {
  const { runner, workers, timers } = runnerFixture();
  const first = runner.run({ hole: 1 });
  workers[0].reply({ power: 10 });
  assert.deepEqual(await first, { power: 10 });
  const second = runner.run({ hole: 6 });
  assert.equal(workers.length, 1);
  const third = runner.run({ hole: 11 });
  assert.equal(await second, null);
  assert.equal(workers[0].terminated, true);
  workers[0].reply({ power: 99 });
  workers[0].onerror({ preventDefault() {} });
  workers[0].onmessageerror();
  assert.equal(workers[1].terminated, false);
  workers[1].reply({ power: 20 });
  assert.deepEqual(await third, { power: 20 });
  assert.equal(timers.size, 0);
});

test('cancel stops the worker immediately and a subsequent request can succeed', async () => {
  const { runner, workers, timers } = runnerFixture();
  const first = runner.run({});
  runner.cancel();
  assert.equal(await first, null);
  assert.equal(workers[0].terminated, true);
  assert.equal(timers.size, 0);
  const second = runner.run({});
  workers[1].reply('new result');
  assert.equal(await second, 'new result');
});

for (const failure of ['error', 'messageerror', 'response', 'timeout']) {
  test(`${failure} frees the UI and permits retry`, async () => {
    const { runner, workers, timers } = runnerFixture();
    const first = runner.run({});
    if (failure === 'error') workers[0].onerror({ preventDefault() {} });
    if (failure === 'messageerror') workers[0].onmessageerror();
    if (failure === 'response') workers[0].onmessage({ data: { id: workers[0].messages[0].id, error: 'failed' } });
    if (failure === 'timeout') [...timers.values()][0]();
    assert.equal(await first, null);
    assert.equal(workers[0].terminated, true);
    const second = runner.run({});
    workers[1].reply({ points: [] });
    assert.deepEqual(await second, { points: [] });
  });
}

test('unavailable worker settles; standalone fallback can be cancelled before computing', async () => {
  assert.equal(await runnerFixture({ creationFails: true }).runner.run({}), null);
  let called = 0;
  const { runner, frames, timers, workers } = runnerFixture({ fallback: () => { called++; return 7; } });
  const first = runner.run({});
  runner.cancel();
  assert.equal(await first, null);
  assert.equal(frames.size, 0);
  assert.equal(called, 0);
  const second = runner.run({});
  [...frames.values()][0]();
  assert.equal(await second, 7);
  assert.equal(called, 1);
  assert.equal(timers.size, 0);
  assert.equal(workers.length, 0);
});

test('stale world/request, surface movement, and failed solve never return an applicable result', async () => {
  const code = section('async function requestOptimalPath()', 'async function snapToOptimal(');
  for (const change of ['revision', 'level', 'planet', 'goal', 'position', 'won', 'lost', 'null', 'valid']) {
    const planet = { pos: new THREE.Vector3(), radius: 3, gravityStrength: 1 };
    let reply;
    const context = { THREE, aimSearchRevision: 0, currentLevel: 1, ballOnPlanet: planet, homePlanet: planet,
      goalPlanet: planet, ball: { position: new THREE.Vector3(0, 3.225, 0) }, holePos: new THREE.Vector3(3, 0, 0),
      planetoids: [planet], ballRadius: 0.225, levelPowerMult: 1.8, SURFACE_FRICTION: 0.9975, CAPTURE_SPEED: 2, MAX_DIST: 400,
      gameWon: false, lostInSpace: false, updateRouteChip() {}, resetAimSearchButtons() {},
      aimTaskRunner: { run: () => new Promise(resolve => { reply = resolve; }) } };
    const request = runInNewContext(`${code}; requestOptimalPath`, context);
    const promise = request();
    assert.equal(context.aimSearchPending, true);
    if (change === 'revision') context.aimSearchRevision++;
    if (change === 'level') context.currentLevel++;
    if (change === 'planet') context.ballOnPlanet = { ...planet };
    if (change === 'goal') context.goalPlanet = { ...planet };
    if (change === 'position') context.ball.position.x++;
    if (change === 'won') context.gameWon = true;
    if (change === 'lost') context.lostInSpace = true;
    reply(change === 'null' ? null : { power: 20, launchDir: { x: 1, y: 0, z: 0 }, points: [{ x: 0, y: 0, z: 0 }] });
    const result = await promise;
    if (change === 'valid') assert.equal(result.launchDir.x, 1);
    else assert.equal(result, null, change);
    if (change !== 'revision') assert.equal(context.aimSearchPending, false);
  }
});

test('input cancellation and planning pause are wired into the actual game', () => {
  assert.match(section('function cancelLockedAim()', '// Fire and cancel buttons'), /cancelAimSearch\(\)/);
  assert.match(section('function hideOptimalPath()', "document.getElementById('optimalBtn').addEventListener"), /cancelAimSearch\(\)/);
  assert.match(section('function onSliderInput()', "sliderX.addEventListener"), /cancelAimSearch\(\)/);
  assert.match(section('function fireLockedShot()', 'function cancelLockedAim()'), /hideOptimalPath\(\)/);
  assert.match(section('function physicsStep(dt)', 'const ringGeoInst'), /if \(aimSearchPending\) return/);
  assert.match(source, /if \(!aimSearchPending\) planetOrbitTime \+= dt/);
  assert.match(source, /if \(aimSearchPending\) \{\s+p.mesh.position.copy\(p.pos\)/);
});

test('generated worker embeds the exact canonical search and rejects missing/duplicate markers', () => {
  const generated = buildAimWorker(source, './vendor/three/build/three.module.js');
  assert.ok(generated.includes(aimSolverSource(source)));
  assert.throws(() => aimSolverSource(source.replace('function findOptimalPath()', 'function renamed()')), /Missing aim solver/);
  assert.throws(() => aimSolverSource(source + 'async function toggleOptimalPath() {'), /contract changed/);
});

const levels = new Function(section('const LEVELS = [', '// ===================== FUNNEL MEASUREMENT') + '\nreturn [...LEVELS, ...PRO_LEVELS];')();
for (const hole of [1, 6, 11]) {
  test(`worker serialization preserves launch, power and all path points on authored hole ${hole}`, () => {
    const level = levels[hole - 1];
    const planets = level.planets.map(p => ({ pos: new THREE.Vector3(...p.pos), radius: p.r,
      gravityStrength: p.r * 3.614625 * 1.215 * (p.gravMult || 1) }));
    const homeIndex = level.planets.findIndex(p => p.type === 'start');
    const goalIndex = level.planets.findIndex(p => p.type === 'goal');
    const start = planets[homeIndex];
    const goal = planets[goalIndex];
    const ballRadius = 0.225;
    const startPos = start.pos.clone().add(new THREE.Vector3(...level.ballDir).normalize().multiplyScalar(start.radius + ballRadius));
    const holePos = goal.pos.clone().add(new THREE.Vector3(Math.sin(level.holePhi) * Math.cos(level.holeAngle),
      Math.cos(level.holePhi), Math.sin(level.holePhi) * Math.sin(level.holeAngle)).normalize().multiplyScalar(goal.radius));
    const maxSpan = Math.max(...planets.map(p => p.pos.distanceTo(start.pos)));
    const levelPowerMult = 1.8 + Math.max(0, Math.min(1, (maxSpan - 30) / 85)) * 1.459;
    const state = { planetoids: planets, ball: { position: startPos }, ballOnPlanet: start, homePlanet: start,
      goalPlanet: goal, holePos, ballRadius, levelPowerMult, SURFACE_FRICTION: 0.9975, CAPTURE_SPEED: 2, MAX_DIST: 400 };
    const keys = Object.keys(state);
    const direct = new Function('THREE', ...keys, `${aimSolverSource(source)}\nreturn findOptimalPath();`)(THREE, ...Object.values(state));
    const snapshot = { ...state, startPos: startPos.toArray(), holePos: holePos.toArray(), homeIndex, goalIndex, planetIndex: homeIndex,
      planetoids: planets.map(p => ({ ...p, pos: p.pos.toArray() })) };
    for (const key of ['ball', 'ballOnPlanet', 'homePlanet', 'goalPlanet']) delete snapshot[key];
    let response;
    const self = { postMessage: data => { response = structuredClone(data); } };
    const worker = buildAimWorker(source, 'three').replace(/^import .*;$/m, '');
    new Function('THREE', 'self', worker)(THREE, self);
    self.onmessage({ data: { id: hole, snapshot: structuredClone(snapshot) } });
    assert.equal(response.id, hole);
    assert.equal(response.error, undefined);
    assert.deepEqual(response.result, structuredClone(direct));
    assert(response.result.points.length >= 2);
  });
}
