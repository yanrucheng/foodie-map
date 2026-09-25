import assert from "node:assert/strict";
import { before, after } from "node:test";
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { test } from "./evidence.mjs";
import { p08Fixture } from "../fixtures/p08Catalog.ts";
import { fileManifest } from "../../scripts/release-artifact.ts";
import { getGroupStyle, getDiningCategory } from "../../src/config/restaurantPresentation.ts";
import { createBrowserHarness } from "./helpers.mjs";
import { buildReleaseFixture, releaseServer, pwaSession, ready, controlled, cached, choose, search, snapshot, saveRecords } from "./release.helpers.mjs";
import { audit } from "./accessibility.helpers.mjs";

process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve("node_modules/.cache/playwright");
const { chromium, webkit } = await import("playwright");
const city = "visual-fixture", dataPath = `/data/${city}/2026/michelin-bib-gourmand.json`;
const url = `/?city=${city}&year=2026&guide=michelin-bib-gourmand`;
const records = [];
let directory, harness, server, chrome, safari, release, businessBefore;
before(async () => {
  businessBefore = await fileManifest(resolve("src"));
  directory = await mkdtemp(join(tmpdir(), "foodie-p09-"));
  const fixture = p08Fixture();
  const root = join(directory, "public/data");
  for (const [ref, value] of Object.entries({ ...fixture.payloads, "/data/catalog.json": fixture.catalog })) {
    const file = join(directory, "public", ref); await mkdir(resolve(file, ".."), { recursive: true }); await writeFile(file, JSON.stringify(value, null, 2) + "\n");
  }
  const run = (args) => {
    const result = spawnSync(process.execPath, ["scripts/data-contract.ts", "--root", root, ...args], { encoding: "utf8" });
    records.push({ command: `node scripts/data-contract.ts --root <fixture>/public/data ${args.join(" ")}`, status: result.status, stdout: result.stdout, stderr: result.stderr });
    return result;
  };
  const validation = run(["--json"]);
  assert.equal(validation.status, 0);
  const report = JSON.parse(validation.stdout);
  for (const dataset of report.datasets) {
    const c = dataset.counts;
    assert.equal(Object.values(c.dining_category).reduce((a, b) => a + b, 0), c.listed);
    assert.equal(Object.values(c.price_grade).reduce((a, b) => a + b, 0), c.listed);
    assert.ok(c.dining_category.unclassified === 12 || (c.dining_category.other === 1 && c.dining_category.unclassified === 2));
  }
  assert.ok(new Set(report.datasets.map((d) => d.counts.largest_icon_price_group.ratio)).size > 1, "per-guide price concentrations remain distinct");
  await saveRecords("p09-catalog-validation.json", report);
  const file = join(root, dataPath.replace("/data/", "")), original = await readFile(file, "utf8");
  for (const field of ["dining_category", "serving_form", "cuisine_group"]) {
    const bad = JSON.parse(original); bad[0][field] = field !== "cuisine_group" ? "unknown" : "UNREGISTERED";
    await writeFile(file, JSON.stringify(bad));
    const result = run(["--json"]); assert.equal(result.status, 1);
    assert.ok(JSON.parse(result.stdout).diagnostics.some((d) => d.severity === "error" && d.record_id === 1 && d.field === `/0/${field}`));
    await writeFile(file, original);
  }
  const input = join(directory, "raw.json"), output = join(directory, "boarded.json");
  await writeFile(input, original);
  const boardArgs = ["-B", "skills/cuisine-boarding/board.py", "--input", input, "--output", output, "--taxonomy", join(root, "taxonomy/visual-fixture.json"), "--mappings", join(root, "taxonomy/visual-fixture-mappings.json")];
  for (const dry of [true, false]) {
    const result = spawnSync("python3", [...boardArgs, ...(dry ? ["--dry-run"] : [])], { encoding: "utf8", env: { ...process.env, FOODIE_NODE: process.execPath } });
    assert.equal(result.status, 0, result.stderr);
    if (dry) await assert.rejects(readFile(output));
    records.push({ name: dry ? "boarding dry-run" : "boarding", status: result.status, stderr: result.stderr });
  }
  assert.equal(await readFile(input, "utf8"), original);
  assert.deepEqual(JSON.parse(await readFile(output, "utf8")), JSON.parse(original));
  const boarded = await readFile(output, "utf8");
  const failure = spawnSync("python3", [...boardArgs, "--mappings", input], { encoding: "utf8", env: { ...process.env, FOODIE_NODE: process.execPath } });
  assert.equal(failure.status, 1); assert.equal(await readFile(output, "utf8"), boarded); assert.equal(await readFile(input, "utf8"), original);
  records.push({ name: "boarding failure preserves input and prior output", status: failure.status, stderr: failure.stderr });
  await saveRecords("p09-boarding-reconciliation.json", { before: JSON.parse(original), after: JSON.parse(boarded), sourceUnchanged: true, onlyCuisineGroupMayChange: true, failurePreservesOutput: true });
  release = await buildReleaseFixture(fixture, join(directory, "dist"));
  server = await releaseServer(join(directory, "dist"));
  harness = await createBrowserHarness({ outDir: join(directory, "dist"), server });
  chrome = await chromium.connectOverCDP(harness.browser.wsEndpoint());
  await saveRecords("p09-fixture.json", fixture);
});
after(async () => {
  const businessAfter = await fileManifest(resolve("src"));
  await saveRecords("p09-visual-encoding.json", { release, browsers: { chromium: chrome?.version(), webkit: safari?.version() }, businessBefore, businessAfter, records });
  await safari?.close(); await chrome?.close(); await harness?.close();
  if (directory) await rm(directory, { recursive: true, force: true });
  assert.deepEqual(businessAfter, businessBefore, "new city/forms need no business source changes");
});
async function closeDetail(page) {
  if (!page.p09CloseTrace) {
    const trace = { name: page.p09Scenario, kind: "detail-close", segments: [], attempts: [] };
    page.p09CloseTrace = trace; records.push(trace);
    await page.exposeFunction("p09RecordClose", (event) => {
      let segment = trace.segments.find((item) => item.documentId === event.documentId);
      if (!segment) { segment = { documentId: event.documentId, url: event.url, events: [] }; trace.segments.push(segment); }
      segment.events.push(event);
    });
    const observe = () => {
      const documentId = `${performance.timeOrigin}-${Math.random()}`;
      const describe = (node) => node instanceof Element ? `${node.tagName}#${node.id}.${node.getAttribute("class") ?? ""}` : null;
      const send = (event) => window.p09RecordClose({ documentId, url: location.href, time: performance.now(), ...event });
      const names = () => [...document.querySelectorAll(".mobile-popup-card h2, .leaflet-popup-content h2")].map((node) => node.textContent);
      for (const type of ["pointerdown", "pointerup", "mousedown", "mouseup", "touchstart", "touchend", "click"]) {
        document.addEventListener(type, (event) => {
          const point = event.changedTouches?.[0] ?? event;
          void send({ type, target: describe(event.target), hit: describe(document.elementFromPoint(point.clientX, point.clientY)), x: point.clientX, y: point.clientY, trusted: event.isTrusted, restaurants: names() });
        }, true);
      }
      let prior;
      const recordDialog = () => {
        const restaurants = names(), state = JSON.stringify(restaurants);
        if (state !== prior) { prior = state; void send({ type: "dialog-change", restaurants }); }
      };
      new MutationObserver(recordDialog).observe(document, { subtree: true, childList: true, characterData: true });
      recordDialog();
      window.p09CloseState = () => {
        const button = document.querySelector(".mobile-popup-close, .leaflet-popup-close-button");
        const rect = button?.getBoundingClientRect(), hit = rect ? document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) : null;
        const animations = document.getAnimations().filter((animation) => animation.effect?.target instanceof Element && button && (animation.effect.target.contains(button) || button.contains(animation.effect.target)) && animation.effect.getComputedTiming().iterations !== Infinity && !["finished", "idle"].includes(animation.playState)).map((animation) => ({ target: describe(animation.effect.target), name: animation.animationName ?? animation.transitionProperty, state: animation.playState, time: animation.currentTime }));
        return { documentId, time: performance.now(), restaurants: names(), button: describe(button), rect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
          hit: describe(hit), hitButton: !!button && button.contains(hit), animations, transform: button ? getComputedStyle(button).transform : null,
          selected: [...document.querySelectorAll(".restaurant-marker--selected")].map((node) => node.getAttribute("aria-label")) };
      };
    };
    await page.addInitScript(observe);
    await page.evaluate(observe);
  }
  const attempt = { before: await page.evaluate(() => window.p09CloseState()) };
  page.p09CloseTrace.attempts.push(attempt);
  try {
    attempt.readiness = await page.evaluate(() => new Promise((resolve) => {
      const started = performance.now();
      let previous, quietSince = started, frames = 0, frame, last;
      const finish = (settled) => { clearTimeout(timer); cancelAnimationFrame(frame); resolve({ settled, elapsedMs: performance.now() - started, stableFrames: frames, last }); };
      const timer = setTimeout(() => finish(false), 3000);
      const sample = () => {
        last = window.p09CloseState();
        const signature = JSON.stringify(last.rect), now = performance.now();
        if (signature !== previous || !last.hitButton || last.animations.length || !last.rect?.width || !last.rect?.height) { quietSince = now; frames = 0; }
        else frames++;
        previous = signature;
        if (frames >= 4 && now - quietSince >= 100) finish(true);
        else frame = requestAnimationFrame(sample);
      };
      frame = requestAnimationFrame(sample);
    }));
    assert.equal(attempt.readiness.settled, true, "Detail close button must settle and receive the click within 3000ms");
    await page.locator('.mobile-popup-close, .leaflet-popup-close-button').click();
    attempt.afterClick = await page.evaluate(() => window.p09CloseState());
    await page.locator('.mobile-popup-card, .leaflet-popup-content').waitFor({ state: "hidden" });
    await page.waitForFunction(() => !document.querySelector('.restaurant-marker--selected'));
    attempt.passed = true;
  } catch (error) {
    attempt.error = String(error.stack ?? error);
    throw error;
  } finally {
    attempt.after = await page.evaluate(() => window.p09CloseState()).catch((error) => ({ unavailable: String(error) }));
  }
}
async function filterPanel(page, mobile) { if (mobile) await page.getByRole("button", { name: "筛选", exact: true }).click(); }
async function closePanel(page, mobile) { if (mobile) { await page.keyboard.press("Escape"); await page.locator(".bottom-sheet-container").waitFor({ state: "hidden" }); } }
async function count(page, total, mapped) {
  await page.waitForFunction(({ total, mapped }) => document.querySelector(".dataset-status")?.textContent.includes(`筛选结果 ${total} · 筛选内可定位 ${mapped}`), { total, mapped });
}

