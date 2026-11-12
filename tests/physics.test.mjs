// Run with: node --test tests/physics.test.mjs
// Checks the ball physics engine that index.html uses for the real ball, the aim preview and the
// path solver. The engine and the level data are read straight out of index.html.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const between = (a, b) => {
  const i = html.indexOf(a), j = html.indexOf(b, i);
  assert.ok(i >= 0 && j > i, 'index.html no longer contains: ' + a);
  return html.slice(i, j);
};
const P = new Function(between('// <golf-physics>', '// </golf-physics>') + '\nreturn createGolfPhysics();')();
const { LEVELS, PRO_LEVELS } = new Function(
  between('const LEVELS = [', '// ===================== UNLOCK SYSTEM') + '\nreturn { LEVELS, PRO_LEVELS };')();
const ALL = [...LEVELS, ...PRO_LEVELS];

const BALL_RADIUS = 0.225;
const BH = [0x110011, 0x220022, 0x110022, 0x050005, 0x0a000a, 0x050010];
const channelGap = (a, b) => Math.abs(((a >> 16) & 255) - ((b >> 16) & 255)) + Math.abs(((a >> 8) & 255) - ((b >> 8) & 255)) + Math.abs((a & 255) - (b & 255));
const isBlackHole = pd => pd.r > 0.1 && BH.some(b => channelGap(pd.color, b) < 30);

// The level as loadLevel() hands it to the engine. frozen = no moving bodies (for the reference check).
function levelSpec(idx, frozen = false) {
  const lvl = ALL[idx];
  const bodies = lvl.planets.map(pd => ({
    x: pd.pos[0], y: pd.pos[1], z: pd.pos[2], radius: pd.r,
    gravity: pd.r * 3.614625 * 1.215 * (pd.gravMult || 1), blackHole: !frozen && isBlackHole(pd),
  }));
  const home = lvl.planets.findIndex(p => p.type === 'start'), goal = lvl.planets.findIndex(p => p.type === 'goal');
  const dir = [Math.sin(lvl.holePhi) * Math.cos(lvl.holeAngle), Math.cos(lvl.holePhi), Math.sin(lvl.holePhi) * Math.sin(lvl.holeAngle)];
  const g = bodies[goal], h = bodies[home];
  let span = 0;
  for (const b of bodies) span = Math.max(span, Math.hypot(b.x - h.x, b.y - h.y, b.z - h.z));
  const maxPower = 17.4 * (1.8 + Math.max(0, Math.min(1, (span - 30) / 85)) * 1.459);
  const bl = Math.hypot(...lvl.ballDir), up = lvl.ballDir.map(v => v / bl), rest = h.radius + BALL_RADIUS;
  return {
    maxPower,
    start: { x: h.x + up[0] * rest, y: h.y + up[1] * rest, z: h.z + up[2] * rest, on: home, tick: 0, whCooldown: 0 },
    spec: {
      levelIndex: frozen ? 0 : idx, home, goal, ballRadius: BALL_RADIUS, bodies,
      hole: [g.x + dir[0] * g.radius, g.y + dir[1] * g.radius, g.z + dir[2] * g.radius],
      wormholes: (lvl.wormholes || []).map(w => ({ a: w.a, b: w.b, radius: 1.8 })),
    },
  };
}

