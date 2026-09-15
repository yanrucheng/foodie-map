import puppeteer from 'puppeteer';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('./outputs/', import.meta.url);
const destination = new URL('supplement/', root);
mkdirSync(destination, { recursive: true });
const requests = JSON.parse(readFileSync(new URL('supplement-requests.json', root)));
const browser = await puppeteer.launch({ headless: 'shell', protocolTimeout: 60000 });
try {
  const page = await browser.newPage();
  for (const request of requests) {
    const file = new URL(`${request.key}.json`, destination);
    if (existsSync(file)) continue;
    const result = { ...request, captured_at: new Date().toISOString() };
    try {
      const response = await page.goto(request.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      result.status = response?.status();
      await new Promise(resolve => setTimeout(resolve, 1200));
      if (request.url.includes('guide.michelin.com')) {
        await page.waitForFunction(() => document.body.innerText.length > 1000, { timeout: 20000 });
      }
      Object.assign(result, await page.evaluate(() => ({
        final_url: location.href, title: document.title, text: document.body.innerText,
        links: [...document.querySelectorAll('a[href]')].map(a => ({ text: a.textContent.trim(), url: a.href })),
      })));
      const html = await page.content();
      result.html_sha256 = createHash('sha256').update(html).digest('hex');
      writeFileSync(new URL(`${request.key}.html`, destination), html);
    } catch (error) { result.error = String(error); }
    writeFileSync(file, JSON.stringify(result, null, 2) + '\n');
    console.log(request.key, result.status, result.title ?? result.error);
  }
} finally { await browser.close(); }
