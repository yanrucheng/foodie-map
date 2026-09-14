import { z } from "zod";
import { basemapSchema } from "../config/basemaps.ts";
import { citySchema, editionYearSchema, guideTypeSchema, spatialContextSchema, isSafeHttpUrl } from "./contract.ts";

const text = z.string().trim().min(1);
export const dataPathSchema = z.string().regex(/^\/data\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.json$/u);
export const evidenceRefSchema = z.string().refine((value) => isSafeHttpUrl(value) || dataPathSchema.safeParse(value).success || /^repo:[a-zA-Z0-9_./-]+$/u.test(value) && !value.includes(".."), "Expected safe HTTP URL, /data/ JSON, or repo: relative file");
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}(?:T.*)?$/u).refine((value) => Number.isFinite(Date.parse(value)), "Invalid date").nullable();
export const coverageSchema = z.object({
  status: z.enum(["not-collected", "partial", "unverified", "verified"]),
  note: text,
  verifiedMembers: z.array(citySchema),
  officialCount: z.number().int().nonnegative().nullable(),
  reconciliationPath: dataPathSchema.nullable(),
}).strict();
const provenanceSchema = z.object({
  collectedAt: date, verifiedAt: date,
  sources: z.array(z.object({ kind: z.enum(["edition", "scope", "membership", "gap"]), ref: evidenceRefSchema, note: text }).strict()).min(1),
  revision: z.object({ id: text, reason: text, evidence: evidenceRefSchema }).strict(),
}).strict();
export const catalogGuideSchema = z.object({
  id: guideTypeSchema, label: text, labelZh: text, year: editionYearSchema,
  dataPath: dataPathSchema.nullable(), legacyPath: dataPathSchema.optional(),
  coverage: coverageSchema, provenance: provenanceSchema,
}).strict();
export const catalogSchema = z.object({
  version: z.literal(1),
  cities: z.array(z.object({
    id: citySchema, label: text, labelZh: text,
    center: z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]), zoom: z.number().min(0).max(22),
    spatialContext: spatialContextSchema,
    basemap: basemapSchema.optional(),
    taxonomyPath: dataPathSchema, mappingsPath: dataPathSchema,
    scope: z.object({ description: text, members: z.array(citySchema).min(1) }).strict(),
    guides: z.array(catalogGuideSchema),
  }).strict()),
}).strict().superRefine((catalog, context) => {
  const cities = new Set<string>(), paths = new Set<string>();
  const issue = (path: (string | number)[], message: string) => context.addIssue({ code: "custom", path, message });
  catalog.cities.forEach((city, ci) => {
    if (cities.has(city.id)) issue(["cities", ci, "id"], `Duplicate city identity ${city.id}`);
    cities.add(city.id);
    if (new Set(city.scope.members).size !== city.scope.members.length) issue(["cities", ci, "scope", "members"], "Duplicate scope member");
    const guides = new Set<string>();
    city.guides.forEach((guide, gi) => {
      const base = ["cities", ci, "guides", gi];
      const identity = `${city.id}/${guide.year}/${guide.id}`;
      if (guides.has(identity)) issue(base, `Duplicate dataset identity ${identity}`);
      guides.add(identity);
      if (guide.coverage.status === "not-collected") {
        if (guide.dataPath !== null || guide.legacyPath || guide.coverage.reconciliationPath || guide.provenance.verifiedAt) issue(base, "Not-collected has no published files or verification");
      } else if (guide.dataPath !== `/data/${identity}.json`) issue([...base, "dataPath"], `Expected independently versioned /data/${identity}.json`);
      for (const path of [guide.dataPath, guide.legacyPath]) if (path) {
        if (paths.has(path)) issue(base, `Reused dataset path ${path}`);
        paths.add(path);
      }
      if (guide.coverage.verifiedMembers.some((member) => !city.scope.members.includes(member)) || new Set(guide.coverage.verifiedMembers).size !== guide.coverage.verifiedMembers.length) issue([...base, "coverage", "verifiedMembers"], "Unknown or duplicate scope member");
      if (guide.coverage.status === "verified") {
        if (!guide.coverage.reconciliationPath || !guide.provenance.verifiedAt || !["edition", "scope", "membership"].every((kind) => guide.provenance.sources.some((source) => source.kind === kind))) issue(base, "Verified requires dated verification, annual/scope/membership sources and identity reconciliation");
        if (city.scope.members.some((member) => !guide.coverage.verifiedMembers.includes(member))) issue(base, "Verified composite scope requires evidence for every member");
      }
    });
  });
});
export type Catalog = z.infer<typeof catalogSchema>;
export type CatalogGuide = z.infer<typeof catalogGuideSchema>;

/** Only published datasets participate in selection; missing published files fail validation. */
export function catalogCities(input: unknown) {
  return catalogSchema.parse(input).cities.map((city) => ({ ...city,
    guides: city.guides.filter((guide): guide is CatalogGuide & { dataPath: string } => guide.dataPath !== null),
  })).filter((city) => city.guides.length > 0);
}
