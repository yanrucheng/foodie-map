/** One-time P02 migration. Dry-run by default; old values stay available in the Git baseline. */
import { createHash } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual, parseArgs } from "node:util";
import { z } from "zod";
import { catalogCities } from "../src/data/catalog.ts";
import { currencySchema, getMapPosition, guideTypeSchema, hasText, restaurantSchema, retiredPriceFields, type Restaurant } from "../src/data/contract.ts";
import { deriveCuisine, taxonomyBundleSchema, type Mappings, type Taxonomy } from "../src/data/taxonomy.ts";
import { validateDataset } from "../src/data/validation.ts";

const legacyPrice = z.union([z.string(), z.number().finite().nonnegative(), z.null()]);
export function migratePrice(record: Record<string, unknown>): Record<string, unknown> {
  const result = { ...record };
  const fields = retiredPriceFields.filter((field) => Object.prototype.hasOwnProperty.call(record, field));
  if (!fields.length) return result;
  if (Object.prototype.hasOwnProperty.call(record, "price")) throw new Error("Both canonical and legacy prices are present");
  const declarations = new Set<string>();
  if (record.currency != null) declarations.add(currencySchema.parse(record.currency));
  if (fields.includes("avg_price_hkd")) declarations.add("HKD");
  if (fields.includes("avg_price_cny")) declarations.add("CNY");
  if (declarations.size > 1) throw new Error("Conflicting currencies; no conversion or automatic choice allowed");
  const populated = fields.map((field) => ({ field, value: legacyPrice.parse(record[field]) }))
    .filter(({ value }) => typeof value === "number" || hasText(value));
  if (populated.length > 1) throw new Error("Multiple populated price fields; no automatic choice allowed");
  const value = populated[0]?.value;
  result.price = value == null ? null : String(value);
  if (declarations.size) result.currency = [...declarations][0];
  fields.forEach((field) => { delete result[field]; });
  return result;
}

export function migrateRecord(original: Record<string, unknown>, taxonomy: Taxonomy, mappings: Mappings): Restaurant {
  const result = migratePrice(original);
  if (result.lat === 0 && result.lon === 0) { result.lat = null; result.lon = null; }
  const raw = z.string().nullish().parse(result.cuisine);
  result.cuisine_group = deriveCuisine(raw, taxonomy, mappings).groupKey;
  return restaurantSchema.parse(result);
}

export function migrateMappings(input: unknown): unknown {
  const legacy = z.object({ version: z.number(), city: z.string(), mappings: z.union([z.array(z.unknown()), z.record(z.string())]) }).strict().parse(input);
  const entries = Array.isArray(legacy.mappings) ? legacy.mappings : Object.entries(legacy.mappings).map(([raw, groupKey]) => ({ raw, groupKey }));
  return { ...legacy, mappings: entries.map((entry) => z.object({ raw: z.string(), groupKey: z.string(), sources: z.array(z.string()).optional() }).strict().parse(entry))
    .filter((entry) => hasText(entry.raw))
    .map((entry) => legacy.city === "hong-kong" && entry.raw === "海鮮" ? { ...entry, groupKey: "OTHER" } : entry) };
}

/** File-local pairing is only for this migration, never for annual restaurant identity. */
export function reconcileRecords(before: Record<string, unknown>[], after: Record<string, unknown>[]) {
  const oldIds = new Set(before.map((row) => row.id));
  const newRows = new Map(after.map((row) => [row.id, row]));
  if (oldIds.size !== before.length || newRows.size !== after.length) throw new Error("Duplicate IDs make migration pairing ambiguous");
  const added = [...newRows.keys()].filter((id) => !oldIds.has(id));
  const removed = [...oldIds].filter((id) => !newRows.has(id));
  const changes = before.flatMap((row) => {
    const next = newRows.get(row.id);
    if (!next) return [];
    return [...new Set([...Object.keys(row), ...Object.keys(next)])].sort().flatMap((field) => {
      if (isDeepStrictEqual(row[field], next[field]) && (field in row) === (field in next)) return [];
      return [{ id: row.id, field, before: row[field], after: next[field], before_present: field in row, after_present: field in next }];
    });
  });
  return { added, removed, changes };
}

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");
const readJson = (file: string): unknown => JSON.parse(readFileSync(file, "utf8"));
const printJson = (value: unknown) => JSON.stringify(value, null, 2) + "\n";

