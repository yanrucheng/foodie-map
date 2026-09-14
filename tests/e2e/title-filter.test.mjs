/** Real browser interactions are kept outside the deterministic Vitest tier. */
import assert from "node:assert/strict";
import { after, before } from "node:test";
import { test } from "./evidence.mjs";
import { createBrowserHarness } from "./helpers.mjs";

let harness;
before(async () => { harness = await createBrowserHarness(); });
after(async () => { await harness?.close(); });

test("desktop guide picker opens, stays clickable, and updates title and URL", async () => {
  const session = await harness.createPage({ width: 1280, height: 800 });
  const { page } = session;
  try {
    await page.goto(harness.fixtureUrl, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".dynamic-title", { visible: true });
    const chips = await page.$$(".dynamic-title .seg-chip");
    await chips[2].click();
    await page.waitForSelector(".seg-dropdown", { visible: true });
    assert.ok((await page.$$(".seg-dropdown-item:not(.seg-dropdown-item--selected)")).length > 0);
    assert.equal((await page.$$(".seg-dropdown-item--selected")).length, 1);

    assert.ok(await page.evaluate(() => {
      const item = document.querySelector(".seg-dropdown-item:not(.seg-dropdown-item--selected)");
      const rect = item.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return hit === item || item.contains(hit);
    }), "The dropdown option must not be obscured");
    const option = await page.$(".seg-dropdown-item:not(.seg-dropdown-item--selected)");
    const target = await option.evaluate((element) => element.textContent);
    await option.click();
    await page.waitForFunction(() => !document.querySelector(".seg-dropdown"));
    assert.equal(await page.$$eval(".dynamic-title .seg-chip-label", (labels) => labels[2].textContent), target);
    assert.equal(new URL(page.url()).searchParams.get("guide"), "michelin-starred");
    assert.match(await page.title(), /米其林星级/);
    assert.deepEqual(session.errors, []);
  } finally {
    await session.close();
  }
});

test("mobile guide picker opens its sheet and updates title and URL", async () => {
  const session = await harness.createPage({ width: 390, height: 844, isMobile: true, hasTouch: true });
  const { page } = session;
  try {
    await page.goto(harness.fixtureUrl, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".dynamic-title--compact", { visible: true });
    const chips = await page.$$(".dynamic-title .seg-chip");
    await chips[2].click();
    await page.waitForSelector(".bottom-sheet-container", { visible: true });
    assert.ok((await page.$$(".seg-sheet-item:not(.seg-sheet-item--selected)")).length > 0);
    assert.equal((await page.$$(".seg-sheet-item--selected")).length, 1);
    const option = await page.$(".seg-sheet-item:not(.seg-sheet-item--selected)");
    const target = await option.evaluate((element) => element.querySelector(".seg-sheet-item-label").textContent);
    // Locator waits for the opening transition to place a stable target onscreen.
    await page.locator(".seg-sheet-item:not(.seg-sheet-item--selected)").click();
    await page.waitForFunction(() => !document.querySelector(".bottom-sheet-container"));
    assert.equal(await page.$$eval(".dynamic-title .seg-chip-label", (labels) => labels[2].textContent), target);
    assert.equal(new URL(page.url()).searchParams.get("guide"), "michelin-starred");
    assert.match(await page.title(), /米其林星级/);
    assert.deepEqual(session.errors, []);
  } finally {
    await session.close();
  }
});
