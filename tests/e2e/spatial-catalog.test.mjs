/** P05 supplement: actual P03 catalog/annual files through the production release pipeline. */
import assert from "node:assert/strict";
import { before, after } from "node:test";
import { test } from "./evidence.mjs";
import { readFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { build } from "vite";
import { createBrowserHarness } from "./helpers.mjs";
import { getMapPosition } from "../../src/data/contract.ts";
import { catalogCities } from "../../src/data/catalog.ts";
import { wgs84ToGcj02 } from "../../src/utils/gcj02.ts";
import { buildReleaseFixture } from "./release.helpers.mjs";

const catalog = JSON.parse(await readFile("public/data/catalog.json", "utf8"));
const cities = catalogCities(catalog);
const output = process.env.E2E_ARTIFACT_DIR;
const observations = [];
let directory, harness;
before(async () => {
  directory = await mkdtemp(join(tmpdir(), "foodie-p05-catalog-"));
  // No discovery replacement, release disabling, data fixtures or coordinate edits.
  await build({ logLevel: "error", build: { outDir: directory, emptyOutDir: true } });
  harness = await createBrowserHarness({ outDir: directory });
  if (output) await mkdir(output, { recursive: true });
});
after(async () => {
  try {
    if (output) await writeFile(join(output, "spatial-catalog.json"), JSON.stringify({
      capturedAt: new Date().toISOString(), browser: await harness?.browser.version(), node: process.version,
      catalog: "public/data/catalog.json", build: harness?.buildMetadata,
      conditions: "Unmodified formal catalog, annual files, taxonomy/mappings and release digest validation. External HTTP aborted, SW bypassed, sensors stubbed. Equality assertions prove consistent implementation, not independent coordinate accuracy.",
      observations,
    }, null, 2));
  } finally { await harness?.close(); if (directory) await rm(directory, { recursive: true, force: true }); }
});

for (const width of [1280, 390]) test(`P05 formal spatialContext: all published datasets, marker/heat/flight/GPS agree at ${width}px`, async () => {
  const session = await harness.createPage({ width, height: 844, isMobile: width === 390, hasTouch: width === 390 }, [], (request) => request.continue());
  const { page } = session;
  try {
    await page.evaluateOnNewDocument(() => {
      const probe = window.spatialProbe = { maps: [], heat: [], watches: new Map(), serial: 0, flights: [] };
      let leaflet;
      Object.defineProperty(window, "L", { configurable: true, get: () => leaflet, set(value) {
        leaflet = value;
        value.Map.addInitHook(function () { probe.maps.push(this); });
        const fly = value.Map.prototype.flyTo;
        value.Map.prototype.flyTo = function (...args) { probe.flights.push(args[0]); return fly.apply(this, args); };
        let heat;
        Object.defineProperty(value, "heatLayer", { configurable: true, get: () => (...args) => { probe.heat.push(args[0]); return heat(...args); }, set: (fn) => { heat = fn; } });
      } });
      Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
        watchPosition(success, error) { const id = ++probe.serial; probe.watches.set(id, { success, error }); return id; },
        clearWatch(id) { probe.watches.delete(id); },
      } });
    });
    for (const city of cities) for (const guide of city.guides) {
      const records = JSON.parse(await readFile(`public${guide.dataPath}`, "utf8"));
      const eligible = records.filter((r) => getMapPosition(r, city.spatialContext));
      const url = `/?city=${city.id}&year=${guide.year}&guide=${guide.id}`;
      await page.goto(harness.baseUrl + url, { waitUntil: "domcontentloaded" });
      await page.waitForSelector('.dataset-status[data-state="ready"],.dataset-status[data-state="empty"]');
      await page.waitForSelector(".loc-btn");
      const initial = await page.evaluate(() => {
        const map = window.spatialProbe.maps.at(-1), ids = [], tileUrls = [];
        map.eachLayer((layer) => {
          if (layer instanceof window.L.MarkerClusterGroup) layer.getLayers().forEach((m) => ids.push(m.__restaurant.id));
          if (layer instanceof window.L.TileLayer) tileUrls.push(layer._url);
        });
        return { center: [map.getCenter().lat, map.getCenter().lng], ids: ids.sort((a, b) => a - b), watches: window.spatialProbe.watches.size,
          tileUrls, minZoom: map.getMinZoom(), maxZoom: map.getMaxZoom(), attribution: document.querySelector(".leaflet-control-attribution").textContent,
          status: document.querySelector(".dataset-status").textContent };
      });
      assert.deepEqual(initial.ids, eligible.map((r) => r.id).sort((a, b) => a - b));
      assert.deepEqual(initial.center, city.basemap === "gsi-standard" ? city.center : wgs84ToGcj02(...city.center));
      assert.equal(initial.watches, 0);
      assert.equal(initial.tileUrls.length, 1);
      if (city.basemap === "gsi-standard") {
        assert.match(initial.tileUrls[0], /cyberjapandata\.gsi\.go\.jp/);
        assert.match(initial.attribution, /国土地理院/);
        assert.equal(initial.minZoom, 9); assert.equal(initial.maxZoom, 18);
      } else assert.match(initial.tileUrls[0], /autonavi\.com/);
      assert.ok(initial.status.includes(`收录 ${records.length} · 筛选结果 ${records.length} · 筛选内可定位 ${eligible.length}`));
      if (width === 390) await page.locator('[aria-label="筛选"]').click();
      await page.locator(".mode-btn").click();
      await page.waitForFunction(() => window.spatialProbe.heat.length > 0);
      const points = await page.evaluate(() => window.spatialProbe.heat.at(-1));
      assert.deepEqual(points, eligible.map((r) => [...(city.basemap === "gsi-standard" ? getMapPosition(r, city.spatialContext) : wgs84ToGcj02(...getMapPosition(r, city.spatialContext))), r.is_new ? 1 : 0.8]));
      await page.locator(".mode-btn").click();
      if (width === 390) {
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => !document.querySelector("dialog[open]"));
      }
      const record = eligible[0];
      if (record) {
        const query = record.name_zh || record.name_en || record.name;
        await page.locator(".search-wrap input").fill(query);
        await page.waitForSelector(".search-dropdown-item");
        await page.locator(".search-dropdown-item").click();
        await page.waitForSelector(width === 390 ? ".mobile-popup-card" : ".leaflet-popup-content");
        const target = city.basemap === "gsi-standard" ? getMapPosition(record, city.spatialContext) : wgs84ToGcj02(...getMapPosition(record, city.spatialContext));
        assert.deepEqual(await page.evaluate(() => window.spatialProbe.flights.at(-1)), target);
        await page.keyboard.press("Escape");
        await page.locator(".loc-btn").click();
        await page.evaluate(({ lat, lon }) => { for (const w of window.spatialProbe.watches.values()) w.success({ coords: { latitude: lat, longitude: lon, accuracy: 8 } }); }, record);
        await page.waitForSelector(".user-loc-dot");
        const user = await page.evaluate(() => {
          const locations = []; window.spatialProbe.maps.at(-1).eachLayer((layer) => {
            if (layer instanceof window.L.Circle || layer instanceof window.L.Marker && layer.options.interactive === false) locations.push([layer.getLatLng().lat, layer.getLatLng().lng]);
          }); return locations;
        });
        assert.deepEqual(user, [target, target]);
        await page.locator(".loc-btn").click();
        assert.equal(await page.evaluate(() => window.spatialProbe.watches.size), 0);
      }
      observations.push({ width, city: city.id, year: guide.year, guide: guide.id, spatialContext: city.spatialContext, basemap: city.basemap ?? "amap", listed: records.length, eligible: eligible.length, center: initial.center, markerIds: initial.ids, heatCount: points.length, result: "consistent" });
      if (output && city.id === "tokyo") await page.screenshot({ path: join(output, `catalog-tokyo-${guide.id}-${width}.png`) });
    }
    assert.deepEqual(session.errors, []);
  } finally { await session.close(); }
});

