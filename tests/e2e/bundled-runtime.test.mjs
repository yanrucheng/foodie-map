/** P01-R2: actual built Leaflet/plugins with every external HTTP request blocked. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "./evidence.mjs";
import { createBrowserHarness, restaurants } from "./helpers.mjs";

test("production map, clusters, heat, and controls work without code CDN, fonts, or tiles", async () => {
  const harness = await createBrowserHarness();
  let session;
  try {
    const viewport = { width: 1280, height: 800 };
    session = await harness.createPage(viewport);
    const { page } = session;
    const artifacts = process.env.E2E_ARTIFACT_DIR;
    if (artifacts) await mkdir(artifacts, { recursive: true });
    await page.goto(harness.fixtureUrl, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#map.leaflet-container .leaflet-control-zoom", { visible: true });
    await page.waitForFunction((count) => document.querySelector(".cluster-badge")?.textContent === String(count), {}, restaurants.length);
    const runtime = await page.evaluate(() => {
      const styles = [...document.styleSheets]
        .filter((sheet) => sheet.href?.startsWith(location.origin))
        .flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText)).join("\n");
      return {
        version: window.L.version,
        cluster: typeof window.L.markerClusterGroup,
        heat: typeof window.L.heatLayer,
        panePosition: getComputedStyle(document.querySelector(".leaflet-pane")).position,
        clusterCss: styles.includes(".marker-cluster-small"),
        scripts: [...document.scripts].map((script) => script.src),
        stylesheets: [...document.querySelectorAll('link[rel="stylesheet"]')].map((link) => link.href),
        fontFamily: getComputedStyle(document.body).fontFamily,
      };
    });
    assert.equal(runtime.version, "1.9.4");
    assert.equal(runtime.cluster, "function");
    assert.equal(runtime.heat, "function");
    assert.equal(runtime.panePosition, "absolute");
    assert.equal(runtime.clusterCss, true);
    assert.ok(runtime.scripts.every((url) => url.startsWith(harness.baseUrl)));
    assert.match(runtime.fontFamily, /sans-serif/);
    if (artifacts) await page.screenshot({ path: join(artifacts, "runtime-marker.png") });

    // Real filter interactions prove the React shell and cluster plugin cooperate.
    await page.click('.filter-list input[type="checkbox"]');
    await page.waitForSelector(".marker-dot", { visible: true });
    await page.click('.filter-list input[type="checkbox"]');
    await page.waitForFunction((count) => document.querySelector(".cluster-badge")?.textContent === String(count), {}, restaurants.length);
    await page.click(".mode-btn");
    await page.waitForFunction(() => {
      const canvas = document.querySelector("canvas.leaflet-heatmap-layer");
      if (!canvas || !canvas.width || !canvas.height) return false;
      const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      return pixels.some((value, index) => index % 4 === 3 && value > 0);
    });
    assert.match(await page.$eval(".mode-btn", (element) => element.textContent), /标记模式/);
    if (artifacts) await page.screenshot({ path: join(artifacts, "runtime-heat.png") });
    await page.click(".mode-btn");
    await page.waitForFunction(() => !document.querySelector("canvas.leaflet-heatmap-layer"));
    await page.waitForSelector(".cluster-badge", { visible: true });
    await page.type('.search-wrap input', "P01 Fixture");
    await page.waitForSelector(".search-dropdown-item", { visible: true });
    assert.equal((await page.$$(".search-dropdown-item")).length, restaurants.length);

    const blocked = session.requests.filter((request) => request.blocked);
    assert.ok(blocked.some((request) => request.url.includes("fonts.googleapis.com")), "Font failure must be exercised");
    assert.ok(blocked.some((request) => request.url.includes("autonavi.com")), "Tile failure must be exercised");
    assert.ok(!session.requests.some((request) => request.blocked && request.type === "script"), "Built app must not request external code");
    assert.deepEqual(session.errors, []);
    assert.deepEqual(session.consoleErrors.filter((message) => !message.includes("net::ERR_FAILED")), []);
    const evidence = {
      browser: await harness.browser.version(), viewport,
      fixture: "tests/e2e/fixtures/restaurants.json", fixtureCount: restaurants.length,
      externalHttpPolicy: "abort every non-preview origin (including unpkg, fonts, and tiles)",
      serviceWorker: "bypassed; upgrade/offline scenarios belong to P07",
      runtime, blockedRequests: blocked, pageErrors: session.errors,
      consoleErrors: session.consoleErrors,
      checks: ["local code and CSS", "cluster count", "filter toggles", "nonempty heat pixels", "return to markers", "search suggestions"],
    };
    if (artifacts) await writeFile(join(artifacts, "bundled-runtime.json"), JSON.stringify(evidence, null, 2) + "\n");
    console.log(JSON.stringify({ browser: evidence.browser, viewport, fixtureCount: restaurants.length, blockedRequests: blocked.length, pageErrors: session.errors.length }));
  } catch (error) {
    console.error(JSON.stringify({ pageErrors: session?.errors, consoleErrors: session?.consoleErrors }));
    throw error;
  } finally {
    await harness.close();
  }
});
