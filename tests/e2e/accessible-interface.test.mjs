/** P06 uses the existing node:test/production-preview tier, with real engine input. */
import assert from "node:assert/strict";
import { before, after } from "node:test";
import { test } from "./evidence.mjs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { build } from "vite";
import { createBrowserHarness } from "./helpers.mjs";
import { fixture, initialUrl, artifacts, records, session, ready, tabTo, search, audit, visibleFocus } from "./accessibility.helpers.mjs";

// Match the documented local browser cache without requiring a global installation.
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve("node_modules/.cache/playwright");
const { chromium, webkit } = await import("playwright");
let temporary, harness, chromiumBrowser, webkitBrowser;
before(async () => {
  temporary = await mkdtemp(join(tmpdir(), "foodie-p06-"));
  await build({ logLevel: "error", define: { __FOODIE_RELEASE__: "null" }, plugins: [{ name: "p06-discovery-fixture", enforce: "pre",
    load(id) { if (id === resolve("src/config/cities.ts")) return `export const cities = ${JSON.stringify(fixture.cities)};`; },
  }], build: { outDir: temporary, emptyOutDir: true } });
  harness = await createBrowserHarness({ outDir: temporary });
  chromiumBrowser = await chromium.connectOverCDP(harness.browser.wsEndpoint());
  webkitBrowser = await webkit.launch();
  chromiumBrowser.p07BuildMetadata = harness.buildMetadata;
  webkitBrowser.p07BuildMetadata = harness.buildMetadata;
});
after(async () => {
  if (artifacts) await writeFile(join(artifacts, "p06-browser.json"), JSON.stringify({
    chromium: chromiumBrowser?.version(), webkit: webkitBrowser?.version(), fixture: "tests/e2e/fixtures/guide-experience.json",
    input: "Playwright keyboard/pointer/touch; no DOM clicks, force clicks or removed overlays",
    records,
  }, null, 2));
  await webkitBrowser?.close(); await chromiumBrowser?.close(); await harness?.close();
  if (temporary) await rm(temporary, { recursive: true, force: true });
});
const viewports = [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1280, height: 800 }];
for (const engine of ["chromium", "webkit"]) {
  const browser = () => engine === "chromium" ? chromiumBrowser : webkitBrowser;
  for (const viewport of viewports) test(`P06-R1/R2/R3/R5/R6 ${engine} ${viewport.width}: expanded states, long details and modal lifecycle`, async () => {
    const s = await session(browser(), harness.baseUrl, viewport, { long: true }); const { page } = s;
    const prefix = `p06-${engine}-${viewport.width}`;
    try {
      await page.goto(harness.baseUrl + initialUrl); await ready(page);
      await audit(page, `${prefix}-default`);
      await tabTo(page, '[data-focus-key="picker-年份"]'); await visibleFocus(page);
      await page.keyboard.press("Enter"); await page.getByRole("option", { selected: true }).waitFor();
      await audit(page, `${prefix}-picker`);
      await page.keyboard.press("ArrowUp"); await visibleFocus(page);
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.activeElement?.dataset.focusKey === "picker-年份");
      await tabTo(page, '[data-focus-key="search"]');
      await page.keyboard.type("无坐标"); await page.keyboard.press("ArrowDown"); await visibleFocus(page);
      await audit(page, `${prefix}-search`);
      await page.keyboard.press("Enter"); await page.locator(".mobile-popup-card").waitFor();
      await audit(page, `${prefix}-unknown-detail`);
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.activeElement?.dataset.focusKey === "search");
      await search(page, "长名称");
      await audit(page, `${prefix}-long-detail`);
      await page.keyboard.press("Escape");
      if (viewport.width < 768) {
        await tabTo(page, '[data-focus-key="panel-filter"]'); await page.keyboard.press("Enter");
        await audit(page, `${prefix}-filter-half`);
        await tabTo(page, ".mode-btn"); await visibleFocus(page);
        await page.keyboard.press("Enter");
        await page.getByRole("button", { name: "展开面板" }).click();
        await audit(page, `${prefix}-filter-full`);
        for (let i = 0; i < 18; i++) { await page.keyboard.press(`${page.p06TabPrefix}Tab`); assert.equal(await page.evaluate(() => !!document.activeElement.closest("dialog")), true); }
        for (let i = 0; i < 18; i++) { await page.keyboard.press(`${page.p06TabPrefix}Shift+Tab`); assert.equal(await page.evaluate(() => !!document.activeElement.closest("dialog")), true); }
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => document.activeElement?.dataset.focusKey === "panel-filter");
        for (const panel of ["stats", "legend"]) {
          await page.locator(`[data-focus-key="panel-${panel}"]`).click();
          await audit(page, `${prefix}-${panel}`);
          await page.locator(".bottom-sheet-backdrop").click({ position: { x: 5, y: 5 } });
        }
        assert.equal(await page.evaluate(() => document.body.style.overflow), "");
        await page.locator('[data-focus-key="panel-filter"]').click();
        const handle = await page.locator(".bottom-sheet-handle").boundingBox();
        await page.mouse.move(handle.x + 30, handle.y + 5); await page.mouse.down();
        await page.mouse.move(handle.x + 30, handle.y + 220, { steps: 6 }); await page.mouse.up();
        await page.waitForFunction(() => !document.querySelector("dialog[open]"));
        await page.locator('[data-focus-key="panel-filter"]').click();
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.waitForFunction(() => !document.querySelector("dialog[open]") && document.body.style.overflow === "");
        await page.waitForFunction(() => document.activeElement?.dataset.focusKey === "search");
      }
      assert.deepEqual(s.errors, []);
    } finally { await s.close(); }
  });

  test(`P06-R1/R4/R6 ${engine}: complete keyboard journey and distinct failures`, async () => {
    const s = await session(browser(), harness.baseUrl, { width: 1280, height: 800 }); const { page } = s;
    try {
      await page.addInitScript(() => {
        window.p06LocationRequests = 0;
        Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
          watchPosition(_success, error) { window.p06LocationRequests++; error({ code: 1 }); return 1; }, clearWatch() {},
        } });
      });
      await page.goto(harness.baseUrl + initialUrl); await ready(page);
      for (const dimension of ["城市", "年份", "榜单"]) {
        await tabTo(page, `[data-focus-key="picker-${dimension}"]`);
        await page.keyboard.press("Enter"); await page.keyboard.press("End"); await visibleFocus(page); await page.keyboard.press("Home");
        await page.keyboard.press("Enter");
        await page.waitForFunction((key) => document.activeElement?.dataset.focusKey === key, `picker-${dimension}`);
        await ready(page);
      }
      await tabTo(page, '[data-focus-key="search"]'); await page.keyboard.type("A"); await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter");
      await page.locator(".leaflet-popup-content h2").waitFor(); await visibleFocus(page);
      assert.equal(await page.evaluate(() => document.activeElement.tagName), "H2");
      await tabTo(page, ".popup a"); await visibleFocus(page);
      const opened = page.context().waitForEvent("page"); await page.keyboard.press("Enter"); const source = await opened; await source.close();
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.activeElement?.dataset.focusKey === "search");
      await tabTo(page, ".dining-segment-btn"); await page.keyboard.press("Space");
      await tabTo(page, '.filter-item input'); await page.keyboard.press("Space"); await visibleFocus(page);
      await tabTo(page, ".mode-btn"); await page.keyboard.press("Enter");
      await page.locator("canvas.leaflet-heatmap-layer").waitFor(); await page.keyboard.press("Enter");
      await tabTo(page, ".loc-btn"); await page.keyboard.press("Enter");
      await page.getByText(/定位权限被拒绝/).waitFor();
      assert.equal(await page.evaluate(() => window.p06LocationRequests), 1);
      await audit(page, `p06-${engine}-location-denied`);
      await page.getByRole("combobox", { name: "搜索餐厅" }).fill("zzzzzz");
      await audit(page, `p06-${engine}-no-match`);
      assert.match(await page.locator(".search-feedback").textContent(), /修改搜索词/);
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "甜饮", exact: true }).click();
      await page.getByText(/当前筛选没有餐厅/).waitFor();
      await audit(page, `p06-${engine}-filtered-empty`);
      for (const failure of ["empty", "error", "bad-json", "loading"]) {
        s.state.data = failure;
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.locator(`.dataset-status[data-state="${failure === "bad-json" ? "error" : failure}"]`).waitFor();
        await audit(page, `p06-${engine}-${failure}`);
        if (failure === "loading") { s.state.data = "ready"; s.state.release(); await ready(page); }
      }
      s.state.data = "ready"; s.state.tiles = false;
      await page.reload(); await ready(page); await page.locator(".map-service-status").waitFor();
      await audit(page, `p06-${engine}-tile-error`);
      await search(page, "无坐标"); await page.keyboard.press("Escape");
      s.state.tiles = true; await page.getByRole("button", { name: "重试地图" }).click();
      await page.locator(".map-service-status").waitFor({ state: "hidden" });
      assert.deepEqual(s.errors, []);
    } finally { await s.close(); }
  });
}


