import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { validateCatalogRoot, resourceFile, digest } from "./catalog.ts";
import { parseRestaurantArray } from "../src/data/contract.ts";
import { reconciliationSchema, reconcileEditions } from "../src/data/reconciliation.ts";

const { values, positionals } = parseArgs({ allowPositionals: true, options: { root: { type: "string", default: "public/data" }, before: { type: "string" }, after: { type: "string" } } });
try {
  const root = path.resolve(values.root);
  const aliases = positionals[0] === "aliases";
  const result = validateCatalogRoot(root, { checkAliases: !aliases });
  if (!result.valid || !result.catalog) throw new Error(JSON.stringify(result.diagnostics));
  if (aliases) {
    for (const city of result.catalog.cities) for (const guide of city.guides) if (guide.legacyPath && guide.dataPath) {
      const file = resourceFile(root, guide.legacyPath);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, readFileSync(resourceFile(root, guide.dataPath)));
    }
    console.log("Derived legacy aliases from their pinned annual sources");
  } else if (positionals[0] === "diff") {
    const entries = result.catalog.cities.flatMap((city) => city.guides.map((guide) => ({ identity: `${city.id}/${guide.year}/${guide.id}`, guide })));
    const before = entries.find((entry) => entry.identity === values.before), after = entries.find((entry) => entry.identity === values.after);
    if (!before?.guide.dataPath || !after?.guide.dataPath) throw new Error("--before and --after must be published catalog identities (city/year/guide)");
    if (before.identity.split("/")[0] !== after.identity.split("/")[0] || before.guide.year >= after.guide.year) throw new Error("Annual comparison needs one scope and strictly increasing editions");
    const read = (ref: string) => readFileSync(resourceFile(root, ref));
    const a = read(before.guide.dataPath), b = read(after.guide.dataPath);
    const evidence = after.guide.coverage.reconciliationPath ? reconciliationSchema.parse(JSON.parse(read(after.guide.coverage.reconciliationPath).toString())) : undefined;
    console.log(JSON.stringify({ before: before.identity, after: after.identity, inputSha256: { before: digest(a), after: digest(b) }, official: evidence ?? null,
      ...reconcileEditions(parseRestaurantArray(JSON.parse(a.toString())), parseRestaurantArray(JSON.parse(b.toString())), evidence) }, null, 2));
  } else throw new Error("Use aliases or diff");
} catch (error) { console.error(String(error)); process.exitCode = 1; }
