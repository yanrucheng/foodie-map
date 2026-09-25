/** Session-only build, local preview, and real-browser evidence for the fixed sample. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import puppeteer from "puppeteer";
import config from "../../../vite.config.ts";
import { releaseBuild } from "../../../scripts/release-build.ts";
import { artifactIdentity, sha256 } from "../../../scripts/release-artifact.ts";

const session = fileURLToPath(new URL(".", import.meta.url));
const out = join(session, "outputs"), publicDir = join(out, "candidate/public");
const dataRoot = join(publicDir, "data"), dist = join(out, "app");
const json = async (file) => JSON.parse(await readFile(file, "utf8"));
const save = async (name, data) => writeFile(join(out, name), JSON.stringify(data, null, 2) + "\n");
const evidence = await json(join(session, "source-evidence.json"));

async function buildCandidate() {
  const catalog = await json(join(dataRoot, "catalog.json"));
  await build({ ...config, configFile: false, publicDir, logLevel: "warn", plugins: [
    ...config.plugins.filter((plugin) => plugin.name !== "foodie-release"),
    { name: "sample-catalog", enforce: "pre", load(id) {
      if (id === resolve("public/data/catalog.json")) return JSON.stringify(catalog);
    } },
    releaseBuild({ dataRoot }),
  ], build: { outDir: dist, emptyOutDir: true } });
  const release = await json(join(dist, "release.json"));
  for (const [logical, resource] of Object.entries(release.resources)) {
    assert.equal(sha256(await readFile(join(dataRoot, logical.replace(/^\/data\//u, "")))), resource.sha256);
    assert.equal(sha256(await readFile(join(dist, resource.url))), resource.sha256);
  }
  await save("build-evidence.json", { builtAt: new Date().toISOString(), dataRoot, dist,
    buildId: release.buildId, dataRevision: release.dataRevision, resources: release.resources,
    artifact: await artifactIdentity(dist) });
  console.log(`Candidate build ${release.buildId}`);
}

async function serve() {
  const mime = { ".html": "text/html", ".txt": "text/plain", ".json": "application/json", ".js": "text/javascript",
    ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const review = url.pathname.startsWith("/review/");
      const root = review ? out : dist;
      const relative = review ? url.pathname.slice(8) : url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      const file = resolve(root, decodeURIComponent(relative));
      if (!file.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
      const rawSource = review && relative.startsWith("sources/") && extname(file) === ".html";
      const bytes = await readFile(file);
      res.writeHead(200, { "Content-Type": `${rawSource ? "text/plain" : mime[extname(file)] ?? "application/octet-stream"}; charset=utf-8`,
        "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
        ...(rawSource ? { "Content-Security-Policy": "sandbox; default-src 'none'" } : {}) });
      res.end(bytes);
    } catch (error) { res.writeHead(error.code === "ENOENT" ? 404 : 500); res.end("Unavailable"); }
  });
  await new Promise((done, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", done); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  await save("server.json", { pid: process.pid, origin, preview: `${origin}/review/preview.html`,
    starred: `${origin}/?city=beijing&year=2026&guide=michelin-starred`,
    bib: `${origin}/?city=beijing&year=2026&guide=michelin-bib-gourmand`, startedAt: new Date().toISOString() });
  console.log(`Comparison: ${origin}/review/preview.html\nCandidate application: ${origin}/?city=beijing&year=2026&guide=michelin-starred`);
}

async function browserCheck() {
  const { origin } = await json(join(out, "server.json"));
  const release = await json(join(dist, "release.json"));
  const browser = await puppeteer.launch({ headless: "shell", protocolTimeout: 30000 });
  const results = { checkedAt: new Date().toISOString(), origin, buildId: release.buildId,
    sourceDomChecks: [], previewChecks: [], cases: [], pageErrors: [] };
  let activePage;
  await mkdir(join(out, "screenshots"), { recursive: true });
  try {
    const probe = await browser.newPage();
    for (const item of evidence.records) {
      const dom = await readFile(resolve(item.local_capture), "utf8");
      const observed = await probe.evaluate((html) => {
        const d = new DOMParser().parseFromString(html, "text/html");
        return { headings: [...d.querySelectorAll("h1")].map((n) => n.textContent.trim()),
          addresses: [...d.querySelectorAll(".data-sheet__block--text")].map((n) => n.textContent.trim()), title: d.title };
      }, dom);
      assert.ok(observed.headings.includes(item.source_heading));
      assert.ok(observed.addresses.includes(item.source_address));
      assert.equal(observed.title, item.source_title);
      results.sourceDomChecks.push({ key: item.key, ...observed });
    }
    await probe.close();
    for (const [mode, viewport] of [["desktop", { width: 1440, height: 1050 }], ["mobile", { width: 390, height: 844, isMobile: true, hasTouch: true }]]) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      activePage = page;
      await page.setViewport(viewport);
      page.setDefaultTimeout(15000);
      page.on("pageerror", (e) => results.pageErrors.push(String(e)));
      async function closeDetail() {
        if (!await page.$(".mobile-popup-card, .leaflet-popup-content")) return;
        // Use the application's keyboard close when a tall popup overlaps the search control.
        if (mode === "desktop") {
          await page.focus(".leaflet-popup-content h2");
          await page.keyboard.press("Escape");
        } else {
          await page.focus(".mobile-popup-close");
          await page.keyboard.press("Enter");
        }
        await page.waitForSelector(".mobile-popup-card, .leaflet-popup-content", { hidden: true });
      }
      async function revealDetail() {
        if (mode !== "desktop") return false;
        const overlap = await page.evaluate(() => {
          const h = document.querySelector(".leaflet-popup-content h2").getBoundingClientRect();
          const s = document.querySelector(".search-wrap").getBoundingClientRect();
          return h.top < s.bottom + 12;
        });
        if (overlap) {
          await page.mouse.move(1050, 600); await page.mouse.down();
          await page.mouse.move(1050, 810, { steps: 25 }); await page.mouse.up();
          await new Promise((done) => setTimeout(done, 500));
        }
        return overlap;
      }
      await page.goto(`${origin}/review/preview.html`, { waitUntil: "networkidle0" });
      assert.equal(await page.title(), "北京 8 家小样，待用户确认");
      assert.equal(await page.$$eval("article", (nodes) => nodes.length), 8);
      assert.equal(await page.$eval("article h2", (n) => n.textContent), "京艳 ‧ 翰林书院");
      const preview = await page.evaluate(() => ({ cards: document.querySelectorAll("article").length,
        width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        links: [...document.querySelectorAll("a")].map((a) => a.href) }));
      assert.ok(preview.scrollWidth <= preview.width);
      for (const link of new Set(preview.links.filter((url) => url.startsWith(`${origin}/review/sources/`)))) {
        const response = await fetch(link);
        assert.equal(response.status, 200);
        if (link.endsWith(".html")) assert.ok(response.headers.get("content-type").startsWith("text/plain"));
      }
      await page.screenshot({ path: join(out, `screenshots/${mode}-comparison.png`), fullPage: true });
      results.previewChecks.push({ mode, ...preview });
      for (const item of evidence.records) {
        const guide = item.before_record.guide_type;
        const logical = `/data/beijing/2026/${guide}.json`;
        await page.goto(`${origin}/?city=beijing&year=2026&guide=${guide}`, { waitUntil: "networkidle0" });
        await page.waitForFunction(() => document.querySelector(".dataset-status")?.dataset.state === "ready");
        const delivered = await page.evaluate(async (resource) => {
          const response = await fetch(resource.url);
          const bytes = await response.arrayBuffer();
          const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
          return { hash, records: JSON.parse(new TextDecoder().decode(bytes)), dataset: { ...document.querySelector(".dataset-status").dataset } };
        }, release.resources[logical]);
        assert.equal(delivered.hash, release.resources[logical].sha256);
        assert.equal(delivered.dataset.build, release.buildId);
        assert.equal(delivered.dataset.dataset, `beijing/2026/${guide}`);
        assert.deepEqual(delivered.records, await json(join(dataRoot, "beijing/2026", `${guide}.json`)));
        if (guide === "michelin-starred") assert.ok(!delivered.records.some((r) => [r.name, r.name_zh, r.name_en].some((n) => n?.includes("京雁"))));
        const stem = `${mode}-${guide}-${item.id}`;
        const queries = [...new Set([item.id === 11 && guide === "michelin-starred" ? "京艳" : item.candidate_name_zh, item.before.name_en])];
        const checks = [];
        for (const query of queries) {
          await closeDetail();
          await page.focus(".search-wrap input");
          await page.$eval(".search-wrap input", (input) => input.select());
          await page.keyboard.press("Backspace");
          await page.waitForFunction(() => document.querySelector(".search-wrap input").value === "");
          await page.keyboard.type(query);
          assert.equal(await page.$eval(".search-wrap input", (input) => input.value), query);
          await page.waitForFunction((name) => [...document.querySelectorAll(".search-item-name")].some((n) => n.textContent === name), {}, item.candidate_name_zh);
          const suggestions = await page.$$eval(".search-item-name", (ns) => ns.map((n) => n.textContent));
          assert.deepEqual(suggestions, [item.candidate_name_zh]);
          if (query === queries[0]) await page.screenshot({ path: join(out, `screenshots/${stem}-search.png`) });
          console.log(`Selecting ${mode} ${item.key}: ${query}`);
          await page.locator(".search-dropdown-item").click();
          await page.waitForFunction((name) => document.querySelector(".mobile-popup-card h2, .leaflet-popup-content h2")?.textContent === name, {}, item.candidate_name_zh);
          // MapShell flyTo lasts 0.8s; do not click moving popup coordinates mid-flight.
          await new Promise((done) => setTimeout(done, 1100));
          const detail = await page.$eval(".mobile-popup-card, .leaflet-popup-content", (n) => ({ text: n.textContent, url: n.querySelector("a")?.href }));
          assert.ok(detail.text.includes(item.before_record.address));
          assert.equal(detail.url, item.guide_url);
          assert.equal(await page.$eval(".search-wrap input", (n) => n.value), item.candidate_name);
          checks.push({ query, suggestions, detail });
        }
        const detailPanned = await revealDetail();
        await page.screenshot({ path: join(out, `screenshots/${stem}-detail.png`) });
        await closeDetail();
        const markerSelector = `.restaurant-marker[title^=${JSON.stringify(item.candidate_name_zh + " · ")}]`;
        let zoomClicks = 0;
        while (!await page.$(markerSelector) && zoomClicks < 4) {
          await page.locator(".leaflet-control-zoom-in").click();
          await new Promise((done) => setTimeout(done, 500));
          zoomClicks++;
        }
        await page.waitForSelector(markerSelector);
        await page.locator(markerSelector).click();
        await page.waitForFunction((name) => document.querySelector(".mobile-popup-card h2, .leaflet-popup-content h2")?.textContent === name, {}, item.candidate_name_zh);
        const mapPanned = await revealDetail();
        const mapEvidence = await page.evaluate(() => ({ detail: document.querySelector(".mobile-popup-card, .leaflet-popup-content")?.textContent,
          selectedMarker: document.querySelector(".restaurant-marker--selected")?.getAttribute("title"),
          loadedTiles: [...document.querySelectorAll("img.leaflet-tile")].filter((n) => n.complete && n.naturalWidth > 0).length }));
        assert.ok(mapEvidence.selectedMarker?.startsWith(item.candidate_name_zh + " · "));
        await page.screenshot({ path: join(out, `screenshots/${stem}-map.png`) });
        results.cases.push({ mode, key: item.key, resource: release.resources[logical], deliveredSha256: delivered.hash,
          dataset: delivered.dataset, queries: checks, zoomClicks, detailPanned, mapPanned, mapEvidence });
        console.log(`PASS ${mode} ${item.key}`);
      }
      await context.close();
    }
    assert.deepEqual(results.pageErrors, []);
    results.passed = true;
  } catch (error) {
    results.passed = false; results.failure = String(error.stack ?? error);
    if (activePage && !activePage.isClosed()) {
      results.failurePage = await activePage.evaluate(() => ({ url: location.href, text: document.body.innerText,
        input: document.querySelector(".search-wrap input")?.value, focused: document.activeElement?.outerHTML }));
      await activePage.screenshot({ path: join(out, "screenshots/failure.png") });
    }
    throw error;
  }
  finally { await save("browser-evidence.json", results); await browser.close(); }
}

await ({ build: buildCandidate, serve, check: browserCheck }[process.argv[2]])();
