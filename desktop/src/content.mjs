import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const types = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript',
  '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css',
  '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.txt': 'text/plain; charset=utf-8' };

export function assetPath(url, files) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'gg:' || parsed.hostname !== 'game' || parsed.port ||
        parsed.username || parsed.password || parsed.search) return null;
    const name = decodeURIComponent(parsed.pathname).slice(1) || 'index.html';
    if (name.includes('\\') || name.split('/').some(part => !part || part === '.' || part === '..')) return null;
    return Object.hasOwn(files, name) ? name : null;
  } catch { return null; }
}

export async function serveAsset(request, root, files) {
  const name = assetPath(request.url, files);
  if (!name) return new Response('Not found', { status: 404 });
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405 });
  const bytes = await readFile(join(root, name));
  const headers = { 'Content-Type': types[extname(name)] || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes' };
  const range = request.headers.get('range');
  let start = 0, end = bytes.length - 1, status = 200;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416,
      headers: { 'Content-Range': `bytes */${bytes.length}` } });
    start = match[1] ? Number(match[1]) : Math.max(0, bytes.length - Number(match[2]));
    end = match[1] && match[2] ? Math.min(Number(match[2]), end) : end;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= bytes.length) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${bytes.length}` } });
    }
    status = 206;
    headers['Content-Range'] = `bytes ${start}-${end}/${bytes.length}`;
  }
  headers['Content-Length'] = String(end - start + 1);
  return new Response(request.method === 'HEAD' ? null : bytes.subarray(start, end + 1), { status, headers });
}