// The physics as the game ran it before the engine existed: per-frame, 8 substeps, at 60 frames a second
// on desktop. The engine's exact step must reproduce it, so the game keeps its feel.
function referenceShot(spec, start, dir, power, maxTime) {
  const bodies = spec.bodies, goal = bodies[spec.goal], hole = spec.hole, sub = 1 / 60 / 8;
  let x = start.x, y = start.y, z = start.z, vx = dir[0] * power, vy = dir[1] * power, vz = dir[2] * power;
  let on = power > 3.2 ? null : bodies[start.on];
  for (let t = 0; t < maxTime; t += 1 / 60) {
    for (let st = 0; st < 8; st++) {
      if (on) {
        let cx = on.x - x, cy = on.y - y, cz = on.z - z, l = Math.hypot(cx, cy, cz);
        const nx = cx / l, ny = cy / l, nz = cz / l, target = on.radius + BALL_RADIUS;
        x = on.x - nx * target; y = on.y - ny * target; z = on.z - nz * target;
        const dp = vx * nx + vy * ny + vz * nz;
        vx = (vx - nx * dp) * 0.9975; vy = (vy - ny * dp) * 0.9975; vz = (vz - nz * dp) * 0.9975;
        if (on === goal) {
          let hx = hole[0] - x, hy = hole[1] - y, hz = hole[2] - z;
          const hd = Math.hypot(hx, hy, hz);
          if (hd > 0.01 && hd < 3) {
            const ps = 1.5 / (hd * hd + 0.3) * sub / hd;
            hx *= ps; hy *= ps; hz *= ps;
            const nd = hx * nx + hy * ny + hz * nz;
            vx += hx - nx * nd; vy += hy - ny * nd; vz += hz - nz * nd;
          }
        }
        x += vx * sub; y += vy * sub; z += vz * sub;
        cx = on.x - x; cy = on.y - y; cz = on.z - z; l = Math.hypot(cx, cy, cz);
        x = on.x - cx / l * target; y = on.y - cy / l * target; z = on.z - cz / l * target;
        if (on === goal && Math.hypot(x - hole[0], y - hole[1], z - hole[2]) < 1.1 && Math.hypot(vx, vy, vz) < 7) return { sunk: true, x: hole[0], y: hole[1], z: hole[2] };
        if (Math.hypot(vx, vy, vz) > 6) on = null;
        if (Math.hypot(vx, vy, vz) < 0.05) return { x, y, z };
      } else {
        for (const p of bodies) {
          const tx = p.x - x, ty = p.y - y, tz = p.z - z, d = Math.hypot(tx, ty, tz);
          const f = p.gravity / Math.pow(d, 1.7) * sub * 60 / d;
          vx += tx * f; vy += ty * f; vz += tz * f;
        }
        vx *= 0.9991; vy *= 0.9991; vz *= 0.9991;
        x += vx * sub; y += vy * sub; z += vz * sub;
        for (const p of bodies) {
          if (p.radius <= 0.1) continue; // sentinel markers have no surface
          const d = Math.hypot(x - p.x, y - p.y, z - p.z), sd = d - p.radius - BALL_RADIUS;
          if (sd <= 0.1 && (Math.hypot(vx, vy, vz) < 2 || sd <= -0.05)) {
            on = p;
            const nx = (x - p.x) / d, ny = (y - p.y) / d, nz = (z - p.z) / d, tg = p.radius + BALL_RADIUS;
            x = p.x + nx * tg; y = p.y + ny * tg; z = p.z + nz * tg;
            const vn = vx * nx + vy * ny + vz * nz;
            if (vn < 0) { vx -= nx * vn; vy -= ny * vn; vz -= nz * vn; }
            vx *= 0.825; vy *= 0.825; vz *= 0.825;
            break;
          }
        }
        let minD = Infinity, away = true;
        const sp = Math.hypot(vx, vy, vz);
        for (const p of bodies) {
          const d = Math.hypot(p.x - x, p.y - y, p.z - z);
          minD = Math.min(minD, d);
          if (((p.x - x) * vx + (p.y - y) * vy + (p.z - z) * vz) / (d * sp) > 0.1) away = false;
        }
        if (minD > 400 || (minD > 200 && sp > 12 && away)) return { lost: true, x, y, z };
      }
    }
    if (on === goal && Math.hypot(x - hole[0], y - hole[1], z - hole[2]) < 1.1 && Math.hypot(vx, vy, vz) < 7) return { sunk: true, x: hole[0], y: hole[1], z: hole[2] };
  }
  return { x, y, z };
}

