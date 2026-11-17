import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { transform } from '../scripts/transform.mjs';
import { assetPath, serveAsset } from '../src/content.mjs';

const source = await readFile(join(process.env.GG_SOURCE_ROOT || resolve(import.meta.dirname, '../..'), 'index.html'), 'utf8');
const built = transform(source);
test('desktop adapter fails closed if source contract changes', () => {
  assert.throws(() => transform(source.replace('let proUnlocked = legacyProAccess;', 'let proUnlocked = false;')), /expected one match/);
  assert.throws(() => transform(source.replace('firebase-app-compat.js', 'unknown.js')), /SDK inventory/);
});
test('desktop keeps course data and audio but disables network integrations', () => {
  assert.match(built.game, /let proUnlocked = true;\nLEVELS.push\(\.\.\.PRO_LEVELS\);/);
  assert.match(built.game, /const LIVE_SERVICES_ENABLED = false;/);
  assert.match(built.game, /new Audio\('soundtrack.mp3'\)/);
  assert.doesNotMatch(built.game, /void initCommerce|void initFunnelAnalytics|setTimeout\(initAuth|import\('\.\/(?:commerce-client|funnel-analytics)/);
  assert.doesNotMatch(built.game, /gravity-golf-6ec4f|AIzaSy/);
  const course = text => text.slice(text.indexOf('const PRO_LEVELS ='), text.indexOf('// ===================== FUNNEL MEASUREMENT'));
  assert.ok(course(source).length > 1000);
  assert.equal(course(source), course(built.game));
  assert.match(built.game, /accessSource: 'desktop-full-course'/);
});
test('local modules parse and import map uses CSP hash without eval or inline handlers', () => {
  const check = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: built.game, encoding: 'utf8' });
  assert.equal(check.status, 0, check.stderr);
  const map = built.html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1];
  const hash = createHash('sha256').update(map).digest('base64');
  assert.ok(built.html.includes(`'sha256-${hash}'`));
  assert.match(built.html, /connect-src 'none'/);
  assert.match(built.html, /worker-src 'self';/);
  assert.doesNotMatch(built.html, /unsafe-eval|\bon\w+="|<script[^>]+src="https?:|fonts.googleapis/);
  assert.equal(JSON.parse(map).imports.three, './vendor/three/build/three.module.js');
});
test('protocol allows only packaged assets at the exact local origin', () => {
  const files = { 'index.html': {}, 'licenses/three.txt': {} };
  assert.equal(assetPath('gg://game/', files), 'index.html');
  assert.equal(assetPath('gg://game/licenses/three.txt', files), 'licenses/three.txt');
  for (const url of ['https://gravitygolf.xyz/', 'file:///etc/passwd', 'gg://other/index.html',
    'gg://game/.env', 'gg://game/../package.json', 'gg://game/%2e%2e%2fpackage.json',
    'gg://user@game/index.html', 'gg://game:80/index.html', 'gg://game/index.html?x=1',
    'gg://game/%ZZ', 'gg://game/toString', 'gg://game/licenses%5c..%5cindex.html']) {
    assert.equal(assetPath(url, files), null, url);
  }
});
test('asset responses support audio ranges and reject unknown paths and writes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gg-protocol-'));
  try {
    await writeFile(join(root, 'audio.mp3'), '0123456789');
    const files = { 'audio.mp3': {} };
    const serve = (path = 'audio.mp3', options = {}) => serveAsset(new Request(`gg://game/${path}`, options), root, files);
    assert.equal((await serve()).headers.get('content-type'), 'audio/mpeg');
    for (const [range, body] of [['bytes=2-5', '2345'], ['bytes=8-', '89'], ['bytes=-3', '789']]) {
      const response = await serve('audio.mp3', { headers: { range } });
      assert.equal(response.status, 206);
      assert.equal(await response.text(), body);
    }
    for (const range of ['bytes=50-60', 'bytes=6-1', 'bytes=0-1,3-5', 'bytes=-0', 'bytes=-']) {
      assert.equal((await serve('audio.mp3', { headers: { range } })).status, 416);
    }
    assert.equal(await (await serve('audio.mp3', { method: 'HEAD' })).text(), '');
    assert.equal((await serve('.env')).status, 404);
    assert.equal((await serve('audio.mp3', { method: 'POST' })).status, 405);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('native window has no renderer Node access, preload, remote services or unsafe switches', async () => {
  const main = await readFile(new URL('../src/main.mjs', import.meta.url), 'utf8');
  assert.match(main, /nodeIntegration: false, contextIsolation: true, sandbox: true/);
  assert.match(main, /webSecurity: true, webviewTag: false/);
  assert.match(main, /setPermissionRequestHandler/);
  assert.doesNotMatch(main, /preload:|shell\.openExternal|disable-web-security|no-sandbox|ipcMain/);
});
test('generated payload matches its hashes and includes no backend or credential files', async () => {
  const root = resolve(import.meta.dirname, '../app/public');
  const manifest = JSON.parse(await readFile(join(root, 'build-manifest.json'), 'utf8'));
  assert.ok(manifest.files['aim-worker.mjs']);
  assert.equal(manifest.sourceIndexSha256, createHash('sha256').update(source).digest('hex'));
  for (const [name, entry] of Object.entries(manifest.files)) {
    assert.doesNotMatch(name, /(?:^|\/)(?:\.env|\.git|\.netlify|netlify|node_modules)|commerce-client|funnel-analytics|login\.html|profile\.html/);
    const bytes = await readFile(join(root, name));
    assert.equal(bytes.length, entry.bytes, name);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, name);
  }
});
