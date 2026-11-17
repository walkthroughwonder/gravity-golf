import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = resolve(process.argv[2] || fileURLToPath(new URL('../../..', import.meta.url)));
const output = resolve(process.argv[3] || fileURLToPath(new URL('..', import.meta.url)));
const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const fontkit = require(process.env.FONTKIT_MODULE || 'fontkit');
const wawoff2 = require(process.env.WAWOFF2_MODULE || 'wawoff2');
const THREE = await import(pathToFileURL(join(repo, 'desktop/node_modules/three/build/three.module.js')));
const fontPath = join(repo, 'desktop/node_modules/@fontsource-variable/orbitron/files/orbitron-latin-wght-normal.woff2');
// Decompress first: Fontkit 2.0.4's variable WOFF2 path decoder is unreliable.
const font = fontkit.create(Buffer.from(await wawoff2.decompress(await readFile(fontPath)))).getVariation({ wght: 900 });
const sha256 = data => createHash('sha256').update(data).digest('hex');
const number = n => Number(n.toFixed(3));
await mkdir(join(output, 'masters'), { recursive: true });
await mkdir(join(output, 'png'), { recursive: true });
await mkdir(join(output, 'review'), { recursive: true });

const defs = `<defs>
  <radialGradient id="space" cx="72%" cy="60%" r="78%">
    <stop stop-color="#242529"/><stop offset=".48" stop-color="#0d151d"/><stop offset="1" stop-color="#05090e"/>
  </radialGradient>
  <linearGradient id="gold" x1="0" y1="0" x2=".2" y2="1">
    <stop stop-color="#fff3ae"/><stop offset=".38" stop-color="#ffe16c"/><stop offset="1" stop-color="#ecaa26"/>
  </linearGradient>
  <radialGradient id="ball" cx="30%" cy="23%" r="85%">
    <stop stop-color="#ffffff"/><stop offset=".55" stop-color="#fff9dc"/><stop offset="1" stop-color="#a4acae"/>
  </radialGradient>
  <radialGradient id="halo"><stop stop-color="#edc166" stop-opacity=".23"/><stop offset="1" stop-color="#d6a24c" stop-opacity="0"/></radialGradient>
  <linearGradient id="flight"><stop stop-color="#ae7027" stop-opacity=".08"/><stop offset=".55" stop-color="#efbc51"/><stop offset="1" stop-color="#fff7d0"/></linearGradient>
</defs>`;

function word(value, x, y, width) {
  const run = font.layout(value);
  let advance = 0;
  const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  const paths = run.glyphs.map((glyph, i) => {
    const position = run.positions[i];
    const dx = advance + position.xOffset;
    const dy = position.yOffset;
    const box = glyph.bbox;
    bounds.minX = Math.min(bounds.minX, dx + box.minX);
    bounds.maxX = Math.max(bounds.maxX, dx + box.maxX);
    bounds.minY = Math.min(bounds.minY, dy + box.minY);
    bounds.maxY = Math.max(bounds.maxY, dy + box.maxY);
    advance += position.xAdvance + 52;
    return `<path transform="translate(${number(dx)} ${number(dy)})" d="${glyph.path.toSVG()}"/>`;
  }).join('');
  const scale = width / (bounds.maxX - bounds.minX);
  return { height: (bounds.maxY - bounds.minY) * scale,
    svg: `<g aria-label="${value}" transform="translate(${number(x - bounds.minX * scale)} ${number(y + bounds.maxY * scale)}) scale(${number(scale)} ${number(-scale)})">${paths}</g>` };
}

function title(x, y, width) {
  const first = word('GRAVITY', x, y, width);
  const second = word('GOLF', x, y + first.height + width * .036, width * .91);
  return `<g fill="url(#gold)">${first.svg}${second.svg}</g>`;
}

function stars(w, h) {
  let state = 271828;
  const random = () => ((state = Math.imul(state, 1664525) + 1013904223 >>> 0) / 4294967296);
  return Array.from({ length: 110 }, () => {
    const x = random() * w, y = random() * h, r = .4 + random() * 1.3;
    return `<circle cx="${number(x)}" cy="${number(y)}" r="${number(r)}" fill="#efdfb9" opacity="${number(.12 + random() * .55)}"/>`;
  }).join('');
}

