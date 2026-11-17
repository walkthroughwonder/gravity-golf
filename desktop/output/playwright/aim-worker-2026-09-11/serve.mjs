import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
const root = resolve(process.argv[2]);
const manifest = JSON.parse(await readFile(join(root, 'build-manifest.json'), 'utf8'));
const allowed = new Set([...Object.keys(manifest.files), 'build-manifest.json']);
const types = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
const server = http.createServer(async (req, res) => {
  if (req.headers.host !== '127.0.0.1:8767') return res.writeHead(403).end();
  const name = new URL(req.url, 'http://127.0.0.1:8767').pathname.slice(1) || 'index.html';
  if (name === 'favicon.ico') return res.writeHead(204).end();
  if (!allowed.has(name) || !['GET', 'HEAD'].includes(req.method)) return res.writeHead(404).end();
  try {
    const body = await readFile(join(root, name));
    res.writeHead(200, { 'Content-Type': types[extname(name)] || 'application/octet-stream' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(500).end(); }
});
server.listen(8767, '127.0.0.1', () => console.log('Isolated offline build preview: http://127.0.0.1:8767'));
process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
