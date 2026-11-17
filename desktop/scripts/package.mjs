import { packager } from '@electron/packager';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [platform, arch] = process.argv.slice(2);
if (!['darwin:arm64', 'win32:x64'].includes(`${platform}:${arch}`)) throw new Error('Only macOS arm64 or Windows x64 prototype targets are configured');
const config = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
// Package only the generated allowlisted app, never the project or its .env.
const paths = await packager({ dir: join(root, 'app'), out: join(root, 'out'),
  name: 'Gravity Golf Prototype', executableName: 'gravity-golf', platform, arch,
  electronVersion: config.devDependencies.electron, asar: true, overwrite: true,
  appBundleId: 'xyz.gravitygolf.desktop.prototype', appVersion: config.version,
  win32metadata: { CompanyName: 'Gravity Golf Prototype', FileDescription: 'Private desktop prototype - not a release build' },
  prune: false, osxSign: false, osxNotarize: false, download: { cacheRoot: join(root, 'node_modules/.electron-cache') } });
console.log(JSON.stringify({ artifacts: paths, signedRelease: false, steamUploaded: false }));
