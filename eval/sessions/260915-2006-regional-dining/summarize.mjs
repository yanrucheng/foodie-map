import { readFileSync, writeFileSync } from 'node:fs';
import { diningDistribution } from '../../../src/config/restaurantPresentation.ts';

const root = new URL('../../../', import.meta.url);
const baseline = new URL('./outputs/baseline/', import.meta.url);
const catalog = JSON.parse(readFileSync(new URL('public/data/catalog.json', root)));
const datasets = [];
for (const city of catalog.cities) {
  for (const guide of city.guides) {
    if (!guide.dataPath) continue;
    const path = `public${guide.dataPath}`;
    const before = JSON.parse(readFileSync(new URL(path, baseline)));
    const after = JSON.parse(readFileSync(new URL(path, root)));
    datasets.push({ dataset: `${city.id}/${guide.year}/${guide.id}`,
      listed: after.length, coverage_status: guide.coverage.status,
      changed_in_this_stage: city.id !== 'tokyo',
      before: diningDistribution(before), after: diningDistribution(after) });
  }
}
writeFileSync(new URL('./distribution.json', import.meta.url), JSON.stringify({
  method: 'Production diningDistribution; denominator = listed; other icon includes unclassified.', datasets,
}, null, 2) + '\n');
for (const row of datasets) console.log(JSON.stringify({ dataset: row.dataset, ...row.after }));
