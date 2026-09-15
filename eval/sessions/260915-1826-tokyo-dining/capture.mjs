import puppeteer from 'puppeteer';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const destination = new URL('./outputs/browser-sources/', import.meta.url);
mkdirSync(destination, { recursive: true });
const requests = JSON.parse(readFileSync(process.argv[2]));
const browser = await puppeteer.launch({ headless: 'shell', protocolTimeout: 60000 });
async function worker() {
  const page = await browser.newPage();
  for (;;) {
    const request = requests.shift();
    if (!request) break;
    const file = new URL(`${request.key}.json`, destination);
    if (existsSync(file)) continue;
    const result = { ...request, captured_at: new Date().toISOString() };
    try {
      const response = await page.goto(request.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      result.status = response?.status();
      if (request.url.includes('guide.michelin.com') && request.url.includes('/restaurant/')) {
        await page.waitForFunction(() => [...document.querySelectorAll('script[type="application/ld+json"]')].some(el => el.textContent.includes('Restaurant')), { timeout: 25000 });
      } else if (request.url.includes('guide.michelin.com')) {
        await page.waitForFunction(() => document.body.innerText.length > 2000, { timeout: 25000 });
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      Object.assign(result, await page.evaluate(() => ({
        final_url: location.href, title: document.title, text: document.body.innerText,
        images: [...document.querySelectorAll('img')].map(el => ({ src: el.src, alt: el.alt })),
        structured: [...document.querySelectorAll('script[type="application/ld+json"]')].map(el => { try { return JSON.parse(el.textContent); } catch { return null; } }),
        links: [...document.querySelectorAll('a[href]')].map(a => ({ text: a.textContent.trim(), url: a.href })),
      })));
      const html = await page.content();
      result.sha256 = createHash('sha256').update(html).digest('hex');
      writeFileSync(new URL(`${request.key}.html`, destination), html);
    } catch (error) { result.error = String(error); }
    writeFileSync(file, JSON.stringify(result, null, 2) + '\n');
    console.log(request.key, result.status, result.title ?? result.error);
  }
  await page.close();
}
try { await Promise.all([worker(), worker(), worker()]); }
finally { await browser.close(); }
