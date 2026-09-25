/** Ad hoc official sources and discovery pages, kept separate from accepted facts. */
import puppeteer from "puppeteer";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { createHash } from "node:crypto";
const session = fileURLToPath(new URL(".", import.meta.url));
const out = join(session, "outputs/full/extra");
await mkdir(out, { recursive: true });
const queue = JSON.parse(await readFile(process.argv[2] ?? join(session, "outputs/full/extra-requests.json"), "utf8"));
const browser = await puppeteer.launch({ headless: "shell", protocolTimeout: 60000 });
async function worker() {
  const page = await browser.newPage();
  for (;;) {
    const task = queue.shift(); if (!task) break;
    const result = { ...task, captured_at: new Date().toISOString() };
    try {
      const response = await page.goto(task.url, { waitUntil: "domcontentloaded", timeout: 30000 });
      if (task.wait_detail) await page.waitForFunction(() => document.querySelector(".data-sheet__block--text")?.textContent.trim(), { timeout: 25000 });
      if (task.wait_href) await page.waitForFunction((part) => [...document.querySelectorAll("a[href]")].some((n) => n.href.includes(part)), { timeout: 20000 }, task.wait_href);
      await new Promise((done) => setTimeout(done, 1500));
      Object.assign(result, await page.evaluate(() => ({ final_url: location.href, title: document.title,
        headings: [...document.querySelectorAll("h1,h2,h3")].map((n) => n.textContent.trim()),
        text: document.body.innerText, images: [...document.querySelectorAll("img")].map((n) => ({ url: n.src, alt: n.alt })),
        links: [...document.querySelectorAll("a[href]")].map((n) => ({ url: n.href, text: n.textContent.trim() })) })));
      result.status = response?.status();
      const body = await page.content();
      result.local_capture = join(out, `${task.key}.html`).slice(process.cwd().length + 1);
      result.capture_sha256 = createHash("sha256").update(body).digest("hex");
      await writeFile(join(out, `${task.key}.html`), body);
      if (task.screenshot) await page.screenshot({ path: join(out, `${task.key}.png`), fullPage: true });
    } catch (error) { result.error = String(error); }
    await writeFile(join(out, `${task.key}.json`), JSON.stringify(result, null, 2) + "\n");
    console.log(task.key, result.status, result.title ?? result.error);
  }
  await page.close();
}
try { await Promise.all(Array.from({ length: 3 }, worker)); } finally { await browser.close(); }