function seeded(seed) {
  let a = seed;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function upwardDir(rnd, start, body) {
  const n = [start.x - body.x, start.y - body.y, start.z - body.z], nl = Math.hypot(...n);
  for (;;) {
    const d = [rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1], l = Math.hypot(...d);
    if (l < 0.1 || l > 1) continue;
    if ((d[0] * n[0] + d[1] * n[1] + d[2] * n[2]) / (l * nl) > 0.1) return d.map(v => v / l);
  }
}

test('there are 8 free and 11 Pro holes, each with one start and one goal', () => {
  assert.equal(LEVELS.length, 8);
  assert.equal(PRO_LEVELS.length, 11);
  for (const lvl of ALL) {
    assert.equal(lvl.planets.filter(p => p.type === 'start').length, 1, lvl.name);
    assert.equal(lvl.planets.filter(p => p.type === 'goal').length, 1, lvl.name);
  }
});

test('the exact step reproduces the original 60 Hz desktop physics', () => {
  let shots = 0;
  for (let idx = 0; idx < ALL.length; idx++) {
    const { spec, start, maxPower } = levelSpec(idx, true);
    if (spec.wormholes.length) continue;
    const world = P.buildWorld(spec), rnd = seeded(idx + 1);
    for (let i = 0; i < 25; i++) {
      const dir = upwardDir(rnd, start, spec.bodies[spec.home]), power = (0.1 + 0.9 * rnd()) * maxPower;
      const want = referenceShot(spec, start, dir, power, 20);
      const got = P.simulate(world, start, dir[0], dir[1], dir[2], power, 20, 1, null);
      assert.equal(got.sunk, !!want.sunk, `hole ${idx + 1} shot ${i}: sunk`);
      assert.equal(got.lost, !!want.lost, `hole ${idx + 1} shot ${i}: lost`);
      const gap = Math.hypot(got.end.x - want.x, got.end.y - want.y, got.end.z - want.z);
      assert.ok(gap < 1e-6, `hole ${idx + 1} shot ${i}: ends ${gap} units from the reference`);
      shots++;
    }
  }
  assert.ok(shots >= 300);
});

test('a shot gives the same result every time, moving bodies included', () => {
  const { spec, start, maxPower } = levelSpec(18);
  const world = P.buildWorld(spec);
  assert.ok(world.moving.length > 0);
  const a = P.simulate(world, start, 0.6, 0.8, 0, maxPower * 0.8, 15, 1, null);
  P.simulate(world, start, -0.2, 0.9, 0.3, maxPower * 0.5, 15, 1, null);
  const b = P.simulate(world, start, 0.6, 0.8, 0, maxPower * 0.8, 15, 1, null);
  assert.deepEqual(a, b);
});

test('a ball resting on a moving body stays on the same spot of it', () => {
  const { spec } = levelSpec(18);
  const world = P.buildWorld(spec);
  const i = world.moving[0], b = world.bodies[i], rest = b.radius + BALL_RADIUS;
  const s = Object.assign(P.newState(), { x: b.x, y: b.y + rest, z: b.z, on: i });
  for (let n = 0; n < 480 * 10; n++) P.step(world, s, 1);
  assert.equal(s.on, i);
  assert.ok(Math.hypot(s.x - b.x, s.y - (b.y + rest), s.z - b.z) < 1e-6, 'the ball slid on the moving body');
});

test('sentinel markers cannot be landed on', () => {
  const { spec } = levelSpec(1);
  const world = P.buildWorld(spec);
  const i = spec.bodies.findIndex(b => b.radius <= 0.1);
  assert.ok(i >= 0);
  assert.equal(world.bodies[i].solid, false);
  assert.equal(world.bodies[i].motion, null);
  const b = world.bodies[i];
  const s = Object.assign(P.newState(), { x: b.x - 0.5, y: b.y, z: b.z, vx: 1, on: -1 });
  for (let n = 0; n < 480; n++) assert.notEqual(P.step(world, s, 1), P.EV.CAPTURE);
});

test('the solver sinks the first three holes from the tee, checked on the exact step', () => {
  for (let idx = 0; idx < 3; idx++) {
    const { spec, start, maxPower } = levelSpec(idx);
    const world = P.buildWorld(spec);
    const shot = P.findOptimalPath(world, start, maxPower);
    assert.equal(shot.sunk, true, ALL[idx].name);
    assert.ok(shot.power <= maxPower + 1e-9);
    const check = P.simulate(world, start, shot.dir[0], shot.dir[1], shot.dir[2], shot.power, 27, 1, null);
    assert.equal(check.sunk, true, ALL[idx].name + ' (replayed)');
  }
});
