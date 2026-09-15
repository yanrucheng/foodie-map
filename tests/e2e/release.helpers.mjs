import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir, mkdtemp, rm, cp } from "node:fs/promises";
import { resolve, join, extname, sep } from "node:path";
import { tmpdir } from "node:os";
import { fixtureCatalog } from "../fixtures/catalog.ts";
import { build } from "vite";
import config from "../../vite.config.ts";
import { releaseBuild } from "../../scripts/release-build.ts";
import { observedSession } from "./evidence.mjs";

export const initialSelection = "/?city=fixture-city&year=2026&guide=michelin-bib-gourmand";
export const dataPath = "/data/fixture-city/2026/michelin-bib-gourmand.json";
export const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF1sAAAAASUVORK5CYII=", "base64");

export async function releaseFixture(revision = "A") {
  const fixture = JSON.parse(await readFile(new URL("./fixtures/guide-experience.json", import.meta.url), "utf8"));
  // P04's display fixtures omit raw cuisine. Release fixtures also satisfy P02's derivation contract.
  for (const dataset of Object.values(fixture.datasets)) for (const record of dataset) record.cuisine = record.cuisine_group;
  const mappings = Object.fromEntries(Object.values(fixture.taxonomies).map((taxonomy) => [`/data/taxonomy/${taxonomy.city}-mappings.json`, {
    version: 1, city: taxonomy.city, mappings: taxonomy.groups.map((group) => ({ raw: group.key, groupKey: group.key })),
  }]));
  if (revision === "A") fixture.cities = [{ ...fixture.cities[0], guides: fixture.cities[0].guides.filter((guide) => guide.year === 2026) }];
  if (revision === "B") fixture.datasets[dataPath][0].name += " · 修订 B";
  for (const dataset of Object.values(fixture.datasets)) {
    dataset[0].dining_category = revision === "B" ? "seafood" : "meat";
    dataset[0].price_range = revision === "B" ? "$$$$" : "￥￥";
  }
  const catalog = fixtureCatalog(fixture.cities);
  for (const city of catalog.cities) for (const guide of city.guides) guide.provenance.revision = {
    id: `release-rehearsal-${revision}`, reason: revision === "B" ? "Synthetic same-edition restaurant-name correction and new edition discovery" : "Synthetic initial edition for A to B to A rollback",
    evidence: "https://example.test/synthetic-evidence",
  };
  return { ...fixture, catalog, payloads: { ...fixture.datasets, ...fixture.taxonomies, ...mappings } };
}

export async function buildReleaseFixture(fixture, outDir) {
  const catalog = fixture.catalog ?? fixtureCatalog(fixture.cities);
  const temporary = await mkdtemp(join(tmpdir(), "foodie-catalog-build-"));
  const publicDir = join(temporary, "public"), dataRoot = join(publicDir, "data");
  await mkdir(dataRoot, { recursive: true });
  try {
    for (const name of ["icons", "manifest.json", "sw.js"]) await cp(resolve("public", name), join(publicDir, name), { recursive: true });
    const wanted = new Set(["/data/catalog.json"]);
    for (const city of catalog.cities) {
      wanted.add(city.taxonomyPath); wanted.add(city.mappingsPath);
      for (const guide of city.guides) {
        if (guide.dataPath) wanted.add(guide.dataPath);
        if (guide.coverage.reconciliationPath) wanted.add(guide.coverage.reconciliationPath);
      }
    }
    const payloads = { ...fixture.payloads, "/data/catalog.json": catalog };
    const references = (value) => {
      if (typeof value === "string" && value.startsWith("/data/") && value.endsWith(".json")) wanted.add(value);
      else if (value && typeof value === "object") for (const child of Object.values(value)) references(child);
    };
    references(catalog);
    for (const ref of wanted) if (ref.startsWith("/data/evidence/")) references(payloads[ref]);
    for (const ref of wanted) {
      if (!(ref in payloads)) throw new Error(`Missing fixture resource ${ref}`);
      const file = join(publicDir, ref);
      await mkdir(resolve(file, ".."), { recursive: true });
      await writeFile(file, JSON.stringify(payloads[ref]) + "\n");
    }
    await build({ ...config, configFile: false, publicDir, logLevel: "error", plugins: [
      ...config.plugins.filter((plugin) => plugin.name !== "foodie-release"),
      { name: "isolated-raw-catalog", enforce: "pre", load(id) { if (id === resolve("public/data/catalog.json")) return JSON.stringify(catalog); } },
      releaseBuild({ dataRoot }),
    ], build: { outDir, emptyOutDir: true } });
  } finally { await rm(temporary, { recursive: true, force: true }); }
  return JSON.parse(await readFile(join(outDir, "release.json"), "utf8"));
}

