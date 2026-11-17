import { copyFile, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { buildAnalyticsConfig } from './analytics-config.mjs';
import { buildAimWorker } from './build-aim-worker.mjs';

const root = new URL('../', import.meta.url);
const destination = new URL('dist/', root);
const analyticsConfig = buildAnalyticsConfig(process.env);
const source = await readFile(new URL('index.html', root), 'utf8');
const imports = JSON.parse(source.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
const aimWorker = buildAimWorker(source, imports.three);
// Only this generated directory is replaced. Never publish the repository root:
// it now contains server implementation, tests and potentially local credentials.
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await mkdir(new URL('licenses/', destination), { recursive: true });
for (const file of ['index.html', 'commerce-client.mjs', 'funnel-analytics.mjs', 'login.html', 'profile.html', 'soundtrack.mp3', '_headers', 'manifest.json', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'third-party-notices.html', 'licenses/three-0.172.0-LICENSE.txt', 'licenses/firebase-10.12.0-LICENSE.txt', 'licenses/orbitron-OFL.txt', 'licenses/exo-2-OFL.txt']) {
  await copyFile(new URL(file, root), new URL(file, destination));
}
await writeFile(new URL('analytics-config.json', destination), JSON.stringify(analyticsConfig));
await writeFile(new URL('aim-worker.mjs', destination), aimWorker);
console.log('Public web assets prepared in dist/. No deployment performed.');
