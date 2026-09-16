import assert from "node:assert/strict";
import { before, after } from "node:test";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { test } from "./evidence.mjs";
import { p08Fixture } from "../fixtures/p08Catalog.ts";
import { createBrowserHarness } from "./helpers.mjs";
import { buildReleaseFixture, releaseServer, pwaSession, ready, controlled, choose, search, snapshot, saveRecords } from "./release.helpers.mjs";
import { audit, tabTo, visibleFocus } from "./accessibility.helpers.mjs";

process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve("node_modules/.cache/playwright");
const { chromium, webkit } = await import("playwright");
const city = "visual-fixture", url = `/?city=${city}&year=2026&guide=michelin-starred`;
const observations = [];
let directory, harness, server, chrome, safari, release, formalServer, formalHarness, formalChrome;
before(async () => {
  directory = await mkdtemp(join(tmpdir(), "foodie-filter-panel-"));
  const fixture = p08Fixture();
  for (const [path, rows] of Object.entries(fixture.payloads)) {
    if (!path.endsWith("/michelin-starred.json")) continue;
    for (const [index, row] of rows.entries()) {
      row.star_rating = index === 4 ? undefined : index === 5 ? null : index % 3 + 1;
      if (index === 6 || index === 8) { row.star_rating = 2; row.dining_category = "french"; }
    }
  }
  // A genuine empty edition still passes the existing catalog/parser pipeline.
  fixture.payloads["/data/visual-fixture/2027/michelin-bib-gourmand.json"] = [];
  release = await buildReleaseFixture(fixture, join(directory, "dist"));
  server = await releaseServer(join(directory, "dist"));
  harness = await createBrowserHarness({ outDir: join(directory, "dist"), server });
  chrome = await chromium.connectOverCDP(harness.browser.wsEndpoint());
  safari = await webkit.launch({ headless: true });
  formalServer = await releaseServer(resolve(process.env.E2E_DIST ?? "dist"));
  formalHarness = await createBrowserHarness({ outDir: resolve(process.env.E2E_DIST ?? "dist"), server: formalServer });
  formalChrome = await chromium.connectOverCDP(formalHarness.browser.wsEndpoint());
});
after(async () => {
  await saveRecords("filter-panel.json", { browsers: { chromium: chrome?.version(), webkit: safari?.version() }, observations });
  await safari?.close(); await chrome?.close(); await formalChrome?.close();
  await harness?.close(); await formalHarness?.close();
  if (directory) await rm(directory, { recursive: true, force: true });
});
async function panel(page) {
  if (page.viewportSize().width < 768) await page.getByRole("button", { name: "筛选", exact: true }).click();
}
async function closePanel(page) {
  if (await page.locator(".bottom-sheet-container[open]").count()) await page.keyboard.press("Escape");
}
async function count(page, total, mapped) {
  await page.waitForFunction(({ total, mapped }) => document.querySelector(".dataset-status")?.textContent.includes(`筛选结果 ${total} · 筛选内可定位 ${mapped}`), { total, mapped });
}
async function geometry(page, name, columns) {
  await page.locator(".control-block").waitFor({ state: "visible" });
  await page.locator(".filter-item input:enabled").first().waitFor();
  const value = await page.locator(".control-block").evaluate((node) => {
    const grid = node.querySelector(".dining-filter-segment");
    const boxes = [...grid.children].map((button) => {
      const r = button.getBoundingClientRect(), label = button.querySelector(".dining-label").getBoundingClientRect();
      const icon = button.querySelector(".dining-icon").getBoundingClientRect(), mark = button.querySelector(".selection-mark").getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, fits: icon.right <= label.left && label.right <= mark.left, label: button.querySelector(".dining-label").textContent };
    });
    return { width: node.getBoundingClientRect().width, columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length, boxes,
      overflow: node.scrollWidth > node.clientWidth || document.documentElement.scrollWidth > innerWidth,
      targets: [...node.querySelectorAll(".star-segment-btn, .toggle-all-btn")].map((button) => ({ width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })),
      nestedScroll: getComputedStyle(node.querySelector(".filter-list")).overflowY };
  });
  observations.push({ name, ...value });
  assert.equal(value.columns, columns, name);
  assert.equal(value.overflow, false, name);
  assert.ok(value.boxes.every((box) => box.fits && box.height >= 44 && box.width >= 44), JSON.stringify(value));
  assert.ok(value.targets.every((box) => box.width >= 44 && box.height >= 44));
  assert.equal(value.nestedScroll, "visible");
  assert.ok(value.boxes.every((box) => Math.abs(box.width - value.boxes[0].width) < 1));
  return value.boxes;
}

