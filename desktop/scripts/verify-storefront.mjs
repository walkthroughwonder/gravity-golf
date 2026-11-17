import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(process.argv[2] || fileURLToPath(new URL('..', import.meta.url)));
const output = resolve(process.argv[3] || join(root, 'output/playwright/storefront-2026-09-10-r3'));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const selection = JSON.parse(await readFile(join(output, 'selection.json'), 'utf8'));
assert.equal(selection.status, 'private-review-only');
assert.equal(selection.screenshots.length, 5);
assert.equal(new Set(selection.screenshots.map(item => item.file)).size, 5);
const archive = join(root, 'out/Gravity Golf Prototype-darwin-arm64/Gravity Golf Prototype.app/Contents/Resources/app.asar');
assert.equal(sha256(await readFile(archive)), selection.archiveSha256, 'Recapture after a game build change.');
const receipts = new Map();
let verifiedFrames = 0;
for (const folder of ['capture-main', 'capture-additional']) {
  const receipt = JSON.parse(await readFile(join(output, folder, 'capture.json'), 'utf8'));
  receipts.set(folder, receipt);
  assert.equal(receipt.archiveSha256, selection.archiveSha256);
  assert.equal(receipt.viewport.width, 1920);
  assert.equal(receipt.viewport.height, 1080);
  assert.deepEqual(receipt.errors, []);
  assert.deepEqual(receipt.externalRendererRequests, []);
  for (const frame of receipt.captures) {
    assert.match(frame.file, /^hole-\d{2}-(?:overview|aim|flight)\.png$/);
    const bytes = await readFile(join(output, folder, frame.file));
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(bytes.readUInt32BE(16), 1920);
    assert.equal(bytes.readUInt32BE(20), 1080);
    assert.equal(sha256(bytes), frame.sha256, frame.file);
    assert.equal(frame.before.introPlaying, false);
    assert.equal(frame.before.trainer.visible, false);
    verifiedFrames++;
  }
}
for (const item of selection.screenshots) {
  const receipt = receipts.get(dirname(item.file));
  assert(receipt?.captures.some(frame => `${dirname(item.file)}/${frame.file}` === item.file), item.file);
}
console.log(JSON.stringify({ status: 'private-review-verified', selected: 5, sourceFrames: verifiedFrames,
  dimensions: '1920x1080', currentArchiveMatch: true, storeAcceptance: false }));
