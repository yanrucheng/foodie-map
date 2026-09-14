import type { Restaurant } from "@/data/contract";
import type { Mappings, Taxonomy } from "@/data/taxonomy";
import type { DatasetContext } from "@/data/validation";

export function restaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  return { id: 1, name: "测试餐厅", city: "fixture-city", guide_type: "michelin-bib-gourmand", edition_year: 2026, cuisine_group: "OTHER", ...overrides };
}
export const taxonomy: Taxonomy = { version: 1, city: "fixture-city", fallbackGroup: "OTHER", groups: [
  { key: "CANTONESE", labelZh: "粤菜", labelEn: "Cantonese", sortOrder: 1 },
  { key: "OTHER", labelZh: "其他", labelEn: "Other", sortOrder: 99 },
] };
export const mappings: Mappings = { version: 1, city: "fixture-city", mappings: [
  { raw: "粵菜", groupKey: "CANTONESE", sources: ["fixture"] },
  { raw: "街頭小吃", groupKey: "OTHER" },
] };
export const context: DatasetContext = { city: "fixture-city", guide_type: "michelin-bib-gourmand", edition_year: 2026, taxonomy, mappings };