for (const engine of ["chromium", "webkit"]) {
  const browser = () => engine === "chromium" ? chrome : safari;
  for (const viewport of [{ width: 1280, height: 800 }, { width: 820, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 640 }]) {
    test(`Filter B ${engine} ${viewport.width}: complete labels, stable columns, keyboard and whole-panel scroll`, async () => {
      const s = await pwaSession(browser(), server, viewport), { page } = s;
      page.p06TabPrefix = engine === "webkit" ? "Alt+" : "";
      try {
        await page.goto(server.baseUrl + url); await controlled(page); await ready(page, 2026, city); await panel(page);
        if (viewport.width < 768) await page.getByRole("button", { name: "展开面板" }).click();
        const before = await geometry(page, `${engine}-${viewport.width}`, viewport.width === 820 ? 1 : 2);
        assert.deepEqual(before.map((b) => b.label), ["全部", "面饭面点", "肉食主打", "鱼鲜主打", "甜饮", "法式", "中餐", "日式会席", "其他料理"]);
        await page.locator('[data-dining="japanese_course"]').click();
        const after = await geometry(page, `${engine}-${viewport.width}-selected`, viewport.width === 820 ? 1 : 2);
        // Scrolling can translate the whole grid, but selection cannot resize/reflow it.
        assert.deepEqual(after.map((b) => [b.x, b.y - after[0].y, b.width, b.height]), before.map((b) => [b.x, b.y - before[0].y, b.width, b.height]));
        const none = page.getByRole("button", { name: "全不选", exact: true });
        await none.focus(); await page.keyboard.press("Enter");
        await count(page, 0, 0);
        assert.equal(await page.evaluate(() => document.activeElement.textContent), "全选");
        await visibleFocus(page);
        await page.keyboard.press("Space");
        assert.equal(await page.evaluate(() => document.activeElement.textContent), "全不选");
        await tabTo(page, ".mode-btn"); await visibleFocus(page);
        if (viewport.width < 768) {
          assert.ok((await page.locator(".filter-item").evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect().height))).every((height) => height >= 44));
        }
        // A wheel over the list must scroll the containing panel, never a nested list.
        const scroller = page.locator(viewport.width < 768 ? ".bottom-sheet-content" : ".control-block");
        await scroller.evaluate((node) => { node.scrollTop = 0; });
        await page.locator('[data-stars="all"]').hover();
        await page.mouse.wheel(0, 500);
        await page.waitForFunction((selector) => document.querySelector(selector).scrollTop > 0, viewport.width < 768 ? ".bottom-sheet-content" : ".control-block");
        await scroller.evaluate((node) => { node.scrollTop = 0; });
        await audit(page, `filter-B-${engine}-${viewport.width}`);
        await snapshot(page, `filter-B-${engine}-${viewport.width}`, release, observations);
        assert.deepEqual(s.errors, []);
      } finally { await s.close(); }
    });
  }

  test(`Filter text enlargement ${engine}: 200% labels reflow to one column`, async () => {
    const s = await pwaSession(browser(), server), { page } = s;
    try {
      await page.goto(server.baseUrl + url); await controlled(page); await ready(page, 2026, city);
      await page.addStyleTag({ content: "html { font-size: 200%; }" });
      await geometry(page, `${engine}-text-200-desktop`, 1);
      await page.setViewportSize({ width: 390, height: 844 }); await panel(page);
      await geometry(page, `${engine}-text-200-mobile`, 1);
      page.p06TabPrefix = engine === "webkit" ? "Alt+" : "";
      await page.keyboard.press(`${page.p06TabPrefix}Tab`);
      await tabTo(page, ".mode-btn");
      await visibleFocus(page);
      await audit(page, `filter-text-200-${engine}`);
      assert.deepEqual(s.errors, []);
    } finally { await s.close(); }
  });

  test(`Filter interactions ${engine}: intersections, zero, map/heat/stats, reveal, resize and edition resets`, async () => {
    const s = await pwaSession(browser(), server), { page } = s;
    try {
      await page.goto(server.baseUrl + url); await controlled(page); await ready(page, 2026, city); await count(page, 12, 11);
      await page.evaluate(() => {
        const original = window.L.heatLayer;
        window.L.heatLayer = function (points, options) { window.filterHeat = points; return original(points, options); };
      });
      for (const [star, n] of [[1, 3], [2, 5], [3, 2]]) {
        await page.locator(`[data-stars="${star}"]`).click(); await count(page, n, n);
      }
      await page.locator('[data-stars="all"]').click(); await count(page, 12, 11);
      await page.locator('[data-stars="2"]').click(); await page.locator('[data-dining="french"]').click(); await count(page, 2, 2);
      await page.getByRole("button", { name: "全不选", exact: true }).click(); await count(page, 0, 0);
      assert.match(await page.locator(".filter-empty-note").textContent(), /尚未选择菜系/);
      await page.waitForFunction(() => !document.querySelector(".restaurant-marker, .cluster-badge"));
      assert.equal(await page.locator(".stats-empty").count(), 1);
      await page.getByRole("checkbox", { name: "新发酵品类" }).check(); await count(page, 1, 1);
      assert.equal(await page.locator(".restaurant-marker").count(), 1);
      assert.equal(await page.locator(".stat-value").textContent(), "1");
      await page.getByRole("button", { name: "切换到热力图", exact: true }).click();
      assert.equal(await page.evaluate(() => window.filterHeat.length), 1);
      await page.getByRole("checkbox", { name: "新发酵品类" }).uncheck(); await count(page, 0, 0);
      assert.equal(await page.evaluate(() => window.filterHeat.length), 0);
      await page.getByRole("button", { name: "全选", exact: true }).click(); await count(page, 2, 2);
      assert.equal(await page.locator('[data-stars="2"]').getAttribute("aria-pressed"), "true");
      assert.equal(await page.locator('[data-dining="french"]').getAttribute("aria-pressed"), "true");
      await page.getByRole("button", { name: "切换到标记模式", exact: true }).click();
      await page.getByRole("checkbox", { name: "第二品类" }).uncheck(); await count(page, 1, 1);
      await page.setViewportSize({ width: 390, height: 844 }); await panel(page);
      assert.equal(await page.locator('[data-stars="2"]').getAttribute("aria-pressed"), "true");
      assert.equal(await page.getByRole("checkbox", { name: "第二品类" }).isChecked(), false);
      await closePanel(page); await search(page, "第二品类餐食"); await count(page, 2, 2);
      await page.keyboard.press("Escape"); await panel(page);
      assert.equal(await page.locator('[data-stars="2"]').getAttribute("aria-pressed"), "true");
      assert.equal(await page.locator('[data-dining="french"]').getAttribute("aria-pressed"), "true");
      await closePanel(page); await search(page, "空值无坐标"); await count(page, 12, 11);
      assert.match(await page.locator(".mobile-popup-card").textContent(), /暂无可靠坐标/);
      await page.keyboard.press("Escape"); await panel(page);
      await page.locator('[data-stars="3"]').click(); await closePanel(page);
      await page.setViewportSize({ width: 1280, height: 800 });
      assert.equal(await page.locator('[data-stars="3"]').getAttribute("aria-pressed"), "true");
      await search(page, "法式测试"); await count(page, 12, 11);
      await page.locator('[data-stars="1"]').click();
      assert.equal(await page.locator(".leaflet-popup-content, .restaurant-marker--selected").count(), 0);
      for (const [dimension, label, year, nextCity] of [["年份", "2027", 2027, city], ["城市", "第二测试城", 2027, "second-fixture"], ["榜单", "米其林必比登", 2027, "second-fixture"]]) {
        await page.getByRole("button", { name: "全不选", exact: true }).click();
        await choose(page, dimension, label); await ready(page, year, nextCity); await count(page, 12, 11);
        assert.ok((await page.getByRole("checkbox").all()).length > 0);
        assert.equal(await page.getByRole("button", { name: "全选", exact: true }).isDisabled(), true);
        assert.equal(await page.locator('[data-dining="all"]').getAttribute("aria-pressed"), "true");
      }
      assert.equal(await page.locator(".star-filter-segment").count(), 0);
      assert.deepEqual(s.errors, []);
    } finally { await s.close(); }
  });

  test(`Filter data states ${engine}: loading, failure and empty edition disable bulk actions`, async () => {
    const s = await pwaSession(browser(), server), { page } = s;
    const resource = release.resources["/data/visual-fixture/2026/michelin-starred.json"].url;
    let releaseResponse;
    server.state.overrides.set(new URL(resource, server.baseUrl).pathname, () => new Promise((resolve) => { releaseResponse = resolve; }));
    try {
      await page.goto(server.baseUrl + url);
      await page.locator('.dataset-status[data-state="loading"]').waitFor();
      for (const action of ["全选", "全不选"]) assert.equal(await page.getByRole("button", { name: action, exact: true }).isDisabled(), true);
      assert.equal(await page.locator(".filter-empty-note").count(), 0);
      await page.waitForFunction(() => document.querySelector(".dataset-status")?.dataset.state === "loading");
      // Allow the pending HTTP request to enter the controllable server.
      await new Promise((resolve, reject) => {
        const deadline = Date.now() + 8000;
        const poll = () => releaseResponse ? resolve() : Date.now() > deadline ? reject(new Error("Dataset request did not arrive")) : setTimeout(poll, 10);
        poll();
      });
      releaseResponse({ status: 503, body: "Unavailable" });
      server.state.overrides.set(new URL(resource, server.baseUrl).pathname, { status: 503, body: "Unavailable" });
      await page.locator('.dataset-status[data-state="error"]').waitFor();
      for (const action of ["全选", "全不选"]) assert.equal(await page.getByRole("button", { name: action, exact: true }).isDisabled(), true);
      assert.equal(await page.locator(".filter-empty-note").count(), 0);
      server.state.overrides.clear();
      await page.locator(".dataset-status button").click(); await ready(page, 2026, city);
      await choose(page, "年份", "2027"); await choose(page, "榜单", "米其林必比登");
      await page.locator('.dataset-status[data-state="empty"]').waitFor();
      for (const action of ["全选", "全不选"]) assert.equal(await page.getByRole("button", { name: action, exact: true }).isDisabled(), true);
      assert.equal(await page.locator(".filter-empty-note").count(), 0);
      assert.deepEqual(s.errors, []);
    } finally { releaseResponse?.({ status: 503, body: "Unavailable" }); server.state.overrides.clear(); await s.close(); }
  });

  test(`Filter formal data ${engine}: Chengdu three-star zero, Tokyo full categories and mobile scrolling`, async () => {
    const s = await pwaSession(engine === "chromium" ? formalChrome : safari, formalServer), { page } = s;
    try {
      await page.goto(formalServer.baseUrl + "/?city=chengdu&year=2026&guide=michelin-starred"); await ready(page, 2026, "chengdu");
      await page.locator('[data-stars="3"]').click(); await count(page, 0, 0);
      assert.match(await page.locator(".dataset-status").textContent(), /调整星级/);
      assert.equal(await page.locator(".filter-empty-note").count(), 0);
      await page.locator('[data-stars="all"]').click();
      const rows = JSON.parse(await readFile("public/data/chengdu/2026/michelin-starred.json", "utf8"));
      await count(page, rows.length, rows.length);
      await page.goto(formalServer.baseUrl + "/?city=tokyo&year=2026&guide=michelin-starred");
      await page.locator('.dataset-status[data-state="ready"]').waitFor();
      await page.setViewportSize({ width: 320, height: 640 }); await panel(page);
      await geometry(page, `${engine}-tokyo-320`, 2);
      await page.getByRole("checkbox").last().focus();
      await page.keyboard.press("Space");
      const row = await page.getByRole("checkbox").last().boundingBox();
      assert.ok(row.y > 0 && row.y + row.height < 640);
      await page.locator(".mode-btn").focus();
      await page.keyboard.press("Enter");
      await closePanel(page); await panel(page);
      assert.equal(await page.locator(".filter-list").evaluate((node) => getComputedStyle(node).overflowY), "visible");
      assert.deepEqual(s.errors, []);
    } finally { await s.close(); }
  });
}
