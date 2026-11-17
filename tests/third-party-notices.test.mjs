import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = file => readFileSync(new URL(file, root), 'utf8');
const hashes = {
  'three-0.172.0-LICENSE.txt': '4c40a1ef62450b857c3b2aaf294936304cd552d965fbcd9d32d4c5bcf4ba4454',
  'firebase-10.12.0-LICENSE.txt': '065e45b5674f9bf76670496e5472611b3fbd87fbeaf99336725430a9909cb687',
  'orbitron-OFL.txt': 'ab609b0e110d622435ff337cdf233288556e011bbf9bd0550be98846c0630819',
  'exo-2-OFL.txt': '7f95a8eeecc6904ffc81cd10cc8ebc7fcee72a67922924bf45f02dff03b88127',
};

test('web license texts preserve the inspected upstream bytes and notices', () => {
  for (const [file, hash] of Object.entries(hashes)) {
    assert.equal(createHash('sha256').update(read('licenses/' + file)).digest('hex'), hash, file);
  }
  assert.match(read('licenses/orbitron-OFL.txt'), /Reserved Font Name: "Orbitron"/);
  assert.match(read('licenses/firebase-10.12.0-LICENSE.txt'), /Copyright 2008 Google Inc/);
});

test('notices match pinned web SDK versions and link to every shipped license', () => {
  const page = read('third-party-notices.html');
  const game = read('index.html');
  assert.match(game, /three@0\.172\.0/);
  assert.match(page, /Three\.js 0\.172\.0/);
  for (const file of ['index.html', 'login.html', 'profile.html']) {
    const versions = [...read(file).matchAll(/firebasejs\/([^/]+)\//g)].map(match => match[1]);
    assert.ok(versions.length > 0);
    assert.ok(versions.every(version => version === '10.12.0'), file);
  }
  for (const file of Object.keys(hashes)) assert.ok(page.includes(`href="./licenses/${file}"`));
  assert.match(page, /do not grant a license to Gravity Golf/);
  assert.doesNotMatch(page, /<script\b|<iframe\b|@import|<link[^>]+stylesheet/i);
});

test('both starting screens expose a separate-tab notice link without replacing the game', () => {
  const game = read('index.html');
  const links = [...game.matchAll(/<a class="notices-link"[^>]+>/g)].map(match => match[0]);
  assert.equal(links.length, 2);
  for (const link of links) {
    assert.match(link, /href="\.\/third-party-notices\.html"/);
    assert.match(link, /target="_blank"/);
    assert.match(link, /rel="noopener noreferrer"/);
    assert.match(link, /aria-label="Third-party notices \(opens in a new tab\)"/);
  }
});
