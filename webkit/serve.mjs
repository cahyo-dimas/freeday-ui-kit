/* Freeday. Static file server for the WebKit suite, dev-only, no dependency.
 *
 * The fixtures in browser/fixtures/ reach UP two directories for their stylesheet and their
 * script (`../../dist/freeday.bundle.css`). The CDP harness opens them as `file://` and Chrome
 * allows that. Safari does not: a `file://` document may read its own directory and below, so a
 * parent-directory subresource is refused outright. Served over HTTP the same fixture files work
 * in both engines, with no second copy to keep in step.
 *
 * Read-only, bound to the loopback interface, and rooted at the repo. Any path that resolves
 * outside the repo gets a 403 rather than a file.
 */
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { dirname, join, normalize, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
const PORT = Number(process.env.FREEDAY_WEBKIT_PORT ?? 4178);

/** @type {Readonly<Record<string, string>>} */
const TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.map': 'application/json; charset=utf-8',
});

/**
 * Resolve a request path to an absolute file inside the repo.
 * @param {string} url
 * @returns {string | null} absolute path, or null when it escapes the repo
 */
function resolveInRepo(url) {
  const pathname = decodeURIComponent(new URL(url, 'http://127.0.0.1').pathname);
  const abs = resolve(join(REPO, normalize(pathname)));
  if (abs !== REPO && !abs.startsWith(REPO + '/')) return null;
  return abs;
}

const server = createServer(async (req, res) => {
  const abs = resolveInRepo(req.url ?? '/');
  if (abs === null) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`403 outside the repo: ${req.url}\n`);
    return;
  }
  let info;
  try {
    info = await stat(abs);
  } catch (err) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`404 ${req.url} (${err.code})\n`);
    return;
  }
  if (info.isDirectory()) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`403 directory: ${req.url}\n`);
    return;
  }
  res.writeHead(200, {
    'content-type': TYPES[extname(abs)] ?? 'application/octet-stream',
    'content-length': String(info.size),
    'cache-control': 'no-store',
  });
  createReadStream(abs).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  process.stdout.write(`freeday webkit fixtures on http://127.0.0.1:${PORT}/ (root ${REPO})\n`);
});
