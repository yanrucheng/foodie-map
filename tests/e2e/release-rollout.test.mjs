import assert from "node:assert/strict";
import { before, after } from "node:test";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { test } from "./evidence.mjs";
import { createBrowserHarness } from "./helpers.mjs";
import { releaseFixture, buildReleaseFixture, releaseServer, pwaSession, initialSelection, dataPath, ready, controlled, cached, choose, search, snapshot, saveRecords, installWaiting, activateAfterClosingPages } from "./release.helpers.mjs";

process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve("node_modules/.cache/playwright");
const { chromium } = await import("playwright");
let temporary, harness, server, browser, A, B, fixtureA;
const records = [];
before(async () => {
  temporary = await mkdtemp(join(tmpdir(), "foodie-p07-rollout-"));
  fixtureA = await releaseFixture("A");
  A = await buildReleaseFixture(fixtureA, join(temporary, "A"));
  B = await buildReleaseFixture(await releaseFixture("B"), join(temporary, "B"));
  server = await releaseServer(join(temporary, "A"));
  harness = await createBrowserHarness({ outDir: join(temporary, "A"), server });
  browser = await chromium.connectOverCDP(harness.browser.wsEndpoint());
});
after(async () => {
  await saveRecords("p07-rollout.json", { browser: browser?.version(), A, B, records });
  await browser?.close(); await harness?.close();
  if (temporary) await rm(temporary, { recursive: true, force: true });
});

test("P07-R3/R5 A to B to A keeps old pages, lazy chunks, editions and rollback identities coherent", async () => {
  server.state.directory = join(temporary, "A");
  const s = await pwaSession(browser, server);
  try {
    await s.page.goto(server.baseUrl + initialSelection); await controlled(s.page); await cached(s.page, A);
    const foreign = "another-app:offline:v7", obsolete = `foodie-map:v3:shell:${"0".repeat(64)}`;
    await s.page.evaluate(async ({ foreign, obsolete }) => {
      await (await caches.open(foreign)).put("/foreign-record", new Response("keep-me"));
      await (await caches.open(obsolete)).put("/old-shell", new Response("obsolete"));
    }, { foreign, obsolete });
    await snapshot(s.page, "p07-rollout-A", A, records);
    assert.equal(await s.page.evaluate(() => performance.getEntriesByType("resource").some((entry) => entry.name.includes("MobileShell-"))), false, "desktop page has not imported its lazy mobile module");
    const waitingB = await installWaiting(server, s.context, s.page, join(temporary, "B"));
    await snapshot(s.page, "p07-rollout-A-while-B-waits", A, records);
    const lazyResponses = [];
    s.page.on("response", (response) => { if (response.url().includes("MobileShell-")) lazyResponses.push({ url: response.url(), serviceWorker: response.fromServiceWorker() }); });
    await s.page.setViewportSize({ width: 390, height: 844 });
    await s.page.locator(".mobile-shell").waitFor();
    await search(s.page, "2026 A");
    assert.ok(lazyResponses.some((response) => response.serviceWorker), "old page loads real asynchronous A module from its worker after B replaced server files");
    await snapshot(s.page, "p07-rollout-A-lazy-mobile-after-B", A, records);
    await s.page.keyboard.press("Escape");
    const concurrent = await s.context.newPage();
    await concurrent.goto(server.baseUrl + initialSelection); await ready(concurrent);
    assert.equal(await concurrent.locator(".dataset-status").getAttribute("data-build"), A.buildId, "no new HTML under an old active worker");
    const pageB = await activateAfterClosingPages(s.context, waitingB);
    await pageB.goto(server.baseUrl + initialSelection); await controlled(pageB); await cached(pageB, B);
    await search(pageB, "修订 B");
    assert.match(await pageB.locator(".leaflet-popup-content").textContent(), /修订 B/);
    await snapshot(pageB, "p07-rollout-B-same-year-revision", B, records);
    await pageB.locator(".leaflet-popup-close-button").click();
    await choose(pageB, "年份", "2027"); await ready(pageB, 2027);
    await cached(pageB, B, "/data/fixture-city/2027/michelin-bib-gourmand.json");
    await s.context.setOffline(true); server.state.offline = true;
    await pageB.reload(); await ready(pageB, 2027);
    await snapshot(pageB, "p07-rollout-B-new-year-offline", B, records);
    server.state.offline = false; await s.context.setOffline(false);
    const waitingA = await installWaiting(server, s.context, pageB, join(temporary, "A"));
    await choose(pageB, "年份", "2026"); await ready(pageB);
    await search(pageB, "修订 B");
    assert.match(await pageB.locator(".leaflet-popup-content").textContent(), /修订 B/);
    await snapshot(pageB, "p07-rollout-B-while-rollback-waits", B, records);
    const pageA = await activateAfterClosingPages(s.context, waitingA);
    await pageA.goto(server.baseUrl + initialSelection); await controlled(pageA); await cached(pageA, A);
    await search(pageA, "2026 A");
    assert.doesNotMatch(await pageA.locator(".leaflet-popup-content").textContent(), /修订 B/);
    const cacheState = await pageA.evaluate(async ({ foreign, obsolete }) => ({ keys: await caches.keys(), foreign: await (await (await caches.open(foreign)).match("/foreign-record")).text(), obsolete: await caches.has(obsolete) }), { foreign, obsolete });
    assert.equal(cacheState.foreign, "keep-me"); assert.equal(cacheState.obsolete, false);
    assert.equal(await pageA.locator(".dataset-status").getAttribute("data-revision"), A.resources[dataPath].sha256);
    await snapshot(pageA, "p07-rollout-back-to-A", A, records);
    records.push({ name: "A-B-A cache ownership and actual lazy resources", cacheState, lazyResponses });
    assert.deepEqual(s.errors, []);
  } finally { server.state.offline = false; server.state.overrides.clear(); await s.close(); }
});

