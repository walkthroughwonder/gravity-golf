import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { serveAsset } from '../src/content.mjs';

const root = resolve(import.meta.dirname, '../app/public');
const { files } = JSON.parse(await readFile(join(root, 'build-manifest.json'), 'utf8'));
const server = createServer(async (req, res) => {
  try {
    const response = await serveAsset(new Request('gg://game' + req.url,
      { method: req.method, headers: req.headers }), root, files);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch { res.writeHead(500); res.end(); }
});
server.listen(8783, '127.0.0.1', () => console.log('Offline desktop web payload preview: http://127.0.0.1:8783'));