export function prepareMigration(root: string) {
  const writes: { file: string; before: string; after: string }[] = [];
  const mappingChanges: { file: string; before_sha256: string; after_sha256: string; raw_changes: unknown[] }[] = [];
  const datasets = [];
  for (const city of catalogCities(readJson(path.join(root, "catalog.json")))) {
    const file = path.join(root, city.mappingsPath.replace(/^\/data\//u, ""));
    const beforeText = readFileSync(file, "utf8"), beforeMapping = JSON.parse(beforeText);
    const bundle = taxonomyBundleSchema.parse({ taxonomy: readJson(path.join(root, city.taxonomyPath.replace(/^\/data\//u, ""))), mappings: migrateMappings(beforeMapping) });
    if (bundle.taxonomy.city !== city.id) throw new Error(`Wrong taxonomy city in ${file}`);
    const afterText = isDeepStrictEqual(beforeMapping, bundle.mappings) ? beforeText : printJson(bundle.mappings);
    if (afterText !== beforeText) writes.push({ file, before: beforeText, after: afterText });
    const oldEntries: { raw: string; groupKey: string }[] = Array.isArray(beforeMapping.mappings) ? beforeMapping.mappings : Object.entries(beforeMapping.mappings).map(([raw, groupKey]) => ({ raw, groupKey: String(groupKey) }));
    const rawChanges = oldEntries.flatMap((entry) => {
      const next = bundle.mappings.mappings.find((item) => item.raw === entry.raw);
      return !next || next.groupKey !== entry.groupKey ? [{ raw: entry.raw, before: entry.groupKey, after: next?.groupKey ?? null }] : [];
    });
    mappingChanges.push({ file: path.relative(root, file), before_sha256: sha256(beforeText), after_sha256: sha256(afterText), raw_changes: rawChanges });
    for (const guide of city.guides) {
      const dataFile = path.join(root, guide.dataPath.replace(/^\/data\//u, ""));
      const before = readFileSync(dataFile, "utf8");
      const rows = z.array(z.record(z.unknown())).parse(JSON.parse(before));
      const transformed = rows.map((row) => migrateRecord(row, bundle.taxonomy, bundle.mappings));
      // Maintain original key order and untouched fields; validation is not a serializer.
      const ordered = transformed.map((row, index) => {
        const original = rows[index]!;
        const output: Record<string, unknown> = {};
        for (const key of Object.keys(original)) if (Object.prototype.hasOwnProperty.call(row, key)) output[key] = row[key];
        for (const key of Object.keys(row)) if (!Object.prototype.hasOwnProperty.call(output, key)) output[key] = row[key];
        return output;
      });
      const validation = validateDataset(ordered, { city: city.id, guide_type: guideTypeSchema.parse(guide.id), edition_year: guide.year, spatial: city.spatialContext, ...bundle }, dataFile);
      const errors = validation.diagnostics.filter((item) => item.severity === "error");
      if (errors.length) throw new Error(JSON.stringify(errors));
      const diff = reconcileRecords(rows, ordered);
      if (diff.added.length || diff.removed.length) throw new Error(`${dataFile}: restaurant identities changed`);
      const allowed = new Set<string>([...retiredPriceFields, "price", "currency", "cuisine_group", "lat", "lon"]);
      if (diff.changes.some((change) => !allowed.has(change.field))) throw new Error(`${dataFile}: unexpected field change`);
      const after = printJson(ordered);
      if (before !== after) writes.push({ file: dataFile, before, after });
      datasets.push({ file: path.relative(root, dataFile), before_sha256: sha256(before), after_sha256: sha256(after), records: rows.length,
        identity_set: rows.map((row) => ({ id: row.id, guide_url: row.guide_url })), ...diff,
        locatable_before: rows.filter((row) => getMapPosition(row)).length, locatable_after: validation.counts.locatable });
    }
  }
  return { writes, report: { scope: "P02 local representation migration; no source collection or factual re-verification", mappings: mappingChanges, datasets } };
}

function main() {
  const { values } = parseArgs({ options: { root: { type: "string" }, write: { type: "boolean" } }, strict: true });
  const root = path.resolve(values.root ?? fileURLToPath(new URL("../public/data", import.meta.url)));
  const { writes, report } = prepareMigration(root);
  if (values.write) {
    for (const item of writes) if (readFileSync(item.file, "utf8") !== item.before) throw new Error(`Input changed during preparation: ${item.file}`);
    for (const item of writes) {
      const temporary = `${item.file}.p02-${process.pid}.tmp`;
      let descriptor: number | undefined;
      let owned = false;
      try {
        mkdirSync(path.dirname(item.file), { recursive: true });
        descriptor = openSync(temporary, "wx");
        owned = true;
        writeFileSync(descriptor, item.after);
        closeSync(descriptor);
        descriptor = undefined;
        renameSync(temporary, item.file);
      } finally {
        if (descriptor !== undefined) closeSync(descriptor);
        if (owned && existsSync(temporary)) rmSync(temporary);
      }
    }
  }
  process.stdout.write(printJson({ mode: values.write ? "write" : "dry-run", ...report }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { process.stderr.write(String(error) + "\n"); process.exitCode = 1; }
}