test("P07-R3/R5 legacy v2 worker upgrades without trusting its cached payloads or deleting other apps", async () => {
  server.state.directory = join(temporary, "A");
  server.state.overrides.set("/sw.js", { contentType: "text/javascript", body: await readFile(new URL("./fixtures/legacy-sw.js", import.meta.url), "utf8") });
  const s = await pwaSession(browser, server);
  try {
    await s.page.goto(server.baseUrl + initialSelection); await controlled(s.page); await s.page.reload(); await ready(s.page);
    assert.equal(await s.page.evaluate(() => caches.has("foodie-map-shell-v2")), true);
    await s.page.evaluate(async () => (await caches.open("another-app:legacy-neighbor")).put("/neighbor", new Response("unchanged")));
    server.state.overrides.delete("/sw.js");
    const waitingB = await installWaiting(server, s.context, s.page, join(temporary, "B"));
    const url = B.resources[dataPath].url;
    server.state.overrides.set(url, { body: JSON.stringify(fixtureA.payloads[dataPath]) });
    const newPage = await s.context.newPage();
    await newPage.goto(server.baseUrl + initialSelection);
    await newPage.locator('.dataset-status[data-state="error"]').waitFor();
    assert.equal(await newPage.locator(".marker-dot, .cluster-badge").count(), 0);
    assert.equal(await newPage.locator(".dataset-status").getAttribute("data-build"), B.buildId);
    await snapshot(newPage, "p07-legacy-worker-new-page-rejects-old-body", B, records);
    server.state.overrides.delete(url);
    await newPage.getByRole("button", { name: "重试", exact: true }).click(); await ready(newPage);
    const upgraded = await activateAfterClosingPages(s.context, waitingB);
    await upgraded.goto(server.baseUrl + initialSelection); await controlled(upgraded); await cached(upgraded, B);
    const cachesAfter = await upgraded.evaluate(async () => ({ legacy: await caches.has("foodie-map-shell-v2"), neighbor: await (await (await caches.open("another-app:legacy-neighbor")).match("/neighbor")).text() }));
    assert.deepEqual(cachesAfter, { legacy: false, neighbor: "unchanged" });
    await s.context.setOffline(true); server.state.offline = true;
    await upgraded.reload(); await ready(upgraded);
    await snapshot(upgraded, "p07-legacy-upgraded-offline-B", B, records);
    records.push({ name: "legacy cache cleanup", ...cachesAfter });
  } finally { server.state.offline = false; server.state.overrides.clear(); await s.close(); }
});