for (const engine of ["chromium", "webkit"]) for (const width of [1280, 390]) {
  test(`P09 R1–R7 ${engine} ${width}px: raw catalog, forms, dense targets, context stability and offline icons`, async (context) => {
    if (engine === "webkit") safari ??= await webkit.launch({ headless: true });
    const s = await pwaSession(engine === "chromium" ? chrome : safari, server, { width, height: 844 });
    const page = s.page, mobile = width < 768;
    page.p09Scenario = context.name;
    page.on("pageerror", (error) => { records.push({ name: `${engine}-${width}-page-error`, stack: error.stack }); console.error(error.stack); });
    const observedRequests = []; page.on("request", (request) => observedRequests.push(request.url()));
    try {
      await page.goto(server.baseUrl + url); await controlled(page); await ready(page, 2026, city); await cached(page, release, dataPath);
      await count(page, 12, 11);
      await page.evaluate(() => {
        const original = window.L.heatLayer;
        window.L.heatLayer = function (points, options) { window.p09HeatPoints = points; return original(points, options); };
      });
      await filterPanel(page, mobile);
      assert.deepEqual((await page.locator(".dining-segment-btn").allTextContents()).map((text) => text.replace("✓", "").trim()), ["全部", "面饭面点", "肉食主打", "鱼鲜主打", "甜饮", "法式", "中餐", "日式会席", "其他料理"]);
      assert.doesNotMatch((await page.locator('.control-block').allTextContents()).join('\n'), /未标注/);
      assert.equal(await page.locator(".dining-count-note").count(), 0);
      const swatch = '.filter-item .swatch';
      const color = await page.locator(swatch).first().evaluate((el) => getComputedStyle(el).backgroundColor);
      const paths = await page.locator('.dining-segment-btn[data-dining="staple"] svg').innerHTML();
      await page.locator('[data-dining="meat"]').click(); await count(page, 2, 2);
      await page.locator('.filter-item').filter({ hasText: "第二品类" }).click(); await count(page, 1, 1);
      if (!mobile) assert.equal(await page.locator('.stat-value').textContent(), "1");
      await page.getByRole('button', { name: '切换到热力图', exact: true }).click();
      await page.locator('canvas.leaflet-heatmap-layer').waitFor();
      assert.equal(await page.evaluate(() => window.p09HeatPoints.length), 1);
      await page.getByRole('button', { name: '切换到标记模式', exact: true }).click();
      assert.equal(await page.locator('[data-dining="meat"] .dining-label').textContent(), '肉食主打');
      await page.locator('[data-dining="other"] .dining-label').click(); await count(page, 3, 2);
      await snapshot(page, `p09-${engine}-${width}-filters`, release, records);
      await audit(page, `p09-${engine}-${width}-forms`);
      await closePanel(page, mobile);
      await search(page, "小食测试"); await count(page, 11, 10);
      const detail = page.locator('.mobile-popup-card, .leaflet-popup-content');
      assert.match(await detail.textContent(), /面饭面点.*发酵谷物，现代料理/s);
      assert.doesNotMatch(await detail.textContent(), /新发酵品类|共 4 档|主打体验未标注/);
      assert.equal(await detail.locator('.detail-symbol svg').innerHTML(), paths);
      assert.equal(await detail.locator('.detail-symbol').evaluate((el) => getComputedStyle(el).backgroundColor), color);
      await closeDetail(page);
      await search(page, "空值无坐标");
      assert.match(await page.locator('.mobile-popup-card').textContent(), /暂无可靠坐标/s);
      assert.doesNotMatch(await page.locator('.mobile-popup-card').textContent(), /主打体验未标注|其他料理/);
      await closeDetail(page);
      await choose(page, "年份", "2027"); await ready(page, 2027, city); await count(page, 12, 11);
      assert.equal(await page.locator('.mobile-popup-card, .leaflet-popup-content').count(), 0);
      await choose(page, "榜单", "米其林星级"); await ready(page, 2027, city);
      await choose(page, "城市", "第二测试城"); await ready(page, 2027, "second-fixture");
      await filterPanel(page, mobile);
      assert.equal((await page.locator('[data-dining="other"] .dining-label').textContent()).trim(), "其他料理");
      assert.doesNotMatch((await page.locator('.control-block').allTextContents()).join('\n'), /未标注/);
      assert.equal(await page.locator('.dining-segment-btn').count(), 2);
      await closePanel(page, mobile);
      await search(page, "小食测试");
      assert.match(await detail.textContent(), /发酵谷物，现代料理/s);
      assert.doesNotMatch(await detail.textContent(), /同类异名|主打体验未标注|其他料理/);
      assert.equal(await detail.locator('.detail-symbol').evaluate((el) => getComputedStyle(el).backgroundColor), color);
      await closeDetail(page);
      // Reload restores initial full dataset at max zoom, with a mixed neutral cluster.
      await page.goto(server.baseUrl + url); await ready(page, 2026, city);
      const cluster = page.locator('.cluster-badge'); await cluster.waitFor();
      assert.equal(await cluster.textContent(), "11"); assert.equal(await cluster.locator('svg, .price-badge').count(), 0);
      if (mobile) await cluster.tap(); else { await cluster.locator('..').focus(); await page.keyboard.press("Enter"); }
      await page.waitForFunction(() => document.querySelectorAll('.restaurant-marker').length === 11 && !document.querySelector('.leaflet-cluster-anim'));
      await page.evaluate(async () => { await Promise.all(document.getAnimations().filter((a) => a.effect.getComputedTiming().iterations !== Infinity).map((a) => a.finished)); });
      const bounds = await page.locator('.restaurant-marker').evaluateAll((nodes) => nodes.map((node) => {
        const rect = node.getBoundingClientRect(), dot = node.querySelector('.marker-dot').getBoundingClientRect();
        return { title: node.getAttribute('aria-label'), x: rect.x, y: rect.y, width: rect.width, height: rect.height, dot: dot.width, svg: node.querySelector('svg').getBoundingClientRect().width };
      }));
      assert.ok(bounds.every((b) => b.width === 44 && b.height === 44 && b.dot === 36 && b.svg === 21));
      assert.ok(bounds.every((b) => !/主打体验未标注|共 4 档/.test(b.title)));
      for (let i = 0; i < bounds.length; i++) for (let j = i + 1; j < bounds.length; j++) assert.ok(Math.abs(bounds[i].x - bounds[j].x) >= 44 || Math.abs(bounds[i].y - bounds[j].y) >= 44, "expanded targets do not overlap");
      records.push({ name: `${engine}-${width}-dense-targets`, bounds });
      await snapshot(page, `p09-${engine}-${width}-dense`, release, records);
      for (const item of bounds) {
        const target = page.locator('.restaurant-marker').filter({ has: page.locator('svg') }).and(page.locator(`[aria-label=${JSON.stringify(item.title)}]`));
        if (mobile) await target.tap(); else { await target.focus(); await page.keyboard.press("Enter"); }
        await detail.waitFor();
        assert.equal(await target.evaluate((node) => node.classList.contains('restaurant-marker--selected')), true);
        assert.ok((await detail.textContent()).includes(item.title.split(' · ')[0]));
        assert.equal(await target.locator('svg').count(), 1);
        const price = await target.locator('.price-badge').allTextContents();
        const missing = /未标注测试|饮品测试/.test(item.title);
        assert.equal(price.length, missing ? 0 : 1);
        if (!missing) assert.match(price[0], /^¥{1,4}$/u);
        if (item.title.startsWith('餐食测试')) {
          assert.deepEqual(price, ['¥¥¥¥']);
          const composition = await target.evaluate((node) => {
            const dot = node.querySelector('.marker-dot'), badge = dot.querySelector('.price-badge'), svg = dot.querySelector('svg');
            const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
            const after = getComputedStyle(dot, '::after');
            const luminance = (color) => color.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => v / 255).map((v) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
            const style = getComputedStyle(badge);
            const contrast = (luminance(style.backgroundColor) + .05) / (luminance(style.color) + .05);
            return { contrast, dot: box(dot), badge: box(badge), icon: box(svg), badgeOverflow: badge.scrollWidth > badge.clientWidth, newTop: parseFloat(after.top), newContent: after.content, pointerEvents: getComputedStyle(badge).pointerEvents, outline: getComputedStyle(dot).outlineWidth };
          });
          assert.ok(composition.contrast >= 4.5);
          assert.ok(composition.badge.bottom <= composition.icon.y);
          assert.ok(composition.newTop >= composition.dot.height);
          assert.equal(composition.badgeOverflow, false);
          assert.equal(composition.pointerEvents, 'none');
          assert.equal(composition.outline, '3px');
          assert.match(composition.newContent, /NEW/);
          records.push({ name: `${engine}-${width}-four-price-new-selected`, composition });
          await snapshot(page, `p09-${engine}-${width}-four-price-new-selected`, release, records);
        }
        await closeDetail(page);
      }
      await s.context.setOffline(engine === "chromium"); server.state.offline = true;
      await page.reload(); await ready(page, 2026, city);
      await search(page, "饮品测试");
      assert.match(await detail.textContent(), /甜饮/);
      const icon = await detail.locator('svg').evaluate((svg) => ({ paths: [...svg.querySelectorAll('path')].map((p) => p.getTotalLength()), width: svg.getBoundingClientRect().width }));
      assert.equal(icon.width, 21); assert.ok(icon.paths.every((length) => length > 0));
      await snapshot(page, `p09-${engine}-${width}-offline-drink`, release, records);
      for (const name of ["餐食测试", "小食测试", "鱼鲜测试", "甜品测试", "法式测试", "中餐测试", "会席测试", "其他料理测试", "未标注测试"]) {
        await closeDetail(page); await search(page, name);
        assert.equal(await detail.locator('svg').count(), 1);
        assert.equal(await detail.locator('img, script').count(), 0);
      }
      assert.equal(await page.evaluate(() => window.p09Injected), undefined);
      assert.ok(!observedRequests.some((url) => /tabler|\.svg(?:\?|$)/u.test(url)), "no icon network dependency");
      assert.deepEqual(s.errors, []);
    } finally { server.state.offline = false; await s.context.setOffline(false); await s.close(); }
  });
}

