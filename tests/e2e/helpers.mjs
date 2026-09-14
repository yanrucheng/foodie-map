import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { build, preview } from "vite";
import puppeteer from "puppeteer";
import { observedSession } from "./evidence.mjs";
import { artifactIdentity, sourceIdentity } from "../../scripts/release-artifact.ts";

export const restaurants = JSON.parse(
  readFileSync(new URL("./fixtures/restaurants.json", import.meta.url), "utf8"),
);

/** Browser-only tier: real production assets, dynamic port, owned resources. */
export async function createBrowserHarness({ outDir, server: suppliedServer } = {}) {
  let temporary;
  if (!outDir) {
    temporary = await mkdtemp(join(tmpdir(), "foodie-ui-production-"));
    outDir = temporary;
    try { await build({ logLevel: "error", define: { __FOODIE_RELEASE__: "null" }, build: { outDir, emptyOutDir: true } }); }
    catch (error) { await rm(temporary, { recursive: true, force: true }); throw error; }
  }
  const buildMetadata = { source: await sourceIdentity(process.cwd()), artifact: await artifactIdentity(resolve(outDir)) };
  const server = suppliedServer ?? await preview({
    logLevel: "error",
    ...(outDir ? { build: { outDir } } : {}),
    preview: { host: "127.0.0.1", port: 0, strictPort: true },
  });
  const requests = [];
  server.httpServer.on("request", (request) => requests.push({ url: request.url, at: Date.now() }));
  let browser;
  let closing = false;
  const sessions = new Set();

  async function close() {
    try {
      await Promise.all([...sessions].map((close) => close()));
      closing = true;
      await browser?.close();
    } finally {
      if (process.env.E2E_ARTIFACT_DIR && buildMetadata.browserProcess) {
        await mkdir(process.env.E2E_ARTIFACT_DIR, { recursive: true });
        await writeFile(join(process.env.E2E_ARTIFACT_DIR, `browser-process-${buildMetadata.browserProcess.pid}.json`), JSON.stringify({ ...buildMetadata.browserProcess, browser: buildMetadata.browserVersion, sourceSha256: buildMetadata.source.sha256, outDir }, null, 2));
      }
      server.httpServer.closeAllConnections();
      await new Promise((resolve, reject) => {
        server.httpServer.close((error) => error ? reject(error) : resolve());
      });
      if (temporary) await rm(temporary, { recursive: true, force: true });
    }
  }

  try {
    // Official Headless Shell avoids desktop-compositor frame stalls on macOS.
    browser = await puppeteer.launch({ headless: "shell", protocolTimeout: 30_000 });
    buildMetadata.browserVersion = await browser.version();
    const browserProcess = browser.process();
    buildMetadata.browserProcess = { pid: browserProcess?.pid, stderr: "", exit: null };
    browserProcess?.stderr?.on("data", (data) => { buildMetadata.browserProcess.stderr = (buildMetadata.browserProcess.stderr + String(data)).slice(-16_000); });
    browserProcess?.on("exit", (code, signal) => { buildMetadata.browserProcess.exit = { code, signal, closedByHarness: closing }; });
    browser.on("disconnected", () => { buildMetadata.browserProcess.disconnected = { at: new Date().toISOString(), closedByHarness: closing }; });
    const address = server.httpServer.address();
    assert.ok(address && typeof address === "object");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    async function createPage(viewport, fixture = restaurants, route) {
      const context = await browser.createBrowserContext();
      try {
        const page = await context.newPage();
        await page.setViewport(viewport);
        page.setDefaultTimeout(10_000);
        // P07 tests SW upgrade/offline separately; fixtures must reach this page.
        await page.setBypassServiceWorker(true);
        await page.setRequestInterception(true);
        const requests = [];
        const errors = [];
        const consoleErrors = [];
        page.on("pageerror", (error) => errors.push(String(error.stack ?? error)));
        page.on("console", (message) => {
          if (message.type() === "error") consoleErrors.push(message.text());
        });
        page.on("request", (request) => {
          const url = new URL(request.url());
          const external = ["http:", "https:"].includes(url.protocol) && url.origin !== baseUrl;
          requests.push({ url: request.url(), type: request.resourceType(), blocked: external });
          const matched = url.pathname.match(/^\/data\/hong-kong\/(?:([0-9]{4})\/)?(michelin-bib-gourmand|michelin-starred)\.json$/u);
          const action = external
            ? request.abort("failed")
            : route
              ? route(request, url)
              : matched
              ? request.respond({ status: 200, contentType: "application/json", body: JSON.stringify(fixture.map((record) => ({
                ...record, guide_type: matched[2], edition_year: Number(matched[1] ?? record.edition_year),
                ...(record.star_rating == null ? {} : { star_rating: matched[2] === "michelin-starred" ? 1 : 0 }),
              }))) })
              : request.continue();
          action.catch((error) => errors.push(`Request interception: ${error.message}`));
        });
        const closeSession = observedSession({ page, requests, errors, consoleErrors, browser, outDir: resolve(outDir), buildMetadata, close: async () => { sessions.delete(closeSession); await context.close(); } });
        sessions.add(closeSession);
        return { page, requests, errors, consoleErrors, close: closeSession };
      } catch (error) {
        await context.close();
        throw error;
      }
    }

    const fixtureUrl = `${baseUrl}/?${new URLSearchParams({ city: restaurants[0].city, year: String(restaurants[0].edition_year), guide: restaurants[0].guide_type })}`;
    return { browser, baseUrl, fixtureUrl, createPage, close, buildMetadata, requests };
  } catch (error) {
    await close();
    throw error;
  }
}
