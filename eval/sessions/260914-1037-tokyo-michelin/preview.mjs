import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { preview } from 'vite';
import puppeteer from 'puppeteer';

const root = fileURLToPath(new URL('./', import.meta.url));
const output = join(root, 'outputs', 'preview');
mkdirSync(output, { recursive: true });
const starred = JSON.parse(readFileSync('public/data/tokyo/michelin-starred.json'));
const bib = JSON.parse(readFileSync('public/data/tokyo/michelin-bib-gourmand.json'));
const server = await preview({ logLevel: 'error', preview: { host: '127.0.0.1', port: 0, strictPort: true } });
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await puppeteer.launch({ headless: 'shell' });
const result = { capturedAt: new Date().toISOString(), browser: await browser.version(), base, dataInterception: false, externalRequests: 'allowed', scenarios: [] };
const mobileFilterOnly = process.argv.includes('--mobile-filter');

async function ready(page, guide) {
  await page.waitForFunction(guide => document.querySelector('.dataset-status[data-state="ready"]')?.dataset.dataset === `tokyo/2026/${guide}`, {}, guide);
}
async function search(page, query, expected) {
  if (await page.$('.mobile-popup-close')) await page.locator('.mobile-popup-close').click();
  const input = await page.$('input[aria-label="搜索餐厅"]');
  await input.click({ clickCount: 3 });
  await page.keyboard.press('Backspace');
  await input.type(query);
  await page.waitForSelector('.search-dropdown-item', { visible: true });
  const options = await page.$$('.search-dropdown-item');
  let selected = false;
  for (const option of options) {
    if (await option.$eval('.search-item-name', element => element.textContent) === expected) {
      await option.click(); selected = true; break;
    }
  }
  assert.ok(selected, `Exact suggestion ${expected} for ${query}`);
  await page.waitForFunction(expected => document.querySelector('.leaflet-popup-content, .mobile-popup-card')?.textContent.includes(expected), {}, expected);
  await page.waitForFunction(() => {
    const target = window.tokyoPreview.flights.at(-1);
    const map = window.tokyoPreview.maps.at(-1);
    return !target || map.getCenter().distanceTo(window.L.latLng(target)) < 1;
  });
}
async function snapshot(page, name) {
  await page.screenshot({ path: join(output, `${name}.png`) });
  return page.evaluate(() => {
    const map = window.tokyoPreview.maps.at(-1);
    const layers = Object.values(map._layers);
    const cluster = layers.find(layer => layer instanceof window.L.MarkerClusterGroup);
    const heat = layers.find(layer => layer._heat && Array.isArray(layer._latlngs));
    return { url: location.href, title: document.title, viewport: { width: innerWidth, height: innerHeight },
      status: document.querySelector('.dataset-status')?.textContent,
      detail: document.querySelector('.leaflet-popup-content, .mobile-popup-card')?.textContent,
      center: map.getCenter(), zoom: map.getZoom(),
      markerPositions: cluster?.getLayers().map(marker => [marker.getLatLng().lat, marker.getLatLng().lng]),
      heatPositions: heat?._latlngs,
      flights: window.tokyoPreview.flights,
      tiles: [...document.querySelectorAll('img.leaflet-tile')].map(image => ({ url: image.src, loaded: image.complete && image.naturalWidth > 0 })),
      mapStatus: document.querySelector('.map-service-status')?.textContent ?? null,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
}
try {
  const viewports = [{ width: 1280, height: 800 }, { width: 390, height: 844 }];
  for (const viewport of mobileFilterOnly ? viewports.slice(1) : process.argv.includes('--desktop') ? viewports.slice(0, 1) : viewports) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    const errors = [], consoleErrors = [], requests = [], responses = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('requestfailed', request => requests.push({ url: request.url(), error: request.failure()?.errorText }));
    page.on('response', response => { if (response.url().includes('autonavi.com')) responses.push({ url: response.url(), status: response.status() }); });
    await page.setViewport(viewport);
    await page.setBypassServiceWorker(true);
    page.setDefaultTimeout(20000);
    await page.evaluateOnNewDocument(() => {
      window.tokyoPreview = { maps: [], flights: [] };
      let leaflet;
      Object.defineProperty(window, 'L', { configurable: true, get: () => leaflet, set: value => {
        leaflet = value;
        value.Map.addInitHook(function () { window.tokyoPreview.maps.push(this); });
        const fly = value.Map.prototype.flyTo;
        value.Map.prototype.flyTo = function (...args) { window.tokyoPreview.flights.push(args[0]); return fly.apply(this, args); };
      } });
    });
    try {
      await page.goto(`${base}/?year=2026&city=tokyo&guide=michelin-starred`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await ready(page, 'michelin-starred');
      assert.deepEqual(await page.evaluate(async () => (await fetch('/data/tokyo/michelin-starred.json')).json()), starred);
      const initial = await snapshot(page, `tokyo-${viewport.width}-starred`);
      assert.equal(initial.markerPositions.length, 157);
      result.scenarios.push({ name: `starred-${viewport.width}`, ...initial });

      const anchors = ['est', 'HOMMAGE', 'Yakumo Uezu'];
      if (!mobileFilterOnly) {
      for (const english of anchors) {
        const row = starred.find(row => row.name_en === english);
        // Japanese source name and the official English alias both exercise the real search.
        for (const query of [row.name, row.name_en]) await search(page, query, english);
        const observed = await snapshot(page, `anchor-${viewport.width}-${english.replaceAll(' ', '-')}`);
        assert.deepEqual(observed.flights.at(-1), [row.lat, row.lon]);
        assert.ok(observed.markerPositions.some(point => point[0] === row.lat && point[1] === row.lon));
        result.scenarios.push({ name: `anchor-${viewport.width}-${english}`, source: row.guide_url, expected: [row.lat, row.lon], ...observed });
        if (viewport.width === 1280) await page.locator('.leaflet-popup-close-button').click();
        else await page.locator('.mobile-popup-close').click();
      }
      await search(page, 'est', 'est');
      const price = await snapshot(page, `price-${viewport.width}`);
      assert.ok(price.detail.includes('JPY') && price.detail.includes('27,000') && price.detail.includes('15% service charge'));
      result.scenarios.push({ name: `jpy-price-${viewport.width}`, ...price });
      if (viewport.width === 1280) await page.locator('.leaflet-popup-close-button').click();
      else await page.locator('.mobile-popup-close').click();
      const flightsBefore = await page.evaluate(() => window.tokyoPreview.flights.length);
      await search(page, '氣分', 'KIBUN');
      const unavailable = await snapshot(page, `no-position-${viewport.width}`);
      assert.ok(unavailable.detail.includes('暂无可靠坐标'));
      assert.equal(unavailable.flights.length, flightsBefore);
      result.scenarios.push({ name: `no-position-${viewport.width}`, ...unavailable });
      await page.locator('.mobile-popup-close').click();
      }

      if (viewport.width === 1280) {
        await page.locator('.toggle-all-btn').click();
        const expectedJapanese = starred.filter(row => row.cuisine_group === 'JAPANESE').length;
        await page.waitForFunction(count => document.querySelector('.dataset-status').textContent.includes(`筛选结果 ${count} `), {}, expectedJapanese);
        result.scenarios.push({ name: 'cuisine-filter-1280', ...await snapshot(page, 'cuisine-filter-1280') });
        await page.locator('.toggle-all-btn').click();
        await page.locator('.mode-btn').click();
        await page.waitForSelector('canvas.leaflet-heatmap-layer', { visible: true });
        const heat = await snapshot(page, 'heat-1280');
        assert.equal(heat.heatPositions.length, 157);
        assert.deepEqual(heat.heatPositions.map(p => p.slice(0, 2)).sort(), initial.markerPositions.sort());
        result.scenarios.push({ name: 'heat-1280', ...heat });
        for (const english of anchors) {
          const row = starred.find(row => row.name_en === english);
          await page.evaluate(point => window.tokyoPreview.maps.at(-1).setView(point, 15, { animate: false }), [row.lat, row.lon]);
          await page.waitForNetworkIdle({ idleTime: 500, timeout: 10000 }).catch(() => {});
          result.scenarios.push({ name: `heat-anchor-${english}`, ...await snapshot(page, `heat-anchor-${english.replaceAll(' ', '-')}`) });
        }
        await page.locator('.mode-btn').click();
      } else {
        await page.locator('button[aria-label="筛选"]').click();
        await page.locator('.toggle-all-pill').click();
        const expectedJapanese = starred.filter(row => row.cuisine_group === 'JAPANESE').length;
        await page.waitForFunction(count => document.querySelector('.dataset-status').textContent.includes(`筛选结果 ${count} `), {}, expectedJapanese);
        result.scenarios.push({ name: 'cuisine-filter-390', ...await snapshot(page, 'cuisine-filter-390') });
        await page.locator('.toggle-all-pill').click();
        await page.locator('.mode-btn').click();
        await page.locator('button[aria-label="关闭筛选"]').click();
        await page.waitForSelector('canvas.leaflet-heatmap-layer', { visible: true });
        const heat = await snapshot(page, 'heat-390');
        assert.equal(heat.heatPositions.length, 157);
        assert.deepEqual(heat.heatPositions.map(p => p.slice(0, 2)).sort(), initial.markerPositions.sort());
        result.scenarios.push({ name: 'heat-390', ...heat });
        await page.locator('button[aria-label="筛选"]').click();
        await page.locator('.mode-btn').click();
        await page.locator('button[aria-label="关闭筛选"]').click();
      }

      if (mobileFilterOnly) { assert.deepEqual(errors, []); continue; }

      await page.locator('button[aria-label^="榜单："]').click();
      await page.locator('[role="option"]::-p-text(米其林必比登)').click();
      await ready(page, 'michelin-bib-gourmand');
      assert.deepEqual(await page.evaluate(async () => (await fetch('/data/tokyo/michelin-bib-gourmand.json')).json()), bib);
      const second = await snapshot(page, `tokyo-${viewport.width}-bib`);
      assert.equal(second.markerPositions.length, 111);
      result.scenarios.push({ name: `bib-${viewport.width}`, ...second });
      await search(page, 'ナイトマーケット', 'Night Market');
      result.scenarios.push({ name: `bib-detail-${viewport.width}`, ...await snapshot(page, `bib-detail-${viewport.width}`) });
      assert.deepEqual(errors, []);
    } catch (error) {
      console.error('Preview failure', viewport.width, error);
      result.scenarios.push({ name: `failure-${viewport.width}`, error: String(error.stack), ...await snapshot(page, `failure-${viewport.width}`).catch(() => ({})) });
      process.exitCode = 1;
    } finally {
      result.scenarios.push({ name: `network-${viewport.width}`, errors, consoleErrors, failedRequests: requests, tileResponses: responses });
      await context.close();
    }
  }
} finally {
  writeFileSync(join(root, mobileFilterOnly ? 'preview-mobile-filter-results.json' : process.argv.includes('--desktop') ? 'preview-desktop-results.json' : 'preview-results.json'), JSON.stringify(result, null, 2) + '\n');
  await browser.close();
  server.httpServer.closeAllConnections();
  await new Promise(resolve => server.httpServer.close(resolve));
}
console.log(result.scenarios.map(scenario => ({ name: scenario.name, error: scenario.error, status: scenario.status, mapStatus: scenario.mapStatus })));
