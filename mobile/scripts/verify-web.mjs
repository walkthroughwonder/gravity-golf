import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(scriptDir, '..', 'www');
const html = await readFile(path.join(outputDir, 'index.html'), 'utf8');

const required = [
  'window.GravityGolfNative?.haptic',
  './vendor/three/build/three.module.js',
  './fonts/orbitron-latin-wght-normal.woff2',
  'let proUnlocked = true;',
  'Native guest edition deliberately leaves account services disabled.',
  'connect-src \'none\''
];
for (const marker of required) {
  if (!html.includes(marker)) throw new Error(`Missing mobile marker: ${marker}`);
}

const forbidden = [
  'https://www.gstatic.com/firebasejs/',
  'https://fonts.googleapis.com/',
  'https://cdn.jsdelivr.net/npm/three',
  'https://buy.stripe.com/',
  'setTimeout(initAuth, 100)',
  'href="/manifest.json"',
  'href="/icon-192.png"'
];
for (const marker of forbidden) {
  if (html.includes(marker)) throw new Error(`Forbidden mobile dependency: ${marker}`);
}

const requiredFiles = [
  'mobile-native.js',
  'mobile.css',
  'privacy-policy.html',
  'soundtrack.mp3',
  'fonts/orbitron-latin-wght-normal.woff2',
  'fonts/exo-2-latin-wght-normal.woff2',
  'vendor/three/build/three.module.js',
  'vendor/three/examples/jsm/controls/OrbitControls.js'
];
for (const file of requiredFiles) {
  const info = await stat(path.join(outputDir, file));
  if (!info.isFile() || info.size === 0) throw new Error(`Missing generated asset: ${file}`);
}

const soundtrack = await stat(path.join(outputDir, 'soundtrack.mp3'));
if (soundtrack.size < 30_000_000) throw new Error('Soundtrack asset appears truncated');

console.log(JSON.stringify({
  webDir: outputDir,
  offline: true,
  fullCourse: true,
  accountServices: false,
  soundtrackBytes: soundtrack.size
}, null, 2));
