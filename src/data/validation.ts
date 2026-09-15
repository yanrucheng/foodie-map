import { z } from "zod";
import { citySchema, editionYearSchema, getMapPosition, guideTypeSchema, restaurantArraySchema, restaurantFieldNames, spatialContextSchema, type Restaurant, type SpatialContext } from "./contract.ts";
import { deriveCuisine, taxonomyBundleSchema, type Mappings, type Taxonomy } from "./taxonomy.ts";
import { countServingForms, getGroupStyle, diningDistribution, parsePriceGrade } from "../config/restaurantPresentation.ts";

export interface Diagnostic {
  severity: "error" | "warning";
  code: string;
  file: string;
  record_id?: number;
  field: string;
  reason: string;
  raw?: string | null;
  actual?: string;
  expected?: string;
}
export interface DatasetContext {
  city: string;
  guide_type: Restaurant["guide_type"];
  edition_year: number;
  taxonomy: Taxonomy;
  mappings: Mappings;
  spatial?: SpatialContext;
}

export function schemaDiagnostics(error: z.ZodError, file: string, input?: unknown): Diagnostic[] {
  return error.issues.map((issue) => {
    const index = issue.path[0];
    const record: unknown = typeof index === "number" && Array.isArray(input) ? input[index] : undefined;
    const id = record && typeof record === "object" && "id" in record && typeof record.id === "number" ? record.id : undefined;
    return { severity: "error", code: "INVALID_FIELD", file, ...(id === undefined ? {} : { record_id: id }),
      field: `/${issue.path.map((part) => String(part).replace(/~/gu, "~0").replace(/\//gu, "~1")).join("/")}`, reason: issue.message };
  });
}

const contextSchema = z.object({ city: citySchema, guide_type: guideTypeSchema, edition_year: editionYearSchema, spatial: spatialContextSchema.optional() });

/** Includes unused registered groups; hashing must never hide missing presentation support. */
export function presentationDiagnostics(taxonomy: Taxonomy, file: string): Diagnostic[] {
  return taxonomy.groups.flatMap((group, index) => {
    const style = getGroupStyle(group.key);
    const hue = /^hsl\((\d+) 62% 28%\)$/u.exec(style.color);
    const valid = style.textColor === "#fff" && (group.key === "OTHER" ? style.color === "#666666" : hue !== null && Number(hue[1]) < 360);
    return valid ? [] : [{ severity: "error" as const, code: "INVALID_PRESENTATION", file, field: `/groups/${index}/key`, reason: `Cannot generate category style for ${group.key}` }];
  });
}

/** Read-only validation; catalog discovery belongs to P03, record rules stay here. */
export function validateDataset(input: unknown, context: DatasetContext, file: string) {
  const diagnostics: Diagnostic[] = [];
  const counts = { listed: Array.isArray(input) ? input.length : 0, locatable: 0, missing_cuisine: 0, unmapped: 0, explicit_other: 0, serving_form: countServingForms([]), ...diningDistribution([]) };
  const parsed = restaurantArraySchema.safeParse(input);
  const metadata = contextSchema.safeParse(context);
  const bundle = taxonomyBundleSchema.safeParse(context);
  if (!parsed.success) diagnostics.push(...schemaDiagnostics(parsed.error, file, input));
  if (!metadata.success) diagnostics.push(...schemaDiagnostics(metadata.error, `${file} context`));
  if (!bundle.success) diagnostics.push(...schemaDiagnostics(bundle.error, `${file} taxonomy/mappings`));
  if (!parsed.success || !metadata.success || !bundle.success) return { records: [], counts, diagnostics };
  const records = parsed.data;
  counts.serving_form = countServingForms(records);
  Object.assign(counts, diningDistribution(records));
  diagnostics.push(...presentationDiagnostics(bundle.data.taxonomy, `${file} taxonomy`));
  const issue = (severity: Diagnostic["severity"], code: string, field: string, reason: string, record?: Restaurant) => {
    diagnostics.push({ severity, code, file, field, reason, ...(record ? { record_id: record.id } : {}) });
  };
  if (context.city !== bundle.data.taxonomy.city) issue("error", "TAXONOMY_CITY_MISMATCH", "/city", "Dataset and taxonomy cities differ");
  if (metadata.data.spatial?.coordinateSystem === "unknown") issue("warning", "UNKNOWN_COORDINATE_SYSTEM", "/context/spatial", "Records remain available, but positions cannot be drawn in this context");
  const points = new Map<string, number>();
  records.forEach((record, index) => {
    for (const field of ["city", "guide_type", "edition_year"] as const) {
      if (record[field] !== metadata.data[field]) issue("error", "DATASET_MISMATCH", `/${index}/${field}`, `Expected ${metadata.data[field]}, received ${record[field]}`, record);
    }
    for (const field of Object.keys(record)) {
      if (!restaurantFieldNames.has(field)) issue("warning", "EXTRA_FIELD", `/${index}/${field}`, "Extra field preserved; check its spelling if intended for display", record);
    }
    if (parsePriceGrade(record.price_range).status === "unrecognized") {
      diagnostics.push({ severity: "warning", code: "UNRECOGNIZED_PRICE_GRADE", file, record_id: record.id, field: `/${index}/price_range`, raw: record.price_range, reason: "Source text retained; no price badge is displayed" });
    }
    const resolution = deriveCuisine(record.cuisine, bundle.data.taxonomy, bundle.data.mappings);
    if (resolution.reason === "missing") counts.missing_cuisine++;
    if (resolution.reason === "explicit-other") counts.explicit_other++;
    if (resolution.reason === "unmapped") {
      counts.unmapped++;
      diagnostics.push({ severity: "warning", code: "UNMAPPED_CUISINE", file, record_id: record.id, field: `/${index}/cuisine`, raw: record.cuisine, reason: "Using OTHER for this exact raw label" });
    }
    if (record.cuisine_group !== resolution.groupKey) {
      diagnostics.push({ severity: "error", code: "CUISINE_GROUP_MISMATCH", file, record_id: record.id, field: `/${index}/cuisine_group`, raw: record.cuisine ?? null, actual: record.cuisine_group, expected: resolution.groupKey, reason: "Stored group differs from the deterministic mapping/fallback" });
    }
    if (getMapPosition(record, metadata.data.spatial)) counts.locatable++;
    if (record.lat != null && record.lon != null) {
      const bounds = metadata.data.spatial?.bounds;
      if (bounds && (record.lat < bounds[0] || record.lon < bounds[1] || record.lat > bounds[2] || record.lon > bounds[3])) {
        issue(record.geocode_success === false ? "warning" : "error", "OUTSIDE_BOUNDS", `/${index}/lat`, "Coordinates are outside the provided dataset bounds", record);
      }
      const point = `${record.lat},${record.lon}`;
      const previous = points.get(point);
      if (previous !== undefined) issue("warning", "DUPLICATE_COORDINATES", `/${index}/lat`, `Same coordinates as record ${previous}; records are retained`, record);
      else points.set(point, record.id);
    }
  });
  return { records, counts, diagnostics };
}
