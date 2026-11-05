// Renders a 512×512 transparent WebP thumbnail of every model into docs/thumbs/.
// Run after adding or changing a model: npm run thumbs
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { MODELS } from '../site/catalog.js';
import { openBrowser } from './lib/browser.mjs';

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../docs/thumbs');
await mkdir(out, { recursive: true });
const b = await openBrowser();
const page = await b.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
await page.goto(`${b.base}site/thumb.html`);
await page.waitForFunction(() => window.ready);
const only = process.argv.slice(2);
for (const m of MODELS) {
  if (only.length && !only.includes(m.id)) continue;
  const data = await page.evaluate((id) => window.renderThumb(id), m.id);
  const buf = Buffer.from(data.split(',')[1], 'base64');
  await writeFile(path.join(out, `${m.id}.webp`), buf);
  console.log(`${m.id}.webp  ${Math.round(buf.length / 1024)} KB`);
}
await b.close();