function planet(x, y, radius, rgb, rotation = .4) {
  const geometry = new THREE.IcosahedronGeometry(1, 2);
  geometry.rotateY(rotation);
  geometry.rotateZ(.15);
  const positions = geometry.attributes.position;
  const light = new THREE.Vector3(-.6, .8, 1).normalize();
  const faces = [];
  for (let i = 0; i < positions.count; i += 3) {
    const points = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(positions, i + j));
    const normal = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize();
    if (normal.z <= 0) continue;
    const brightness = .25 + .75 * Math.max(0, normal.dot(light));
    const fill = `rgb(${rgb.map(channel => Math.round(channel * brightness)).join(',')})`;
    faces.push(`<polygon points="${points.map(p => `${number(x + p.x * radius)},${number(y - p.y * radius)}`).join(' ')}" fill="${fill}" stroke="${fill}" stroke-width=".6"/>`);
  }
  geometry.dispose();
  return `<g>${faces.join('')}</g>`;
}

function scene({ x, y, r, tx, ty, tr, bx, by, br = 15 }) {
  const flight = `M ${bx} ${by} C ${bx + r * .4} ${by + r * .5}, ${x + r * 1.9} ${y + r * .9}, ${x + r * 1.36} ${y - r * .45} S ${tx - r * 1.9} ${ty - r * .8}, ${tx} ${ty - tr}`;
  return `<circle cx="${x}" cy="${y}" r="${r * 2.2}" fill="url(#halo)"/>
    <g fill="none" stroke="#c8b47d" opacity=".23">
      <ellipse cx="${x}" cy="${y}" rx="${r * 1.45}" ry="${r * 1.45}"/>
      <ellipse cx="${x}" cy="${y}" rx="${r * 1.9}" ry="${r * 1.9}" stroke-dasharray="2 13"/>
      <ellipse cx="${x}" cy="${y}" rx="${r * 2}" ry="${r * .57}" transform="rotate(-30 ${x} ${y})"/>
    </g>
    <path d="${flight}" fill="none" stroke="#e7aa46" stroke-width="16" opacity=".045"/>
    <path d="${flight}" fill="none" stroke="url(#flight)" stroke-width="3.2" stroke-linecap="round"/>
    ${planet(tx, ty, tr, [118, 179, 155], .9)}
    <ellipse cx="${tx}" cy="${ty - tr * .83}" rx="${tr * .21}" ry="${tr * .09}" fill="#071310" stroke="#99b89d" stroke-width="1.5"/>
    <path d="M ${tx} ${ty - tr * .83} V ${ty - tr * 2.05}" stroke="#e9dca9" stroke-width="2.5"/>
    <path d="M ${tx} ${ty - tr * 2.05} l ${tr * .65} ${tr * .2} l ${-tr * .65} ${tr * .27} Z" fill="#ffd863"/>
    ${planet(x, y, r, [211, 192, 150])}
    <circle cx="${bx}" cy="${by}" r="${br * 3}" fill="url(#halo)"/>
    <circle cx="${bx}" cy="${by}" r="${br}" fill="url(#ball)"/>
    <g fill="#8a8772" opacity=".4">${[[-.4,-.25],[.08,-.42],[.5,-.12],[-.19,.21],[.27,.32]].map(([dx,dy]) => `<circle cx="${bx + br * dx}" cy="${by + br * dy}" r="${br * .08}"/>`).join('')}</g>`;
}

