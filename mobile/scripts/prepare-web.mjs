import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const mobileDir = path.resolve(scriptDir, '..');
const projectDir = path.resolve(mobileDir, '..');
const outputDir = path.join(mobileDir, 'www');

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) {
    throw new Error(`Missing expected source fragment: ${label}`);
  }
  return source.replace(search, replacement);
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(path.join(outputDir, 'fonts'), { recursive: true });
await mkdir(path.join(outputDir, 'vendor', 'three'), { recursive: true });

let html = await readFile(path.join(projectDir, 'index.html'), 'utf8');

html = html
  .replace('<link rel="manifest" href="/manifest.json">\n', '')
  .replace('<link rel="apple-touch-icon" href="/icon-192.png">\n', '')
  .replace(/<!-- Firebase SDK \(compat mode for simplicity\) -->\n(?:<script src="https:\/\/www\.gstatic\.com\/firebasejs\/[^\n]+<\/script>\n){3}/, '')
  .replace(
    "  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;800;900&family=Exo+2:wght@300;400;500;600&display=swap');",
    `  @font-face { font-family: 'Orbitron'; font-style: normal; font-display: swap; font-weight: 400 900; src: url('./fonts/orbitron-latin-wght-normal.woff2') format('woff2-variations'); }\n  @font-face { font-family: 'Exo 2'; font-style: normal; font-display: swap; font-weight: 300 900; src: url('./fonts/exo-2-latin-wght-normal.woff2') format('woff2-variations'); }`
  )
  .replace('"three": "https://cdn.jsdelivr.net/npm/three@0.172.0/build/three.module.js"', '"three": "./vendor/three/build/three.module.js"')
  .replace('"three/addons/": "https://cdn.jsdelivr.net/npm/three@0.172.0/examples/jsm/"', '"three/addons/": "./vendor/three/examples/jsm/"');

html = replaceRequired(
  html,
  '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
  `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover">\n<meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob: capacitor:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'self';">`,
  'viewport metadata'
);
html = replaceRequired(html, 'let proUnlocked = false;', 'let proUnlocked = true;', 'pro unlock state');
html = replaceRequired(html, 'checkSavedUnlock();', 'unlockPro();', 'saved unlock initialization');
html = replaceRequired(
  html,
  "const STRIPE_PAYMENT_URL = 'https://buy.stripe.com/4gMeVe5PnaYT47i0Jo3Nm00';",
  "const STRIPE_PAYMENT_URL = ''; // Native edition includes the complete course.",
  'Stripe payment URL'
);
html = replaceRequired(
  html,
  '// Initialize auth on load\nsetTimeout(initAuth, 100);',
  '// Native guest edition deliberately leaves account services disabled.',
  'auth initialization'
);
html = replaceRequired(
  html,
  `function haptic(ms) {\n  if (navigator.vibrate) navigator.vibrate(ms || 10);\n}\nfunction hapticPattern(pattern) {\n  if (navigator.vibrate) navigator.vibrate(pattern);\n}`,
  `function haptic(ms) {\n  if (window.GravityGolfNative?.haptic(ms)) return;\n  if (navigator.vibrate) navigator.vibrate(ms || 10);\n}\nfunction hapticPattern(pattern) {\n  if (window.GravityGolfNative?.hapticPattern(pattern)) return;\n  if (navigator.vibrate) navigator.vibrate(pattern);\n}`,
  'haptic helpers'
);
html = replaceRequired(
  html,
  '</head>',
  '  <link rel="stylesheet" href="./mobile.css">\n</head>',
  'head close'
);
html = replaceRequired(
  html,
  '<script type="module">',
  '<script src="./mobile-native.js"></script>\n\n<script type="module">',
  'game module script'
);

await writeFile(path.join(outputDir, 'index.html'), html);
await cp(path.join(scriptDir, 'mobile.css'), path.join(outputDir, 'mobile.css'));
await cp(path.join(scriptDir, 'mobile-native.js'), path.join(outputDir, 'mobile-native.js'));
await cp(path.join(mobileDir, 'store', 'privacy-policy.html'), path.join(outputDir, 'privacy-policy.html'));
await cp(path.join(projectDir, 'soundtrack.mp3'), path.join(outputDir, 'soundtrack.mp3'));
await cp(path.join(mobileDir, 'node_modules', 'three', 'build'), path.join(outputDir, 'vendor', 'three', 'build'), { recursive: true });
await cp(path.join(mobileDir, 'node_modules', 'three', 'examples', 'jsm'), path.join(outputDir, 'vendor', 'three', 'examples', 'jsm'), { recursive: true });
await cp(
  path.join(mobileDir, 'node_modules', '@fontsource-variable', 'orbitron', 'files', 'orbitron-latin-wght-normal.woff2'),
  path.join(outputDir, 'fonts', 'orbitron-latin-wght-normal.woff2')
);
await cp(
  path.join(mobileDir, 'node_modules', '@fontsource-variable', 'exo-2', 'files', 'exo-2-latin-wght-normal.woff2'),
  path.join(outputDir, 'fonts', 'exo-2-latin-wght-normal.woff2')
);

const soundtrack = await stat(path.join(outputDir, 'soundtrack.mp3'));
await writeFile(path.join(outputDir, 'mobile-build.json'), JSON.stringify({
  appId: 'com.epoch6.gravitygolf',
  edition: 'guest-full-course',
  offlineAssets: true,
  sourceCommit: process.env.SOURCE_COMMIT || '74f29f6',
  soundtrackBytes: soundtrack.size
}, null, 2));

console.log(`Prepared ${outputDir}`);
