import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetDir = path.join(root, 'assets');
const iconSource = await readFile(path.join(assetDir, 'icon.svg'));
const splashSource = await readFile(path.join(assetDir, 'splash.svg'));

await mkdir(path.join(assetDir, 'generated'), { recursive: true });

const icon = await sharp(iconSource)
  .resize(1024, 1024)
  .flatten({ background: '#020208' })
  .png({ compressionLevel: 9 })
  .toBuffer();
const splash = await sharp(splashSource)
  .resize(2732, 2732)
  .png({ compressionLevel: 9 })
  .toBuffer();

await writeFile(path.join(assetDir, 'generated', 'icon-1024.png'), icon);
await writeFile(path.join(assetDir, 'generated', 'splash-2732.png'), splash);
await writeFile(path.join(assetDir, 'icon-only.png'), icon);
await writeFile(path.join(assetDir, 'splash.png'), splash);

console.log(`Generated branded assets in ${path.join(assetDir, 'generated')}`);
