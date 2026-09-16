/** P05 production integration. Sensor APIs and HTTP are controlled, Leaflet/React are real. */
import assert from "node:assert/strict";
import { before, after } from "node:test";
import { test } from "./evidence.mjs";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { build } from "vite";
import { createBrowserHarness } from "./helpers.mjs";

const desktop = { width: 1280, height: 800 }, mobile = { width: 390, height: 844, isMobile: true, hasTouch: true };
const definitions = [
  ["hong-kong", "香港", [22.302, 114.177]], ["macau", "澳门", [22.166, 113.559]],
  ["beijing", "北京", [39.904, 116.407]], ["unknown", "未知域", [22.302, 114.177]],
];
const registry = definitions.map(([id, labelZh, center]) => ({
  id, label: id, labelZh, center, zoom: 13,
  spatialContext: { coordinateSystem: id === "unknown" ? "unknown" : "WGS84" },
  guides: [{ id: "michelin-bib-gourmand", label: "Bib", labelZh: "必比登", year: 2026, dataPath: `/data/${id}/2026/michelin-bib-gourmand.json` }],
}));
function records(city) {
  const [lat, lon] = definitions.find(([id]) => id === city)[2];
  const base = { city, guide_type: "michelin-bib-gourmand", edition_year: 2026, cuisine_group: "OTHER", venue_type: "restaurant", address: "测试地址", lat, lon };
  return [
    { ...base, id: 1, name: "P05 有坐标", name_zh: "P05 有坐标" },
    { ...base, id: 2, name: "P05 同址", name_zh: "P05 同址", geocode_success: null },
    { ...base, id: 3, name: "P05 无坐标", name_zh: "P05 无坐标", lat: null, lon: null },
    { ...base, id: 4, name: "P05 明确失败", name_zh: "P05 明确失败", geocode_success: false },
  ];
}
let temporary, harness;
const artifacts = process.env.E2E_ARTIFACT_DIR;
const evidence = [];
before(async () => {
  temporary = await mkdtemp(join(tmpdir(), "foodie-p05-browser-"));
  await build({ logLevel: "error", define: { __FOODIE_RELEASE__: "null" }, plugins: [{ name: "p05-discovery-fixture", enforce: "pre",
    load(id) { if (id === resolve("src/config/cities.ts")) return `export const cities = ${JSON.stringify(registry)};`; },
  }], build: { outDir: temporary, emptyOutDir: true } });
  harness = await createBrowserHarness({ outDir: temporary });
  if (artifacts) await mkdir(artifacts, { recursive: true });
});
after(async () => {
  try {
    if (artifacts) await writeFile(join(artifacts, "map-location.json"), JSON.stringify({
      browser: await harness?.browser.version(), node: process.version,
      conditions: "Production Vite build; discovery replaced by explicit fixtures (not P03 catalog); HTTP data/taxonomy intercepted; tiles aborted or synthetic SVG; geolocation/orientation stubbed; SW bypassed. No ground-coordinate calibration claimed.", checks: evidence,
    }, null, 2));
  } finally { await harness?.close(); if (temporary) await rm(temporary, { recursive: true, force: true }); }
});

