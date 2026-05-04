import hongKongTaxonomy from "../../public/data/taxonomy/hong-kong.json";
import beijingTaxonomy from "../../public/data/taxonomy/beijing.json";
import guangzhouShenzhenTaxonomy from "../../public/data/taxonomy/guangzhou-shenzhen.json";

/** A single cuisine group entry from the taxonomy registry. */
export interface CuisineGroup {
  key: string;
  labelZh: string;
  labelEn: string;
  sortOrder: number;
}

/** Visual style for a cuisine group marker/chip. */
export interface CuisineStyle {
  color: string;
  textColor: string;
}

/**
 * Merges multiple taxonomy arrays, deduplicating by key.
 * First occurrence wins (preserves label/sortOrder from the first taxonomy).
 */
function mergeTaxonomies(...sources: CuisineGroup[][]): CuisineGroup[] {
  const seen = new Set<string>();
  const result: CuisineGroup[] = [];
  for (const groups of sources) {
    for (const group of groups) {
      if (!seen.has(group.key)) {
        seen.add(group.key);
        result.push(group);
      }
    }
  }
  return result.sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Ordered list of all cuisine groups from all city taxonomies. */
export const cuisineRegistry: CuisineGroup[] = mergeTaxonomies(
  hongKongTaxonomy.groups,
  beijingTaxonomy.groups,
  guangzhouShenzhenTaxonomy.groups
);

/** The fallback group key for unknown/unmapped cuisine values. */
export const FALLBACK_GROUP = "OTHER";

/** Color palette for cuisine groups — covers all keys across all cities. */
const COLOR_PALETTE: Record<string, CuisineStyle> = {
  // Shared / universal groups
  CANTONESE: { color: "#D64C4C", textColor: "#fff" },
  DIM_SUM: { color: "#43A36B", textColor: "#fff" },
  NOODLES_CONGEE: { color: "#E1B93A", textColor: "#1a1a1a" },
  REGIONAL_CHINESE: { color: "#8A57C9", textColor: "#fff" },
  SOUTHEAST_ASIAN: { color: "#4386D6", textColor: "#fff" },
  JAPANESE: { color: "#2B2B2B", textColor: "#fff" },
  KOREAN: { color: "#5C6BC0", textColor: "#fff" },
  FRENCH: { color: "#B8860B", textColor: "#fff" },
  ITALIAN_EUROPEAN: { color: "#E0823F", textColor: "#fff" },
  WESTERN_OTHER: { color: "#8C8F96", textColor: "#fff" },
  INNOVATIVE: { color: "#00897B", textColor: "#fff" },
  STEAKHOUSE_GRILL: { color: "#6D4C41", textColor: "#fff" },
  VEGETARIAN: { color: "#7CB342", textColor: "#fff" },
  OTHER: { color: "#BDBDBD", textColor: "#1a1a1a" },

  // Beijing-specific groups
  BEIJING_LOCAL: { color: "#C62828", textColor: "#fff" },
  SICHUAN: { color: "#E53935", textColor: "#fff" },
  HUAIYANG_JIANGNAN: { color: "#F9A825", textColor: "#1a1a1a" },
  SHANDONG: { color: "#FF7043", textColor: "#fff" },
  HUNAN: { color: "#D32F2F", textColor: "#fff" },
  HOTPOT_BBQ: { color: "#BF360C", textColor: "#fff" },
  NOODLES_SNACKS: { color: "#FBC02D", textColor: "#1a1a1a" },
  JIANGZHE: { color: "#8BC34A", textColor: "#1a1a1a" },
  FUJIAN_SEAFOOD: { color: "#00ACC1", textColor: "#fff" },
  HUBEI: { color: "#7E57C2", textColor: "#fff" },

  // Guangzhou/Shenzhen-specific groups
  CHAOZHOU: { color: "#0097A7", textColor: "#fff" },
  SICHUAN_HUNAN: { color: "#E57373", textColor: "#fff" },
};

/** Style map: group key → visual properties (color, text contrast). */
export const cuisineStyleMap: Record<string, CuisineStyle> = COLOR_PALETTE;

/** Resolves a group key to its style, falling back to OTHER for unknown keys. */
export function getGroupStyle(groupKey: string): CuisineStyle {
  return cuisineStyleMap[groupKey] ?? cuisineStyleMap[FALLBACK_GROUP]!;
}

/** Resolves a group key to its Chinese display label. */
export function getGroupLabel(groupKey: string): string {
  const group = cuisineRegistry.find((g) => g.key === groupKey);
  return group?.labelZh ?? groupKey;
}
