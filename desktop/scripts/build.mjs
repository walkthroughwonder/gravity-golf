import { readFile, writeFile, mkdir, rm, copyFile } from 'node:fs/promises';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { transform } from './transform.mjs';
import { buildAimWorker } from '../../scripts/build-aim-worker.mjs';

const desktop = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = resolve(process.argv[2] || join(desktop, '..'));
const output = join(desktop, 'app');
const web = join(output, 'public');
const source = await readFile(join(sourceRoot, 'index.html'), 'utf8');
const { html, game } = transform(source); // Fail before replacing a previous successful build.
const aimWorker = buildAimWorker(source, './vendor/three/build/three.module.js');
const config = JSON.parse(await readFile(join(desktop, 'package.json'), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const files = {};
const inputs = { 'index.html': sha(source) };
inputs['scripts/build-aim-worker.mjs'] = sha(await readFile(new URL('../../scripts/build-aim-worker.mjs', import.meta.url)));
for (const path of ['package.json', 'package-lock.json', 'scripts/build.mjs', 'scripts/transform.mjs', 'scripts/package.mjs']) {
  inputs[`desktop/${path}`] = sha(await readFile(join(desktop, path)));
}
await rm(output, { recursive: true, force: true });
await mkdir(web, { recursive: true });
async function put(name, bytes) {
  await mkdir(dirname(join(web, name)), { recursive: true });
  await writeFile(join(web, name), bytes);
  files[name] = { bytes: Buffer.byteLength(bytes), sha256: sha(bytes) };
}
async function copy(from, name) {
  const bytes = await readFile(from);
  await put(name, bytes);
  const label = from.startsWith(desktop + '/') ? 'desktop/' + relative(desktop, from) : relative(sourceRoot, from);
  inputs[label.replaceAll('\\', '/')] = sha(bytes);
}
await put('index.html', html);
await put('game.mjs', game);
await put('aim-worker.mjs', aimWorker);
await copy(join(sourceRoot, 'soundtrack.mp3'), 'soundtrack.mp3');
for (const file of ['desktop.mjs', 'desktop.css', 'notices.html']) await copy(join(desktop, 'src', file), file);
for (const file of ['three-0.172.0-LICENSE.txt', 'orbitron-OFL.txt', 'exo-2-OFL.txt']) {
  await copy(join(sourceRoot, 'licenses', file), `licenses/${file}`);
}
for (const [file, dest] of [['LICENSE', 'electron-LICENSE.txt'], ['LICENSES.chromium.html', 'chromium.html']]) {
  await copy(join(desktop, 'node_modules/electron/dist', file), `licenses/${dest}`);
}
let fonts = '';
for (const [family, pkg] of [['Orbitron', 'orbitron'], ['Exo 2', 'exo-2']]) {
  const file = `${pkg}-latin-wght-normal.woff2`;
  await copy(join(desktop, 'node_modules/@fontsource-variable', pkg, 'files', file), `fonts/${file}`);
  fonts += `@font-face { font-family: '${family}'; font-style: normal; font-weight: 100 900; font-display: swap; src: url('./fonts/${file}') format('woff2'); }\n`;
}
await put('desktop.css', fonts + await readFile(join(desktop, 'src/desktop.css'), 'utf8'));

// Only bundle Three.js modules actually imported by the game, not the full SDK or backend.
const three = join(desktop, 'node_modules/three');
const seen = new Set();
async function vendor(name) {
  const clean = relative(three, resolve(three, name)).replaceAll('\\', '/');
  if (clean.startsWith('../') || !clean.endsWith('.js')) throw new Error(`Unexpected vendor path: ${name}`);
  if (seen.has(clean)) return;
  seen.add(clean);
  const code = await readFile(join(three, clean), 'utf8');
  await put(`vendor/three/${clean}`, code);
  for (const match of code.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
    const dependency = match[1];
    if (dependency.startsWith('.')) await vendor(join(dirname(clean), dependency));
    else if (dependency === 'three') await vendor('build/three.module.js');
    else if (dependency === 'three/webgpu') await vendor('build/three.webgpu.js');
    else throw new Error(`Unexpected dependency: ${dependency}`);
  }
}
await vendor('build/three.module.js');
for (const match of game.matchAll(/from\s*['"]three\/addons\/([^'"]+)['"]/g)) await vendor(`examples/jsm/${match[1]}`);
for (const file of ['main.mjs', 'content.mjs']) {
  await copyFile(join(desktop, 'src', file), join(output, file));
  inputs[`desktop/src/${file}`] = sha(await readFile(join(desktop, 'src', file)));
}
const commit = execFileSync('git', ['-C', sourceRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const dirty = !!execFileSync('git', ['-C', sourceRoot, 'status', '--porcelain'], { encoding: 'utf8' }).trim();
await writeFile(join(output, 'package.json'), JSON.stringify({ name: config.name, version: config.version,
  private: true, type: 'module', main: 'main.mjs', description: 'Gravity Golf offline desktop prototype' }, null, 2) + '\n');
await writeFile(join(web, 'build-manifest.json'), JSON.stringify({ edition: 'desktop-prototype',
  sourceCommit: commit, sourceContainsUncommittedChanges: dirty, sourceIndexSha256: sha(source),
  dependencies: config.devDependencies, inputs, files }, null, 2) + '\n');
console.log(JSON.stringify({ output, files: Object.keys(files).length, sourceCommit: commit,
  sourceIndexSha256: sha(source), gameBytes: Buffer.byteLength(game), networkServices: false }));