async function session(viewport = desktop, tileMode = "success", corrupt = false) {
  const context = await harness.browser.createBrowserContext();
  const page = await context.newPage(); await page.setViewport(viewport); page.setDefaultTimeout(10_000);
  await page.setBypassServiceWorker(true); await page.setRequestInterception(true);
  const errors = [], requests = []; const control = { tileMode, tiles: 0 };
  page.on("pageerror", (e) => errors.push(String(e.stack ?? e)));
  page.on("request", (request) => {
    const url = new URL(request.url()); requests.push(request.url());
    let action;
    if (url.hostname.endsWith("autonavi.com")) {
      control.tiles++;
      action = control.tileMode === "fail" || control.tileMode === "one-failure" && control.tiles === 1
        ? request.abort("failed") : request.respond({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><path fill="#e7eee7" d="M0 0h256v256H0z"/></svg>' });
    } else if (url.origin !== harness.baseUrl && /^https?:/u.test(url.protocol)) action = request.abort("failed");
    else if (/\/data\/taxonomy\//u.test(url.pathname)) {
      const city = url.pathname.split("/").pop().replace(".json", "");
      action = request.respond({ contentType: "application/json", body: JSON.stringify({ version: 1, city, fallbackGroup: "OTHER", groups: [{ key: "OTHER", labelZh: "其他", labelEn: "Other", sortOrder: 1 }] }) });
    } else if (/\/data\//u.test(url.pathname)) {
      const data = records(url.pathname.split("/")[2]);
      if (corrupt) data[0] = { ...data[0], lat: 0, lon: 0 };
      action = request.respond({ contentType: "application/json", body: JSON.stringify(data) });
    } else action = request.continue();
    action.catch((e) => errors.push(e.message));
  });
  await page.evaluateOnNewDocument(() => {
    const state = window.p05 = { maps: [], watches: new Map(), oldWatches: [], serial: 0, requests: 0, permissionRequests: 0, directionListeners: new Set(), timers: new Set() };
    let leaflet;
    Object.defineProperty(window, "L", { configurable: true, get: () => leaflet, set: (value) => {
      leaflet = value;
      value.Map.addInitHook(function () { state.maps.push(this); });
    } });
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
      watchPosition(success, error) { const id = ++state.serial; state.requests++; const pair = { success, error }; state.watches.set(id, pair); state.oldWatches.push(pair); return id; },
      clearWatch(id) { state.watches.delete(id); },
    } });
    Object.defineProperty(window, "DeviceOrientationEvent", { configurable: true, value: class { static async requestPermission() { state.permissionRequests++; return "granted"; } } });
    const add = window.addEventListener.bind(window), remove = window.removeEventListener.bind(window);
    window.addEventListener = (name, listener, ...rest) => { if (name.startsWith("deviceorientation")) state.directionListeners.add(listener); return add(name, listener, ...rest); };
    window.removeEventListener = (name, listener, ...rest) => { if (name.startsWith("deviceorientation")) state.directionListeners.delete(listener); return remove(name, listener, ...rest); };
    const set = window.setTimeout.bind(window), clear = window.clearTimeout.bind(window);
    window.setTimeout = (callback, delay, ...args) => {
      const id = set(() => { state.timers.delete(id); callback(...args); }, delay);
      if (delay === 300_000 || delay === 1500) state.timers.add(id);
      return id;
    };
    window.clearTimeout = (id) => { state.timers.delete(id); return clear(id); };
  });
  return { page, errors, requests, control, close: () => context.close() };
}
async function ready(page, city = "hong-kong") {
  await page.waitForFunction((city) => document.querySelector('.dataset-status[data-state="ready"]')?.dataset.dataset.startsWith(`${city}/`), {}, city);
  await page.waitForSelector(".loc-btn", { visible: true });
}
async function navigate(page, city) {
  await page.evaluate((city) => { history.pushState(null, "", `/?year=2026&city=${city}&guide=michelin-bib-gourmand`); dispatchEvent(new PopStateEvent("popstate")); }, city);
  await ready(page, city);
}
async function search(page, name) {
  await page.locator(".search-wrap input").fill(name);
  await page.waitForSelector(".search-dropdown-item", { visible: true }); await page.click(".search-dropdown-item");
}
async function capture(page, name) {
  evidence.push({ name, ...await page.evaluate(() => ({ url: location.search, counts: document.querySelector(".dataset-status")?.textContent,
    mapStatus: document.querySelector(".map-service-status")?.textContent ?? null, watches: window.p05.watches.size,
    orientation: window.p05.directionListeners.size, sessionTimers: window.p05.timers.size,
  })) });
  if (artifacts) await page.screenshot({ path: join(artifacts, `p05-${name}.png`) });
}

test("P05-R2/R3/R6 tile outage preserves facts; retry preserves selection and single-tile failure is tolerated", async () => {
  const s = await session(desktop, "one-failure"); const { page } = s;
  try {
    await page.goto(harness.baseUrl); await ready(page);
    await page.waitForFunction(() => document.querySelectorAll(".leaflet-tile-loaded").length > 1);
    assert.equal(await page.$(".map-service-status"), null);
    await page.click(".loc-btn");
    await page.evaluate(() => { for (const watch of window.p05.watches.values()) watch.success({ coords: { latitude: 22.302, longitude: 114.177, accuracy: 10 } }); });
    const before = await page.evaluate(() => window.p05.requests);
    s.control.tileMode = "fail";
    await page.evaluate(() => window.p05.maps.at(-1).eachLayer((layer) => { if (layer instanceof window.L.TileLayer) layer.redraw(); }));
    await page.waitForSelector(".map-service-status", { visible: true });
    await search(page, "无坐标"); await page.waitForSelector(".mobile-popup-card", { visible: true });
    assert.match(await page.$eval(".mobile-popup-card", (el) => el.textContent), /暂无可靠坐标/);
    await capture(page, "tile-outage-detail");
    await page.locator(".mobile-popup-close").click();
    await search(page, "有坐标"); await page.waitForSelector(".leaflet-popup-content", { visible: true });
    await page.click(".leaflet-popup-close-button");
    const identity = await page.$eval(".dataset-status", (el) => el.dataset.dataset);
    s.control.tileMode = "success"; await page.locator(".map-service-status button").click();
    await page.waitForFunction(() => !document.querySelector(".map-service-status") && document.querySelectorAll(".leaflet-tile-loaded").length > 1);
    assert.equal(await page.evaluate(() => window.p05.requests), before);
    assert.equal(await page.$eval(".dataset-status", (el) => el.dataset.dataset), identity);
    assert.match(await page.$eval(".dataset-status", (el) => el.textContent), /收录 4 · 筛选结果 4 · 筛选内可定位 2/);
    await capture(page, "tile-recovered"); assert.deepEqual(s.errors, []);
  } finally { await s.close(); }
});