for (const engine of ["chromium", "webkit"]) for (const width of [1280, 390]) {
  test(`P09 selection ${engine} ${width}px: click A, close, search B and dismiss share one selection`, async (context) => {
    if (engine === "webkit") safari ??= await webkit.launch({ headless: true });
    const s = await pwaSession(engine === "chromium" ? chrome : safari, server, { width, height: 844 });
    const page = s.page, mobile = width < 768;
    page.p09Scenario = context.name;
    const selected = page.locator('.restaurant-marker--selected');
    const detail = page.locator('.mobile-popup-card, .leaflet-popup-content');
    async function assertSelection(name) {
      await page.waitForFunction((name) => {
        const nodes = document.querySelectorAll('.restaurant-marker--selected');
        return nodes.length === 1 && nodes[0].getAttribute('aria-label').startsWith(name + ' · ');
      }, name);
      assert.ok((await detail.textContent()).includes(name));
      assert.equal(await selected.locator('svg').count(), 1);
      if (!mobile) {
        const geometry = await page.evaluate(() => ({
          popupBottom: document.querySelector('.leaflet-popup').getBoundingClientRect().bottom,
          markerTop: document.querySelector('.restaurant-marker--selected .marker-dot').getBoundingClientRect().top,
        }));
        assert.ok(geometry.popupBottom <= geometry.markerTop, "popup must leave the selected form icon visible");
      }
    }
    try {
      await page.goto(server.baseUrl + '/?city=second-fixture&year=2026&guide=michelin-bib-gourmand');
      await controlled(page);
      await cached(page, release, '/data/second-fixture/2026/michelin-bib-gourmand.json');
      await ready(page, 2026, 'second-fixture');
      const markerA = page.locator('.restaurant-marker[aria-label^="餐食测试 · "]');
      if (mobile) await markerA.tap(); else { await markerA.focus(); await page.keyboard.press('Enter'); }
      await assertSelection('餐食测试');
      await snapshot(page, `p09-selection-${engine}-${width}-clicked-A`, release, records);
      await closeDetail(page);
      assert.equal(await selected.count(), 0);
      await search(page, '小食测试');
      await assertSelection('小食测试');
      assert.equal(await markerA.evaluate((node) => node.classList.contains('restaurant-marker--selected')), false);
      await snapshot(page, `p09-selection-${engine}-${width}-searched-B`, release, records);
      // Dismiss by keyboard, then selecting another record cannot resurrect B's ring.
      await page.keyboard.press('Escape');
      await detail.waitFor({ state: 'hidden' });
      await page.waitForFunction(() => !document.querySelector('.restaurant-marker--selected'));
      await search(page, '餐食测试'); await assertSelection('餐食测试');
      // A -> B without closing exercises the old-popup-close/new-selection ordering.
      if (mobile) await closeDetail(page);
      await search(page, '小食测试'); await assertSelection('小食测试');
      if (mobile) await closeDetail(page);
      await search(page, '空值无坐标');
      await page.locator('.mobile-popup-card').waitFor();
      assert.equal(await selected.count(), 0);
      assert.match(await detail.textContent(), /暂无可靠坐标/);
      await closeDetail(page);
      await search(page, '小食测试'); await assertSelection('小食测试');
      await closeDetail(page);
      await choose(page, '年份', '2027'); await ready(page, 2027, 'second-fixture');
      assert.equal(await selected.count(), 0); assert.equal(await detail.count(), 0);
      assert.deepEqual(s.errors, []);
    } finally { await s.close(); }
  });
}

