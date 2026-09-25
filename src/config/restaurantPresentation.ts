import type { DiningCategory, Restaurant, ServingForm } from "../data/contract.ts";

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

/** FNV-1a over canonical ASCII keys; independent of city, labels and active groups. */
export function getGroupStyle(groupKey: string): CuisineStyle {
  if (groupKey === FALLBACK_GROUP || !/^[A-Z][A-Z0-9_]*$/u.test(groupKey)) return { color: "#666666", textColor: "#fff" };
  let hash = 2166136261;
  for (let i = 0; i < groupKey.length; i++) hash = Math.imul(hash ^ groupKey.charCodeAt(i), 16777619) >>> 0;
  return { color: `hsl(${hash % 360} 62% 28%)`, textColor: "#fff" };
}

/** Resolves a group key to its Chinese display label. */
export function getGroupLabel(groupKey: string, groups: readonly CuisineGroup[] = []): string {
  const group = groups.find((g) => g.key === groupKey);
  return group?.labelZh ?? groupKey;
}

export type DiningFilter = "all" | DiningCategory;
export type DiningCounts = Record<DiningCategory | "unclassified", number>;
interface DiningPresentation { label: string; icon: string; svg: string }

// Trusted static paths from the approved P09 preview. Never interpolate source facts.
// Tabler Outline 3.46.0 / Lucide 1.46.0 licenses and provenance: public/icons/.
function svg(paths: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
}
export const diningCategories: Record<DiningCategory, DiningPresentation> = {
  staple: { label: "面饭面点", icon: "bowl-chopsticks", svg: svg(`<path d="M4 11h16a1 1 0 0 1 1 1v.5c0 1.5 -2.517 5.573 -4 6.5v1a1 1 0 0 1 -1 1h-8a1 1 0 0 1 -1 -1v-1c-1.687 -1.054 -4 -5 -4 -6.5v-.5a1 1 0 0 1 1 -1" />
  <path d="M19 7l-14 1" />
  <path d="M19 2l-14 3" />`) },
  meat: { label: "肉食主打", icon: "meat", svg: svg(`<path d="M13.62 8.382l1.966 -1.967a2 2 0 1 1 3.414 -1.415a2 2 0 1 1 -1.413 3.414l-1.82 1.821" />
  <path d="M5.904 18.596c2.733 2.734 5.9 4 7.07 2.829c1.172 -1.172 -.094 -4.338 -2.828 -7.071c-2.733 -2.734 -5.9 -4 -7.07 -2.829c-1.172 1.172 .094 4.338 2.828 7.071" />
  <path d="M7.5 16l1 1" />
  <path d="M12.975 21.425c3.905 -3.906 4.855 -9.288 2.121 -12.021c-2.733 -2.734 -8.115 -1.784 -12.02 2.121" />`) },
  seafood: { label: "鱼鲜主打", icon: "fish", svg: svg(`<path d="M16.69 7.44a6.973 6.973 0 0 0 -1.69 4.56c0 1.747 .64 3.345 1.699 4.571" />
  <path d="M2 9.504c7.715 8.647 14.75 10.265 20 2.498c-5.25 -7.761 -12.285 -6.142 -20 2.504" />
  <path d="M18 11v.01" />
  <path d="M11.5 10.5c-.667 1 -.667 2 0 3" />`) },
  dessert_drink: { label: "甜饮", icon: "cake-roll", svg: svg(`<path d="M12 15c-4.97 0 -9 -2.462 -9 -5.5s4.03 -5.5 9 -5.5s9 2.462 9 5.5s-4.03 5.5 -9 5.5" />
  <path d="M12 6.97c3 0 4 1.036 4 1.979c0 2.805 -8 2.969 -8 -.99c0 -2.11 1.5 -3.959 4 -3.959" />
  <path d="M21 9.333v5.334c0 2.945 -4.03 5.333 -9 5.333c-4.97 0 -9 -2.388 -9 -5.333v-5.334" />`) },
  french: { label: "法式", icon: "chef-hat", svg: svg(`<path d="M12 3c1.918 0 3.52 1.35 3.91 3.151a4 4 0 0 1 2.09 7.723l0 7.126h-12v-7.126a4 4 0 1 1 2.092 -7.723a4 4 0 0 1 3.908 -3.151" />
  <path d="M6.161 17.009l11.839 -.009" />`) },
  chinese: { label: "中餐", icon: "cooking-pot", svg: svg(`<path d="M2 12h20" />
  <path d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8" />
  <path d="m4 8 16-4" />
  <path d="m8.86 6.78-.45-1.81a2 2 0 0 1 1.45-2.43l1.94-.48a2 2 0 0 1 2.43 1.46l.45 1.8" />
`) },
  japanese_course: { label: "日式会席", icon: "kaiseki-tray", svg: svg(`<rect x="2.5" y="3.5" width="19" height="17" rx="2"/><circle cx="8" cy="9" r="2.5"/><path d="M14 7h4M14 10h4M5.5 15h6v1a3 3 0 0 1 -6 0z"/><circle cx="16.5" cy="16" r="2"/>`) },
  other: { label: "其他料理", icon: "tools-kitchen-2", svg: svg(`<path d="M19 3v12h-5c-.023 -3.681 .184 -7.406 5 -12m0 12v6h-1v-3m-10 -14v17m-3 -17v3a3 3 0 1 0 6 0v-3" />`) },
};
export const diningCategoryOrder = Object.keys(diningCategories) as DiningCategory[];
const unclassified: DiningPresentation = { ...diningCategories.other, label: "主打体验未标注" };
export function getDiningCategory(category: DiningCategory | null | undefined): DiningPresentation {
  if (category == null) return unclassified;
  if (!Object.prototype.hasOwnProperty.call(diningCategories, category)) throw new Error(`Invalid dining_category: ${String(category)}`);
  return diningCategories[category];
}
/** UI has eight groups; missing remains distinct in the source and diagnostics. */
export function diningKey(record: Pick<Restaurant, "dining_category">): DiningCategory {
  return record.dining_category ?? "other";
}
export function countDiningCategories(records: readonly Pick<Restaurant, "dining_category">[]): DiningCounts {
  const counts = Object.fromEntries(diningCategoryOrder.map((key) => [key, 0])) as DiningCounts;
  counts.unclassified = 0;
  for (const record of records) counts[record.dining_category ?? "unclassified"]++;
  return counts;
}
export function diningDisplayCounts(counts: DiningCounts): Record<DiningCategory, number> {
  const { unclassified, ...explicit } = counts;
  return { ...explicit, other: explicit.other + unclassified };
}

