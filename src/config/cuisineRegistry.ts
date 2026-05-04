import taxonomyData from "../../public/data/taxonomy/hong-kong.json";

/** A single cuisine group entry from the taxonomy registry. */
export interface CuisineGroup {
  key: string;
  labelZh: string;
  labelEn: string;
  sortOrder: number;
}

/** Union type of all canonical cuisine group keys. */
export type GroupKey =
  | "CANTONESE"
  | "NOODLES_CONGEE"
  | "DIM_SUM"
  | "REGIONAL_CHINESE"
  | "SOUTHEAST_ASIAN"
  | "JAPANESE"
  | "KOREAN"
  | "FRENCH"
  | "ITALIAN_EUROPEAN"
  | "WESTERN_OTHER"
  | "INNOVATIVE"
  | "STEAKHOUSE_GRILL"
  | "OTHER";

/** Visual style for a cuisine group marker/chip. */
export interface CuisineStyle {
  color: string;
  textColor: string;
}

/** Ordered list of all cuisine groups from the taxonomy registry. */
export const cuisineRegistry: CuisineGroup[] = taxonomyData.groups;

/** The fallback group key for unknown/unmapped cuisine values. */
export const FALLBACK_GROUP: GroupKey = "OTHER";

/** Style map: canonical group key → visual properties (color, text contrast). */
export const cuisineStyleMap: Record<GroupKey, CuisineStyle> = {
  CANTONESE: { color: "#D64C4C", textColor: "#fff" },
  NOODLES_CONGEE: { color: "#E1B93A", textColor: "#1a1a1a" },
  DIM_SUM: { color: "#43A36B", textColor: "#fff" },
  REGIONAL_CHINESE: { color: "#8A57C9", textColor: "#fff" },
  SOUTHEAST_ASIAN: { color: "#4386D6", textColor: "#fff" },
  JAPANESE: { color: "#2B2B2B", textColor: "#fff" },
  KOREAN: { color: "#5C6BC0", textColor: "#fff" },
  FRENCH: { color: "#B8860B", textColor: "#fff" },
  ITALIAN_EUROPEAN: { color: "#E0823F", textColor: "#fff" },
  WESTERN_OTHER: { color: "#8C8F96", textColor: "#fff" },
  INNOVATIVE: { color: "#00897B", textColor: "#fff" },
  STEAKHOUSE_GRILL: { color: "#6D4C41", textColor: "#fff" },
  OTHER: { color: "#BDBDBD", textColor: "#1a1a1a" },
};

/** Resolves a group key to its style, falling back to OTHER for unknown keys. */
export function getGroupStyle(groupKey: string): CuisineStyle {
  return cuisineStyleMap[groupKey as GroupKey] ?? cuisineStyleMap[FALLBACK_GROUP];
}

/** Resolves a group key to its Chinese display label. */
export function getGroupLabel(groupKey: string): string {
  const group = cuisineRegistry.find((g) => g.key === groupKey);
  return group?.labelZh ?? groupKey;
}
