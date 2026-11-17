import { createHash } from 'node:crypto';

function once(text, pattern, replacement) {
  const matches = typeof pattern === 'string' ? text.split(pattern).length - 1 : [...text.matchAll(new RegExp(pattern.source, 'g'))].length;
  if (matches !== 1) throw new Error(`Desktop adapter expected one match, got ${matches}: ${String(pattern).slice(0, 100)}`);
  return text.replace(pattern, replacement);
}

export function transform(source) {
  let html = source;
  const sdk = /<script src="https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.0\/firebase-(?:app|database|auth)-compat\.js"><\/script>\n/g;
  if ([...html.matchAll(sdk)].length !== 3) throw new Error('Unexpected Firebase SDK inventory');
  html = html.replace(sdk, '');
  html = html.replace(/^<meta (?:property="og:|name="twitter:|name="apple-mobile-).*\n/gm, '');
  html = html.replace(/^<link rel="(?:canonical|manifest|apple-touch-icon)".*\n/gm, '');
  html = once(html, /  @import url\('https:\/\/fonts\.googleapis\.com\/css2\?[^\n]+\);/, '');
  html = once(html, / onclick="document\.getElementById\('keyDisplay'\)[^"]+"/, '');
  html = once(html, /<script>\n\/\/ PWA install prompt[\s\S]*?<\/script>/, '');
  html = once(html, '<title>Gravity Golf</title>', '<title>Gravity Golf - Desktop Prototype</title>');
  html = once(html, /<meta name="description"[^>]+>/,
    '<meta name="description" content="Gravity Golf desktop prototype. All 19 authored holes included.">');
  html = html.replaceAll('./third-party-notices.html', './notices.html');
  html = once(html, '</head>', '<link rel="stylesheet" href="./desktop.css">\n</head>');
  html = once(html, '<button id="playBtn">TEE OFF</button>', '<button id="playBtn">TEE OFF</button>\n' +
    '<p class="desktop-edition">DESKTOP PROTOTYPE / ALL 19 HOLES INCLUDED</p>');
  html = once(html, '</body>', '<dialog id="desktopCourse" aria-labelledby="desktopCourseTitle">' +
    '<h2 id="desktopCourseTitle">CHOOSE YOUR ORBIT</h2>' +
    '<p>All 19 holes included. Daily Challenge is local, with no online leaderboard.</p>' +
    '<div class="course-slots"></div><button class="course-close">BACK</button></dialog>\n' +
    '<script type="module" src="./desktop.mjs"></script>\n</body>');

  const module = html.match(/<script type="module">([\s\S]*?)<\/script>/);
  if (!module) throw new Error('Game module missing');
  let game = module[1];
  game = once(game, /const LIVE_SERVICES_ENABLED = [\s\S]*?includes\(window.location.hostname\);/,
    'const LIVE_SERVICES_ENABLED = false;');
  game = once(game, /try \{ legacyProAccess = localStorage.getItem\('gg_pro'\)[^\n]+\nlet proUnlocked = legacyProAccess;\nif \(legacyProAccess\) LEVELS.push\(\.\.\.PRO_LEVELS\);/,
    'let proUnlocked = true;\nLEVELS.push(...PRO_LEVELS);');
  game = once(game, /async function initCommerce\(\) \{[\s\S]*?\n\/\/ ===================== UNLOCK UI HANDLERS/,
    '// Desktop has no purchase client or account restoration.\n// ===================== UNLOCK UI HANDLERS');
  game = once(game, /async function initFunnelAnalytics\(\) \{[\s\S]*?\nfunction showUsageSettings/,
    'function showUsageSettings');
  game = once(game, /document.getElementById\('pickerProBtn'\).addEventListener\('click',[\s\S]*?\n\/\/ Add Pro badge/,
    '// Add Pro badge');
  game = once(game, /function updateTitleProBadge\(\) \{[\s\S]*?\n\}\nupdateTitleProBadge\(\);/,
    'function updateTitleProBadge() {}');
  game = once(game, /const FIREBASE_CONFIG = \{[\s\S]*?\n\};/, 'const FIREBASE_CONFIG = Object.freeze({});');
  game = once(game, 'setTimeout(initAuth, 100);', '// Desktop does not initialize account services.');
  game = once(game, 'void initCommerce();', '');
  game = once(game, 'void initFunnelAnalytics();', '');
  game = once(game, "phase: 'checking', message: 'Checking purchase availability...'",
    "phase: 'disabled', message: 'Desktop full course; no in-game purchases.'");
  game = once(game, "accessSource: commerceState.proVerified ? 'verified-account' : legacyProAccess ? 'legacy-device' : 'free',",
    "accessSource: 'desktop-full-course',");
  game = once(game, 'window.render_game_to_text = () => JSON.stringify({',
    "window.render_game_to_text = () => JSON.stringify({\n  desktop: { edition: 'prototype', dailyMode, courseHoles: (window._originalLevels || LEVELS).length },");
  html = once(html, module[0], '<script type="module" src="./game.mjs"></script>');

  html = once(html, 'https://cdn.jsdelivr.net/npm/three@0.172.0/build/three.module.js', './vendor/three/build/three.module.js');
  html = once(html, 'https://cdn.jsdelivr.net/npm/three@0.172.0/examples/jsm/', './vendor/three/examples/jsm/');
  const importMap = html.match(/<script type="importmap">([\s\S]*?)<\/script>/)?.[1];
  if (!importMap) throw new Error('Import map missing');
  const hash = createHash('sha256').update(importMap).digest('base64');
  const csp = `default-src 'none'; script-src 'self' 'sha256-${hash}'; worker-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; media-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'`;
  html = once(html, '<meta charset="UTF-8">', `<meta charset="UTF-8">\n<meta http-equiv="Content-Security-Policy" content="${csp}">`);
  if (/\bon\w+="/i.test(html) || /<script[^>]+src="https?:/i.test(html)) throw new Error('Unsafe inline handler or remote script remains');
  if (/import\(['"]\.\/(commerce-client|funnel-analytics)/.test(game)) throw new Error('Web service module import remains');
  return { html, game };
}
