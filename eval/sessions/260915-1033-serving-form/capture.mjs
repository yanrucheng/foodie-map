import puppeteer from 'puppeteer';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Read-only official listing capture. Requests and raw results stay local in outputs/.
const root = new URL('./outputs/', import.meta.url);
const destination = new URL('capture/', root);
mkdirSync(destination, { recursive: true });
const requests = JSON.parse(readFileSync(new URL(process.argv[2] ?? 'requests.json', root)));
const browser = await puppeteer.launch({ headless: 'shell', protocolTimeout: 60000 });
let next = 0;
try {
  await Promise.all(Array.from({ length: 3 }, async () => {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', request => {
      const skip = ['image', 'media', 'font'].includes(request.resourceType());
      (skip ? request.abort() : request.continue()).catch(() => {});
    });
    while (next < requests.length) {
      const request = requests[next++];
      const file = new URL(`${createHash('sha256').update(request.key).digest('hex').slice(0, 20)}.json`, destination);
      if (existsSync(file) && JSON.parse(readFileSync(file)).description) continue;
      const result = { ...request, captured_at: new Date().toISOString() };
      try {
        const response = await page.goto(request.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        result.status = response?.status();
        await page.waitForSelector('h1.data-sheet__title', { timeout: 12000 });
        await page.waitForFunction(() => [...document.querySelectorAll('script[type="application/ld+json"]')].some(element => element.textContent.includes('datePublished')), { timeout: 8000 }).catch(() => {});
        Object.assign(result, await page.evaluate(() => {
          const restaurant = [...document.querySelectorAll('script[type="application/ld+json"]')]
            .map(element => JSON.parse(element.textContent)).find(item => item['@type'] === 'Restaurant');
          return {
            canonical: document.querySelector('link[rel="canonical"]')?.href,
            source_name: document.querySelector('h1.data-sheet__title')?.textContent.trim(),
            source_address: document.querySelector('.data-sheet__block--text')?.textContent.trim(),
            upstream_id: document.querySelector('[data-restaurant-id]')?.dataset.restaurantId,
            description: document.querySelector('.data-sheet__description')?.textContent.trim(),
            award_year: restaurant?.award?.dateAwarded,
            review_date: restaurant?.review?.datePublished,
            restaurant,
            links: [...document.querySelectorAll('a[href]')].filter(a => /Visit [Ww]ebsite|ウェブサイト/.test(a.textContent)).map(a => a.href),
          };
        }));
        const html = await page.content();
        result.html_sha256 = createHash('sha256').update(html).digest('hex');
        writeFileSync(new URL(file.href.replace(/\.json$/, '.html')), html);
      } catch (error) { result.error = String(error); }
      writeFileSync(file, JSON.stringify(result, null, 2) + '\n');
      console.log(`${next}/${requests.length} ${request.key} ${result.description ? 'OK' : result.error}`);
    }
    await page.close();
  }));
} finally { await browser.close(); }
