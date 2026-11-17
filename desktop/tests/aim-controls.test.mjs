import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { pathToFileURL } from 'node:url';

const root = process.env.GG_SOURCE_ROOT || resolve(import.meta.dirname, '../..');
const desktop = process.env.GG_DESKTOP_ROOT || resolve(import.meta.dirname, '..');
const THREE = await import(pathToFileURL(join(desktop, 'node_modules/three/build/three.module.js')).href);
const source = await readFile(join(root, 'index.html'), 'utf8');
function section(startText, endText) {
  const start = source.indexOf(startText);
  const end = source.indexOf(endText, start);
  assert(start > 0 && end > start);
  return source.slice(start, end);
}
const snap = section('async function snapToOptimal(sourceBtn)', '// ===================== SLIDER AIM');
const sliders = section('function computeLaunchFromSliders()', '// Show panel when ball is clicked');

function fixture(azimuth, elevation, rotation) {
  const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(rotation);
  const forward = new THREE.Vector3(1, 0, 0).applyQuaternion(rotation);
  const right = new THREE.Vector3(0, 0, 1).applyQuaternion(rotation);
  const a = THREE.MathUtils.degToRad(azimuth);
  const e = THREE.MathUtils.degToRad(elevation);
  const launchDir = forward.clone().multiplyScalar(Math.cos(a) * Math.cos(e))
    .addScaledVector(right, Math.sin(a) * Math.cos(e)).addScaledVector(normal, Math.sin(e));
  const vector = () => new THREE.Vector3();
  const field = () => ({ value: '0', textContent: '' });
  const optimalButton = { classList: { add() {} } };
  const context = {
    THREE, Math, aimLocked: true, ballOnPlanet: { pos: vector() }, homePlanet: null,
    ball: { position: normal.clone().multiplyScalar(3.2) },
    requestOptimalPath: async () => ({ launchDir, power: 17.4, points: [vector(), launchDir] }),
    aimSearchRevision: 1,
    requestAnimationFrame: callback => callback(), setTimeout: () => 0,
    document: { getElementById: id => id === 'optimalBtn' ? optimalButton : null },
    lockedLaunchDir: vector(), lockedPower: 0, lockedPowerNorm: 0,
    lockedWorldDir: vector(), lockedNormal: vector(), levelPowerMult: 2,
    sliderAimActive: true, sliderX: field(), sliderY: field(), sliderZ: field(), sliderPwr: field(),
    valX: field(), valY: field(), valZ: field(), valPwr: field(),
    getAimTangentFrame: () => ({ normal, forward, right }), updatePowerDisplay() {},
    captureAssistBaseline() {}, updateDynamicLine() {},
    optimalPathLine: { material: {} }, lastOptimalLaunchDir: null, lastOptimalPower: 0,
    optimalPathPoints: [], optimalAnimating: false, optimalAnimT: 0, optimalPathVisible: false,
  };
  const api = runInNewContext(`${snap}\n${sliders}\n({ snapToOptimal, updateAimFromSliders })`, context);
  return { context, api, launchDir };
}

for (const [azimuth, elevation, rotated] of [[37, 35, false], [-63, 18, false], [119, 68, true]]) {
  test(`power-only adjustment preserves assisted heading (${azimuth}/${elevation}, rotated=${rotated})`, async () => {
    const rotation = rotated ? new THREE.Quaternion().setFromEuler(new THREE.Euler(0.6, 1.1, -0.4)) : new THREE.Quaternion();
    const { context, api, launchDir } = fixture(azimuth, elevation, rotation);
    await api.snapToOptimal('auto');
    assert(context.lockedLaunchDir.angleTo(launchDir) < 1e-7);
    context.sliderPwr.value = '75';
    api.updateAimFromSliders();
    const errorDegrees = THREE.MathUtils.radToDeg(context.lockedLaunchDir.angleTo(launchDir));
    assert(errorDegrees < 0.01, `Changing power rotated the shot by ${errorDegrees.toFixed(2)} degrees`);
    assert.equal(context.lockedPowerNorm, 0.75);
    assert(Math.abs(context.lockedPower - 26.1) < 1e-10);
    assert.equal(Number(context.sliderX.value), -azimuth);
    assert.equal(Number(context.sliderY.value), elevation);
  });
}