function document(w, h, content, transparent = false) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Gravity Golf key art">
<title>Gravity Golf</title><desc>Private illustrated key art, not a gameplay screenshot.</desc>
${defs}${transparent ? '' : `<rect width="${w}" height="${h}" fill="url(#space)"/>${stars(w, h)}`}${content}</svg>\n`;
}

const assets = [
  { name: 'header-capsule', w: 920, h: 430, svg: document(920, 430,
    scene({ x: 713, y: 315, r: 98, tx: 799, ty: 130, tr: 31, bx: 570, by: 330, br: 11 }) + title(42, 99, 495)) },
  { name: 'small-capsule', w: 462, h: 174, svg: document(462, 174,
    `<circle cx="365" cy="112" r="114" fill="url(#halo)"/><ellipse cx="365" cy="112" rx="99" ry="45" transform="rotate(-34 365 112)" fill="none" stroke="#b89848" opacity=".5" stroke-width="2"/>${planet(376, 113, 50, [198, 180, 139])}<circle cx="308" cy="132" r="6" fill="url(#ball)"/>` + title(18, 26, 303)) },
  { name: 'main-capsule', w: 1232, h: 706, svg: document(1232, 706,
    scene({ x: 932, y: 514, r: 164, tx: 1043, ty: 209, tr: 54, bx: 700, by: 555, br: 18 }) + title(62, 123, 650)) },
  { name: 'vertical-capsule', w: 748, h: 896, svg: document(748, 896,
    scene({ x: 430, y: 693, r: 157, tx: 548, ty: 411, tr: 43, bx: 191, by: 722, br: 17 }) + title(59, 85, 630)) },
  { name: 'library-capsule', w: 600, h: 900, svg: document(600, 900,
    scene({ x: 343, y: 703, r: 143, tx: 443, ty: 421, tr: 40, bx: 134, by: 710, br: 15 }) + title(43, 99, 514)) },
  { name: 'library-hero', w: 3840, h: 1240, svg: document(3840, 1240,
    `<g fill="none" stroke="#bea878" opacity=".12"><ellipse cx="1960" cy="655" rx="1420" ry="455" transform="rotate(-12 1960 655)"/><ellipse cx="1960" cy="655" rx="1750" ry="610" transform="rotate(-12 1960 655)" stroke-dasharray="4 24"/></g><g transform="translate(1540 340) scale(.78)">${scene({ x: 475, y: 430, r: 170, tx: 683, ty: 240, tr: 57, bx: 210, by: 484, br: 22 })}</g>`) },
  { name: 'library-logo', w: 1280, h: 510, transparent: true, svg: document(1280, 510, title(20, 20, 1240), true) },
];
assets.splice(5, 0, { ...assets[0], name: 'library-header' });

const receipt = { status: 'private-owner-review', created: '2026-09-11',
  kind: 'illustrated-key-art-not-gameplay-screenshots',
  source: 'AI-assisted procedural SVG composition and outlined Orbitron 900 logotype. No downloaded stock art or raster image generation. Review platform AI disclosures before submission.',
  font: { package: '@fontsource-variable/orbitron', version: '5.3.0', license: 'OFL-1.1', sha256: sha256(await readFile(fontPath)) },
  generatorSha256: sha256(await readFile(fileURLToPath(import.meta.url))),
  rulesChecked: '2026-09-11',
  sources: ['https://partner.steamgames.com/doc/store/assets/standard', 'https://partner.steamgames.com/doc/store/assets/libraryassets'],
  release: { uploaded: false, ownerApproved: false, storeAccepted: false, trademarkCleared: false },
  assets: [] };
for (const asset of assets) {
  assert(!/<(?:text|image|script|foreignObject)\b/.test(asset.svg));
  await writeFile(join(output, `masters/${asset.name}.svg`), asset.svg);
  const png = await sharp(Buffer.from(asset.svg)).png().toBuffer();
  const meta = await sharp(png).metadata();
  assert.equal(meta.width, asset.w);
  assert.equal(meta.height, asset.h);
  const pixels = await sharp(png).ensureAlpha().raw().toBuffer();
  let transparentPixels = 0;
  for (let i = 3; i < pixels.length; i += 4) if (pixels[i] === 0) transparentPixels++;
  assert.equal(transparentPixels > 0, !!asset.transparent);
  await writeFile(join(output, `png/${asset.name}.png`), png);
  receipt.assets.push({ name: asset.name, width: asset.w, height: asset.h,
    transparent: !!asset.transparent, svgSha256: sha256(asset.svg), pngSha256: sha256(png) });
}
await copyFile(join(repo, 'desktop/node_modules/@fontsource-variable/orbitron/LICENSE'), join(output, 'ORBITRON-OFL.txt'));
await writeFile(join(output, 'manifest.json'), JSON.stringify(receipt, null, 2) + '\n');

// Review reductions are not upload assets; the masters retain native dimensions.
for (const [w, h] of [[120, 45], [184, 69]]) {
  await sharp(join(output, 'png/small-capsule.png')).resize(w, h).png().toFile(join(output, `review/small-${w}x${h}.png`));
}
const panels = [
  ['main-capsule', 32, 66, 616, 353], ['header-capsule', 32, 472, 616, 288],
  ['vertical-capsule', 682, 66, 374, 448], ['library-capsule', 1090, 66, 300, 450],
  ['small-capsule', 682, 575, 462, 174], ['library-logo', 32, 812, 616, 245],
  ['library-hero', 32, 1114, 1358, 439],
];
const labels = panels.map(([name,x,y]) => `<text x="${x}" y="${y - 13}" fill="#d6c395" font-family="sans-serif" font-size="16">${name}</text>`).join('');
const base = `<svg xmlns="http://www.w3.org/2000/svg" width="1422" height="1590"><rect width="100%" height="100%" fill="#16191e"/><text x="32" y="27" fill="#f6e3ab" font-family="sans-serif" font-size="18">PRIVATE KEY ART / REVIEW ONLY / NOT GAMEPLAY SCREENSHOTS</text>${labels}</svg>`;
const overlays = [];
for (const [name,left,top,w,h] of panels) {
  overlays.push({ input: await sharp(join(output, `png/${name}.png`)).resize(w,h).png().toBuffer(), left, top });
}
await sharp(Buffer.from(base)).composite(overlays).png().toFile(join(output, 'review/contact-sheet.png'));
console.log(JSON.stringify({ assets: receipt.assets.length, output, status: receipt.status }));
