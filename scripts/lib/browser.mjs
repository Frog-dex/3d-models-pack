// Starts the static server and a headless Chromium whose requests for three.js on the CDN are
// answered from node_modules, so thumbnails, screenshots and tests work offline.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';
import { serve } from '../serve.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CDN = /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.*)$/;

export async function openBrowser() {
  const server = await serve(0);
  const base = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  async function newPage(options = {}) {
    const context = await browser.newContext(options);
    await context.route(CDN, async (route) => {
      const rel = route.request().url().match(CDN)[1];
      try {
        route.fulfill({ body: await readFile(path.join(root, 'node_modules/three', rel)), contentType: 'text/javascript' });
      } catch { route.fulfill({ status: 404 }); }
    });
    // Fonts are cosmetic; don't let a blocked network stall rendering.
    await context.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: '', contentType: 'text/css' }));
    const page = await context.newPage();
    page.on('pageerror', (e) => console.error('[page error]', e.message));
    return page;
  }
  return { base, newPage, async close() { await browser.close(); server.close(); } };
}
