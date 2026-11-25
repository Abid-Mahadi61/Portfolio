import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 4173);
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('Bad Request');
    return;
  }

  const filePath = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  const relativePath = relative(root, filePath);
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  let fileInfo;
  try {
    fileInfo = await stat(filePath);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      response.writeHead(404).end('Not Found');
      return;
    }
    console.error(`Unable to read ${filePath}:`, error);
    response.writeHead(500).end('Internal Server Error');
    return;
  }
  if (!fileInfo.isFile()) {
    response.writeHead(404).end('Not Found');
    return;
  }

  response.writeHead(200, {
    'Content-Type': contentTypes[extname(filePath).toLowerCase()] || 'application/octet-stream',
  });
  if (request.method === 'HEAD') {
    response.end();
  } else {
    const stream = createReadStream(filePath);
    stream.on('error', (error) => {
      console.error(`Unable to stream ${filePath}:`, error);
      if (response.headersSent) {
        response.destroy(error);
      } else {
        response.writeHead(500).end('Internal Server Error');
      }
    });
    stream.pipe(response);
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Serving portfolio at http://127.0.0.1:${port}`);
});
