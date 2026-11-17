import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { buildAimWorker } from '../scripts/build-aim-worker.mjs';

test('public build includes only the intended game files, not backend code or credentials', () => {
  const root = new URL('../', import.meta.url);
  const result = spawnSync(process.execPath, ['scripts/build-web.mjs'], { cwd: root, encoding: 'utf8',
    env: { ...process.env, GG_ANALYTICS_MODE: 'disabled' } });
  assert.equal(result.status, 0, result.stderr);
  const expected = ['_headers', 'aim-worker.mjs', 'analytics-config.json', 'apple-touch-icon.png', 'commerce-client.mjs', 'funnel-analytics.mjs', 'icon-192.png', 'icon-512.png', 'index.html', 'licenses', 'login.html', 'manifest.json', 'profile.html', 'soundtrack.mp3', 'third-party-notices.html'];
  assert.deepEqual(readdirSync(new URL('dist/', root)).sort(), expected);
  for (const file of expected) {
    if (file === 'aim-worker.mjs') {
      const source = readFileSync(new URL('index.html', root), 'utf8');
      const imports = JSON.parse(source.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
      assert.equal(readFileSync(new URL('dist/aim-worker.mjs', root), 'utf8'), buildAimWorker(source, imports.three));
      continue;
    }
    if (file === 'licenses') {
      const licenses = ['exo-2-OFL.txt', 'firebase-10.12.0-LICENSE.txt', 'orbitron-OFL.txt', 'three-0.172.0-LICENSE.txt'];
      assert.deepEqual(readdirSync(new URL('dist/licenses/', root)).sort(), licenses);
      for (const name of licenses) assert.deepEqual(readFileSync(new URL(`dist/licenses/${name}`, root)), readFileSync(new URL(`licenses/${name}`, root)));
      continue;
    }
    if (file === 'analytics-config.json') {
      assert.deepEqual(JSON.parse(readFileSync(new URL(`dist/${file}`, root))), { mode: 'disabled' });
      continue;
    }
    assert.deepEqual(readFileSync(new URL(`dist/${file}`, root)), readFileSync(new URL(file, root)));
  }
});
