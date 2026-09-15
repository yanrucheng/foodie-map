import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { z } from "zod";
import { boardingInputSchema, deriveCuisine, taxonomyBundleSchema } from "../src/data/taxonomy.ts";
import { schemaDiagnostics } from "../src/data/validation.ts";

import { validateCatalogRoot as validateDataRoot } from "./catalog.ts";

const repository = fileURLToPath(new URL("../", import.meta.url));
function readJson(file: string | number): unknown { return JSON.parse(readFileSync(file, "utf8")); }
/** One batch call from Python; only group assignments return, never rewritten source records. */
function board(): void {
  const request = z.object({ input: z.string(), taxonomy: z.string(), mappings: z.string() }).strict().parse(readJson(0));
  const bundle = taxonomyBundleSchema.parse({ taxonomy: JSON.parse(request.taxonomy), mappings: JSON.parse(request.mappings) });
  const input: unknown = JSON.parse(request.input);
  const parsed = boardingInputSchema.safeParse(input);
  if (!parsed.success) {
    process.stderr.write(JSON.stringify({ kind: "data", diagnostics: schemaDiagnostics(parsed.error, "input", input) }) + "\n");
    process.exitCode = 1;
    return;
  }
  process.stdout.write(JSON.stringify({ resolutions: parsed.data.map((record) => ({ id: record.id, ...deriveCuisine(record.cuisine, bundle.taxonomy, bundle.mappings) })) }) + "\n");
}

export { validateCatalogRoot as validateDataRoot } from "./catalog.ts";

function main(): void {
  if (process.argv[2] === "board") { board(); return; }
  const { values } = parseArgs({ args: process.argv.slice(2), options: { root: { type: "string" }, json: { type: "boolean" } }, strict: true });
  const result = validateDataRoot(path.resolve(values.root ?? path.join(repository, "public/data")));
  if (values.json) process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  else {
    for (const item of result.diagnostics) process.stderr.write(`${item.severity.toUpperCase()} ${item.code} ${item.file} id=${item.record_id ?? "-"} ${item.field}: ${item.reason}\n`);
    const sum = (key: "listed" | "locatable" | "missing_cuisine" | "unmapped" | "explicit_other") => result.datasets.reduce((count, item) => count + (item.counts?.[key] ?? 0), 0);
    process.stdout.write(`${result.valid ? "PASS" : "FAIL"}: ${result.datasets.length} datasets, ${sum("listed")} listed, ${sum("locatable")} locatable, ${sum("missing_cuisine")} missing cuisine, ${sum("unmapped")} unmapped, ${sum("explicit_other")} explicit OTHER.\n`);
    for (const form of ["meal", "snack", "dessert", "drink", "unclassified"] as const) {
      process.stdout.write(`serving_form.${form}: ${result.datasets.reduce((count, dataset) => count + (dataset.counts?.serving_form[form] ?? 0), 0)}\n`);
    }
  }
  process.exitCode = result.valid ? 0 : 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); }
  catch (error) {
    const dataError = error instanceof z.ZodError || error instanceof SyntaxError;
    const reason = error instanceof z.ZodError ? error.issues : String(error);
    process.stderr.write(`${process.argv[2] === "board" ? JSON.stringify({ kind: dataError ? "data" : "runtime", reason }) : typeof reason === "string" ? reason : JSON.stringify(reason)}\n`);
    process.exitCode = dataError ? 1 : 2;
  }
}
