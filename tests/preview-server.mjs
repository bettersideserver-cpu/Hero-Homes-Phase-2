// Local UI fixture only: never connects to the live Supabase project.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = fileURLToPath(new URL('./fixtures/supabase.js', import.meta.url));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (!url.pathname.startsWith('/preview/')) { response.writeHead(404).end(); return; }
    const relative = decodeURIComponent(url.pathname.slice('/preview/'.length));
    // Public-page layout previews must not create visitors in the live database.
    if (relative === 'map/IPX/JS/HeroHomesAnalytics.js') {
      response.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' });
      response.end('// Visitor tracking is disabled in the local fixture preview.');
      return;
    }
    const file = path.resolve(root, relative);
    if (!file.startsWith(root) || relative.startsWith('tests/')) { response.writeHead(403).end(); return; }
    const body = await readFile(relative === 'map/IPX/admin/js/supabase.js' ? fixture : file);
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(body);
  } catch { response.writeHead(404).end('Not found'); }
}).listen(8765, '127.0.0.1', () => console.log('Fixture preview: http://127.0.0.1:8765/preview/map/IPX/admin/index.html'));
