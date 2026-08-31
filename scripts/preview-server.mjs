/**
 * Static file server for `dist/` + a WEAO API proxy, used to preview the app in
 * a browser (and to capture screenshots).
 *
 * The proxy exists because the web target cannot talk to WEAO directly:
 * browsers refuse to set `User-Agent`, which WEAO requires, and WEAO sends no
 * CORS headers. Node has neither restriction.
 *
 *   node scripts/preview-server.mjs [port]
 *
 * Then build with the client pointed at it:
 *   EXPO_PUBLIC_WEAO_HOSTS=http://localhost:8088 pnpm exec expo export --platform web
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const PORT = Number(process.argv[2] ?? 8088);
const ROOT = new URL('../dist/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const UPSTREAM = 'https://weao.xyz';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  // --- API proxy ------------------------------------------------------------
  if (url.pathname.startsWith('/api/')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') {
      res.writeHead(204).end();
      return;
    }
    try {
      const upstream = await fetch(`${UPSTREAM}${url.pathname}${url.search}`, {
        headers: { 'User-Agent': 'WEAO-3PService', Accept: 'application/json' },
      });
      const body = await upstream.text();
      res.writeHead(upstream.status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(body);
    } catch (err) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(err) }));
    }
    return;
  }

  // --- Static files ---------------------------------------------------------
  let filePath = join(ROOT, normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, ''));
  if (existsSync(filePath) && statSync(filePath).isDirectory()) filePath = join(filePath, 'index.html');
  // expo-router emits a static page per route; fall back to the SPA shell.
  if (!existsSync(filePath)) filePath = join(ROOT, 'index.html');

  if (!existsSync(filePath)) {
    res.writeHead(404).end('not found');
    return;
  }

  res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream' });
  createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`preview: http://localhost:${PORT}  (proxying /api -> ${UPSTREAM})`);
});
