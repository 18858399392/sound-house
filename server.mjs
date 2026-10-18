import http from 'node:http';
import { createReadStream, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
const root = fileURLToPath(new URL('./', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.md': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json' };
const allowed = new Set(['index.html','app.js','audio.js','data.js','storage.js','styles.css','sw.js','manifest.webmanifest','素材与授权.md','LICENSE-Moodist','README.md','immersive-app.js','immersive.css','mixer.js','offline.js','scene-view.js','scene-motion.js','install.js','icons.js']);
const server = http.createServer((request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
    const url = new URL(request.url, 'http://localhost');
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    if (!allowed.has(relative) && relative !== 'media-index.js' && !relative.startsWith('assets/')) { response.writeHead(404).end('Not found'); return; }
    const target = path.resolve(root, relative);
    if (!target.startsWith(root) || !existsSync(target) || !statSync(target).isFile()) { response.writeHead(404).end('Not found'); return; }
    const size = statSync(target).size;
    const headers = { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes' };
    if (request.headers.range) {
      const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range);
      if (!range) { response.writeHead(416, { 'Content-Range': `bytes */${size}` }).end(); return; }
      const start = Number(range[1]), end = Math.min(range[2] ? Number(range[2]) : size - 1, size - 1);
      if (start > end || start >= size) { response.writeHead(416, { 'Content-Range': `bytes */${size}` }).end(); return; }
      response.writeHead(206, { ...headers, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${size}` });
      if (request.method === 'HEAD') response.end(); else createReadStream(target, { start, end }).pipe(response);
    } else {
      response.writeHead(200, { ...headers, 'Content-Length': size });
      if (request.method === 'HEAD') response.end(); else createReadStream(target).pipe(response);
    }
  } catch { response.writeHead(400).end('Bad request'); }
});
let port = Number(process.env.PORT || 4173);
server.on('error', error => { if (error.code === 'EADDRINUSE' && port < 4190) { port++; server.listen(port, '0.0.0.0'); } else { console.error(error.message); process.exit(1); } });
server.listen(port, '0.0.0.0', () => {
  console.log(`声音小屋 Local: http://localhost:${port}/`);
  for (const entries of Object.values(os.networkInterfaces())) for (const item of entries || []) if (item.family === 'IPv4' && !item.internal) console.log(`同网手机: http://${item.address}:${port}/`);
});
