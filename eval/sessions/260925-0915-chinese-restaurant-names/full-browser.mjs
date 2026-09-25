/** Consume the verified full build; no name injection or intercepted data responses. */
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { preview } from "vite";
import puppeteer from "puppeteer";
import { getMapPosition } from "../../../src/data/contract.ts";
const session = fileURLToPath(new URL(".", import.meta.url));
const out = join(session, "outputs/full");
const json = async (p) => JSON.parse(await readFile(p, "utf8"));
const save = async (name, value) => writeFile(join(out, name), JSON.stringify(value, null, 2) + "\n");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function serve() {
  const dist = resolve(process.argv[3] ?? join(out, "app"));
  const server = await preview({ configFile: false, root: process.cwd(), build: { outDir: dist },
    preview: { host: "127.0.0.1", port: 0, strictPort: true } });
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  await save("server.json", { origin, dist, pid: process.pid, startedAt: new Date().toISOString() });
  console.log(origin);
}

async function check() {
  const { origin, dist } = await json(join(out, "server.json"));
  const release = await json(join(dist, "release.json"));
  const ledger = await json(join(session, "full-source-evidence.json"));
  const catalog = await json(resolve("public/data/catalog.json"));
  const keys = new Set();
  const datasets = [...new Set(ledger.records.map((r) => r.key.split("#")[0]))];
  for (const dataset of datasets) keys.add((ledger.records.find((r) => r.key.startsWith(dataset + "#") && r.decision === "evidenced-change")
    ?? ledger.records.find((r) => r.key.startsWith(dataset + "#"))).key);
  for (const key of ["beijing/2026/michelin-starred#11", "beijing/2026/michelin-starred#7", "beijing/2026/michelin-starred#18",
    "beijing/2026/michelin-starred#28", "shanghai/2026/michelin-starred#2", "shanghai/2026/michelin-bib-gourmand#25",
    "macau/2026/michelin-starred#13", "macau/2026/michelin-starred#12", "macau/2026/michelin-starred#14",
    "macau/2026/michelin-starred#20", "guangzhou-shenzhen/2026/michelin-bib-gourmand#40", "hong-kong/2026/michelin-starred#31",
    ...ledger.records.filter((r) => r.decision === "unresolved").map((r) => r.key)]) keys.add(key);
  const selected = ledger.records.filter((r) => keys.has(r.key));
  const results = { checkedAt: new Date().toISOString(), origin, buildId: release.buildId, resources: [], cases: [], pageErrors: [] };
  if (process.argv.includes("--resume")) {
    const prior = await json(join(out, "browser-evidence.json"));
    assert.equal(prior.buildId, release.buildId, "Resume only checks of the identical build");
    results.cases = prior.cases.map((c) => ({ observedAt: prior.checkedAt, ...c }));
    results.resumedFrom = { checkedAt: prior.checkedAt, completedCases: prior.cases.length };
    assert.deepEqual(prior.pageErrors, []);
  }
  for (const [logical, resource] of Object.entries(release.resources)) {
    const response = await fetch(origin + resource.url);
    assert.equal(response.status, 200);
    const digest = sha(new Uint8Array(await response.arrayBuffer()));
    assert.equal(digest, resource.sha256);
    assert.equal(digest, sha(await readFile(resolve("public" + logical))));
    results.resources.push({ logical, url: resource.url, sha256: digest });
  }
  await mkdir(join(out, "screenshots"), { recursive: true });
  const browser = await puppeteer.launch({ headless: "shell", protocolTimeout: 30000 });
  let activePage;
  try {
    for (const [mode, viewport] of [["desktop", { width: 1440, height: 1050 }], ["mobile", { width: 390, height: 844, isMobile: true, hasTouch: true }]]) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage(); activePage = page;
      page.setDefaultTimeout(15000); await page.setViewport(viewport);
      page.on("pageerror", (e) => results.pageErrors.push(String(e)));
      const englishChecked = new Set();
      async function closeDetail() {
        if (!await page.$(".mobile-popup-card, .leaflet-popup-content")) return;
        const card = !!await page.$(".mobile-popup-card");
        await page.focus(card ? ".mobile-popup-close" : ".leaflet-popup-content h2");
        await page.keyboard.press(card ? "Enter" : "Escape");
        await page.waitForSelector(".mobile-popup-card, .leaflet-popup-content", { hidden: true });
      }
      async function revealDetail() {
        if (mode !== "desktop" || !await page.$(".leaflet-popup-content h2")) return false;
        const overlap = await page.evaluate(() => document.querySelector(".leaflet-popup-content h2").getBoundingClientRect().top < document.querySelector(".search-wrap").getBoundingClientRect().bottom + 12);
        if (overlap) {
          await page.mouse.move(1050, 600); await page.mouse.down(); await page.mouse.move(1050, 810, { steps: 25 }); await page.mouse.up();
          await new Promise((done) => setTimeout(done, 500));
        }
        return overlap;
      }
      for (const item of selected) {
        if (results.cases.some((c) => c.mode === mode && c.key === item.key)) continue;
        const [dataset, id] = item.key.split("#"), [city, year, guide] = dataset.split("/");
        const records = await json(resolve(`public/data/${dataset}.json`));
        const record = records.find((r) => r.id === Number(id));
        const mappable = getMapPosition(record, catalog.cities.find((c) => c.id === city).spatialContext) !== null;
        await page.goto(`${origin}/?city=${city}&year=${year}&guide=${guide}`, { waitUntil: "networkidle0" });
        await page.waitForFunction(() => document.querySelector(".dataset-status")?.dataset.state === "ready");
        const status = await page.$eval(".dataset-status", (n) => ({ ...n.dataset }));
        assert.equal(status.build, release.buildId); assert.equal(status.dataset, dataset);
        const queries = [record.name_zh];
        if (!englishChecked.has(dataset) && record.name_en && record.name_en !== record.name_zh) queries.push(record.name_en);
        englishChecked.add(dataset);
        const observations = [];
        for (const query of queries) {
          await closeDetail();
          await page.focus(".search-wrap input"); await page.$eval(".search-wrap input", (n) => n.select());
          await page.keyboard.press("Backspace");
          await page.waitForFunction(() => document.querySelector(".search-wrap input").value === "");
          await page.keyboard.type(query);
          await page.waitForFunction((name) => [...document.querySelectorAll(".search-item-name")].some((n) => n.textContent === name), {}, record.name_zh);
          const suggestions = await page.$$eval(".search-item-name", (ns) => ns.map((n) => n.textContent));
          assert.ok(suggestions.includes(record.name_zh));
          const options = await page.$$(".search-dropdown-item");
          const at = suggestions.indexOf(record.name_zh); await options[at].click();
          await page.waitForFunction((name) => document.querySelector(".mobile-popup-card h2, .leaflet-popup-content h2")?.textContent === name, {}, record.name_zh);
          await new Promise((done) => setTimeout(done, 1100));
          const detail = await page.$eval(".mobile-popup-card, .leaflet-popup-content", (n) => ({ text: n.textContent, url: n.querySelector("a")?.href }));
          assert.equal(detail.url, new URL(record.guide_url).href);
          if (record.address) assert.ok(detail.text.includes(record.address));
          assert.equal(await page.$eval(".search-wrap input", (n) => n.value), record.name);
          observations.push({ query, suggestions, detail });
        }
        const panned = await revealDetail();
        const stem = `${mode}-${city}-${guide}-${id}`;
        await page.screenshot({ path: join(out, `screenshots/${stem}-detail.png`) });
        if (!mappable) {
          assert.ok(observations.every((o) => o.detail.text.includes("暂无可靠坐标")));
          results.cases.push({ mode, key: item.key, disposition: item.decision, status, queries: observations,
            map: { eligible: false, reason: "Existing unreliable/missing coordinates preserved; detail remains searchable." } });
          console.log(`PASS ${mode} ${item.key} (no reliable map position)`);
          continue;
        }
        await closeDetail();
        const marker = `.restaurant-marker[title^=${JSON.stringify(record.name_zh + " · ")}]`;
        let zoomClicks = 0;
        while (!await page.$(marker) && zoomClicks < 4) {
          await page.locator(".leaflet-control-zoom-in").click(); await new Promise((done) => setTimeout(done, 500)); zoomClicks++;
        }
        let clusterClicks = 0;
        while (!await page.$(marker) && clusterClicks < 3) {
          const index = await page.$$eval(".cluster-badge", (nodes) => nodes.map((n, i) => {
            const r = n.getBoundingClientRect();
            return { i, distance: Math.hypot(r.x + r.width / 2 - innerWidth / 2, r.y + r.height / 2 - innerHeight * 0.55) };
          }).sort((a, b) => a.distance - b.distance)[0]?.i ?? -1);
          assert.ok(index >= 0, "A clustered target must have a visible cluster");
          await (await page.$$(".cluster-badge"))[index].click();
          await new Promise((done) => setTimeout(done, 500)); clusterClicks++;
        }
        await page.waitForSelector(marker);
        let markerPans = 0;
        for (; markerPans < 6; markerPans++) {
          const move = await page.$eval(marker, (n) => {
            const r = n.getBoundingClientRect();
            const x = r.x + r.width / 2, y = r.y + r.height / 2;
            const targetY = innerHeight * 0.56;
            return { dx: innerWidth / 2 - x, dy: targetY - y,
              hit: n.contains(document.elementFromPoint(x, y)) };
          });
          if (move.hit && Math.abs(move.dx) < 140 && Math.abs(move.dy) < 100) break;
          const step = mode === "desktop" ? 180 : 100;
          const start = mode === "desktop" ? { x: 900, y: 550 } : { x: 230, y: 430 };
          await page.mouse.move(start.x, start.y); await page.mouse.down();
          await page.mouse.move(start.x + Math.max(-step, Math.min(step, move.dx)),
            start.y + Math.max(-step, Math.min(step, move.dy)), { steps: 25 });
          await page.mouse.up(); await new Promise((done) => setTimeout(done, 400));
        }
        await page.locator(marker).click();
        await page.waitForFunction((name) => document.querySelector(".mobile-popup-card h2, .leaflet-popup-content h2")?.textContent === name, {}, record.name_zh);
        await revealDetail();
        const map = await page.evaluate(() => ({ selectedMarker: document.querySelector(".restaurant-marker--selected")?.getAttribute("title"),
          loadedTiles: [...document.querySelectorAll("img.leaflet-tile")].filter((n) => n.complete && n.naturalWidth).length }));
        assert.ok(map.selectedMarker?.startsWith(record.name_zh + " · "));
        await page.screenshot({ path: join(out, `screenshots/${stem}-map.png`) });
        results.cases.push({ observedAt: new Date().toISOString(), mode, key: item.key, disposition: item.decision, status, queries: observations, panned, zoomClicks, clusterClicks, markerPans, map });
        console.log(`PASS ${mode} ${item.key}`);
      }
      await context.close();
    }
    assert.equal(results.cases.length, selected.length * 2);
    assert.equal(new Set(results.cases.map((c) => c.mode + ":" + c.key)).size, selected.length * 2);
    assert.deepEqual(results.pageErrors, []); results.passed = true;
  } catch (error) {
    results.passed = false; results.failure = String(error.stack ?? error);
    if (activePage && !activePage.isClosed()) {
      results.failurePage = await activePage.evaluate(() => ({ url: location.href, text: document.body.innerText }));
      await activePage.screenshot({ path: join(out, "screenshots/failure.png") });
    }
    throw error;
  } finally { await save("browser-evidence.json", results); await browser.close(); }
}

await ({ serve, check }[process.argv[2]])();
