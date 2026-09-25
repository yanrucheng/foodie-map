/** Public, fixed-list source capture. Captures facts; makes no name decisions. */
import puppeteer from "puppeteer";
import { readFile, writeFile, mkdir, cp, access } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const session = fileURLToPath(new URL(".", import.meta.url));
const out = join(session, "outputs/full");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const readJson = async (p) => JSON.parse(await readFile(p, "utf8"));
const exists = async (p) => { try { await access(p); return true; } catch { return false; } };
await mkdir(join(out, "sources"), { recursive: true });
const baseline = join(out, "baseline/public/data");
if (!await exists(baseline)) await cp("public/data", baseline, { recursive: true });
const catalog = await readJson(join(baseline, "catalog.json"));
const overrides = await exists(join(out, "url-overrides.json")) ? await readJson(join(out, "url-overrides.json")) : {};
const requests = [];
for (const cityId of ["beijing", "guangzhou-shenzhen", "shanghai", "chengdu", "hong-kong", "macau"]) {
  const city = catalog.cities.find((c) => c.id === cityId);
  for (const guide of city.guides) {
    if (!guide.dataPath) continue;
    for (const row of await readJson(join(baseline, guide.dataPath.replace(/^\/data\//u, "")))) {
      const key = `${cityId}/${guide.year}/${guide.id}#${row.id}`;
      const stem = `${cityId}-${guide.id}-${row.id}`;
      const path = join(out, `sources/${stem}.json`);
      if (process.argv[2] && cityId !== process.argv[2]) continue;
      if (await exists(path) && (await readJson(path)).success) continue;
      const raw = new URL(overrides[key]?.url ?? row.guide_url);
      const parts = raw.pathname.split("/").filter(Boolean);
      if (["en", "zh_CN", "zh_HK", "zh_TW"].includes(parts[0])) parts.shift();
      else if (["en", "zh_CN", "zh_HK", "zh_TW"].includes(parts[1])) parts.splice(0, 2);
      else throw new Error(`Unrecognized explicit locale in ${raw}`);
      const locale = ["hong-kong", "macau"].includes(cityId) ? "hk/zh_HK" : "sg/zh_CN";
      raw.pathname = `/${locale}/${parts.join("/")}`;
      requests.push({ key, stem, path, row, requested_url: raw.href,
        ...(overrides[key] ? { url_override: overrides[key] } : {}) });
    }
  }
}
console.log(`Pending capture: ${requests.length}`);
const browser = await puppeteer.launch({ headless: "shell", protocolTimeout: 60000 });
let done = 0;
async function worker() {
  const page = await browser.newPage();
  for (;;) {
    const task = requests.shift();
    if (!task) break;
    const result = { key: task.key, guide_url: task.row.guide_url, requested_url: task.requested_url,
      captured_at: new Date().toISOString(), success: false,
      ...(task.url_override ? { url_override: task.url_override } : {}) };
    try {
      const response = await page.goto(task.requested_url, { waitUntil: "domcontentloaded", timeout: 30000 });
      result.initial_http_status = response?.status();
      await page.waitForFunction(() => document.querySelector("h1")?.textContent.trim() &&
        document.querySelector(".data-sheet__block--text")?.textContent.trim(), { timeout: 16000 });
      Object.assign(result, await page.evaluate(() => ({ final_url: location.href, title: document.title,
        lang: document.documentElement.lang, h1: [...document.querySelectorAll("h1")].map((n) => n.textContent.trim()),
        canonical: document.querySelector('link[rel="canonical"]')?.href ?? null,
        address: document.querySelector(".data-sheet__block--text")?.textContent.trim(),
        text: document.body.innerText,
        language_links: [...document.querySelectorAll("link[hreflang]")].map((n) => ({ lang: n.hreflang, url: n.href }))
      })));
      const bytes = await page.content();
      const capture = join(out, `sources/${task.stem}.html`);
      await writeFile(capture, bytes);
      result.capture_sha256 = sha(bytes);
      result.local_capture = capture.slice(process.cwd().length + 1);
      result.success = true;
    } catch (error) {
      result.error = String(error);
      result.final_url = page.url();
      result.title = await page.title().catch(() => "");
    }
    await writeFile(task.path, JSON.stringify(result, null, 2) + "\n");
    console.log(`${++done} ${result.success ? "READ" : "UNRESOLVED"} ${task.key}: ${result.h1?.[0] ?? result.error}`);
  }
  await page.close();
}
try { await Promise.all(Array.from({ length: 4 }, worker)); }
finally { await browser.close(); }