export type PriceTier = 1 | 2 | 3 | 4;
export type PriceGrade = { status: "valid"; tier: PriceTier; badge: string } | { status: "missing" | "unrecognized"; tier: null; badge: null };
/** Normalize only a parsing copy: symbols express a grade, never an amount or FX. */
export function parsePriceGrade(raw: Restaurant["price_range"]): PriceGrade {
  const value = raw?.trim().normalize("NFKC") ?? "";
  if (!value) return { status: "missing", tier: null, badge: null };
  const symbols = [...value];
  if (symbols.length <= 4 && /^\p{Sc}+$/u.test(value) && symbols.every((symbol) => symbol === symbols[0])) {
    const tier = symbols.length as PriceTier;
    return { status: "valid", tier, badge: "¥".repeat(tier) };
  }
  return { status: "unrecognized", tier: null, badge: null };
}
export const encodingExplanation = "颜色看菜系，图标看主打；¥越多价位越高，不表示金额，不同城市不宜直接比较。";

/** Stable group ordering also resolves ties; ratios use all listed records. */
export function diningDistribution(records: readonly Pick<Restaurant, "dining_category" | "price_range">[]) {
  const dining_category = countDiningCategories(records);
  const display = diningDisplayCounts(dining_category);
  const price_grade: Record<PriceTier | "missing" | "unrecognized", number> = { 1: 0, 2: 0, 3: 0, 4: 0, missing: 0, unrecognized: 0 };
  const combinations: Record<string, number> = {};
  for (const record of records) {
    const grade = parsePriceGrade(record.price_range);
    price_grade[grade.status === "valid" ? grade.tier : grade.status]++;
    const key = `${diningKey(record)}:${grade.tier ?? "no-badge"}`;
    combinations[key] = (combinations[key] ?? 0) + 1;
  }
  const largest = (groups: Record<string, number>) => {
    const entry = Object.entries(groups).sort(([a, ac], [b, bc]) => bc - ac || a.localeCompare(b))[0];
    return records.length && entry ? { group: entry[0], count: entry[1], ratio: entry[1] / records.length } : null;
  };
  return { dining_category, price_grade, largest_icon_group: largest(display), largest_icon_price_group: largest(combinations) };
}

/** Retained legacy diagnostics, with no conversion to the new category. */
export function countServingForms(records: readonly Pick<Restaurant, "serving_form">[]): Record<ServingForm | "unclassified", number> {
  const counts = { meal: 0, snack: 0, dessert: 0, drink: 0, unclassified: 0 };
  for (const record of records) counts[record.serving_form ?? "unclassified"]++;
  return counts;
}