test("P06-R1/R3/R5 real touch scroll, last active candidate, reduced visual viewport and target sizes", async () => {
  const s = await session(chromiumBrowser, harness.baseUrl, { width: 360, height: 800 }, { many: true });
  const { page } = s;
  try {
    await page.goto(harness.baseUrl + initialUrl); await ready(page);
    await page.getByRole("combobox").fill("候选");
    const client = await page.context().newCDPSession(page);
    const bounds = await page.locator(".search-dropdown").boundingBox();
    const x = bounds.x + 80, y = bounds.y + bounds.height - 25;
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let step = 1; step <= 6; step++) await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y - step * 22 }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    assert.equal(await page.locator(".mobile-popup-card").count(), 0);
    assert.ok(await page.locator(".search-dropdown").evaluate((node) => node.scrollTop > 0));
    for (let i = 0; i < 20; i++) await page.keyboard.press("ArrowDown");
    const activeVisible = await page.evaluate(() => {
      const input = document.querySelector('[role="combobox"]');
      const option = document.getElementById(input.getAttribute("aria-activedescendant"));
      const list = option.parentElement.getBoundingClientRect(), rect = option.getBoundingClientRect();
      return rect.top >= list.top && rect.bottom <= list.bottom;
    });
    assert.equal(activeVisible, true);
    await page.setViewportSize({ width: 360, height: 440 });
    await audit(page, "p06-chromium-reduced-viewport-search");
    await page.keyboard.press("Enter"); await page.locator(".mobile-popup-card").waitFor();
    await audit(page, "p06-chromium-reduced-viewport-detail");
    const close = await page.locator(".mobile-popup-close").boundingBox(); assert.ok(close.width >= 44 && close.height >= 44);
    await page.getByRole("button", { name: "关闭餐厅详情" }).tap();
    await page.setViewportSize({ width: 360, height: 800 });
    await page.getByRole("button", { name: "筛选", exact: true }).tap();
    const sizes = await page.locator("dialog button").evaluateAll((nodes) => nodes.map((node) => ({ name: node.textContent, width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })));
    assert.ok(sizes.every((size) => size.width >= 44 && size.height >= 44), JSON.stringify(sizes));
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /年份/ }).tap();
    await page.keyboard.press("Home"); await page.keyboard.press("Enter"); await ready(page);
    await page.waitForFunction(() => document.activeElement?.dataset.focusKey === "picker-年份");
    assert.equal(await page.evaluate(() => document.body.style.overflow), "");
    assert.deepEqual(s.errors, []);
  } finally { await s.close(); }
});

