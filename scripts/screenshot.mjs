// Takes README screenshots of the gallery, the viewer and the Study into docs/.
//   npm run screenshot
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { openBrowser } from './lib/browser.mjs';

const docs = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../docs');
const out = (f) => path.join(docs, f);
const b = await openBrowser();
const waitLoaded = (page, sel) => page.waitForFunction((s) => document.querySelector(s)?.hidden, sel, { timeout: 120000 });

// Study (also used as the teaser image on the home page)
let page = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
await page.goto(`${b.base}study.html`);
await waitLoaded(page, '#study-loading');
await page.waitForTimeout(1500);
await page.screenshot({ path: out('study.jpg'), type: 'jpeg', quality: 86 });
await page.close();

// Gallery, desktop
page = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
await page.goto(`${b.base}index.html`);
await page.waitForLoadState('networkidle');
await page.screenshot({ path: out('screenshot-home.jpg'), type: 'jpeg', quality: 85 });
await page.locator('#gallery').scrollIntoViewIfNeeded();
await page.evaluate(() => document.querySelector('#gallery').scrollIntoView());
await page.waitForTimeout(400);
await page.screenshot({ path: out('screenshot-gallery.jpg'), type: 'jpeg', quality: 85 });

// Viewer
await page.goto(`${b.base}index.html#model/retro-computer`);
await waitLoaded(page, '#viewer-loading');
await page.waitForTimeout(1200);
await page.screenshot({ path: out('screenshot-viewer.jpg'), type: 'jpeg', quality: 85 });
await page.click('#t-wire');
await page.waitForTimeout(600);
await page.screenshot({ path: out('screenshot-wireframe.jpg'), type: 'jpeg', quality: 85 });
await page.close();

// Mobile
page = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(`${b.base}index.html`);
await page.waitForLoadState('networkidle');
await page.screenshot({ path: out('screenshot-mobile.jpg'), type: 'jpeg', quality: 80 });
await page.goto(`${b.base}index.html#model/lizard`);
await waitLoaded(page, '#viewer-loading');
await page.waitForTimeout(1000);
await page.screenshot({ path: out('screenshot-mobile-viewer.jpg'), type: 'jpeg', quality: 80 });
await page.goto(`${b.base}study.html`);
await waitLoaded(page, '#study-loading');
await page.waitForTimeout(1000);
await page.screenshot({ path: out('screenshot-mobile-study.jpg'), type: 'jpeg', quality: 80 });

await b.close();
console.log('Screenshots written to docs/.');
