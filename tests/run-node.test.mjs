import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const launcher = fileURLToPath(new URL('../scripts/run-node.cjs', import.meta.url));
const source = readFileSync(launcher, 'utf8');
const run = (args, environment = {}) => spawnSync(process.execPath, [launcher, ...args], {
  env: { ...process.env, npm_node_execpath: process.execPath, ...environment },
  encoding: 'utf8', timeout: 10000,
});

test('launcher selects npm runtime without shell expansion or PATH lookup', () => {
  const expected = ['--test', 'tests/*.test.mjs', 'a path with spaces'];
  const state = {
    argv: ['shadowed-node', launcher, ...expected], execPath: 'shadowed-node',
    env: { npm_node_execpath: 'C:\\Program Files\\nodejs\\node.exe' },
  };
  let command;
  runInNewContext(source, {
    process: state, console,
    require: name => {
      assert.equal(name, 'node:child_process');
      return { spawnSync: (...args) => { command = args; return { status: 0 }; } };
    },
  });
  assert.equal(command[0], state.env.npm_node_execpath);
  assert.deepEqual(Array.from(command[1]), expected);
  assert.equal(command[2].stdio, 'inherit');
  assert.equal(command[2].shell, undefined);
  assert.equal(state.exitCode, 0);
});

test('launcher preserves argument boundaries and working directory', () => {
  const values = ['with spaces', 'quote"inside', '$HOME & %PATH%', 'tests/*.test.mjs'];
  const result = run(['-e', 'console.log(JSON.stringify({ args: process.argv.slice(1), cwd: process.cwd() }))', '--', ...values]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { args: values, cwd: process.cwd() });
});

test('launcher supports direct use outside npm', () => {
  const result = run(['-p', 'process.execPath'], { npm_node_execpath: '' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), process.execPath);
});

test('launcher propagates child failure', () => {
  const result = run(['-e', 'process.exit(23)']);
  assert.equal(result.status, 23);
});

test('launcher fails instead of falling back when npm runtime is missing', () => {
  const result = run(['-e', 'console.log("should not run")'], { npm_node_execpath: `${launcher}.missing` });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /ENOENT/);
  assert.equal(result.stdout, '');
});

test('launcher requires a command rather than opening a Node REPL', () => {
  const result = run([]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage:/);
});

test('root and desktop npm scripts use the portable launcher and quoted test globs', () => {
  for (const [path, prefix] of [['../package.json', 'node scripts/run-node.cjs '],
    ['../desktop/package.json', 'node ../scripts/run-node.cjs ']]) {
    const config = JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
    for (const script of Object.values(config.scripts)) {
      assert.ok(script.startsWith(prefix), script);
      assert.doesNotMatch(script, /\$npm_node_execpath|%npm_node_execpath%/);
    }
    assert.ok(config.scripts.test.endsWith('"tests/*.test.mjs"'));
  }
});