test("P05 raw catalog unknown context reaches release validation, counts, details and map", async () => {
  const unknown = structuredClone(catalog);
  unknown.cities.find((city) => city.id === "tokyo").spatialContext = { coordinateSystem: "unknown" };
  const payloads = {};
  for (const city of unknown.cities) {
    const paths = [city.taxonomyPath, city.mappingsPath, ...city.guides.flatMap((guide) => [guide.dataPath, guide.legacyPath]).filter(Boolean)];
    for (const path of paths) payloads[path] = JSON.parse(await readFile(`public${path}`, "utf8"));
  }
  const outDir = await mkdtemp(join(tmpdir(), "foodie-p05-unknown-catalog-"));
  let unknownHarness;
  try {
    // Modify only the raw catalog in an isolated release, never the adapter or real files.
    await buildReleaseFixture({ catalog: unknown, payloads }, outDir);
    unknownHarness = await createBrowserHarness({ outDir });
    for (const width of [1280, 390]) {
      const session = await unknownHarness.createPage({ width, height: 844, isMobile: width === 390, hasTouch: width === 390 }, [], (request) => request.continue());
      try {
        await session.page.goto(unknownHarness.baseUrl + "/?city=tokyo&year=2026&guide=michelin-starred");
        await session.page.waitForSelector('.dataset-status[data-state="ready"]');
        const data = payloads["/data/tokyo/2026/michelin-starred.json"];
        assert.ok((await session.page.$eval(".dataset-status", (el) => el.textContent)).includes(`收录 ${data.length} · 筛选结果 ${data.length} · 筛选内可定位 0`));
        assert.equal(await session.page.$(".marker-dot,.cluster-badge"), null);
        assert.ok(await session.page.$(".map-spatial-status"));
        await session.page.evaluate(() => { window.catalogFlights = 0; const fly = window.L.Map.prototype.flyTo; window.L.Map.prototype.flyTo = function (...args) { window.catalogFlights++; return fly.apply(this, args); }; });
        await session.page.locator(".search-wrap input").fill(data[0].name_en || data[0].name);
        await session.page.waitForSelector(".search-dropdown-item"); await session.page.locator(".search-dropdown-item").click();
        await session.page.waitForSelector(".mobile-popup-card");
        assert.match(await session.page.$eval(".mobile-popup-card", (el) => el.textContent), /暂无可靠坐标/);
        assert.equal(await session.page.evaluate(() => window.catalogFlights), 0);
        assert.deepEqual(session.errors, []);
        observations.push({ width, scenario: "unknown raw catalog", listed: data.length, eligible: 0, flights: 0, result: "consistent" });
        if (output) await session.page.screenshot({ path: join(output, `catalog-unknown-${width}.png`) });
      } finally { await session.close(); }
    }
  } finally { await unknownHarness?.close(); await rm(outDir, { recursive: true, force: true }); }
});