/** Same production files as preview, with an atomic deployment pointer and controllable HTTP failures. */
export async function releaseServer(directory) {
  const state = { directory: resolve(directory), offline: false, overrides: new Map(), requests: [] };
  const mime = { ".json": "application/json", ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".png": "image/png", ".svg": "image/svg+xml" };
  const httpServer = createServer(async (request, response) => {
    // Block external HTTP at the browser boundary without intercepting SW-controlled navigations.
    response.setHeader("content-security-policy", "default-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:");
    const url = new URL(request.url, "http://localhost");
    const entry = { path: url.pathname, directory: state.directory, at: new Date().toISOString() };
    state.requests.push(entry);
    if (state.offline) { entry.status = "network-offline"; response.destroy(); return; }
    try {
      const override = state.overrides.get(url.pathname);
      const controlled = typeof override === "function" ? await override(request) : override;
      if (controlled) {
        if (controlled.hang) {
          entry.status = "response-hanging";
          response.on("close", () => { entry.closedAt = new Date().toISOString(); });
          if (controlled.partialBody) { response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); response.write(controlled.partialBody); }
          return;
        }
        entry.status = controlled.status ?? 200;
        response.writeHead(entry.status, { "content-type": controlled.contentType ?? "application/json", "cache-control": "no-store" });
        response.end(controlled.body); return;
      }
      let path = resolve(state.directory, `.${decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname)}`);
      if (!path.startsWith(state.directory + sep)) { response.writeHead(403); response.end(); return; }
      let bytes;
      try { bytes = await readFile(path); }
      catch (error) {
        if (error.code !== "ENOENT") throw error;
        if (request.headers.accept?.includes("text/html") && !extname(url.pathname)) { path = join(state.directory, "index.html"); bytes = await readFile(path); }
        else { entry.status = 404; response.writeHead(404, { "content-type": "text/plain" }); response.end("Not found"); return; }
      }
      entry.status = 200;
      response.writeHead(200, { "content-type": mime[extname(path)] ?? "application/octet-stream", "cache-control": "no-store" });
      response.end(bytes);
    } catch (error) { entry.status = 500; response.writeHead(500); response.end(String(error)); }
  });
  await new Promise((resolve, reject) => { httpServer.once("error", reject); httpServer.listen(0, "127.0.0.1", resolve); });
  return { httpServer, state, baseUrl: `http://127.0.0.1:${httpServer.address().port}` };
}

export async function pwaSession(browser, server, viewport = { width: 1280, height: 800 }) {
  const context = await browser.newContext({ viewport, serviceWorkers: "allow", hasTouch: viewport.width < 768 });
  context.setDefaultTimeout(12_000);
  // The server's CSP controls external fonts/tiles. Request interception breaks WebKit offline SW navigation.
  const errors = [], consoleErrors = [];
  context.on("page", (page) => {
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12_000);
  return { context, page, errors, consoleErrors,
    close: observedSession({ page, errors, consoleErrors, browser, requests: server.state.requests, outDir: server.state.directory, close: () => context.close() }) };
}
export async function ready(page, year = 2026, city = "fixture-city") {
  await page.waitForFunction(({ year, city }) => { const node = document.querySelector(".dataset-status"); return node?.dataset.state === "ready" && node.dataset.dataset.startsWith(`${city}/${year}/`); }, { year, city });
}
export async function controlled(page) {
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.waitForFunction(() => document.querySelector(".dataset-status")?.dataset.state === "ready");
}
export async function cached(page, release, logicalPath = dataPath) {
  await page.waitForFunction(async ({ release, logicalPath }) => !!await (await caches.open(`foodie-map:v3:data:${release.buildId}`)).match(release.resources[logicalPath].url), { release, logicalPath });
}
export async function installWaiting(server, context, page, directory) {
  server.state.directory = directory;
  const created = context.waitForEvent("serviceworker");
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  const worker = await created;
  await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state === "installed");
  return worker;
}
export async function activateAfterClosingPages(context, worker) {
  // Observe activation without skipWaiting, unregistering or clearing any cache.
  const activation = worker.evaluate(() => new Promise((resolve) => self.addEventListener("activate", () => resolve(true), { once: true })));
  await Promise.all(context.pages().map((page) => page.close()));
  await activation;
  return context.newPage();
}
export async function choose(page, dimension, label) {
  await page.locator(`[data-focus-key="picker-${dimension}"]`).click();
  await page.getByRole("option", { name: label, exact: true }).click();
  await page.waitForFunction(() => !document.querySelector(".seg-dropdown, .seg-sheet-list"));
}
export async function search(page, term) {
  await page.getByRole("combobox", { name: "搜索餐厅" }).fill(term);
  await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter");
  await page.locator(".mobile-popup-card, .leaflet-popup-content").waitFor();
}
export async function snapshot(page, name, release, records) {
  const observation = await page.evaluate(() => ({ url: location.href, title: document.title, dataset: { ...document.querySelector(".dataset-status")?.dataset }, status: document.querySelector(".dataset-status")?.textContent, version: document.querySelector(".dataset-status")?.title, detail: document.querySelector(".mobile-popup-card, .leaflet-popup-content")?.textContent, online: navigator.onLine }));
  assert.equal(observation.dataset.build, release.buildId);
  records.push({ name, ...observation, expected: { buildId: release.buildId, dataRevision: release.dataRevision } });
  const artifacts = process.env.E2E_ARTIFACT_DIR;
  if (artifacts) { await mkdir(artifacts, { recursive: true }); await page.screenshot({ path: join(artifacts, `${name}.png`) }); }
}
export async function saveRecords(name, records) {
  if (!process.env.E2E_ARTIFACT_DIR) return;
  await mkdir(process.env.E2E_ARTIFACT_DIR, { recursive: true });
  await writeFile(join(process.env.E2E_ARTIFACT_DIR, name), JSON.stringify(records, null, 2) + "\n");
}
