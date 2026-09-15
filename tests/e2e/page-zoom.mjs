/* global chrome */
/** Optional headed verification: actual Chrome tabs.setZoom, not DPR/pinch/CSS emulation. */
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { build } from "vite";
import { fixture, initialUrl as accessibleUrl } from "./accessibility.helpers.mjs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import puppeteer from "puppeteer";
import { p08Fixture } from "../fixtures/p08Catalog.ts";
import { buildReleaseFixture } from "./release.helpers.mjs";
const dining = process.argv.includes("--dining");
const initialUrl = dining ? "/?city=second-fixture&year=2026&guide=michelin-bib-gourmand" : accessibleUrl;
import { createBrowserHarness } from "./helpers.mjs";

const artifacts = process.env.E2E_ARTIFACT_DIR;
assert.ok(artifacts, "Set E2E_ARTIFACT_DIR to retain zoom evidence");
await mkdir(artifacts, { recursive: true });
const temporary = await mkdtemp(join(tmpdir(), "foodie-p06-zoom-"));
await writeFile(join(temporary, "manifest.json"), JSON.stringify({ manifest_version: 3, name: "P06 native zoom verification", version: "1.0", permissions: ["tabs"], background: { service_worker: "worker.js" } }));
await writeFile(join(temporary, "worker.js"), "chrome.runtime.onInstalled.addListener(() => {});");
const outDir = join(temporary, "dist");
if (dining) await buildReleaseFixture(p08Fixture(), outDir);
else await build({ logLevel: "error", define: { __FOODIE_RELEASE__: "null" }, plugins: [{ name: "p06-zoom-fixture", enforce: "pre", load(id) {
  if (id === resolve("src/config/cities.ts")) return `export const cities = ${JSON.stringify(fixture.cities)};`;
} }], build: { outDir, emptyOutDir: true } });
const harness = await createBrowserHarness({ outDir });
let browser;
try {
  browser = await puppeteer.launch({ headless: false, defaultViewport: null, args: [`--disable-extensions-except=${temporary}`, `--load-extension=${temporary}`, "--window-size=1280,887"] });
  const page = (await browser.pages())[0];
  const target = await browser.waitForTarget((target) => target.type() === "service_worker");
  const worker = await target.worker();
  let failData = false;
  await page.setBypassServiceWorker(true);
  await page.setCacheEnabled(false);
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const url = new URL(request.url());
    const data = fixture.datasets[url.pathname];
    const payload = fixture.taxonomies[url.pathname] ?? data;
    if (url.origin !== harness.baseUrl) void request.abort();
    else if (data && failData) void request.respond({ status: 503, body: "Unavailable" });
    else if (payload) void request.respond({ contentType: "application/json", body: JSON.stringify(payload) });
    else void request.continue();
  });
  const client = await page.createCDPSession();
  const { windowId } = await client.send("Browser.getWindowForTarget");
  const evidence = [];
  for (const viewport of [{ width: 1280, height: 800 }, { width: 768, height: 1024 }]) {
    await page.goto(harness.baseUrl + initialUrl);
    await worker.evaluate(async () => { const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); await chrome.tabs.setZoom(tab.id, 1); });
    await page.waitForFunction(() => devicePixelRatio === 2);
    const frame = await page.evaluate(() => ({ width: outerWidth - innerWidth, height: outerHeight - innerHeight }));
    await client.send("Browser.setWindowBounds", { windowId, bounds: { width: viewport.width + frame.width, height: viewport.height + frame.height } });
    await page.waitForFunction((size) => innerWidth === size.width, {}, viewport);
    console.log("native window", viewport, await page.evaluate(() => ({ width: innerWidth, height: innerHeight, outerWidth, outerHeight })));
    // macOS caps headed windows to the available screen height. Preserve the actual
    // viewport in evidence rather than calling a capped window 768×1024.

    await page.waitForSelector('.dataset-status[data-state="ready"]');
    const before = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio, scale: visualViewport.scale }));
    await worker.evaluate(async () => { const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); await chrome.tabs.setZoom(tab.id, 2); });
    await page.waitForFunction((width) => innerWidth < width * 0.6, {}, before.width);
    const after = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio, scale: visualViewport.scale, overflow: document.documentElement.scrollWidth > innerWidth }));
    const actualZoom = await worker.evaluate(async () => { const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); return chrome.tabs.getZoom(tab.id); });
    assert.equal(actualZoom, 2); assert.equal(after.scale, 1); assert.equal(after.overflow, false);
    assert.ok(Math.abs(after.width * 2 - before.width) < 3);
    const prefix = `${dining ? "p09" : "p06"}-native-200-${viewport.width}`;
    await page.screenshot({ path: join(artifacts, `${prefix}-default.png`) });
    if (dining) {
      await page.waitForSelector('.mobile-shell .search-wrap input', { visible: true });
      await page.click('.search-wrap input'); await page.keyboard.type('餐食测试'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
      await page.waitForSelector('.mobile-popup-card');
      const marker = await page.$('.restaurant-marker--selected');
      const composition = await marker.evaluate((node) => {
        const dot = node.querySelector('.marker-dot'), badge = node.querySelector('.price-badge'), icon = node.querySelector('svg');
        const b = badge.getBoundingClientRect(), i = icon.getBoundingClientRect();
        return { badge: badge.textContent, clipped: badge.scrollWidth > badge.clientWidth, separated: b.bottom <= i.top,
          newTop: getComputedStyle(dot, '::after').top, outline: getComputedStyle(dot).outlineWidth, targetWidth: node.getBoundingClientRect().width,
          detail: document.querySelector('.mobile-popup-card').textContent };
      });
      assert.equal(composition.badge, '¥¥¥¥'); assert.equal(composition.clipped, false); assert.equal(composition.separated, true);
      assert.equal(composition.outline, '3px'); assert.equal(composition.targetWidth, 44); assert.match(composition.detail, /肉食主打.*¥¥¥¥/s);
      await page.screenshot({ path: join(artifacts, `${prefix}-selected-new-price.png`) });
      await page.keyboard.press('Escape');
      await page.waitForSelector('.mobile-popup-card', { hidden: true });
      await page.$eval('.restaurant-marker[title^="餐食测试 ·"]', (node) => node.focus());
      const focused = await page.$eval('.restaurant-marker[title^="餐食测试 ·"]', (node) => {
        const dot = node.querySelector('.marker-dot'), badge = node.querySelector('.price-badge');
        const r = dot.getBoundingClientRect(), b = badge.getBoundingClientRect();
        return { visible: document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('.restaurant-marker') === node,
          badgeInViewport: b.x >= 0 && b.right <= innerWidth && b.y >= 0 && b.bottom <= innerHeight,
          outline: getComputedStyle(dot).outlineWidth, newBottom: r.y + parseFloat(getComputedStyle(dot, '::after').top) + 14 };
      });
      assert.equal(focused.visible, true); assert.equal(focused.badgeInViewport, true); assert.equal(focused.outline, '3px');
      assert.ok(focused.newBottom <= after.height);
      await page.screenshot({ path: join(artifacts, `${prefix}-focused-new-price.png`) });
      await page.locator('[aria-label="筛选"]').click(); await page.waitForSelector('.bottom-sheet-container');
      assert.equal(await page.$$eval('.dining-segment-btn', (buttons) => buttons.length), 9);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: join(artifacts, `${prefix}-filters.png`) });
      await page.keyboard.press('Escape');
      evidence.push({ requestedViewport: viewport, heightCapped: before.height !== viewport.height, before, after, actualZoom, composition, focused });
      await writeFile(join(artifacts, "p09-native-zoom.json"), JSON.stringify({ browser: await browser.version(), mechanism: "Chrome tabs.setZoom / tabs.getZoom", fixture: "P09 raw catalog, isolated second-fixture", evidence }, null, 2));
      continue;
    }
    await page.locator('.seg-chip--interactive').click();
    await page.waitForSelector("dialog[open]");
    await page.screenshot({ path: join(artifacts, `${prefix}-picker.png`) });
    await page.keyboard.press("Escape");
    await page.click(".search-wrap input"); await page.keyboard.type("A"); await page.keyboard.press("ArrowDown");
    await page.screenshot({ path: join(artifacts, `${prefix}-search.png`) });
    await page.keyboard.press("Enter"); await page.waitForSelector(".mobile-popup-card");
    await page.screenshot({ path: join(artifacts, `${prefix}-detail.png`) });
    await page.keyboard.press("Escape");
    failData = true; await page.reload(); await page.waitForSelector('.dataset-status[data-state="error"]');
    await page.screenshot({ path: join(artifacts, `${prefix}-error.png`) });
    failData = false; await page.locator('.dataset-status button').click(); await page.waitForSelector('.dataset-status[data-state="ready"]');
    evidence.push({ requestedViewport: viewport, heightCapped: before.height !== viewport.height, before, after, actualZoom });
    await writeFile(join(artifacts, "p06-native-zoom.json"), JSON.stringify({ browser: await browser.version(), mechanism: "Chrome tabs.setZoom", evidence }, null, 2));
  }
  if (!dining) await writeFile(join(artifacts, "p06-native-zoom.json"), JSON.stringify({ browser: await browser.version(), mechanism: "Chrome extension tabs.setZoom(tabId, 2); tabs.getZoom confirms 2; native window resized via Browser.setWindowBounds", fixture: "P04 guide-experience + P06 in-memory multi-guide fixture", evidence }, null, 2));
  console.log(evidence);

} finally { await browser?.close(); await harness.close(); await rm(temporary, { recursive: true, force: true }); }
