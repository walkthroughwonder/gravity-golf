const { spawnSync } = require('node:child_process');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/run-node.cjs <Node arguments or script>');
  process.exit(1);
}

// Read npm's runtime in JS: shell variable syntax differs on Windows, and npm's
// PATH may put an unrelated ancestor project's Node binary ahead of this one.
const result = spawnSync(process.env.npm_node_execpath || process.execPath, args, { stdio: 'inherit' });
if (result.error) console.error(result.error.message);
if (result.signal) console.error(`Node command terminated by ${result.signal}.`);
process.exitCode = result.status ?? 1;
