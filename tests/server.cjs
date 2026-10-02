// Test-only server. The application remains a plain static file.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
http.createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const file = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (file !== 'index.html' && !/^words\/[567]\.txt$/.test(file)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const content = await fs.readFile(path.join(root, file));
    response.writeHead(200, {
      'Content-Type': file.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8',
    }).end(content);
  } catch {
    response.writeHead(404).end();
  }
}).listen(4173, '127.0.0.1');
