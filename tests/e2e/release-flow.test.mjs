/** P04–P06 core flows in both engines, using the P07 immutable fixture release. */
import assert from "node:assert/strict";
import { before, after } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { test } from "./evidence.mjs";
import { createBrowserHarness } from "./helpers.mjs";
import { tabTo, visibleFocus } from "./accessibility.helpers.mjs";
import { releaseFixture, buildReleaseFixture, releaseServer, pwaSession, initialSelection, ready, controlled, choose, search, snapshot, saveRecords } from "./release.helpers.mjs";

process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve("node_modules/.cache/playwright");
const { chromium, webkit } = await import("playwright");
let temporary, harness, server, chrome, webkitBrowser, release;
const records = [];
before(async () => {
  temporary = await mkdtemp(join(tmpdir(), "foodie-p07-flow-"));
  release = await buildReleaseFixture(await releaseFixture("B"), temporary);
  server = await releaseServer(temporary);
  harness = await createBrowserHarness({ outDir: temporary, server });
  chrome = await chromium.connectOverCDP(harness.browser.wsEndpoint()); webkitBrowser = await webkit.launch();
});
after(async () => {
  await saveRecords("p07-core-matrix.json", { chromium: chrome?.version(), webkit: webkitBrowser?.version(), release, records });
  await webkitBrowser?.close(); await chrome?.close(); await harness?.close();
  if (temporary) await rm(temporary, { recursive: true, force: true });
});

for (const engine of ["chromium", "webkit"]) {
  const browser = () => engine === "chromium" ? chrome : webkitBrowser;
  for (const width of [1280, 390]) test(`P07-R2/R7 ${engine} ${width}: keyboard, two editions, new city, failure, map and location`, async () => {
    const s = await pwaSession(browser(), server, { width, height: width === 390 ? 844 : 800 });
    const { page } = s;
    page.p06TabPrefix = engine === "webkit" ? "Alt+" : "";
    try {
      await s.context.addInitScript(() => Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
        watchPosition(_success, error) { queueMicrotask(() => error({ code: 1, message: "Controlled permission denied" })); return 7; }, clearWatch() {},
      } }));
      await page.goto(server.baseUrl + initialSelection); await controlled(page);
      await tabTo(page, '[data-focus-key="picker-年份"]'); await visibleFocus(page);
      await page.keyboard.press("Enter"); await page.getByRole("option", { selected: true }).waitFor();
      await page.keyboard.press("Home"); await page.keyboard.press("Enter"); await ready(page, 2027);
      await tabTo(page, '[data-focus-key="search"]'); await page.keyboard.type("无坐标");
      await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter"); await page.locator(".mobile-popup-card").waitFor();
      assert.match(await page.locator(".mobile-popup-card").textContent(), /2027.*米其林|暂无可靠坐标/);
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.activeElement?.dataset.focusKey === "search");
      const path = release.resources["/data/new-city/2027/michelin-starred.json"].url;
      server.state.overrides.set(path, { status: 500, body: "Controlled failure" });
      await choose(page, "城市", "新城"); await page.locator('.dataset-status[data-state="error"]').waitFor();
      assert.equal(await page.locator(".marker-dot, .cluster-badge, .mobile-popup-card").count(), 0);
      server.state.overrides.delete(path);
      await page.getByRole("button", { name: "重试", exact: true }).click(); await ready(page, 2027, "new-city");
      if (width === 390) await page.getByRole("button", { name: "筛选", exact: true }).click();
      await page.getByRole("button", { name: "切换到热力图", exact: true }).click();
      await page.waitForFunction(() => { const canvas = document.querySelector("canvas.leaflet-heatmap-layer"); return canvas?.width && canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data.some((value, index) => index % 4 === 3 && value > 0); });
      await page.getByRole("button", { name: "切换到标记模式", exact: true }).click();
      if (width === 390) await page.keyboard.press("Escape");
      await page.locator(".loc-btn").click(); await page.locator(".loc-error-toast").waitFor();
      assert.match(await page.locator(".loc-error-toast").textContent(), /拒绝|权限/);
      await search(page, "新城 2027 A");
      await snapshot(page, `p07-${engine}-${width}-core-flow`, release, records);
      assert.deepEqual(s.errors, []);
    } finally { server.state.overrides.clear(); await s.close(); }
  });

  test(`P07-R2 ${engine}: C then A then B response order cannot replace the current dataset`, async () => {
    const s = await pwaSession(browser(), server);
    const releases = new Map(), arrivals = new Map();
    const logical = ["/data/fixture-city/2027/michelin-bib-gourmand.json", "/data/new-city/2027/michelin-starred.json", "/data/third-city/2027/michelin-starred.json"];
    const paths = logical.map((path) => release.resources[path].url);
    try {
      await s.context.addInitScript(() => {
        const original = window.fetch.bind(window); window.completedTransport = [];
        window.fetch = async (input, init) => { const response = await original(input, { ...init, signal: undefined }); await response.clone().text(); window.completedTransport.push(String(input)); return response; };
      });
      await s.page.goto(server.baseUrl + initialSelection); await controlled(s.page);
      for (const path of paths) {
        const arrived = Promise.withResolvers(), gate = Promise.withResolvers();
        arrivals.set(path, arrived); releases.set(path, gate);
        server.state.overrides.set(path, async () => { arrived.resolve(); await gate.promise; return null; });
      }
      await choose(s.page, "年份", "2027"); await arrivals.get(paths[0]).promise;
      await choose(s.page, "城市", "新城"); await arrivals.get(paths[1]).promise;
      await choose(s.page, "城市", "第三城"); await arrivals.get(paths[2]).promise;
      assert.equal(await s.page.locator(".marker-dot, .cluster-badge").count(), 0);
      releases.get(paths[2]).resolve(); await ready(s.page, 2027, "third-city");
      for (const path of paths.slice(0, 2)) { releases.get(path).resolve(); await s.page.waitForFunction((path) => window.completedTransport.includes(path), path); }
      await search(s.page, "第三城 2027 A");
      assert.match(await s.page.locator(".leaflet-popup-content").textContent(), /第三城 2027 A/);
      await snapshot(s.page, `p07-${engine}-race-c-a-b`, release, records);
      assert.deepEqual(s.errors, []);
    } finally { for (const gate of releases.values()) gate.resolve(); server.state.overrides.clear(); await s.close(); }
  });
}
