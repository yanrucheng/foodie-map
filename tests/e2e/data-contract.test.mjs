/** P02 field adaptation only; complete no-position detail interactions belong to P04. */
import assert from "node:assert/strict";
import { test } from "./evidence.mjs";
import { createBrowserHarness, restaurants } from "./helpers.mjs";

for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`partial facts preserve available prices and search entries at ${viewport.width}px`, async () => {
    const fixture = [{
      ...restaurants[0], name_zh: null, address: null, address_en: null, signature_dishes: null,
      price: "約 200–400", currency: "HKD", geocode_success: null,
    }, {
      id: 2, name: "P02 缺少位置", city: "hong-kong", guide_type: "michelin-bib-gourmand",
      edition_year: 2026, cuisine_group: "OTHER", geocode_success: false,
    }];
    const harness = await createBrowserHarness();
    let session;
    try {
      session = await harness.createPage(viewport, fixture);
      const { page } = session;
      await page.goto(harness.fixtureUrl, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".marker-dot", { visible: true });
      assert.equal((await page.$$(".marker-dot")).length, 1, "Only the record with a usable position is drawn");
      await page.click(".marker-dot");
      const card = viewport.width < 768 ? ".mobile-popup-card" : ".leaflet-popup-content";
      await page.waitForSelector(card, { visible: true });
      const content = await page.$eval(card, (element) => element.textContent);
      assert.match(content, /P01 Fixture A/);
      assert.match(content, /HKD 約 200–400/);
      assert.doesNotMatch(content, /招牌菜|地址|undefined|null|人均|未核验/);
      assert.equal((await page.$$(`${card} a`)).length, 0, "A missing source URL creates no link");
      await page.locator(viewport.width < 768 ? ".mobile-popup-close" : ".leaflet-popup-close-button").click();
      await page.type(".search-wrap input", "P02 缺少");
      await page.waitForSelector(".search-dropdown-item", { visible: true });
      assert.equal((await page.$$(".search-dropdown-item")).length, 1);
      assert.match(await page.$eval(".search-dropdown-item", (element) => element.textContent), /P02 缺少位置/);
      assert.deepEqual(session.errors, []);
    } finally { await harness.close(); }
  });
}