test("P05 mode regression: mobile heat -> search location -> toggle matches its label", async () => {
  const s = await session(mobile); const { page } = s;
  try {
    await page.goto(harness.baseUrl); await ready(page); await page.click('[aria-label="筛选"]');
    await page.waitForSelector(".mode-btn", { visible: true }); await page.locator(".mode-btn").click();
    await page.waitForSelector("canvas.leaflet-heatmap-layer");
    await page.click(".bottom-sheet-backdrop", { offset: { x: 10, y: 100 } });
    await page.waitForFunction(() => !document.querySelector(".bottom-sheet-container"));
    await search(page, "有坐标"); await page.waitForSelector(".mobile-popup-card", { visible: true });
    await page.waitForFunction(() => !document.querySelector("canvas.leaflet-heatmap-layer"));
    await page.locator(".mobile-popup-close").click(); await page.click('[aria-label="筛选"]');
    await page.waitForSelector(".mode-btn", { visible: true });
    assert.equal(await page.$eval(".mode-btn", (el) => el.textContent), "切换到热力图");
    await page.locator(".mode-btn").click(); await page.waitForSelector("canvas.leaflet-heatmap-layer");
    assert.equal(await page.$eval(".mode-btn", (el) => el.textContent), "切换到标记模式");
    await capture(page, "mobile-mode-synchronized"); assert.deepEqual(s.errors, []);
  } finally { await s.close(); }
});

test("P05-R2/R3 unknown spatial context propagates to counts, details, points and search", async () => {
  const s = await session(); const { page } = s;
  try {
    await page.goto(harness.baseUrl); await ready(page);
    await page.evaluate(() => { window.p05.flights = 0; const fly = window.L.Map.prototype.flyTo; window.L.Map.prototype.flyTo = function (...args) { window.p05.flights++; return fly.apply(this, args); }; });
    await navigate(page, "unknown");
    assert.match(await page.$eval(".dataset-status", (el) => el.textContent), /收录 4 · 筛选结果 4 · 筛选内可定位 0/);
    assert.equal(await page.$(".marker-dot,.cluster-badge"), null);
    await search(page, "有坐标"); await page.waitForSelector(".mobile-popup-card", { visible: true });
    assert.match(await page.$eval(".mobile-popup-card", (el) => el.textContent), /暂无可靠坐标/);
    assert.equal(await page.evaluate(() => window.p05.flights), 0);
    await capture(page, "unknown-context");
    await navigate(page, "macau"); assert.match(await page.$eval(".dataset-status", (el) => el.textContent), /可定位 2/);
    await search(page, "有坐标"); await page.waitForSelector(".leaflet-popup-content", { visible: true });
    assert.equal(await page.evaluate(() => window.p05.flights), 1); assert.deepEqual(s.errors, []);
  } finally { await s.close(); }
});

test("P05-R3 invalid coordinates enter dataset error, never a silently filtered successful list", async () => {
  const s = await session(desktop, "success", true);
  try {
    await s.page.goto(harness.baseUrl); await s.page.waitForSelector('.dataset-status[data-state="error"]');
    assert.equal(await s.page.$(".marker-dot,.cluster-badge"), null); await capture(s.page, "invalid-payload-error"); assert.deepEqual(s.errors, []);
  } finally { await s.close(); }
});

test("P05-R4/R5 10 city/layout remounts release sensor resources and ignore old successes/errors", async () => {
  const s = await session(); const { page } = s;
  try {
    await page.goto(harness.baseUrl); await ready(page);
    assert.equal(await page.evaluate(() => window.p05.requests), 0);
    for (let i = 0; i < 10; i++) {
      await page.click(".loc-btn");
      await page.waitForFunction(() => window.p05.watches.size === 1 && window.p05.directionListeners.size === 1);
      await page.evaluate(() => { for (const watch of window.p05.watches.values()) watch.success({ coords: { latitude: 22.302, longitude: 114.177, accuracy: 30 } }); });
      await page.waitForSelector(".user-loc-dot");
      await navigate(page, i % 2 ? "beijing" : "macau");
      await page.setViewport(i % 2 ? desktop : mobile);
      await page.waitForFunction(() => document.querySelectorAll(".loc-btn").length === 1 && window.p05.watches.size === 0 && window.p05.directionListeners.size === 0 && window.p05.timers.size === 0);
      await page.evaluate(() => { for (const watch of window.p05.oldWatches) { watch.success({ coords: { latitude: 22, longitude: 114, accuracy: 5 } }); watch.error({ code: 1 }); } });
      assert.equal(await page.$(".user-loc-dot"), null);
      assert.equal(await page.$$eval(".leaflet-container", (nodes) => nodes.length), 1);
    }
    await capture(page, "ten-remounts-clean"); assert.deepEqual(s.errors, []);
  } finally { await s.close(); }
});
