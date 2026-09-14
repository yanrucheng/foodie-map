import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createRequire } from "node:module";
import { observedSession } from "./evidence.mjs";
import { reviewIncomplete } from "./axe-review.mjs";

export const fixture = JSON.parse(await readFile(new URL("./fixtures/guide-experience.json", import.meta.url), "utf8"));
// Extend P04's fixture in memory to exercise a real multi-guide picker in both years.
for (const year of [2026, 2027]) {
  const path = `/data/fixture-city/${year}/michelin-starred.json`;
  fixture.cities[0].guides.push({ id: "michelin-starred", label: "Michelin Starred", labelZh: "米其林星级", year, dataPath: path });
  fixture.datasets[path] = fixture.datasets[`/data/fixture-city/${year}/michelin-bib-gourmand.json`].map((record) => ({ ...record, guide_type: "michelin-starred", star_rating: 1 }));
}
export const initialUrl = "/?year=2026&city=fixture-city&guide=michelin-bib-gourmand";
export const artifacts = process.env.E2E_ARTIFACT_DIR;
const require = createRequire(import.meta.url);
export const axePath = require.resolve("axe-core/axe.js");
export const records = [];
export async function session(browser, baseUrl, viewport, overrides = {}) {
  const context = await browser.newContext({ viewport, hasTouch: viewport.width < 1024, serviceWorkers: "block" });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.p06TabPrefix = browser.browserType().name() === "webkit" ? "Alt+" : "";
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const state = { data: "ready", tiles: true, ...overrides };
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname.includes("autonavi")) {
      return state.tiles ? route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF1sAAAAASUVORK5CYII=", "base64") }) : route.abort();
    }
    if (url.origin !== baseUrl) return route.abort();
    const taxonomy = fixture.taxonomies[url.pathname];
    if (taxonomy) return route.fulfill({ json: taxonomy });
    const data = fixture.datasets[url.pathname];
    if (data) {
      if (state.data === "error") return route.fulfill({ status: 503, body: "Unavailable" });
      if (state.data === "bad-json") return route.fulfill({ contentType: "application/json", body: "{" });
      if (state.data === "loading") await new Promise((resolve) => { state.release = resolve; });
      const source = state.many ? Array.from({ length: 30 }, (_, index) => ({ ...data[0], id: index + 100, name: `候选餐厅 ${index}`, name_zh: `候选餐厅 ${index}`, name_en: `Candidate ${index}` })) : data;
      const payload = state.data === "empty" ? [] : source.map((record) => state.long && record.id === data[0].id ? {
        ...record, name: "长名称 " + "RestaurantWithoutSpaces".repeat(8), name_zh: "长名称".repeat(20), name_en: "RestaurantWithoutSpaces".repeat(8), address: "很长的餐厅地址".repeat(30),
      } : record);
      return route.fulfill({ json: payload });
    }
    return route.continue();
  });
  return { page, context, state, errors, close: observedSession({ page, errors, browser, close: async () => { state.release?.(); await context.close(); } }) };
}
export async function ready(page) { await page.locator('.dataset-status[data-state="ready"]').waitFor(); }
export async function tabTo(page, selector, backwards = false) {
  for (let i = 0; i < 100; i++) {
    if (await page.evaluate((selector) => document.activeElement?.matches(selector), selector)) return;
    await page.keyboard.press(`${page.p06TabPrefix}${backwards ? "Shift+Tab" : "Tab"}`);
  }
  assert.fail(`Cannot reach ${selector} by ${backwards ? "Shift+Tab" : "Tab"}`);
}
export async function search(page, term) {
  await page.getByRole("combobox", { name: "搜索餐厅" }).fill(term);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.locator(".mobile-popup-card, .leaflet-popup-content").waitFor();
}
export async function audit(page, name) {
  if (artifacts) await mkdir(artifacts, { recursive: true });
  // Read the settled expanded state, not a transient opacity midway through opening.
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().filter((animation) => animation.effect.getComputedTiming().iterations !== Infinity).map((animation) => animation.finished.catch(() => {})));
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
  if (!await page.evaluate(() => !!window.axe)) await page.addScriptTag({ path: axePath });
  const results = await page.evaluate(async () => window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] } }));
  const geometry = await page.evaluate(() => ({
    viewport: { width: innerWidth, height: innerHeight, visualWidth: visualViewport.width, visualHeight: visualViewport.height, scale: visualViewport.scale },
    overflow: document.documentElement.scrollWidth > innerWidth,
    surfaces: Array.from(document.querySelectorAll(".header, .floating-card, .bottom-sheet, .bottom-sheet-toolbar button, .venue-segment-btn--active, .mobile-popup-tag, .dataset-status, .loc-error-toast, .search-wrap input")).map((node) => {
      const style = getComputedStyle(node); return { selector: node.className || node.tagName, color: style.color, background: style.backgroundColor, backgroundImage: style.backgroundImage, fontSize: style.fontSize };
    }),
    references: Array.from(document.querySelectorAll("[aria-controls], [aria-activedescendant]")).flatMap((node) => ["aria-controls", "aria-activedescendant"].filter((attr) => node.hasAttribute(attr)).map((attr) => ({ attr, id: node.getAttribute(attr), exists: !!document.getElementById(node.getAttribute(attr)) }))),
    focus: document.activeElement?.outerHTML.slice(0, 500),
  }));
  records.push({ name, ...geometry, axeVersion: results.testEngine.version, violations: results.violations, incomplete: results.incomplete });
  if (artifacts) {
    await writeFile(join(artifacts, `${name}.axe.json`), JSON.stringify(results, null, 2));
    await page.screenshot({ path: join(artifacts, `${name}.png`) });
  }
  const reviews = await reviewIncomplete(page, results);
  records.at(-1).incompleteReviews = reviews;
  if (artifacts) await writeFile(join(artifacts, `${name}.incomplete-review.json`), JSON.stringify(reviews, null, 2));
  assert.deepEqual(reviews.filter((review) => !review.resolved), [], `${name}: unresolved axe incomplete findings`);
  assert.deepEqual(results.violations.filter((item) => ["critical", "serious"].includes(item.impact)).map((item) => ({ id: item.id, nodes: item.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })) })), [], name);
  assert.ok(geometry.references.every((reference) => reference.exists), `${name}: valid ARIA relationships`);
  assert.equal(geometry.overflow, false, `${name}: no page overflow`);
}
export async function visibleFocus(page) {
  const result = await page.evaluate(() => {
    const el = document.activeElement, rect = el.getBoundingClientRect(), style = getComputedStyle(el);
    return { html: el.outerHTML.slice(0, 300), visible: rect.top >= 0 && rect.bottom <= innerHeight && rect.left >= 0 && rect.right <= innerWidth,
      outline: style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 2 };
  });
  records.push({ name: "keyboard-focus", ...result });
  assert.equal(result.visible, true, JSON.stringify(result));
  assert.equal(result.outline, true, JSON.stringify(result));
  return result;
}
