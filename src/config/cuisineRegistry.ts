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

/** The fallback group key for unknown/unmapped cuisine values. */
export const FALLBACK_GROUP = "OTHER";

/** Color palette for cuisine groups — covers all keys across all cities. */
const COLOR_PALETTE: Record<string, CuisineStyle> = {
  // Shared / universal groups
  CANTONESE: { color: "#D64C4C", textColor: "#000" },
  DIM_SUM: { color: "#43A36B", textColor: "#000" },
  NOODLES_CONGEE: { color: "#E1B93A", textColor: "#1a1a1a" },
  REGIONAL_CHINESE: { color: "#8A57C9", textColor: "#fff" },
  SOUTHEAST_ASIAN: { color: "#4386D6", textColor: "#000" },
  JAPANESE: { color: "#78909C", textColor: "#000" },
  KOREAN: { color: "#5C6BC0", textColor: "#fff" },
  FRENCH: { color: "#B8860B", textColor: "#000" },
  ITALIAN_EUROPEAN: { color: "#E0823F", textColor: "#000" },
  WESTERN_OTHER: { color: "#8C8F96", textColor: "#000" },
  INNOVATIVE: { color: "#00897B", textColor: "#000" },
  STEAKHOUSE_GRILL: { color: "#6D4C41", textColor: "#fff" },
  VEGETARIAN: { color: "#7CB342", textColor: "#000" },
  OTHER: { color: "#BDBDBD", textColor: "#1a1a1a" },

  // Beijing-specific groups
  BEIJING_LOCAL: { color: "#C62828", textColor: "#fff" },
  SICHUAN: { color: "#E53935", textColor: "#000" },
  HUAIYANG_JIANGNAN: { color: "#F9A825", textColor: "#1a1a1a" },
  SHANDONG: { color: "#FF7043", textColor: "#000" },
  HUNAN: { color: "#D32F2F", textColor: "#fff" },
  HOTPOT_BBQ: { color: "#BF360C", textColor: "#fff" },
  NOODLES_SNACKS: { color: "#FBC02D", textColor: "#1a1a1a" },
  JIANGZHE: { color: "#8BC34A", textColor: "#1a1a1a" },
  FUJIAN_SEAFOOD: { color: "#00ACC1", textColor: "#000" },
  HUBEI: { color: "#7E57C2", textColor: "#fff" },

  // Guangzhou/Shenzhen-specific groups
  CHAOZHOU: { color: "#0097A7", textColor: "#000" },
  SICHUAN_HUNAN: { color: "#E57373", textColor: "#000" },

  // Shanghai-specific groups
  SHANGHAINESE: { color: "#A1887F", textColor: "#000" },
  HUAIYANG: { color: "#FFB300", textColor: "#1a1a1a" },
  ZHEJIANG: { color: "#66BB6A", textColor: "#000" },
  NINGBO: { color: "#26A69A", textColor: "#000" },
  NOODLES: { color: "#FDD835", textColor: "#1a1a1a" },
  TEOCHEW: { color: "#0097A7", textColor: "#000" },
  ITALIAN: { color: "#FF8A65", textColor: "#000" },
  THAI: { color: "#9CCC65", textColor: "#1a1a1a" },
  MEDITERRANEAN: { color: "#42A5F5", textColor: "#000" },
  BEIJING: { color: "#C62828", textColor: "#fff" },
  FUJIAN: { color: "#00ACC1", textColor: "#000" },

  // Chengdu-specific groups
  SICHUANESE: { color: "#E53935", textColor: "#000" },
  EUROPEAN_CONTEMPORARY: { color: "#AB47BC", textColor: "#fff" },

  // Macau-specific groups
  PORTUGUESE_MACANESE: { color: "#FF8F00", textColor: "#000" },
};

/** Style map: group key → visual properties (color, text contrast). */
export const cuisineStyleMap: Record<string, CuisineStyle> = COLOR_PALETTE;

/** Resolves a group key to its style, falling back to OTHER for unknown keys. */
export function getGroupStyle(groupKey: string): CuisineStyle {
  return cuisineStyleMap[groupKey] ?? cuisineStyleMap[FALLBACK_GROUP]!;
}

/** Resolves a group key to its Chinese display label. */
export function getGroupLabel(groupKey: string, groups: readonly CuisineGroup[] = []): string {
  const group = groups.find((g) => g.key === groupKey);
  return group?.labelZh ?? groupKey;
}
