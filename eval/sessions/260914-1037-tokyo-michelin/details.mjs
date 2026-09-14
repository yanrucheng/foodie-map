import puppeteer from 'puppeteer';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
const root = new URL('./outputs/', import.meta.url);
const requests = JSON.parse(readFileSync(new URL('detail-requests.json', root)));
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
      const { key, url } = requests[next++];
      const destination = new URL(`${key}.json`, root);
      if (existsSync(destination) && JSON.parse(readFileSync(destination)).restaurant) continue;
      const result = { url, startedAt: new Date().toISOString() };
      try {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        result.initialStatus = response?.status();
        await page.waitForSelector('h1.data-sheet__title', { timeout: 20000 });
        await new Promise(resolve => setTimeout(resolve, 500));
        Object.assign(result, await page.evaluate(() => {
          const data = [...document.querySelectorAll('script[type="application/ld+json"]')].map(element => JSON.parse(element.textContent)).find(item => item['@type'] === 'Restaurant');
          const fields = [...document.querySelectorAll('.data-sheet__block--row')].map(element => [...element.querySelectorAll('.data-sheet__block--text')].map(item => item.textContent.trim()));
          return {
            canonical: document.querySelector('link[rel="canonical"]')?.href,
            name: document.querySelector('h1.data-sheet__title')?.textContent.trim(),
            upstreamId: document.querySelector('[data-restaurant-id]')?.dataset.restaurantId,
            district: document.querySelector('[data-dtm-district]')?.dataset.dtmDistrict,
            address: document.querySelector('.data-sheet__block--text')?.textContent.trim(),
            fields, restaurant: data,
            text: document.body.innerText,
            links: [...document.querySelectorAll('a[href]')].filter(a => a.href.startsWith('tel:') || /ウェブサイト|Visit website/.test(a.textContent)).map(a => ({ text: a.textContent.trim(), url: a.href })),
          };
        }));
        writeFileSync(new URL(`${key}.html`, root), await page.content());
      } catch (error) { result.error = String(error); }
      result.finishedAt = new Date().toISOString();
      writeFileSync(destination, JSON.stringify(result, null, 2) + '\n');
      console.log(next, '/', requests.length, key, result.name ?? result.error, result.restaurant?.award?.dateAwarded);
    }
    await page.close();
  }));
} finally { await browser.close(); }
