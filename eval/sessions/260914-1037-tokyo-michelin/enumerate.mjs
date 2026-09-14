import { readFileSync, writeFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
const root = new URL('./', import.meta.url);
const pages = {
  'michelin-starred': ['star-list', 'star-list-2', 'star-list-3', 'star-list-4', 'ja-stars-1', 'ja-stars-2', 'ja-stars-3', 'ja-stars-4', 'rating-3-1', 'rating-2-1', 'rating-1-1', 'rating-1-2', 'rating-1-3'],
  'michelin-bib-gourmand': ['bib-list', 'bib-list-2', 'bib-list-3', 'ja-bib-1', 'ja-bib-2', 'ja-bib-3'],
};
const inventory = [];
const coverage = [];
for (const [guide, keys] of Object.entries(pages)) {
  const seen = new Map();
  for (const key of keys) {
    const metadata = JSON.parse(readFileSync(new URL(`outputs/${key}.json`, root)));
    const document = new JSDOM(readFileSync(new URL(`outputs/${key}.html`, root), 'utf8'), { url: metadata.finalUrl }).window.document;
    const cards = [...document.querySelectorAll('.js-restaurant__list_items .js-restaurant__list_item')];
    coverage.push({ key, url: metadata.finalUrl, capturedAt: metadata.finishedAt, heading: metadata.text.match(/(?:Tokyo|東京) : [^\n]+/u)?.[0], cards: cards.length, identities: cards.map(card => card.dataset.id) });
    for (const card of cards) {
      const upstreamId = card.dataset.id;
      const title = card.querySelector('h3 a');
      const raw = card.querySelectorAll('.card__menu-footer--score')[1].textContent.trim().replace(/\s+/gu, ' ');
      const data = card.querySelector('[data-dtm-id]').dataset;
      const label = title.textContent.trim();
      const japanese = metadata.finalUrl.includes('/ja/');
      const name_en = japanese ? label.split('／').slice(1).join('／') || label : label;
      const row = { upstreamId, guide, listPages: [key], name_en, url: title.href, district: data.dtmDistrict, distinction: data.dtmDistinction, listCuisineAndPrice: raw };
      if (seen.has(upstreamId)) {
        const previous = seen.get(upstreamId);
        if (new URL(previous.url).pathname.split('/restaurant/')[1] !== new URL(row.url).pathname.split('/restaurant/')[1]) throw new Error(`Conflicting canonical slug for ${upstreamId}`);
        previous.listPages.push(key);
      } else { seen.set(upstreamId, row); inventory.push(row); }
    }
  }
}
writeFileSync(new URL('list-identities.json', root), JSON.stringify({ coverage, restaurants: inventory }, null, 2) + '\n');
writeFileSync(new URL('outputs/detail-requests.json', root), JSON.stringify(inventory.map(r => ({ key: `restaurant-${r.upstreamId}-ja`, url: r.url.includes('/jp/ja/') ? r.url : r.url.replace('/en/', '/jp/ja/') })), null, 2) + '\n');
console.log(coverage);
console.log(inventory.reduce((counts, r) => ({ ...counts, [r.distinction]: (counts[r.distinction] ?? 0) + 1 }), {}));