for (const engine of ["chromium", "webkit"]) {
  test(`P09 mouse reactivation ${engine}: repeated A clicks, search A, close and reopen`, async (context) => {
    if (engine === "webkit") safari ??= await webkit.launch({ headless: true });
    const s = await pwaSession(engine === "chromium" ? chrome : safari, server, { width: 1280, height: 844 });
    const page = s.page;
    page.p09Scenario = context.name;
    const marker = page.locator('.restaurant-marker[aria-label^="餐食测试 · "]');
    const detail = page.locator('.leaflet-popup-content');
    async function expectOpen() {
      await detail.waitFor({ state: 'visible' });
      assert.equal(await detail.count(), 1);
      assert.equal(await detail.locator('h2').textContent(), '餐食测试');
      assert.equal(await page.locator('.restaurant-marker--selected').count(), 1);
      assert.equal(await marker.evaluate((node) => node.classList.contains('restaurant-marker--selected')), true);
    }
    try {
      await page.goto(server.baseUrl + '/?city=second-fixture&year=2026&guide=michelin-bib-gourmand');
      await controlled(page);
      await cached(page, release, '/data/second-fixture/2026/michelin-bib-gourmand.json');
      await ready(page, 2026, 'second-fixture');
      for (let click = 0; click < 3; click++) { await marker.click(); await expectOpen(); }
      await snapshot(page, `p09-reactivation-${engine}-repeated-mouse`, release, records);
      await search(page, '餐食测试'); await expectOpen();
      await snapshot(page, `p09-reactivation-${engine}-search-same-A`, release, records);
      await closeDetail(page);
      await marker.click(); await expectOpen();
      await closeDetail(page);
      await search(page, '餐食测试'); await expectOpen();
      await closeDetail(page);
      assert.deepEqual(s.errors, []);
    } finally { await s.close(); }
  });
}

