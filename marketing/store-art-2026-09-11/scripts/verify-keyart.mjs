import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(process.argv[2] || fileURLToPath(new URL('..', import.meta.url)));
const sharp = createRequire(import.meta.url)(process.env.SHARP_MODULE || 'sharp');
const sha256 = data => createHash('sha256').update(data).digest('hex');
const expected = new Map([
  ['header-capsule', [920, 430]], ['small-capsule', [462, 174]],
  ['main-capsule', [1232, 706]], ['vertical-capsule', [748, 896]],
  ['library-capsule', [600, 900]], ['library-header', [920, 430]],
  ['library-hero', [3840, 1240]], ['library-logo', [1280, 510]],
]);
const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'));
assert.equal(manifest.status, 'private-owner-review');
assert.equal(manifest.kind, 'illustrated-key-art-not-gameplay-screenshots');
assert.deepEqual(manifest.release, { uploaded: false, ownerApproved: false, storeAccepted: false, trademarkCleared: false });
assert.equal(manifest.assets.length, 8);
assert.equal(new Set(manifest.assets.map(asset => asset.name)).size, 8);
assert.equal(manifest.generatorSha256, sha256(await readFile(join(root, 'scripts/render-keyart.mjs'))));
for (const asset of manifest.assets) {
  assert(expected.has(asset.name));
  const svg = await readFile(join(root, `masters/${asset.name}.svg`), 'utf8');
  const png = await readFile(join(root, `png/${asset.name}.png`));
  assert.equal(sha256(svg), asset.svgSha256, asset.name);
  assert.equal(sha256(png), asset.pngSha256, asset.name);
  assert(!/<(?:text|image|script|foreignObject)\b|(?:href|onload)\s*=/.test(svg), asset.name);
  const labels = [...svg.matchAll(/<g aria-label="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(labels, asset.name === 'library-hero' ? [] : ['GRAVITY', 'GOLF']);
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([info.width, info.height], expected.get(asset.name));
  assert.deepEqual([asset.width, asset.height], expected.get(asset.name));
  let transparent = 0, solid = 0;
  const bounds = [info.width, info.height, -1, -1];
  for (let pixel = 0; pixel < info.width * info.height; pixel++) {
    const alpha = data[pixel * 4 + 3];
    if (alpha === 0) transparent++;
    if (alpha === 255) solid++;
    if (alpha > 0) {
      const x = pixel % info.width, y = Math.floor(pixel / info.width);
      bounds[0] = Math.min(bounds[0], x); bounds[1] = Math.min(bounds[1], y);
      bounds[2] = Math.max(bounds[2], x); bounds[3] = Math.max(bounds[3], y);
    }
  }
  if (asset.name === 'library-logo') {
    assert(asset.transparent && transparent > data.length / 16 && solid > 10000);
    assert(bounds[0] > 5 && bounds[1] > 5 && bounds[2] < info.width - 5 && bounds[3] < info.height - 5, 'Logo must not clip');
  } else {
    assert(!asset.transparent);
    assert.equal(solid, info.width * info.height, 'Non-logo art must be opaque');
  }
}
for (const [width, height] of [[120, 45], [184, 69]]) {
  const metadata = await sharp(join(root, `review/small-${width}x${height}.png`)).metadata();
  assert.deepEqual([metadata.width, metadata.height], [width, height]);
}
assert.equal(await readFile(join(root, 'masters/header-capsule.svg'), 'utf8'),
  await readFile(join(root, 'masters/library-header.svg'), 'utf8'));
assert.match(await readFile(join(root, 'ORBITRON-OFL.txt'), 'utf8'), /SIL OPEN FONT LICENSE/);
console.log(JSON.stringify({ status: 'private-key-art-files-verified', assets: 8,
  dimensions: true, hashes: true, outlinedTitleOnly: true, heroTextFree: true,
  transparentLogoUnclipped: true, storeAcceptance: false }));
