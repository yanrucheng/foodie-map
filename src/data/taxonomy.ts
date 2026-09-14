import { z } from "zod";
import { citySchema, checkUniqueIds, hasText, localIdSchema } from "./contract.ts";

const groupKey = z.string().regex(/^[A-Z][A-Z0-9_]*$/u);
const label = z.string().refine(hasText, "Expected nonempty label");
export const taxonomySchema = z.object({
  version: z.number().int().positive(),
  city: citySchema,
  fallbackGroup: z.literal("OTHER"),
  groups: z.array(z.object({ key: groupKey, labelZh: label, labelEn: label, sortOrder: z.number().int() }).strict()).min(1),
}).strict().superRefine((taxonomy, context) => {
  const seen = new Set<string>();
  taxonomy.groups.forEach((group, index) => {
    if (seen.has(group.key)) context.addIssue({ code: "custom", path: ["groups", index, "key"], message: `Duplicate group ${group.key}` });
    seen.add(group.key);
  });
  if (!seen.has(taxonomy.fallbackGroup)) context.addIssue({ code: "custom", path: ["fallbackGroup"], message: "Fallback group must exist" });
});

export const mappingsSchema = z.object({
  version: z.number().int().positive(),
  city: citySchema,
  mappings: z.array(z.object({ raw: label, groupKey, sources: z.array(z.string()).optional() }).strict()),
}).strict().superRefine((mappings, context) => {
  const seen = new Set<string>();
  mappings.mappings.forEach((mapping, index) => {
    if (seen.has(mapping.raw)) context.addIssue({ code: "custom", path: ["mappings", index, "raw"], message: `Duplicate raw label ${mapping.raw}` });
    seen.add(mapping.raw);
  });
});

export const taxonomyBundleSchema = z.object({ taxonomy: taxonomySchema, mappings: mappingsSchema }).superRefine(({ taxonomy, mappings }, context) => {
  if (taxonomy.city !== mappings.city) context.addIssue({ code: "custom", path: ["mappings", "city"], message: "Taxonomy and mappings cities differ" });
  const keys = new Set(taxonomy.groups.map((group) => group.key));
  mappings.mappings.forEach((mapping, index) => {
    if (!keys.has(mapping.groupKey)) context.addIssue({ code: "custom", path: ["mappings", "mappings", index, "groupKey"], message: `Unknown target group ${mapping.groupKey}` });
  });
});
export type Taxonomy = z.infer<typeof taxonomySchema>;
export type Mappings = z.infer<typeof mappingsSchema>;
export type CuisineResolution = { groupKey: string; reason: "mapped" | "explicit-other" | "missing" | "unmapped" };

export function deriveCuisine(raw: string | null | undefined, taxonomy: Taxonomy, mappings: Mappings): CuisineResolution {
  if (!hasText(raw)) return { groupKey: taxonomy.fallbackGroup, reason: "missing" };
  const entry = mappings.mappings.find((mapping) => mapping.raw === raw);
  if (!entry) return { groupKey: taxonomy.fallbackGroup, reason: "unmapped" };
  return { groupKey: entry.groupKey, reason: entry.groupKey === taxonomy.fallbackGroup ? "explicit-other" : "mapped" };
}

/** Raw input can contain facts outside the published contract; boarding preserves them. */
export const boardingInputSchema = z.array(z.object({
  id: localIdSchema, name: label, cuisine: z.string().nullish(),
}).passthrough()).superRefine(checkUniqueIds);
