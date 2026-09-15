/** P07: real production service workers; no bypass, no mocked internal components. */
import assert from "node:assert/strict";
import { before, after } from "node:test";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { test } from "./evidence.mjs";
import { createBrowserHarness } from "./helpers.mjs";
import { releaseFixture, buildReleaseFixture, releaseServer, pwaSession, initialSelection, dataPath, ready, controlled, cached, choose, search, snapshot, saveRecords } from "./release.helpers.mjs";

process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve("node_modules/.cache/playwright");
const { chromium, webkit } = await import("playwright");
let temporary, harness, server, chrome, safariEngine, release, fixture;
const records = [];
before(async () => {
  temporary = await mkdtemp(join(tmpdir(), "foodie-p07-cache-"));
  fixture = await releaseFixture("B");
  release = await buildReleaseFixture(fixture, join(temporary, "B"));
  server = await releaseServer(join(temporary, "B"));
  harness = await createBrowserHarness({ outDir: join(temporary, "B"), server });
  chrome = await chromium.connectOverCDP(harness.browser.wsEndpoint());
  safariEngine = await webkit.launch();
});
after(async () => {
  await saveRecords("p07-cache.json", { chromium: chrome?.version(), webkit: safariEngine?.version(), release, fixture: "isolated raw catalog/annual files through the formal P03 parser and P02 validation", records });
  await safariEngine?.close(); await chrome?.close(); await harness?.close();
  if (temporary) await rm(temporary, { recursive: true, force: true });
});

test("P07-R1/R2 exact deployment artifact boots and caches its real registered data", async () => {
  const outDir = resolve(process.env.E2E_DIST ?? "dist");
  const deployment = JSON.parse(await readFile(join(outDir, "release.json"), "utf8"));
  const catalog = JSON.parse(await readFile(join(outDir, "data/catalog.json"), "utf8"));
  assert.equal(deployment.discovery.provider, "/data/catalog.json");
  const actualServer = await releaseServer(outDir);
  const actualHarness = await createBrowserHarness({ outDir, server: actualServer });
  const browser = await chromium.connectOverCDP(actualHarness.browser.wsEndpoint());
  const s = await pwaSession(browser, actualServer);
  try {
    await s.page.goto(actualServer.baseUrl + "/"); await controlled(s.page);
    const selected = await s.page.locator(".dataset-status").getAttribute("data-dataset");
    const [logical, resource] = Object.entries(deployment.resources).find(([, entry]) => entry.identity === selected);
    await cached(s.page, deployment, logical);
    assert.equal(await s.page.locator(".dataset-status").getAttribute("data-revision"), resource.sha256);
    const guide = catalog.cities.flatMap((city) => city.guides).find((entry) => entry.dataPath === logical);
    const resourcePage = await s.context.newPage();
    for (const path of [logical, guide?.legacyPath].filter(Boolean)) {
      const response = await resourcePage.goto(actualServer.baseUrl + path);
      assert.match(response.headers()["content-type"], /application\/json/u, "an installed worker must preserve annual and pinned legacy JSON navigations");
      assert.equal(createHash("sha256").update(await response.body()).digest("hex"), resource.sha256);
    }
    await resourcePage.close();
    await s.context.setOffline(true); actualServer.state.offline = true;
    await s.page.reload(); await controlled(s.page);
    assert.equal(await s.page.locator(".dataset-status").getAttribute("data-dataset"), selected);
    assert.equal(await s.page.locator(".dataset-status").getAttribute("data-revision"), resource.sha256);
    assert.match(await s.page.locator(".dataset-status").textContent(), /离线.*缓存/u);
    await snapshot(s.page, "p07-exact-deployment-artifact", deployment, records);
    assert.deepEqual(s.errors, []);
  } finally { actualServer.state.offline = false; await s.close(); await browser.close(); await actualHarness.close(); }
});

