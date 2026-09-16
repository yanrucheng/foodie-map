/** P07 laboratory budgets. Run separately from functional tests, on one idle machine. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve, relative } from "node:path";
import { tmpdir, cpus, totalmem, platform, release, arch } from "node:os";
import { gzipSync } from "node:zlib";
import { parseArgs } from "node:util";
import { cities } from "../../src/config/cities.ts";
import { createBrowserHarness } from "./helpers.mjs";
import { buildReleaseFixture } from "./release.helpers.mjs";

const { values } = parseArgs({ options: { output: { type: "string" }, dist: { type: "string", default: "dist" } } });
const output = resolve(values.output ?? "test-results/performance.json");
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const seed = 7042026;
let randomState = seed;
const random = () => ((randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0) / 2 ** 32);
const fixtures = Array.from({ length: 1000 }, (_, index) => ({
  id: index + 1, city: "performance-city", guide_type: "michelin-bib-gourmand", edition_year: 2026,
  name: `性能 ${String(index).padStart(4, "0")}`, name_en: `Performance ${String(index).padStart(4, "0")}`,
  cuisine: index % 2 ? "A" : "B", cuisine_group: index % 2 ? "A" : "B", serving_form: index % 2 ? "meal" : "dessert", dining_category: index % 2 ? "meat" : "dessert_drink", price_range: "¥¥¥¥",
  lat: 22.302 + (random() - 0.5) * 0.015, lon: 114.177 + (random() - 0.5) * 0.015, geocode_success: true,
}));
const fixturePath = "/data/performance-city/2026/michelin-bib-gourmand.json";
const fixtureCity = { id: "performance-city", label: "Performance", labelZh: "性能测试", center: [22.302, 114.177], zoom: 11,
  guides: [{ id: "michelin-bib-gourmand", year: 2026, label: "Fixture", labelZh: "米其林必比登", dataPath: fixturePath }] };
const taxonomy = { version: 1, city: "performance-city", fallbackGroup: "OTHER", groups: [{ key: "A", labelZh: "甲", labelEn: "A", sortOrder: 1 }, { key: "B", labelZh: "乙", labelEn: "B", sortOrder: 2 }, { key: "OTHER", labelZh: "其他", labelEn: "Other", sortOrder: 3 }] };
const candidates = await Promise.all(cities.flatMap((city) => city.guides.map(async (guide) => {
  const bytes = await readFile(join("public", guide.dataPath));
  return { city, guide, count: JSON.parse(bytes).length, sha256: digest(bytes) };
})));
const largest = candidates.sort((a, b) => b.count - a.count || a.guide.dataPath.localeCompare(b.guide.dataPath))[0];
const temporary = await mkdtemp(join(tmpdir(), "foodie-p07-performance-"));
const result = {
  kind: "laboratory measurements; not field INP or p75", startedAt: new Date().toISOString(),
  environment: { node: process.version, os: `${platform()} ${release()}`, arch: arch(), cpu: cpus()[0]?.model, logicalCPUs: cpus().length, memoryBytes: totalmem() },
  protocol: { viewport: { width: 390, height: 844 }, cpuThrottle: 4, downloadBitsPerSecond: 10_000_000, uploadBitsPerSecond: 10_000_000, latencyMs: 40,
    coldNavigationsPerDataset: 5, externalTiles: "fixed one-pixel PNG", externalFonts: "fixed empty CSS; system fallback",
    navigationCompletion: "dataset and mapped points ready, all initial requests settled, document.fonts.ready, finite animations finished, two animation frames",
    interactionCompletion: "trusted input/click capture to expected visible suggestions or filter count AND mapped point count, then two animation frames",
    percentile: "nearest rank: sorted[ceil(0.95*n)-1]", median: "middle of five sorted samples", javascript: "sum gzip(level=9) of every distinct first-screen own JS response including asynchronous chunks and bundled libraries",
  },
  datasets: [{ kind: "largest-current", path: largest.guide.dataPath, count: largest.count, sha256: largest.sha256 }, { kind: "fixture-1000", seed, count: fixtures.length, sha256: digest(JSON.stringify(fixtures)) }],
  samples: [], interactions: [],
};
let actual, synthetic;
try {
  const fixtureRelease = await buildReleaseFixture({ cities: [fixtureCity], payloads: {
    [fixturePath]: fixtures, "/data/taxonomy/performance-city.json": taxonomy,
    "/data/taxonomy/performance-city-mappings.json": { version: 1, city: "performance-city", mappings: [{ raw: "A", groupKey: "A" }, { raw: "B", groupKey: "B" }] },
  } }, join(temporary, "fixture"));
  actual = await createBrowserHarness({ outDir: resolve(values.dist) });
  synthetic = await createBrowserHarness({ outDir: join(temporary, "fixture") });
  result.environment.chromium = await actual.browser.version();
  result.environment.executable = actual.browser.process().spawnfile;
  result.releases = { actual: JSON.parse(await readFile(join(values.dist, "release.json"), "utf8")), fixture: fixtureRelease };
  result.protocol.serviceWorker = "cold contexts; production worker installs normally; first-screen JS includes worker and precached lazy JS observed at the server";
  async function files(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    return (await Promise.all(entries.map((entry) => entry.isDirectory() ? files(join(directory, entry.name)) : join(directory, entry.name)))).flat();
  }
  result.builds = {};
  for (const [name, directory] of [["largest-current", resolve(values.dist)], ["fixture-1000", join(temporary, "fixture")]]) {
    const entries = await Promise.all((await files(directory)).sort().map(async (path) => [relative(directory, path), digest(await readFile(path))]));
    result.builds[name] = { sha256: digest(JSON.stringify(entries)), files: Object.fromEntries(entries) };
  }
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF1sAAAAASUVORK5CYII=", "base64");
  for (const kind of ["largest-current", "fixture-1000"]) {
    const harness = kind === "largest-current" ? actual : synthetic;
    for (let run = 1; run <= 5; run++) {
      const requestStart = harness.requests.length;
      const context = await harness.browser.createBrowserContext();
      const page = await context.newPage();
      const javascript = new Map();
      const responseJobs = [];
      const errors = [];
      const externalResponses = [];
      let pending = 0;
      try {
        await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
        page.setDefaultTimeout(30_000);
        const cdp = await page.createCDPSession();
        await cdp.send("Network.enable");
        await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
        await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 40, downloadThroughput: 10_000_000 / 8, uploadThroughput: 10_000_000 / 8, connectionType: "cellular4g" });
        await page.setRequestInterception(true);
        page.on("pageerror", (error) => errors.push(String(error)));
        page.on("request", (request) => {
          pending++;
          const url = new URL(request.url());
          const external = url.origin !== harness.baseUrl;
          const image = request.resourceType() === "image";
          if (external) externalResponses.push({ url: url.href, resourceType: request.resourceType(), contentType: image ? "image/png" : "text/css", sha256: digest(image ? png : "/* fixed laboratory font response */") });
          const response = external
            ? request.respond(image ? { contentType: "image/png", body: png } : { contentType: "text/css", body: "/* fixed laboratory font response */" })
            : request.continue();
          response.catch((error) => errors.push(String(error)));
        });
        page.on("requestfinished", () => pending--);
        page.on("requestfailed", () => pending--);
        page.on("response", (response) => {
          if (response.url().startsWith(harness.baseUrl) && new URL(response.url()).pathname.endsWith(".js")) {
            responseJobs.push(response.buffer().then((body) => javascript.set(new URL(response.url()).pathname, { bytes: body.length, gzipBytes: gzipSync(body, { level: 9 }).length, sha256: digest(body) })));
          }
        });
        await page.evaluateOnNewDocument(() => {
          window.p07Perf = { lcp: [], cls: [], longTasks: [] };
          new PerformanceObserver((list) => window.p07Perf.lcp.push(...list.getEntries().map((entry) => ({ startTime: entry.startTime, size: entry.size, element: entry.element?.outerHTML.slice(0, 300) })))).observe({ type: "largest-contentful-paint", buffered: true });
          new PerformanceObserver((list) => window.p07Perf.cls.push(...list.getEntries().map((entry) => ({ value: entry.value, startTime: entry.startTime, hadRecentInput: entry.hadRecentInput })))).observe({ type: "layout-shift", buffered: true });
          new PerformanceObserver((list) => window.p07Perf.longTasks.push(...list.getEntries().map((entry) => ({ startTime: entry.startTime, duration: entry.duration })))).observe({ type: "longtask", buffered: true });
        });
        const query = kind === "largest-current" ? `?city=${largest.city.id}&year=${largest.guide.year}&guide=${largest.guide.id}` : `?city=performance-city&year=2026&guide=michelin-bib-gourmand`;
        await page.goto(harness.baseUrl + "/" + query, { waitUntil: "load" });
        await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistration())?.active?.state === "activated");
        await page.waitForSelector('.dataset-status[data-state="ready"]');
        await page.waitForSelector(".marker-dot, .cluster-badge");
        await page.waitForNetworkIdle({ idleTime: 200, timeout: 30_000 });
        assert.equal(pending, 0, "all initial requests completed");
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(document.getAnimations().filter((animation) => animation.effect.getComputedTiming().iterations !== Infinity).map((animation) => animation.finished.catch(() => {})));
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        });
        const tileRender = await page.evaluate(() => [...document.querySelectorAll("img.leaflet-tile")].map((image) => ({ complete: image.complete, width: image.naturalWidth, height: image.naturalHeight })));
        assert.ok(tileRender.length > 0 && tileRender.every((image) => image.complete && image.width === 1 && image.height === 1), "Every provider's tiles must decode the same controlled PNG");
        await Promise.all(responseJobs);
        const directory = kind === "largest-current" ? resolve(values.dist) : join(temporary, "fixture");
        for (const request of harness.requests.slice(requestStart)) {
          const pathname = new URL(request.url, harness.baseUrl).pathname;
          if (pathname.endsWith(".js")) {
            const body = await readFile(join(directory, pathname));
            javascript.set(pathname, { bytes: body.length, gzipBytes: gzipSync(body, { level: 9 }).length, sha256: digest(body) });
          }
        }
        const metrics = await page.evaluate(() => ({ ...window.p07Perf, end: performance.now(), status: document.querySelector(".dataset-status").textContent, navigation: performance.getEntriesByType("navigation")[0].toJSON() }));
        assert.ok(metrics.lcp.length, "LCP observed");
        // CLS uses the maximum session window, per the Web Vitals definition.
        let cls = 0, windowValue = 0, first = -Infinity, last = -Infinity;
        for (const entry of metrics.cls.filter((entry) => !entry.hadRecentInput)) {
          if (entry.startTime - last >= 1000 || entry.startTime - first >= 5000) { first = entry.startTime; windowValue = 0; }
          windowValue += entry.value; last = entry.startTime; cls = Math.max(cls, windowValue);
        }
        const sample = { kind, run, lcpMs: metrics.lcp.at(-1).startTime, cls, jsGzipBytes: [...javascript.values()].reduce((sum, item) => sum + item.gzipBytes, 0), javascript: Object.fromEntries(javascript), externalResponses, tileRender, errors, metrics };
        result.samples.push(sample);
        console.log(JSON.stringify({ kind, run, lcpMs: sample.lcpMs, cls, jsGzipBytes: sample.jsGzipBytes }));
        assert.deepEqual(errors, []);
        if (kind === "fixture-1000" && run === 5) {
          async function arm(expected) {
            await page.evaluate((expected) => {
              window.p07Interaction = null;
              let start;
              const finished = () => {
                if (start == null) return;
                const options = [...document.querySelectorAll(".search-dropdown-item .search-item-name")].map((node) => node.textContent);
                const mapped = [...document.querySelectorAll(".cluster-badge")].reduce((sum, node) => sum + Number(node.textContent), 0) + document.querySelectorAll(".marker-dot").length;
                const done = expected.type === "search" ? JSON.stringify(options) === JSON.stringify(expected.names)
                  : document.querySelector(".dataset-status")?.textContent.includes(`筛选结果 ${expected.count} ·`) && mapped === expected.count;
                if (!done) return;
                observer.disconnect();
                requestAnimationFrame(() => requestAnimationFrame(() => { window.p07Interaction = { start, end: performance.now(), latencyMs: performance.now() - start, observed: expected.type === "search" ? options : mapped }; }));
              };
              const observer = new MutationObserver(finished);
              observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
              const onEvent = (event) => { if (event.target.matches(expected.selector) || event.target.closest(expected.selector)) { start = performance.now(); document.removeEventListener(expected.event, onEvent, true); queueMicrotask(finished); } };
              document.addEventListener(expected.event, onEvent, true);
            }, expected);
          }
          for (let index = 0; index < 10; index++) {
            const term = `性能 ${String(index * 10).padStart(3, "0")}`;
            const names = fixtures.filter((record) => record.name.includes(term)).slice(0, 20).map((record) => record.name_en);
            await page.focus(".search-wrap input");
            // Preparation is outside timing; insertText below emits the measured trusted input event.
            await page.$eval(".search-wrap input", (input) => input.select());
            await arm({ type: "search", event: "input", selector: ".search-wrap input", names });
            await page.keyboard.sendCharacter(term);
            await page.waitForFunction(() => window.p07Interaction !== null);
            result.interactions.push({ type: "search", term, ...await page.evaluate(() => window.p07Interaction) });
          }
          await page.keyboard.press("Escape");
          await page.click('[aria-label="筛选"]');
          await page.waitForSelector(".filter-pill", { visible: true });
          for (let index = 0; index < 10; index++) {
            const selector = index % 2 === 0 ? '.dining-segment-btn[data-dining="meat"]' : '.dining-segment-btn[data-dining="all"]';
            const count = index % 2 === 0 ? 500 : 1000;
            await arm({ type: "filter", event: "click", selector, count });
            await page.click(selector);
            await page.waitForFunction(() => window.p07Interaction !== null);
            result.interactions.push({ type: "filter", count, ...await page.evaluate(() => window.p07Interaction) });
          }
        }
      } catch (error) {
        result.failureContext = await page.evaluate(() => ({ url: location.href, input: document.querySelector(".search-wrap input")?.value, status: document.querySelector(".dataset-status")?.textContent, suggestions: [...document.querySelectorAll(".search-item-name")].map((node) => node.textContent), interaction: window.p07Interaction, mapped: [...document.querySelectorAll(".cluster-badge")].map((node) => node.textContent) })).catch(() => null);
        await page.screenshot({ path: output.replace(/\.json$/u, "-failure.png") }).catch(() => {});
        throw error;
      } finally { await context.close(); }
    }
  }
  const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const latency = result.interactions.map((item) => item.latencyMs).sort((a, b) => a - b);
  result.summary = { datasets: result.datasets.map((dataset) => {
    const samples = result.samples.filter((sample) => sample.kind === dataset.kind);
    return { kind: dataset.kind, lcpMedianMs: median(samples.map((sample) => sample.lcpMs)), clsMedian: median(samples.map((sample) => sample.cls)), jsGzipMaxBytes: Math.max(...samples.map((sample) => sample.jsGzipBytes)) };
  }), interactionCount: latency.length, interactionP95Ms: latency[Math.ceil(latency.length * 0.95) - 1],
    interactions: ["search", "filter"].map((type) => {
      const samples = result.interactions.filter((item) => item.type === type).map((item) => item.latencyMs).sort((a, b) => a - b);
      return { type, count: samples.length, p95Ms: samples[Math.ceil(samples.length * 0.95) - 1] };
    }),
  };
  result.passed = result.summary.datasets.every((dataset) => dataset.lcpMedianMs <= 2500 && dataset.clsMedian <= 0.1 && dataset.jsGzipMaxBytes <= 400 * 1024) && latency.length >= 20 && result.summary.interactionP95Ms <= 200;
  console.log(JSON.stringify(result.summary));
  if (!result.passed) process.exitCode = 1;
} catch (error) {
  result.error = String(error.stack ?? error); process.exitCode = 1; console.error(error);
} finally {
  result.finishedAt = new Date().toISOString();
  await mkdir(resolve(output, ".."), { recursive: true });
  await writeFile(output, JSON.stringify(result, null, 2) + "\n");
  await Promise.all([actual?.close(), synthetic?.close()]);
  await rm(temporary, { recursive: true, force: true });
}
