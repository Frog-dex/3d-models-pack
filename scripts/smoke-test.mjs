// End-to-end smoke test in headless Chromium: the gallery lists every model, filters work,
// every model opens in the viewer, and the Study places every model without page errors.
import assert from 'node:assert/strict';
import { MODELS } from '../site/catalog.js';
import { openBrowser } from './lib/browser.mjs';

const b = await openBrowser();
const errors = [];
const watch = (page) => {
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
};
const step = (msg) => console.log(`✓ ${msg}`);

try {
  const page = await b.newPage({ viewport: { width: 1280, height: 900 } });
  watch(page);
  await page.goto(`${b.base}index.html`);
  assert.equal(await page.locator('#grid .card').count(), MODELS.length);
  step(`gallery lists ${MODELS.length} models`);

  const broken = await page.$$eval('#grid img', (imgs) => Promise.all(imgs.map((i) => (i.loading = 'eager', i.decode().then(() => null, () => i.src)))));
  assert.deepEqual(broken.filter(Boolean), [], 'thumbnails failed to load');
  step('all thumbnails load');

  await page.click('.chip[data-group="terminals"]');
  assert.equal(await page.locator('#grid li:not([hidden])').count(), 3);
  await page.click('.chip[data-group="all"]');
  await page.fill('#search', 'lizard');
  assert.equal(await page.locator('#grid li:not([hidden])').count(), 2);
  await page.fill('#search', 'zzzz');
  assert.ok(await page.locator('#empty').isVisible());
  await page.fill('#search', '');
  step('group filter and search work');

  await page.click('[data-open="desk"]');
  await page.waitForSelector('#viewer[open]');
  for (const m of MODELS) {
    await page.evaluate((id) => { location.hash = `model/${id}`; }, m.id);
    await page.waitForFunction((file) => document.querySelector('#viewer-file').textContent === file && document.querySelector('#viewer-loading').hidden, m.file, { timeout: 60000 });
    const meshes = Number(await page.textContent('#s-meshes'));
    assert.ok(meshes > 0, `${m.file} has no meshes`);
  }
  step('every model loads in the viewer');

  await page.click('#t-wire');
  assert.equal(await page.getAttribute('#t-wire', 'aria-pressed'), 'true');
  await page.click('#viewer-next');
  await page.waitForFunction(() => document.querySelector('#viewer-loading').hidden);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#viewer').open);
  await page.waitForFunction(() => !location.hash.startsWith('#model/'), null, { timeout: 5000 }); // the close event is async
  step('viewer tools, navigation and closing work');

  const study = await b.newPage({ viewport: { width: 1280, height: 800 } });
  watch(study);
  await study.goto(`${b.base}study.html`);
  await study.waitForFunction(() => document.querySelector('#study-loading').hidden, null, { timeout: 120000 });
  assert.equal(await study.evaluate(() => window.__study.placed.size), MODELS.length);
  assert.equal(await study.locator('#tour button').count(), MODELS.length);
  await study.click('#tour button[data-id="lizard"]');
  assert.equal(await study.textContent('#study-card-name'), 'Lizard');
  assert.equal(await study.getAttribute('#study-card-open', 'href'), 'index.html#model/lizard');
  step('the Study places every model and the tour works');

  assert.deepEqual(errors, [], 'page errors');
  step('no console errors');
} finally {
  await b.close();
}
