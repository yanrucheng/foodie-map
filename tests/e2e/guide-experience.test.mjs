/** P04: isolated registry and HTTP fixtures, with the real production application and Leaflet. */
import assert from "node:assert/strict";
import { before, after } from "node:test";
import { test } from "./evidence.mjs";
import { readFile, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { build } from "vite";
import { createBrowserHarness } from "./helpers.mjs";

const fixture = JSON.parse(await readFile(new URL("./fixtures/guide-experience.json", import.meta.url), "utf8"));
const artifacts = process.env.E2E_ARTIFACT_DIR;
const evidence = [];
let temporary, harness, emptyHarness;
const desktop = { width: 1280, height: 800 };
const mobile = { width: 390, height: 844, isMobile: true, hasTouch: true };
const newPath = "/data/fixture-city/2027/michelin-bib-gourmand.json";
const secondPath = "/data/new-city/2027/michelin-starred.json";
const thirdPath = "/data/third-city/2027/michelin-starred.json";
const initialUrl = "/?year=2026&city=fixture-city&guide=michelin-bib-gourmand";

before(async () => {
  temporary = await mkdtemp(join(tmpdir(), "foodie-p04-browser-"));
  // Replace only the discovery module in an isolated production build. No formal data is written.
  async function fixtureBuild(name, cities) {
    const outDir = join(temporary, name);
    await build({
      logLevel: "error", define: { __FOODIE_RELEASE__: "null" },
      plugins: [{
        name: "p04-isolated-discovery-fixture", enforce: "pre",
        load(id) { if (id === resolve("src/config/cities.ts")) return `export const cities = ${JSON.stringify(cities)};`; },
      }],
      build: { outDir, emptyOutDir: true },
    });
    return createBrowserHarness({ outDir });
  }
  harness = await fixtureBuild("editions", fixture.cities);
  emptyHarness = await fixtureBuild("empty", []);
  if (artifacts) await mkdir(artifacts, { recursive: true });
});
after(async () => {
  try {
    if (artifacts) await writeFile(join(artifacts, "guide-experience.json"), JSON.stringify({
      browser: await harness?.browser.version(), fixture: "tests/e2e/fixtures/guide-experience.json",
      isolation: "production Vite build replaces only src/config/cities.ts with fixture discovery; HTTP data/taxonomy intercepted; all external HTTP blocked; SW bypassed",
      checks: evidence,
    }, null, 2) + "\n");
  } finally {
    await Promise.all([harness?.close(), emptyHarness?.close()]);
    if (temporary) await rm(temporary, { recursive: true, force: true });
  }
});

function route(request, url) {
  const payload = fixture.taxonomies[url.pathname] ?? fixture.datasets[url.pathname];
  return payload ? request.respond({ status: 200, contentType: "application/json", body: JSON.stringify(payload) }) : request.continue();
}
async function ready(page, year = 2026, city = "fixture-city") {
  await page.waitForFunction((year, city) => {
    const state = document.querySelector(".dataset-status");
    return state?.dataset.state === "ready" && state.dataset.dataset.startsWith(`${city}/${year}/`);
  }, {}, year, city);
}
async function choose(page, dimension, label) {
  const chips = await page.$$(".dynamic-title .seg-chip");
  await chips[dimension].click();
  await page.waitForSelector(".seg-dropdown-item, .seg-sheet-item", { visible: true });
  const selector = ".seg-dropdown-item, .seg-sheet-item";
  const options = await page.$$(selector);
  const labels = await Promise.all(options.map((option) => option.evaluate((element) => (element.querySelector(".seg-sheet-item-label") ?? element).textContent.trim())));
  const index = labels.indexOf(label);
  assert.notEqual(index, -1, `Option ${label} exists among ${labels}`);
  // Locator waits for the mobile sheet animation and stable hit target.
  await options[index].asLocator().click();
  await page.waitForFunction(() => !document.querySelector(".seg-dropdown, .seg-sheet-list"));
}
async function search(page, query) {
  const input = await page.$(".search-wrap input");
  await input.click({ clickCount: 3 });
  await page.keyboard.press("Backspace");
  await input.type(query);
  await page.waitForSelector(".search-dropdown-item", { visible: true });
  await page.click(".search-dropdown-item");
}
async function clickText(page, selector, label) {
  const options = await page.$$(selector);
  for (const option of options) {
    if (await option.evaluate((element) => element.textContent.trim()) === label) {
      await option.asLocator().click();
      return;
    }
  }
  assert.fail(`Missing control ${label}`);
}
async function closeDetail(page) {
  const selector = await page.$(".mobile-popup-close") ? ".mobile-popup-close" : ".leaflet-popup-close-button";
  await page.locator(selector).click();
  await page.waitForFunction(() => !document.querySelector(".mobile-popup-card, .leaflet-popup-content"));
}
async function recordEvidence(page, name) {
  await page.evaluate(async () => {
    const animations = document.querySelector(".mobile-popup-card")?.getAnimations() ?? [];
    await Promise.all(animations.filter((animation) => animation.effect.getComputedTiming().iterations !== Infinity).map((animation) => animation.finished.catch(() => {})));
  });
  const item = await page.evaluate(() => ({
    url: location.pathname + location.search, title: document.title,
    state: document.querySelector(".dataset-status")?.dataset.state,
    identity: document.querySelector(".dataset-status")?.dataset.dataset,
    counts: document.querySelector(".dataset-status")?.textContent,
    detail: document.querySelector(".mobile-popup-card, .leaflet-popup-content")?.textContent ?? null,
  }));
  evidence.push({ name, ...item });
  if (artifacts) await page.screenshot({ path: join(artifacts, `p04-${name}.png`) });
}

test("P04-R1 empty registry is explicit and requests no dataset", async () => {
  const session = await emptyHarness.createPage(desktop, [], route);
  try {
    await session.page.goto(emptyHarness.baseUrl + "/?year=oops&city=unknown", { waitUntil: "domcontentloaded" });
    await session.page.waitForSelector(".dataset-unavailable", { visible: true });
    assert.equal(session.requests.some(({ url }) => new URL(url).pathname.startsWith("/data/")), false);
    assert.deepEqual(session.errors, []);
    await recordEvidence(session.page, "empty-registry");
  } finally { await session.close(); }
});

test("P04-R1/R4 new city, two years, old-only city and invalid URL use deterministic discovery", async () => {
  const session = await harness.createPage(desktop, [], route);
  const { page } = session;
  try {
    await page.goto(harness.baseUrl + "/?year=oops&city=missing&guide=missing", { waitUntil: "domcontentloaded" });
    await ready(page, 2027);
    assert.equal(new URL(page.url()).searchParams.get("city"), "fixture-city");
    await choose(page, 1, "新城");
    await ready(page, 2027, "new-city");
    assert.match(await page.title(), /新城.*米其林星级/);
    const labels = await page.$$eval(".filter-item", (items) => items.map((item) => item.textContent));
    assert.deepEqual(labels, ["新城新菜系", "新城粤菜", "其他"]);
    await recordEvidence(page, "new-city-taxonomy");
    await choose(page, 0, "2026");
    await ready(page);
    await choose(page, 1, "旧版城");
    await ready(page, 2026, "old-only");
    await choose(page, 0, "2027");
    await ready(page, 2027);
    assert.deepEqual(session.errors, []);
    await recordEvidence(page, "selection-cascade");
  } finally { await session.close(); }
});

for (const viewport of [desktop, mobile]) {
  test(`P04-R3/R5/R6 search reveals hidden records, opens unknown positions and keeps facts at ${viewport.width}px`, async () => {
    const session = await harness.createPage(viewport, [], route);
    const { page } = session;
    const compact = viewport.width < 768;
    try {
      await page.goto(harness.baseUrl + initialUrl, { waitUntil: "domcontentloaded" });
      await ready(page);
      await page.evaluate(() => {
        window.p04Flights = [];
        const original = window.L.Map.prototype.flyTo;
        window.L.Map.prototype.flyTo = function (...args) { window.p04Flights.push(args); return original.apply(this, args); };
      });
      if (compact) await page.click('[aria-label="筛选"]');
      const cuisineSelector = compact ? ".filter-pill" : ".filter-item";
      await page.waitForSelector(cuisineSelector, { visible: true });
      await clickText(page, cuisineSelector, "测试城新菜系");
      await clickText(page, ".venue-segment-btn", "仅餐厅");
      await page.waitForFunction(() => document.querySelector(".dataset-status").textContent.includes("筛选结果 1"));
      if (compact) {
        await page.click(".bottom-sheet-backdrop", { offset: { x: 10, y: 100 } });
        await page.waitForFunction(() => !document.querySelector(".bottom-sheet-container"));
      }
      await search(page, "2026 B");
      const card = compact ? ".mobile-popup-card" : ".leaflet-popup-content";
      await page.waitForSelector(card, { visible: true });
      assert.match(await page.$eval(card, (element) => element.textContent), /CNY 100 起/);
      assert.match(await page.$eval(".dataset-status", (element) => element.textContent), /收录 4 · 筛选结果 4 · 筛选内可定位 3/);
      await recordEvidence(page, `reveal-${viewport.width}`);
      await closeDetail(page);

      // The real map must not move to another restaurant or a placeholder for a missing position.
      const before = await page.evaluate(() => window.p04Flights.length);
      await search(page, "无坐标");
      await page.waitForSelector(".mobile-popup-card", { visible: true });
      const text = await page.$eval(".mobile-popup-card", (element) => element.textContent);
      assert.match(text, /暂无可靠坐标，无法地图定位/);
      assert.match(text, /MOP {2}80–120 /);
      assert.equal(await page.evaluate(() => window.p04Flights.length), before);
      await recordEvidence(page, `no-position-${viewport.width}`);
      await closeDetail(page);
      await search(page, "<img");
      await page.waitForSelector(card, { visible: true });
      assert.equal(await page.$eval(card, (element) => element.querySelectorAll("img,script,a").length), 0);
      assert.equal(await page.evaluate(() => window.p04Injected), undefined);
      assert.doesNotMatch(await page.$eval(card, (element) => element.textContent), /undefined|null|价格|招牌菜/);
      await recordEvidence(page, `markup-${viewport.width}`);
      await closeDetail(page);

      await choose(page, 0, "2027");
      await ready(page, 2027);
      await search(page, "2027 A");
      await page.waitForSelector(card, { visible: true });
      const facts = await page.$eval(card, (element) => element.textContent);
      assert.match(facts, /2027 新晋/);
      assert.match(facts, /HKD 約 200–400/);
      assert.doesNotMatch(facts, /2026 新晋|undefined|null/);
      assert.equal(await page.$eval(`${card} a`, (element) => element.getAttribute("href")), "https://guide.michelin.com/en/fixture/restaurant/example");
      await recordEvidence(page, `facts-2027-${viewport.width}`);
      // Browser history may change selection while a detail overlay is open.
      await page.evaluate(() => {
        history.pushState(null, "", "?year=2027&city=new-city&guide=michelin-starred");
        dispatchEvent(new PopStateEvent("popstate"));
      });
      await ready(page, 2027, "new-city");
      assert.equal(await page.$(".mobile-popup-card, .leaflet-popup-content"), null);
      assert.equal(await page.$eval(".search-wrap input", (element) => element.value), "");
      assert.match(await page.$eval(".dataset-status", (element) => element.textContent), /筛选结果 4/);
      // Returning to the original identity cannot restore an old detail or old filters.
      await choose(page, 1, "测试城");
      await ready(page, 2027);
      assert.equal(await page.$(".mobile-popup-card, .leaflet-popup-content"), null);
      assert.deepEqual(session.errors, []);
    } finally { await session.close(); }
  });
}

test("P04-R2 late A/B responses cannot overwrite C or revive an old detail", async () => {
  const held = new Map();
  const arrivals = new Map([newPath, secondPath, thirdPath].map((path) => [path, Promise.withResolvers()]));
  const session = await harness.createPage(desktop, [], async (request, url) => {
    if (arrivals.has(url.pathname)) {
      const gate = Promise.withResolvers();
      held.set(url.pathname, () => gate.resolve());
      arrivals.get(url.pathname).resolve();
      await gate.promise;
    }
    return route(request, url);
  });
  const { page } = session;
  try {
    await page.evaluateOnNewDocument(() => {
      const original = window.fetch.bind(window);
      window.p04Completed = [];
      window.fetch = async (input, init) => {
        // Model transports that complete despite cancellation; application identity guard still applies.
        const response = await original(input, { ...init, signal: undefined });
        await response.clone().text();
        window.p04Completed.push(String(input));
        return response;
      };
    });
    await page.goto(harness.baseUrl + initialUrl, { waitUntil: "domcontentloaded" });
    await ready(page);
    await search(page, "无坐标");
    await page.waitForSelector(".mobile-popup-card", { visible: true });
    await closeDetail(page);
    await choose(page, 0, "2027");
    await arrivals.get(newPath).promise;
    await choose(page, 1, "新城");
    await arrivals.get(secondPath).promise;
    await choose(page, 1, "第三城");
    await arrivals.get(thirdPath).promise;
    assert.equal(await page.$(".marker-dot, .cluster-badge, .mobile-popup-card, .leaflet-popup-content, .stat-item"), null);
    assert.equal(await page.$eval(".dataset-status", (element) => element.dataset.state), "loading");
    await recordEvidence(page, "race-loading");
    held.get(thirdPath)();
    await ready(page, 2027, "third-city");
    held.get(newPath)();
    await page.waitForFunction((path) => window.p04Completed.includes(path), {}, newPath);
    held.get(secondPath)();
    await page.waitForFunction((path) => window.p04Completed.includes(path), {}, secondPath);
    await ready(page, 2027, "third-city");
    await search(page, "第三城 2027 A");
    await page.waitForSelector(".leaflet-popup-content", { visible: true });
    assert.match(await page.$eval(".leaflet-popup-content", (element) => element.textContent), /第三城 2027 A/);
    assert.deepEqual(session.errors, []);
    await recordEvidence(page, "race-final-c");
  } finally { for (const release of held.values()) release(); await session.close(); }
});

for (const failure of ["404", "network", "bad-json", "object", "unsafe-link", "empty"]) {
  test(`P04-R2/R6 ${failure} withdraws old edition and recovers through retry or selection`, async () => {
    let failing = true;
    const session = await harness.createPage(desktop, [], (request, url) => {
      if (url.pathname === newPath && failing) {
        if (failure === "network") return request.abort("failed");
        const body = failure === "bad-json" ? "{broken" : failure === "object" ? "{}" : failure === "empty" ? "[]"
          : failure === "unsafe-link" ? JSON.stringify([{ ...fixture.datasets[newPath][0], guide_url: "javascript:alert(1)" }]) : "";
        return request.respond({ status: failure === "404" ? 404 : 200, contentType: "application/json", body });
      }
      return route(request, url);
    });
    const { page } = session;
    try {
      await page.goto(harness.baseUrl + initialUrl, { waitUntil: "domcontentloaded" });
      await ready(page);
      await choose(page, 0, "2027");
      await page.waitForSelector(`.dataset-status[data-state="${failure === "empty" ? "empty" : "error"}"]`);
      assert.equal(await page.$(".marker-dot, .cluster-badge, .stat-item, .leaflet-popup-content, .mobile-popup-card"), null);
      assert.match(await page.title(), /2027/);
      await recordEvidence(page, `failure-${failure}`);
      failing = false;
      if (failure === "empty") {
        assert.equal(await page.$(".dataset-status button"), null);
        await choose(page, 0, "2026");
        await ready(page);
      } else {
        await page.click(".dataset-status button");
        await ready(page, 2027);
      }
      assert.deepEqual(session.errors, []);
    } finally { await session.close(); }
  });
}
