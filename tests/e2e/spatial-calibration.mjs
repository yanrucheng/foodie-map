/** Explicit online evidence collection, excluded from the deterministic *.test.mjs suite. */
import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { build } from "vite";
import { createBrowserHarness } from "./helpers.mjs";

const output = process.env.P05_CALIBRATION_DIR;
if (!output) throw new Error("Set P05_CALIBRATION_DIR to a new evidence directory; this script uses real external provider tiles.");
await mkdir(join(output, "tiles"), { recursive: true });
const anchorsFile = process.env.P05_ANCHORS_FILE ?? "openspec/changes/p05-map-location-correctness/evidence/supplement-260914/anchors.json";
const anchors = JSON.parse(await readFile(anchorsFile, "utf8")).filter((anchor) => !process.env.P05_CITY || anchor.city === process.env.P05_CITY);
const catalog = JSON.parse(await readFile("public/data/catalog.json", "utf8"));
const temporary = await mkdtemp(join(tmpdir(), "foodie-p05-online-"));
const evidence = { startedAt: new Date().toISOString(), source: anchorsFile, observations: [], conditions: {
  catalog: "Unmodified formal public/data/catalog.json and annual files, production release build",
  tiles: "Real HTTPS configured-provider requests by the application; no intercepted tile bodies",
  geolocation: "Browser API stub injects independent public-source anchor as WGS84; accuracy=50 is test visualization only, NOT independently measured accuracy",
  camera: "Normal application first-fix flyTo, then configured zoom using map camera only",
  precision: "No surveyed source accuracy or independent Amap conversion reference. Screenshots do not establish <=10m / <=200m acceptance.",
  viewport: { width: 1280, height: 900, deviceScaleFactor: 1 }, serviceWorker: "bypassed",
} };
let harness;
try {
  await build({ logLevel: "error", build: { outDir: temporary, emptyOutDir: true } });
  harness = await createBrowserHarness({ outDir: temporary });
  evidence.build = harness.buildMetadata;
  evidence.browser = await harness.browser.version();
  for (const anchor of anchors) {
    const context = await harness.browser.createBrowserContext();
    const page = await context.newPage();
    const item = { id: anchor.id, city: anchor.city, sourceUrl: anchor.source_url, input: anchor.input_lat_lon,
      sourceAccuracyMeters: anchor.reference_accuracy_m ?? null, basemap: catalog.cities.find((city) => city.id === anchor.city)?.basemap ?? "amap", numericalErrorMeters: null, endToEndErrorMeters: null,
      numericalAccepted: false, endToEndAccepted: false, requests: [], responses: [], errors: [] };
    const pending = [];
    try {
      await page.setViewport(evidence.conditions.viewport); page.setDefaultTimeout(12_000);
      await page.setBypassServiceWorker(true); await page.setRequestInterception(true);
      page.on("pageerror", (e) => item.errors.push(String(e)));
      page.on("request", (request) => {
        const url = new URL(request.url());
        const tile = (url.hostname.endsWith("autonavi.com") || url.hostname === "cyberjapandata.gsi.go.jp");
        if (tile) item.requests.push(request.url());
        const action = tile || url.origin === harness.baseUrl || !/^https?:/u.test(url.protocol) ? request.continue() : request.abort();
        action.catch((e) => item.errors.push(String(e)));
      });
      page.on("response", (response) => {
        if (!["cyberjapandata.gsi.go.jp"].includes(new URL(response.url()).hostname) && !new URL(response.url()).hostname.endsWith("autonavi.com")) return;
        pending.push((async () => {
          try {
            const body = await response.buffer(); const sha256 = createHash("sha256").update(body).digest("hex");
            await writeFile(join(output, "tiles", sha256 + ".png"), body);
            item.responses.push({ url: response.url(), status: response.status(), bytes: body.length, sha256,
              contentType: response.headers()["content-type"], file: `tiles/${sha256}.png` });
          } catch (e) { item.errors.push(`Tile body: ${e.message}`); }
        })());
      });
      await page.evaluateOnNewDocument(() => {
        const probe = window.calibration = { maps: [], fixes: [], flights: [] }; let leaflet;
        Object.defineProperty(window, "L", { configurable: true, get: () => leaflet, set(value) {
          leaflet = value; value.Map.addInitHook(function () { probe.maps.push(this); });
          const fly = value.Map.prototype.flyTo;
          value.Map.prototype.flyTo = function (...args) { probe.flights.push(args[0]); return fly.apply(this, args); };
        } });
        Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
          watchPosition(success) { probe.fixes.push(success); return probe.fixes.length; }, clearWatch() {},
        } });
      });
      const city = catalog.cities.find((c) => c.id === anchor.city);
      const guide = city.guides.find((g) => g.dataPath);
      await page.goto(`${harness.baseUrl}/?city=${city.id}&year=${guide.year}&guide=${guide.id}`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector('.dataset-status[data-state="ready"]');
      await page.locator(".loc-btn").click();
      await page.evaluate(([lat, lon]) => window.calibration.fixes.at(-1)({ coords: { latitude: lat, longitude: lon, accuracy: 50 } }), anchor.input_lat_lon);
      await page.waitForSelector(".user-loc-dot");
      await page.evaluate(async (zoom) => {
        const map = window.calibration.maps.at(-1);
        // Finite camera settling wait, never an accuracy assertion.
        await new Promise((done) => setTimeout(done, 1000));
        map.setZoom(zoom, { animate: false });
      }, Number(process.env.P05_ZOOM ?? 17));
      await page.waitForFunction(() => [...document.querySelectorAll("img.leaflet-tile")].every((img) => img.complete), { timeout: 15_000 }).catch(() => item.errors.push("Tile completion timeout"));
      await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
      item.actual = await page.evaluate(() => {
        const map = window.calibration.maps.at(-1), dot = document.querySelector(".user-loc-dot").getBoundingClientRect();
        return { center: [map.getCenter().lat, map.getCenter().lng], zoom: map.getZoom(), displayCoordinate: window.calibration.flights.at(-1),
          dotPixel: [dot.x + dot.width / 2, dot.y + dot.height / 2], status: document.querySelector(".dataset-status").textContent,
          serviceStatus: document.querySelector(".map-service-status")?.textContent ?? null,
          tileElements: [...document.querySelectorAll("img.leaflet-tile")].map((img) => ({ url: img.src, loaded: img.classList.contains("leaflet-tile-loaded"), width: img.naturalWidth, height: img.naturalHeight, rect: (() => { const r = img.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })() })) };
      });
      item.screenshot = `${anchor.id}-application.png`;
      await page.screenshot({ path: join(output, item.screenshot) });
      await Promise.all(pending);
      // Decode saved bodies, not a cross-origin map canvas. Uniform tile != proof of geographic coverage.
      item.tilePixels = [];
      const unique = [...new Set(item.actual.tileElements.map((t) => t.url))];
      for (const url of unique) {
        const response = item.responses.find((r) => r.url === url && r.status === 200);
        if (!response) continue;
        const data = (await readFile(join(output, response.file))).toString("base64");
        const pixels = await page.evaluate(async (base64) => {
          const img = new Image(); img.src = "data:image/png;base64," + base64; await img.decode();
          const canvas = document.createElement("canvas"); canvas.width = img.width; canvas.height = img.height;
          const ctx = canvas.getContext("2d"); ctx.drawImage(img, 0, 0); const bytes = ctx.getImageData(0, 0, img.width, img.height).data;
          const first = [...bytes.slice(0, 4)]; let uniform = true;
          for (let i = 4; i < bytes.length; i++) if (bytes[i] !== first[i % 4]) { uniform = false; break; }
          return { uniform, firstRGBA: first, width: img.width, height: img.height };
        }, data);
        item.tilePixels.push({ url, sha256: response.sha256, ...pixels });
      }
      item.result = "captured-not-calibrated";
    } catch (e) { item.result = "capture-incomplete"; item.errors.push(String(e.stack ?? e)); }
    finally { await Promise.allSettled(pending); await context.close(); }
    evidence.observations.push(item);
    await writeFile(join(output, "observations.json"), JSON.stringify(evidence, null, 2));
    console.log(anchor.id, item.result, "tiles", item.responses.length, "uniform", item.tilePixels?.filter((p) => p.uniform).length);
  }
} finally {
  evidence.finishedAt = new Date().toISOString();
  await writeFile(join(output, "observations.json"), JSON.stringify(evidence, null, 2));
  await harness?.close(); await rm(temporary, { recursive: true, force: true });
}
