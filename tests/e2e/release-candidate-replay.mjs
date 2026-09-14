/** Local artifact-pair replay using the existing browser harness and real service workers. */
import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright";
import { artifactIdentity, sha256 } from "../../scripts/release-artifact.ts";
import { createBrowserHarness } from "./helpers.mjs";
import { test } from "./evidence.mjs";
import { releaseServer, pwaSession, ready, controlled, cached, search, snapshot, saveRecords, installWaiting, activateAfterClosingPages } from "./release.helpers.mjs";

const { values } = parseArgs({ options: { before: { type: "string" }, after: { type: "string" }, output: { type: "string", default: "test-results/candidate-rollout" } } });
assert.ok(values.before && values.after, "Supply complete --before and --after artifact directories; neither is rebuilt by this replay");
const before = resolve(values.before), after = resolve(values.after);
assert.notEqual(before, after);
process.env.E2E_ARTIFACT_DIR = resolve(values.output);

test("P07 integrated candidates: existing pre-catalog Worker, offline, formal catalog upgrade and exact A to B to A rollback", async () => {
  await mkdir(process.env.E2E_ARTIFACT_DIR, { recursive: true });
  const A = JSON.parse(await readFile(join(before, "release.json"), "utf8"));
  const B = JSON.parse(await readFile(join(after, "release.json"), "utf8"));
  assert.notEqual(A.buildId, B.buildId);
  assert.equal(B.discovery.provider, "/data/catalog.json");
  const artifacts = { A: await artifactIdentity(before), B: await artifactIdentity(after) };
  await saveRecords("inputs.json", { before, after, A, B, artifacts });
  const shared = Object.entries(A.resources).filter(([, resource]) => resource.kind === "restaurants" && Object.values(B.resources).some((entry) => entry.identity === resource.identity));
  assert.ok(shared.length >= 2, "Two shared identities are needed for cached and uncached paths");
  const [pathA, resourceA] = shared[0];
  const [city, year, guide] = resourceA.identity.split("/");
  const [pathB, resourceB] = Object.entries(B.resources).find(([, resource]) => resource.identity === resourceA.identity);
  const [, uncached] = shared.find(([, resource]) => !resource.identity.startsWith(`${city}/`));
  const selection = `/?${new URLSearchParams({ city, year, guide })}`;
  const rawA = await readFile(join(before, resourceA.url));
  const rawB = await readFile(join(after, resourceB.url));
  const firstA = JSON.parse(rawA)[0], firstB = JSON.parse(rawB)[0];
  const term = (record) => record.name_zh || record.name_en || record.name;
  const records = [];
  let server, harness, browser, session;
  try {
    server = await releaseServer(before);
    harness = await createBrowserHarness({ outDir: before, server });
    browser = await chromium.connectOverCDP(harness.browser.wsEndpoint());
    session = await pwaSession(browser, server);
    const context = session.context;
    let page = session.page;
    const readyIdentity = (page) => ready(page, Number(year), city);
    const offline = async (value) => { server.state.offline = value; await context.setOffline(value); };
    const show = async (page, release, name, query) => {
      await search(page, query);
      assert.ok((await page.locator(".mobile-popup-card, .leaflet-popup-content").textContent()).includes(query));
      await snapshot(page, name, release, records);
      await page.keyboard.press("Escape");
    };
    await page.goto(server.baseUrl + selection); await controlled(page); await readyIdentity(page); await cached(page, A, pathA);
    await page.evaluate(async () => (await caches.open("another-app:catalog-migration")).put("/neighbor", new Response("preserved")));
    await offline(true); await page.reload(); await readyIdentity(page);
    assert.match(await page.locator(".dataset-status").textContent(), /离线.*缓存/u);
    await show(page, A, "candidate-A-existing-offline", term(firstA));
    const [otherCity, otherYear, otherGuide] = uncached.identity.split("/");
    await page.goto(server.baseUrl + `/?${new URLSearchParams({ city: otherCity, year: otherYear, guide: otherGuide })}`);
    await page.locator('.dataset-status[data-state="error"]').waitFor();
    assert.equal(await page.locator(".dataset-status").getAttribute("data-dataset"), uncached.identity);
    assert.equal(await page.locator(".marker-dot, .cluster-badge").count(), 0);
    await snapshot(page, "candidate-A-uncached-offline", A, records);
    await offline(false);
    await page.getByRole("button", { name: "重试", exact: true }).click(); await ready(page, Number(otherYear), otherCity);
    await page.goto(server.baseUrl + selection); await readyIdentity(page);

    const waitingB = await installWaiting(server, context, page, after);
    const lazyResponses = [];
    page.on("response", (response) => { if (response.url().includes("MobileShell-")) lazyResponses.push({ url: response.url(), serviceWorker: response.fromServiceWorker() }); });
    assert.equal(await page.evaluate(() => performance.getEntriesByType("resource").some((entry) => entry.name.includes("MobileShell-"))), false);
    await page.setViewportSize({ width: 390, height: 844 }); await page.locator(".mobile-shell").waitFor();
    await show(page, A, "candidate-A-old-page-after-B-published", term(firstA));
    assert.ok(lazyResponses.some((response) => response.serviceWorker), "A lazy module must come from the old Worker after B replaces the server root");
    const nextTab = await context.newPage(); await nextTab.goto(server.baseUrl + selection); await readyIdentity(nextTab);
    assert.equal(await nextTab.locator(".dataset-status").getAttribute("data-build"), A.buildId);
    page = await activateAfterClosingPages(context, waitingB);
    await page.goto(server.baseUrl + selection); await controlled(page); await readyIdentity(page); await cached(page, B, pathB);
    assert.equal(await page.locator(".dataset-status").getAttribute("data-revision"), sha256(rawB));
    const catalogResource = B.resources["/data/catalog.json"];
    const catalogResponse = await page.evaluate(async (url) => { const response = await fetch(url); return { body: await response.text(), build: response.headers.get("x-foodie-build") }; }, catalogResource.url);
    assert.equal(sha256(catalogResponse.body), catalogResource.sha256);
    assert.equal(catalogResponse.build, B.buildId);
    const catalog = JSON.parse(catalogResponse.body);
    assert.equal(catalog.cities.find((entry) => entry.id === city).guides.find((entry) => entry.id === guide && entry.year === Number(year)).dataPath, pathB);
    await offline(true); await page.reload(); await readyIdentity(page);
    assert.match(await page.locator(".dataset-status").textContent(), /离线.*缓存/u);
    await show(page, B, "candidate-B-formal-catalog-offline", term(firstB));
    await offline(false);

    const waitingA = await installWaiting(server, context, page, before);
    await show(page, B, "candidate-B-old-page-during-rollback", term(firstB));
    page = await activateAfterClosingPages(context, waitingA);
    await page.goto(server.baseUrl + selection); await controlled(page); await readyIdentity(page); await cached(page, A, pathA);
    await offline(true); await page.reload(); await readyIdentity(page);
    assert.equal(await page.locator(".dataset-status").getAttribute("data-revision"), sha256(rawA));
    await show(page, A, "candidate-back-to-exact-A-offline", term(firstA));
    const cacheState = await page.evaluate(async () => ({ keys: await caches.keys(), neighbor: await (await (await caches.open("another-app:catalog-migration")).match("/neighbor")).text() }));
    assert.equal(cacheState.neighbor, "preserved");
    assert.deepEqual(session.errors, []);
    assert.deepEqual({ A: await artifactIdentity(before), B: await artifactIdentity(after) }, artifacts);
    await saveRecords("summary.json", { passed: true, independentAcceptance: false, productionDeployment: "not invoked", browser: browser.version(), A, B, artifacts, unchangedArtifacts: true, records, lazyResponses, cacheState, paths: { A: pathA, B: pathB }, note: "A is the retained historical developer preview. The drill verifies existing-client compatibility; deploy/rollback approval still requires an accepted release." });
  } finally {
    if (server) server.state.offline = false;
    await session?.close(); await browser?.close(); await harness?.close();
  }
});
