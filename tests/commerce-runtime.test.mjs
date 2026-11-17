import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const root = fileURLToPath(new URL('../', import.meta.url));

test('actual commerce module loads under the documented Netlify runtime options', () => {
  const example = parseEnv(readFileSync(new URL('../.env.example', import.meta.url), 'utf8'));
  assert.equal(example.NODE_OPTIONS, '--experimental-require-module');
  const result = spawnSync(process.execPath, [
    '--experimental-strip-types', '--no-experimental-detect-module', example.NODE_OPTIONS,
    '--input-type=module', '--eval', `
      import assert from 'node:assert/strict';
      globalThis.Netlify = { env: { get: () => undefined } };
      const { default: handler } = await import('./netlify/functions/commerce.mts');
      const response = await handler(new Request('http://localhost:8888/api/commerce/status'));
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('content-type'), 'application/json');
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      assert.equal((await response.json()).available, false);
      console.log('actual-commerce-module-loaded');
    `,
  ], { cwd: root, env: {}, encoding: 'utf8', timeout: 20000 });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'actual-commerce-module-loaded');
});
