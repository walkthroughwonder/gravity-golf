import assert from 'node:assert/strict';
import { extractFile, listPackage } from '@electron/asar';
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

const root = resolve(import.meta.dirname, '..');
const paths = [
  'out/Gravity Golf Prototype-darwin-arm64/Gravity Golf Prototype.app/Contents/Resources/app.asar',
  'out/Gravity Golf Prototype-win32-x64/resources/app.asar',
];
const manifestBytes = await readFile(join(root, 'app/public/build-manifest.json'));
const manifest = JSON.parse(manifestBytes);
for (const path of paths) {
  const archive = join(root, path);
  const inventory = listPackage(archive);
  assert.equal(inventory.some(name => /(?:^|\/)(?:\.env|\.git|\.netlify|node_modules|netlify)(?:\/|$)/.test(name)), false);
  for (const file of ['main.mjs', 'content.mjs', 'public/build-manifest.json']) {
    assert.deepEqual(extractFile(archive, file), await readFile(join(root, 'app', file)), file);
  }
  const expectedPackage = JSON.parse(await readFile(join(root, 'app/package.json'), 'utf8'));
  delete expectedPackage.private; // Electron Packager removes npm-only metadata by default.
  assert.deepEqual(JSON.parse(extractFile(archive, 'package.json').toString()), expectedPackage);
  for (const [name, entry] of Object.entries(manifest.files)) {
    const bytes = extractFile(archive, `public/${name}`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, name);
  }
  console.log(JSON.stringify({ archive: path, sha256: createHash('sha256').update(await readFile(archive)).digest('hex'),
    publicAssetsVerified: Object.keys(manifest.files).length, containsBackendOrCredentials: false }));
}
