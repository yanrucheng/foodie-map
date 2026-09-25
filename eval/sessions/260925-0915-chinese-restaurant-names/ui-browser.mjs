/** Actual application checks for the user-confirmed presentation cleanup. */
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { preview } from "vite";
import puppeteer from "puppeteer";

const out = fileURLToPath(new URL("outputs/ui-cleanup/", import.meta.url));
const json = async (path) => JSON.parse(await readFile(path, "utf8"));
const save = (name, value) => writeFile(join(out, name), JSON.stringify(value, null, 2) + "\n");
if (process.argv[2] === "serve") {
  const dist = join(out, "app");
  const server = await preview({ configFile: false, build: { outDir: dist }, preview: { host: "127.0.0.1", port: 0, strictPort: true } });
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  await save("server.json", { origin, dist, pid: process.pid, startedAt: new Date().toISOString() });
  console.log(origin);
} else {
  const { origin, dist } = await json(join(out, "server.json"));
  const release = await json(join(dist, "release.json"));
  assert.equal(release.version, (await readFile(resolve("VERSION"), "utf8")).trim());
  const results = { origin, buildId: release.buildId, version: release.version, cases: [], pageErrors: [] };
  if (process.argv.includes("--resume")) {
    const prior = await json(join(out, "browser.json"));
    assert.equal(prior.buildId, release.buildId);
    assert.deepEqual(prior.pageErrors, []);
    results.cases = prior.cases;
    results.resumedCases = prior.cases.length;
  }
  const browser = await puppeteer.launch({ headless: "shell" });
  await mkdir(join(out, "screenshots"), { recursive: true });
  let page;
  try {
    for (const width of [1440, 390]) {
      if (results.cases.filter((item) => item.width === width).length === 6) continue;
      const context = await browser.createBrowserContext();
      page = await context.newPage();
      page.setDefaultTimeout(15000);
      await page.setViewport({ width, height: width === 390 ? 844 : 1050, isMobile: width === 390, hasTouch: width === 390 });
      page.on("pageerror", (error) => results.pageErrors.push(String(error)));
      for (const [city, name] of [["beijing", "富春居"], ["beijing", "止观小馆"], ["hong-kong", "態邸"], ["beijing", "Jing"], ["beijing", "京艳 ‧ 翰林书院"]]) {
        await page.goto(`${origin}/?city=${city}&year=2026&guide=michelin-starred`, { waitUntil: "networkidle0" });
        await page.waitForFunction(() => document.querySelector(".dataset-status")?.dataset.state === "ready");
        const record = (await json(resolve(`public/data/${city}/2026/michelin-starred.json`))).find((r) => r.name_zh === name);
        await page.type(".search-wrap input", name);
        await page.waitForSelector(".search-dropdown-item");
        await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter");
        await page.waitForFunction((name) => document.querySelector(".mobile-popup-card h2, .leaflet-popup-content h2")?.textContent === name, {}, name);
        await new Promise((done) => setTimeout(done, 1100));
        if (name !== "態邸" && width !== 390) {
          for (let zoom = 0; zoom < 4 && !await page.$(".restaurant-marker--selected"); zoom++) {
            await page.click(".leaflet-control-zoom-in");
            await new Promise((done) => setTimeout(done, 500));
          }
        }
        const observed = await page.evaluate(() => {
          const detail = document.querySelector(".mobile-popup-card, .leaflet-popup-content");
          const version = document.querySelector(".dynamic-title-version"), rect = version.getBoundingClientRect();
          const marker = document.querySelector(".restaurant-marker--selected");
          return { text: detail.textContent, tags: [...detail.querySelectorAll(".tag, .mobile-popup-tag")].map((n) => n.textContent),
            guideUrl: detail.querySelector("a")?.href, priceSpoken: detail.querySelector(".sr-only")?.textContent,
            version: version.textContent, versionVisible: rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.bottom <= innerHeight,
            status: document.querySelector(".dataset-status").textContent, statusTitle: document.querySelector(".dataset-status").getAttribute("title"),
            markerTitle: marker?.getAttribute("title"), markerAria: marker?.getAttribute("aria-label"),
            overflow: document.documentElement.scrollWidth > innerWidth,
          };
        });
        assert.equal(observed.version, `v${release.version}`); assert.equal(observed.versionVisible, true);
        assert.equal(observed.statusTitle, null); assert.equal(observed.overflow, false);
        assert.doesNotMatch(observed.text, /主打体验未标注|价格等级|共 4 档|原文|未识别等级/);
        assert.doesNotMatch(observed.status, /旧登记范围|旧文件自报年度|完整身份集合|现行在线集合对齐|空文件/);
        assert.match(observed.status, /该榜单的年份、范围及完整性尚未核实，请以官方指南为准/);
        assert.ok(observed.text.includes(record.geo_source)); assert.ok(observed.text.includes("坐标来源"));
        assert.equal(observed.guideUrl, new URL(record.guide_url).href);
        assert.equal(new Set(observed.tags).size, observed.tags.length);
        if (name === "富春居") { assert.deepEqual(observed.tags.slice(0, 2), ["中餐", "粤菜"]); assert.equal(observed.priceSpoken, "第3档"); }
        if (name === "止观小馆") { assert.equal(observed.tags[0], "东北菜"); assert.ok(!observed.tags.includes("鲁菜")); assert.ok(!observed.tags.includes("其他料理")); }
        if (name === "態邸") {
          assert.match(observed.text, /暂无可靠坐标，无法地图定位/); assert.ok(observed.text.includes("HKD 約 700 以上")); assert.equal(observed.markerTitle, undefined);
        } else if (observed.markerTitle) {
          assert.equal(observed.markerTitle, observed.markerAria);
          assert.doesNotMatch(observed.markerTitle, /主打体验未标注|共 4 档/);
        }
        if (width !== 390 && name !== "態邸") assert.ok(observed.markerTitle, "Desktop zoom reveals the actual target marker");
        const client = await page.createCDPSession();
        const tree = await client.send("Accessibility.getFullAXTree");
        const accessibleText = tree.nodes.filter((n) => !n.ignored).map((n) => n.name?.value).filter(Boolean).join("\n");
        assert.doesNotMatch(accessibleText, /主打体验未标注|共 4 档/);
        assert.match(accessibleText, /坐标来源/);
        if (["富春居", "止观小馆"].includes(name)) assert.match(accessibleText, /第\s*3\s*档/);
        await client.detach();
        const stem = `${width}-${city}-${record.id}`;
        await page.screenshot({ path: join(out, `screenshots/${stem}.png`) });
        results.cases.push({ width, city, name, ...observed, accessibleText });
        console.log(`PASS ${width} ${name}`);
      }
      await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
      const worker = browser.targets().find((target) => target.type() === "service_worker" && target.url().startsWith(origin));
      assert.ok(worker);
      const workerClient = await worker.createCDPSession();
      await workerClient.send("Network.enable");
      const network = { latency: 0, downloadThroughput: -1, uploadThroughput: -1 };
      await workerClient.send("Network.emulateNetworkConditions", { ...network, offline: true });
      await page.setOfflineMode(true);
      await page.reload({ waitUntil: "networkidle0" });
      await page.waitForFunction(() => document.querySelector(".dataset-status")?.dataset.state === "ready");
      const offline = await page.$eval(".dataset-status", (n) => ({ text: n.textContent, retry: [...n.querySelectorAll("button")].some((b) => b.textContent === "重试") }));
      assert.match(offline.text, /离线浏览 · 使用已保存内容/); assert.equal(offline.retry, true);
      await page.screenshot({ path: join(out, `screenshots/${width}-offline.png`) });
      results.cases.push({ width, offline });
      await page.setOfflineMode(false);
      await workerClient.send("Network.emulateNetworkConditions", { ...network, offline: false });
      await workerClient.detach(); await context.close();
    }
    assert.deepEqual(results.pageErrors, []); results.passed = true;
  } catch (error) {
    results.passed = false; results.failure = String(error.stack ?? error);
    if (page && !page.isClosed()) await page.screenshot({ path: join(out, "screenshots/failure.png") });
    throw error;
  } finally { await save("browser.json", results); await browser.close(); }
}
