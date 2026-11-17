import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8'));

function meta(attribute, name) {
  const tags = html.match(new RegExp(`<meta ${attribute}="${name}" content="[^"]*">`, 'g')) || [];
  assert.equal(tags.length, 1, `One ${name} tag is required`);
  return tags[0].match(/content="([^"]*)"/)[1];
}

function pngSize(file) {
  const bytes = readFileSync(new URL(file, root));
  assert.deepEqual(bytes.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  assert.equal(bytes.toString('ascii', 12, 16), 'IHDR');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), bytes: bytes.length };
}

test('sharing metadata describes the free browser game without sales or store claims', () => {
  assert.match(meta('name', 'description'), /8 free holes/);
  assert.equal(meta('property', 'og:type'), 'website');
  assert.equal(meta('property', 'og:site_name'), 'Gravity Golf');
  assert.equal(meta('property', 'og:url'), 'https://gravitygolf.xyz/');
  assert.match(html, /<link rel="canonical" href="https:\/\/gravitygolf\.xyz\/">/);
  assert.equal(meta('name', 'twitter:card'), 'summary');
  assert.equal(meta('name', 'twitter:title'), meta('property', 'og:title'));
  assert.equal(meta('name', 'twitter:description'), meta('property', 'og:description'));
  assert.equal(meta('name', 'twitter:image'), meta('property', 'og:image'));
  const copy = `${meta('property', 'og:title')} ${meta('property', 'og:description')} ${manifest.description}`;
  assert.doesNotMatch(copy, /offline|app store|google play|steam|epic|bestseller|\$/i);
});

test('social image and web icons have real matching dimensions within a static asset budget', () => {
  const image = new URL(meta('property', 'og:image'));
  assert.equal(image.origin, 'https://gravitygolf.xyz');
  assert.equal(image.search, '');
  const size = pngSize(image.pathname.slice(1));
  assert.equal(size.width, Number(meta('property', 'og:image:width')));
  assert.equal(size.height, Number(meta('property', 'og:image:height')));
  assert.equal(meta('property', 'og:image:type'), 'image/png');
  assert.ok(meta('property', 'og:image:alt').length > 20);
  assert.equal(meta('name', 'twitter:image:alt'), meta('property', 'og:image:alt'));
  let total = pngSize('apple-touch-icon.png').bytes;
  for (const icon of manifest.icons) {
    const actual = pngSize(icon.src);
    assert.equal(icon.sizes, `${actual.width}x${actual.height}`);
    assert.equal(icon.type, 'image/png');
    assert.equal(icon.purpose, 'any');
    total += actual.bytes;
  }
  assert.ok(total < 200000, 'Keep optional icon payloads below 200 KB combined');
  assert.equal(pngSize('apple-touch-icon.png').width, 180);
  assert.equal(pngSize('apple-touch-icon.png').height, 180);
  assert.match(html, /<link rel="apple-touch-icon" sizes="180x180" href="\.\/apple-touch-icon\.png">/);
});

test('manifest start and scope stay local without inheriting account or payment return data', () => {
  assert.match(html, /<link rel="manifest" href="\.\/manifest\.json">/);
  assert.equal(manifest.name, 'Gravity Golf');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.prefer_related_applications, false);
  assert.deepEqual(manifest.icons.map(icon => icon.sizes), ['192x192', '512x512']);
  for (const origin of ['https://gravitygolf.xyz', 'http://localhost:8765']) {
    const base = new URL('/preview/manifest.json', origin);
    for (const value of [manifest.id, manifest.start_url, manifest.scope, ...manifest.icons.map(icon => icon.src)]) {
      const resolved = new URL(value, base);
      assert.equal(resolved.origin, origin);
      assert.equal(resolved.search, '');
      assert.equal(resolved.hash, '');
      assert.ok(resolved.pathname.startsWith('/preview/'));
    }
  }
  assert.equal(manifest.related_applications, undefined);
  assert.equal(manifest.share_target, undefined);
  assert.doesNotMatch(html, /serviceWorker\.register/);
});
