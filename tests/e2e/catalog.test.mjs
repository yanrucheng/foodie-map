import assert from "node:assert/strict";
import { test } from "./evidence.mjs";
import { mkdtemp, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "playwright";
import { p03Fixture } from "../fixtures/p03Catalog.ts";
import { fileManifest } from "../../scripts/release-artifact.ts";
import { createBrowserHarness } from "./helpers.mjs";
import { buildReleaseFixture, releaseServer, pwaSession, ready, controlled, choose, search, snapshot, saveRecords } from "./release.helpers.mjs";

test("P03 formal raw catalog: both layouts discover new city, two editions, custom taxonomy, partial and evidenced zero", async () => {
  const before = await fileManifest(resolve("src"));
  const directory = await mkdtemp(join(tmpdir(), "foodie-p03-browser-"));
  const fixture = p03Fixture(); let server, browser, harness;
  const records = [];
  try {
    const release = await buildReleaseFixture(fixture, join(directory, "dist"));
    assert.equal(release.discovery.provider, "/data/catalog.json");
    server = await releaseServer(join(directory, "dist"));
    harness = await createBrowserHarness({ outDir: join(directory, "dist"), server });
    browser = await chromium.connectOverCDP(harness.browser.wsEndpoint());
    for (const width of [1280, 390]) {
      const session = await pwaSession(browser, server, { width, height: 844 });
      const page = session.page;
      try {
        await page.goto(server.baseUrl + "/?city=harbor-fixture&year=2026&guide=michelin-starred"); await ready(page, 2026, "harbor-fixture"); await controlled(page); await ready(page, 2026, "harbor-fixture");
        assert.match(await page.locator(".dataset-status").textContent(), /名单已核验/u);
        await search(page, "甲店"); assert.match(await page.locator(".mobile-popup-card, .leaflet-popup-content").textContent(), /甲店/u);
        await snapshot(page, `p03-${width}-2026`, release, records);
        if (width === 390) await page.locator(".mobile-popup-card button[aria-label='关闭餐厅详情']").click();
        await choose(page, "年份", "2027"); await ready(page, 2027, "harbor-fixture");
        assert.match(await page.locator(".dataset-status").textContent(), /部分名单/u);
        await search(page, "甲店新名"); assert.match(await page.locator(".mobile-popup-card, .leaflet-popup-content").textContent(), /甲店新名/u);
        await snapshot(page, `p03-${width}-2027`, release, records);
        if (width === 390) await page.locator(".mobile-popup-card button[aria-label='关闭餐厅详情']").click();
        await choose(page, "城市", "零收录测试城");
        await page.waitForFunction(() => document.querySelector(".dataset-status")?.dataset.state === "empty");
        assert.match(await page.locator(".dataset-status").textContent(), /名单已核验/u);
        await snapshot(page, `p03-${width}-official-zero`, release, records);
        await choose(page, "城市", "港湾测试城"); await choose(page, "榜单", "米其林必比登");
        await page.waitForFunction(() => document.querySelector(".dataset-status")?.dataset.state === "empty");
        assert.match(await page.locator(".dataset-status").textContent(), /空文件不代表官方零收录/u);
        await choose(page, "年份", "2026"); await ready(page, 2026, "harbor-fixture");
        await search(page, "甲店"); assert.doesNotMatch(await page.locator(".mobile-popup-card, .leaflet-popup-content").textContent(), /甲店新名/u);
        await snapshot(page, `p03-${width}-back-to-2026`, release, records);
        assert.deepEqual(session.errors, []);
      } finally { await session.close(); }
    }
    const after = await fileManifest(resolve("src")); assert.deepEqual(after, before);
    await saveRecords("p03-catalog-browser.json", { records, businessBefore: before, businessAfter: after, formalDiscovery: true });
  } finally {
    await browser?.close();
    if (harness) await harness.close();
    else if (server) await new Promise((resolve) => server.httpServer.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
});
