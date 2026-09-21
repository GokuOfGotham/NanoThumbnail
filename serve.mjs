// Local production server: serves the static `dist/` build and provides the two
// Netlify functions (`replicate-proxy`, `youtube-thumbnail-proxy`) so the
// Replicate provider and the YouTube remix fallback work without Netlify.
//
//   npm run build && npm run serve   →  http://localhost:8788
//
// No dependencies. Mirrors netlify/functions/*.ts behaviour.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), 'dist');
const PORT = Number(process.env.PORT) || 8788;
const HOST = process.env.HOST || '127.0.0.1';

// Same allowlist as netlify/functions/replicate-proxy.ts
const ALLOWED_ORIGINS = [
  'https://api.replicate.com',
  'https://generativelanguage.googleapis.com',
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-goog-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

function sendJson(res, status, obj, extra = {}) {
  send(res, status, { ...CORS, 'Content-Type': 'application/json', ...extra }, JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// --- /.netlify/functions/replicate-proxy?url=<encoded target> ---
async function replicateProxy(req, res, url) {
  if (req.method === 'OPTIONS') return send(res, 204, CORS, '');

  const targetUrl = url.searchParams.get('url');
  if (!targetUrl) return sendJson(res, 400, { error: 'Missing url parameter' });
  if (!ALLOWED_ORIGINS.some((o) => targetUrl.startsWith(o))) {
    return sendJson(res, 403, { error: 'Forbidden: target URL is not allowed' });
  }

  const headers = {};
  if (req.headers.authorization) headers['Authorization'] = req.headers.authorization;
  if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];
  if (req.headers['x-goog-api-key']) headers['x-goog-api-key'] = req.headers['x-goog-api-key'];

  try {
    const requestBody = req.method !== 'GET' ? (await readBody(req)).toString('utf-8') : undefined;
    const upstream = await fetch(targetUrl, { method: req.method, headers, body: requestBody || undefined });
    const responseBody = await upstream.text();

    send(
      res,
      upstream.status,
      { ...CORS, 'Content-Type': upstream.headers.get('content-type') || 'application/json' },
      responseBody ||
        JSON.stringify({
          _proxy_debug: {
            upstreamStatus: upstream.status,
            upstreamStatusText: upstream.statusText,
            emptyBody: true,
            targetUrl,
            method: req.method,
            hasBody: !!requestBody,
            bodyLength: requestBody?.length || 0,
          },
        }),
    );
  } catch (error) {
    sendJson(res, 502, { error: 'Proxy request failed', details: String(error) });
  }
}

// --- /.netlify/functions/youtube-thumbnail-proxy?videoId=<id> ---
async function youtubeThumbnailProxy(req, res, url) {
  if (req.method === 'OPTIONS') return send(res, 204, CORS, '');

  const videoId = url.searchParams.get('videoId');
  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return sendJson(res, 400, { error: 'Missing or invalid videoId parameter' });
  }

  for (const quality of ['maxresdefault', 'hqdefault']) {
    try {
      const upstream = await fetch(`https://img.youtube.com/vi/${videoId}/${quality}.jpg`);
      if (!upstream.ok) continue;
      const base64 = Buffer.from(await upstream.arrayBuffer()).toString('base64');
      return sendJson(res, 200, { base64: `data:image/jpeg;base64,${base64}` });
    } catch {
      continue;
    }
  }
  sendJson(res, 404, { error: 'Thumbnail not found' });
}

// --- static files from dist/ ---
async function serveStatic(res, pathname) {
  let rel = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(ROOT, rel);
  if (!filePath.startsWith(ROOT)) return send(res, 403, { 'Content-Type': 'text/plain' }, 'Forbidden');

  try {
    let info = await stat(filePath);
    if (info.isDirectory()) {
      filePath = join(filePath, 'index.html');
      info = await stat(filePath);
    }
    const body = await readFile(filePath);
    const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
    const cache = filePath.includes(`${join(ROOT, 'assets')}`) ? 'public, max-age=31536000, immutable' : 'no-cache';
    send(res, 200, { 'Content-Type': type, 'Cache-Control': cache }, body);
  } catch {
    // Astro static pages are folders with index.html; try `<path>/index.html` before 404
    try {
      const body = await readFile(join(ROOT, rel, 'index.html'));
      send(res, 200, { 'Content-Type': MIME['.html'] }, body);
    } catch {
      send(res, 404, { 'Content-Type': 'text/plain' }, 'Not found');
    }
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname === '/.netlify/functions/replicate-proxy') return await replicateProxy(req, res, url);
    if (url.pathname === '/.netlify/functions/youtube-thumbnail-proxy') return await youtubeThumbnailProxy(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { 'Content-Type': 'text/plain' }, 'Method not allowed');
    await serveStatic(res, url.pathname);
  } catch (error) {
    sendJson(res, 500, { error: 'Server error', details: String(error) });
  }
});

try {
  await stat(join(ROOT, 'index.html'));
} catch {
  console.error(`No build found at ${ROOT}. Run \`npm run build\` first.`);
  process.exit(1);
}

server.listen(PORT, HOST, () => {
  console.log(`NanoThumbnail  →  http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`App            →  http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/app/`);
  console.log('Netlify functions emulated: replicate-proxy, youtube-thumbnail-proxy');
});
