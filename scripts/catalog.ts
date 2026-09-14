import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { catalogSchema, type Catalog } from "../src/data/catalog.ts";
import { reconciliationSchema, reconcileCoverage } from "../src/data/reconciliation.ts";
import { taxonomyBundleSchema } from "../src/data/taxonomy.ts";
import { schemaDiagnostics, validateDataset, type Diagnostic } from "../src/data/validation.ts";

const repository = fileURLToPath(new URL("../", import.meta.url));
export const digest = (body: string | Buffer) => createHash("sha256").update(body).digest("hex");
export const resourceFile = (root: string, ref: string) => ref.startsWith("repo:") ? path.join(repository, ref.slice(5)) : path.join(root, ref.replace(/^\/data\//u, ""));
function jsonFiles(root: string): string[] {
  return existsSync(root) ? readdirSync(root, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? jsonFiles(path.join(root, entry.name)) : entry.name.endsWith(".json") ? [path.join(root, entry.name)] : []) : [];
}
export function validateCatalogRoot(root: string, options: { checkAliases?: boolean } = {}) {
  root = path.resolve(root);
  const diagnostics: Diagnostic[] = [];
  let catalog: Catalog | null = null;
  const inputs: Record<string, string> = {};
  const datasets: { identity: string; file: string | null; counts: ReturnType<typeof validateDataset>["counts"] | null; coverage: ReturnType<typeof reconcileCoverage> | null }[] = [];
  const registered = new Set<string>();
  const issue = (file: string, code: string, reason: string, field = "/") => diagnostics.push({ severity: "error", code, file, field, reason });
  const read = (file: string) => { registered.add(file); const body = readFileSync(file); inputs[path.relative(root, file)] = digest(body); return body; };
  const report = (error: unknown, file: string) => { if (error instanceof z.ZodError) diagnostics.push(...schemaDiagnostics(error, file)); else issue(file, error instanceof SyntaxError ? "INVALID_JSON" : "READ_ERROR", String(error)); };
  const json = (file: string): unknown => JSON.parse(read(file).toString());
  const reference = (ref: string) => { if (/^https?:/u.test(ref)) return; const file = resourceFile(root, ref); try { read(file); } catch (error) { report(error, file); } };
  const catalogFile = path.join(root, "catalog.json");
  try { catalog = catalogSchema.parse(json(catalogFile)); } catch (error) { report(error, catalogFile); }
  if (!catalog) return { valid: false, catalog, datasets, diagnostics, inputs };
  const sharedPoints = new Map<string, { file: string; id: number }>();
  for (const city of catalog.cities) {
    let bundle: z.infer<typeof taxonomyBundleSchema> | null = null;
    const taxonomyFile = resourceFile(root, city.taxonomyPath), mappingsFile = resourceFile(root, city.mappingsPath);
    try { bundle = taxonomyBundleSchema.parse({ taxonomy: json(taxonomyFile), mappings: json(mappingsFile) }); }
    catch (error) {
      if (error instanceof z.ZodError) for (const entry of error.issues) diagnostics.push({ severity: "error", code: "INVALID_TAXONOMY", file: entry.path[0] === "mappings" ? mappingsFile : taxonomyFile, field: `/${entry.path.slice(1).join("/")}`, reason: entry.message });
      else report(error, !existsSync(taxonomyFile) ? taxonomyFile : mappingsFile);
    }
    if (bundle && bundle.taxonomy.city !== city.id) issue(taxonomyFile, "TAXONOMY_CITY_MISMATCH", `Expected ${city.id}`);
    for (const guide of city.guides) {
      const identity = `${city.id}/${guide.year}/${guide.id}`;
      for (const source of guide.provenance.sources) reference(source.ref);
      reference(guide.provenance.revision.evidence);
      if (guide.dataPath === null) { datasets.push({ identity, file: null, counts: null, coverage: null }); continue; }
      const file = resourceFile(root, guide.dataPath);
      try {
        const input = json(file);
        if (!bundle) continue;
        const result = validateDataset(input, { city: city.id, guide_type: guide.id, edition_year: guide.year, spatial: city.spatialContext, ...bundle }, file);
        diagnostics.push(...result.diagnostics);
        let coverage = null;
        if (guide.coverage.reconciliationPath) {
          const evidenceFile = resourceFile(root, guide.coverage.reconciliationPath);
          try {
            const evidence = reconciliationSchema.parse(json(evidenceFile));
            for (const ref of [...evidence.sources, ...evidence.aliases.map((alias) => alias.evidence)]) reference(ref);
            if (evidence.dataset !== identity) issue(evidenceFile, "EVIDENCE_IDENTITY_MISMATCH", `Expected ${identity}`);
            coverage = reconcileCoverage(result.records, evidence);
            if (guide.coverage.officialCount !== null && evidence.complete && evidence.identities.length !== guide.coverage.officialCount) issue(evidenceFile, "OFFICIAL_COUNT_MISMATCH", "Official total differs from complete identity set");
            if (guide.coverage.status === "verified" && !coverage.complete) issue(evidenceFile, "COVERAGE_MISMATCH", JSON.stringify(coverage));
          } catch (error) { report(error, evidenceFile); }
        }
        datasets.push({ identity, file, counts: result.counts, coverage });
        if (guide.legacyPath) {
          const legacy = resourceFile(root, guide.legacyPath); registered.add(legacy);
          if (options.checkAliases !== false && !read(legacy).equals(read(file))) issue(legacy, "STALE_ALIAS", `Derived alias differs from ${guide.dataPath}; run npm run data:aliases`);
        }
        for (const record of result.records) {
          if (record.lat == null || record.lon == null) continue;
          const key = `${city.id}/${guide.year}/${record.lat},${record.lon}`, previous = sharedPoints.get(key);
          if (previous && previous.file !== file) diagnostics.push({ severity: "warning", code: "DUPLICATE_COORDINATES", file, record_id: record.id, field: "/lat", reason: `Same coordinates as ${previous.file} id=${previous.id}; records retained` });
          else if (!previous) sharedPoints.set(key, { file, id: record.id });
        }
      } catch (error) { report(error, file); }
    }
  }
  // Scanning detects omissions only; identity and availability are always catalog-owned.
  for (const file of jsonFiles(root)) if (!registered.has(file)) issue(file, "UNREGISTERED_DATASET", "JSON file is not referenced by catalog");
  return { valid: !diagnostics.some((item) => item.severity === "error"), catalog, datasets, diagnostics, inputs };
}
