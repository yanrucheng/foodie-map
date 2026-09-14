// Session-local public Michelin capture. Saves the response, rendered HTML and links.
import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const root = fileURLToPath(new URL('./', import.meta.url));
const output = join(root, 'outputs');
mkdirSync(output, { recursive: true });
const requests = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const browser = await puppeteer.launch({ headless: 'shell', protocolTimeout: 60000 });
try {
  const page = await browser.newPage();
  for (const { key, url, waitMs = 2000 } of requests) {
    const metadata = { key, url, startedAt: new Date().toISOString() };
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForFunction(() => document.body.innerText.length > 1000, { timeout: 15000 }).catch(() => {});
      await new Promise(resolve => setTimeout(resolve, waitMs));
      metadata.status = response?.status();
      metadata.finalUrl = page.url();
      metadata.title = await page.title();
      metadata.text = await page.$eval('body', element => element.innerText);
      metadata.links = await page.$$eval('a[href]', elements => elements.map(element => ({ text: element.textContent.trim(), url: element.href })));
      metadata.search = await page.evaluate(() => {
        const search = window.jQuery?.instantSearchInstance;
        return search ? { status: search.status, state: search.helper?.state, results: search.helper?.lastResults } : null;
      });
      writeFileSync(join(output, `${key}.html`), await page.content());
    } catch (error) { metadata.error = String(error); }
    metadata.finishedAt = new Date().toISOString();
    writeFileSync(join(output, `${key}.json`), JSON.stringify(metadata, null, 2) + '\n');
    console.log(key, metadata.status, metadata.title, metadata.text?.length, metadata.error ?? '');
  }
} finally { await browser.close(); }