for (const engine of ["chromium", "webkit"]) {
  const browser = () => engine === "chromium" ? chrome : safariEngine;
  test(`P07-R3/R4 ${engine}: stalled headers and body have a bounded verified-cache fallback`, async () => {
    const s = await pwaSession(browser(), server);
    try {
      await s.page.goto(server.baseUrl + initialSelection); await controlled(s.page); await cached(s.page, release);
      const known = release.resources[dataPath].url;
      const unknown = release.resources["/data/fixture-city/2027/michelin-bib-gourmand.json"].url;
      for (const partialBody of ["", "["]) {
        for (const url of [known, unknown]) server.state.overrides.set(url, { hang: true, partialBody });
        const started = performance.now();
        const responses = await s.page.evaluate(async (urls) => Promise.all(urls.map(async (url) => {
          const response = await fetch(url, { cache: "no-store" });
          return { status: response.status, cache: response.headers.get("x-foodie-cache"), network: response.headers.get("x-foodie-network"), body: await response.text() };
        })), [known, unknown]);
        const elapsedMs = performance.now() - started;
        assert.equal(responses[0].cache, "hit"); assert.equal(responses[0].network, "unavailable");
        assert.equal(createHash("sha256").update(responses[0].body).digest("hex"), release.resources[dataPath].sha256);
        assert.equal(responses[1].status, 503); assert.equal(responses[1].network, "unavailable");
        assert.ok(elapsedMs < 10_000, "network stalls must finish before the ordinary UI test deadline");
        records.push({ name: `${engine}-stalled-${partialBody ? "body" : "headers"}`, elapsedMs, cachedStatus: responses[0].status, uncachedStatus: responses[1].status, timeoutMs: 4000 });
      }
      server.state.overrides.clear();
      await choose(s.page, "年份", "2027"); await ready(s.page, 2027);
      await cached(s.page, release, "/data/fixture-city/2027/michelin-bib-gourmand.json");
      assert.deepEqual(s.errors, []);
    } finally { server.state.overrides.clear(); await s.close(); }
  });
  test(`P07-R3 ${engine}: bad HTTP/JSON/contract/identity responses preserve good cache`, async () => {
    const s = await pwaSession(browser(), server);
    try {
      await s.page.goto(server.baseUrl + initialSelection); await controlled(s.page); await cached(s.page, release);
      const url = release.resources[dataPath].url;
      const good = await s.page.evaluate(async (url) => (await fetch(url)).text(), url);
      const bad = [
        { name: "404", status: 404, body: "Not found" }, { name: "500", status: 500, body: "Error" },
        { name: "html-as-json", body: "<html>Not data</html>" }, { name: "html-content-type", contentType: "text/html", body: good },
        { name: "bad-json", body: "{" }, { name: "invalid-contract", body: JSON.stringify([{ id: 1 }]) },
        { name: "wrong-identity", body: JSON.stringify(fixture.payloads[dataPath].map((record) => ({ ...record, edition_year: 2025 }))) },
        { name: "old-same-year-revision", body: JSON.stringify(fixture.payloads[dataPath].map((record) => ({ ...record, name: record.name.replace(" · 修订 B", "") }))) },
      ];
      for (const response of bad) {
        server.state.overrides.set(url, response);
        const actual = await s.page.evaluate(async ({ url, cacheName }) => {
          const response = await fetch(url, { cache: "no-store" });
          return { status: response.status, cache: response.headers.get("x-foodie-cache"), body: await response.text(), stored: await (await (await caches.open(cacheName)).match(url)).text() };
        }, { url, cacheName: `foodie-map:v3:data:${release.buildId}` });
        assert.equal(actual.cache, "hit", response.name); assert.equal(actual.body, good, response.name); assert.equal(actual.stored, good, response.name);
        records.push({ name: `${engine}-${response.name}`, status: actual.status, cache: actual.cache, preserved: true, build: release.buildId, revision: release.resources[dataPath].sha256 });
      }
      server.state.overrides.delete(url);
      for (const logical of ["/data/catalog.json", "/data/taxonomy/fixture-city.json"]) {
        const metadataUrl = release.resources[logical].url;
        const goodMetadata = await s.page.evaluate(async (url) => (await fetch(url)).text(), metadataUrl);
        server.state.overrides.set(metadataUrl, { body: JSON.stringify({ stale: true, city: "old-context" }) });
        const metadata = await s.page.evaluate(async (url) => { const response = await fetch(url); return { cache: response.headers.get("x-foodie-cache"), body: await response.text() }; }, metadataUrl);
        assert.equal(metadata.cache, "hit"); assert.equal(metadata.body, goodMetadata);
        records.push({ name: `${engine}-metadata-cache-integrity`, logical, revision: release.resources[logical].sha256, preserved: true, formalDiscovery: true, syntheticData: true });
        server.state.overrides.delete(metadataUrl);
      }
      await snapshot(s.page, `p07-${engine}-bad-responses-preserve-cache`, release, records);
      assert.deepEqual(s.errors, []);
    } finally { server.state.overrides.clear(); await s.close(); }
  });

  test(`P07-R3 ${engine}: injected old payload cannot fill a new revision context`, async () => {
    const s = await pwaSession(browser(), server);
    const url = release.resources[dataPath].url;
    try {
      const old = (await releaseFixture("A")).payloads[dataPath];
      server.state.overrides.set(url, { body: JSON.stringify(old) });
      await s.page.goto(server.baseUrl + initialSelection);
      await s.page.locator('.dataset-status[data-state="error"]').waitFor();
      await s.page.waitForFunction(() => navigator.serviceWorker.controller !== null);
      await s.page.locator('.dataset-status[data-state="error"]').waitFor();
      assert.equal(await s.page.locator(".marker-dot, .cluster-badge").count(), 0);
      await s.page.evaluate(async ({ url, name, old }) => (await caches.open(name)).put(url, new Response(JSON.stringify(old), { headers: { "content-type": "application/json" } })), { url, name: `foodie-map:v3:data:${release.buildId}`, old });
      if (engine === "chromium") await s.context.setOffline(true); server.state.offline = true;
      await s.page.getByRole("button", { name: "重试", exact: true }).click();
      await s.page.locator('.dataset-status[data-state="error"]').waitFor();
      assert.equal(await s.page.locator(".marker-dot, .cluster-badge").count(), 0);
      await snapshot(s.page, `p07-${engine}-old-payload-rejected`, release, records);
      server.state.offline = false; server.state.overrides.clear(); if (engine === "chromium") await s.context.setOffline(false);
      await s.page.getByRole("button", { name: "重试", exact: true }).click(); await ready(s.page); await cached(s.page, release);
      await search(s.page, "修订 B");
      assert.match(await s.page.locator(".leaflet-popup-content").textContent(), /修订 B/);
      assert.deepEqual(s.errors, []);
    } finally { server.state.offline = false; server.state.overrides.clear(); await s.close(); }
  });

  test(`P07-R4 ${engine}: offline refresh/reopen/fallback, unknown city/year and online retry`, async () => {
    const s = await pwaSession(browser(), server, { width: 390, height: 844 });
    try {
      await s.page.goto(server.baseUrl + initialSelection); await controlled(s.page); await cached(s.page, release);
      const cachedPaths = await s.page.evaluate(async (name) => (await (await caches.open(name)).keys()).map((request) => new URL(request.url).pathname), `foodie-map:v3:data:${release.buildId}`);
      assert.deepEqual(cachedPaths.sort(), [release.resources[dataPath].url, release.resources["/data/taxonomy/fixture-city.json"].url, release.resources["/data/taxonomy/fixture-city-mappings.json"].url].sort(), "only visited dataset/taxonomy/mappings cached");
      if (engine === "chromium") await s.context.setOffline(true); server.state.offline = true;
      await s.page.reload(); await ready(s.page);
      assert.match(await s.page.locator(".dataset-status").textContent(), /离线.*缓存/);
      await search(s.page, "无坐标");
      assert.match(await s.page.locator(".mobile-popup-card").textContent(), /暂无可靠坐标/);
      await s.page.keyboard.press("Escape");
      await s.page.getByRole("button", { name: "筛选", exact: true }).click();
      await s.page.getByRole("button", { name: "餐食 1", exact: true }).click();
      await s.page.waitForFunction(() => document.querySelector(".dataset-status").textContent.includes("筛选结果 1"));
      await s.page.keyboard.press("Escape");
      await snapshot(s.page, `p07-${engine}-offline-search-filter-detail`, release, records);
      await choose(s.page, "年份", "2027");
      await s.page.locator('.dataset-status[data-state="error"]').waitFor();
      assert.match(await s.page.locator(".dataset-status").textContent(), /此版次尚未缓存/);
      assert.equal(await s.page.locator(".marker-dot, .cluster-badge, .mobile-popup-card").count(), 0);
      await snapshot(s.page, `p07-${engine}-offline-uncached-year`, release, records);
      server.state.offline = false; if (engine === "chromium") await s.context.setOffline(false);
      await s.page.getByRole("button", { name: "重试", exact: true }).click(); await ready(s.page, 2027);
      if (engine === "chromium") await s.context.setOffline(true); server.state.offline = true;
      await choose(s.page, "城市", "新城"); await s.page.locator('.dataset-status[data-state="error"]').waitFor();
      assert.equal(await s.page.locator(".marker-dot, .cluster-badge").count(), 0);
      server.state.offline = false; if (engine === "chromium") await s.context.setOffline(false);
      await s.page.getByRole("button", { name: "重试", exact: true }).click(); await ready(s.page, 2027, "new-city");
      await snapshot(s.page, `p07-${engine}-online-retry-correct-city`, release, records);
      if (engine === "chromium") await s.context.setOffline(true); server.state.offline = true;
      // Closing every page leaves only the stored app/worker; opening a new page exercises cold startup.
      await s.page.close();
      const reopened = await s.context.newPage();
      await reopened.goto(server.baseUrl + "/saved/place" + initialSelection.slice(1)); await ready(reopened);
      assert.match(await reopened.locator(".dataset-status").textContent(), /离线.*缓存/);
      await snapshot(reopened, `p07-${engine}-cold-offline-navigation-fallback`, release, records);
      assert.deepEqual(s.errors, []);
    } finally { server.state.offline = false; await s.close(); }
  });
}