test("P09 all browser-resolved hues contrast with white on both light and dark surfaces", async () => {
  const s = await pwaSession(chrome, server);
  try {
    await s.page.goto(server.baseUrl + url); await ready(s.page, 2026, city);
    const colors = new Set();
    for (let i = 0; colors.size < 360 && i < 10000; i++) colors.add(getGroupStyle(`FUTURE_${i}`).color);
    assert.equal(colors.size, 360);
    const observations = await s.page.evaluate((colors) => colors.map((color) => {
      const node = document.createElement('span'); node.style.backgroundColor = color; document.body.append(node);
      const rgb = getComputedStyle(node).backgroundColor.match(/[\d.]+/g).map(Number); node.remove();
      const lum = rgb.map((v) => v / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
      return { color, rgb, contrast: 1.05 / (lum + .05) };
    }), [...colors, getGroupStyle("OTHER").color]);
    assert.ok(observations.every((o) => o.contrast >= 4.5));
    records.push({ name: 'browser-resolved-contrast', minimum: Math.min(...observations.map((o) => o.contrast)), observations });
    await s.page.locator('.cluster-badge').click();
    await s.page.waitForFunction(() => document.querySelectorAll('.restaurant-marker').length === 11 && !document.querySelector('.leaflet-cluster-anim'));
    for (const background of ["#ffffff", "#101821"]) {
      await s.page.locator('#map').evaluate((node, background) => { node.style.background = background; }, background);
      await snapshot(s.page, `p09-background-${background.slice(1)}`, release, records);
    }
    assert.equal(getDiningCategory(null).icon, "tools-kitchen-2");
  } finally { await s.close(); }
});
