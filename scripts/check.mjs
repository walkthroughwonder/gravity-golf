import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 17)) {
  console.error('Gravity Golf checks require Node 22.17 or newer. No system changes were made.');
  process.exit(1);
}
const tests = readdirSync(new URL('tests/', root)).filter(name => name.endsWith('.test.mjs')).sort();
// npm prepends ancestor node_modules/.bin directories to PATH. Reuse this process's
// runtime so an unrelated parent project's node binary cannot hijack nested checks.
for (const args of [
  ['node_modules/typescript/bin/tsc', '--noEmit'],
  ['--experimental-strip-types', '--test', ...tests.map(name => `tests/${name}`)],
  ['scripts/build-web.mjs'],
]) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status || 1);
}