for (const engine of ["chromium", "webkit"]) test(`P06-R2/R4 ${engine}: mobile failure notices and dataset withdrawal close the modal`, async () => {
  const s = await session(engine === "chromium" ? chromiumBrowser : webkitBrowser, harness.baseUrl, { width: 390, height: 844 });
  const { page } = s;
  try {
    for (const reason of ["timeout", "unsupported"]) {
      await page.goto(harness.baseUrl + initialUrl); await ready(page);
      await page.evaluate((reason) => {
        if (reason === "unsupported") {
          delete navigator.geolocation;
          delete Object.getPrototypeOf(navigator).geolocation;
        } else Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
          watchPosition(_success, error) { error({ code: 3 }); return 1; }, clearWatch() {},
        } });
      }, reason);
      await page.getByRole("button", { name: "显示我的位置" }).click();
      await page.getByText(reason === "timeout" ? /定位超时/ : /不支持定位/).waitFor();
      await audit(page, `p06-${engine}-mobile-location-${reason}`);
    }
    for (const state of ["empty", "error"]) {
      s.state.data = state; await page.reload();
      await page.locator(`.dataset-status[data-state="${state}"]`).waitFor();
      await audit(page, `p06-${engine}-mobile-${state}`);
    }
    s.state.data = "ready"; await page.getByRole("button", { name: "重试", exact: true }).click(); await ready(page);
    await page.getByRole("button", { name: "筛选", exact: true }).click();
    // Model browser Back/Forward changing context while an overlay is open.
    await page.evaluate(() => { history.pushState(null, "", "?year=2027&city=fixture-city&guide=michelin-bib-gourmand"); dispatchEvent(new PopStateEvent("popstate")); });
    await ready(page); await page.waitForFunction(() => !document.querySelector("dialog[open]") && document.body.style.overflow === "");
    await page.waitForFunction(() => document.activeElement?.dataset.focusKey === "panel-filter");
    assert.deepEqual(s.errors, []);
  } finally { await s.close(); }
});


test("P06-R3 long city/guide labels reflow without clipping core choices", async () => {
  const s = await session(chromiumBrowser, harness.baseUrl, { width: 360, height: 800 });
  try {
    await s.page.goto(harness.baseUrl + initialUrl); await ready(s.page);
    // Text-only layout stress, no behavioral bypass or production fixture writes.
    await s.page.locator('.seg-chip-label').evaluateAll((nodes) => nodes.forEach((node) => { node.textContent += "VeryLongCityOrGuideWithoutSpaces".repeat(4); }));
    await audit(s.page, "p06-chromium-long-picker-labels");
    await s.page.getByRole("button", { name: /城市/ }).click();
    await s.page.locator('[role="option"]').evaluateAll((nodes) => nodes.forEach((node) => { node.querySelector('.seg-sheet-item-label').textContent += "VeryLongOptionWithoutSpaces".repeat(4); }));
    await audit(s.page, "p06-chromium-long-option-labels");
    await s.page.keyboard.press("End"); await visibleFocus(s.page);
    await s.page.keyboard.press("Escape");
    assert.deepEqual(s.errors, []);
  } finally { await s.close(); }
});
