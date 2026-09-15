import type { Restaurant, ServingForm } from "../data/contract.ts";

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

export type FormFilter = "all" | "unclassified" | ServingForm;
export type FormCounts = Record<ServingForm | "unclassified", number>;
interface FormPresentation { label: string; icon: string; svg: string }

// Trusted local Tabler Outline 3.46.0 paths. Source/license: public/icons/tabler-LICENSE.txt.
// Both React and Leaflet use these strings; no data fields enter SVG markup.
function svg(paths: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
}
export const servingForms: Record<ServingForm, FormPresentation> = {
  meal: { label: "餐食", icon: "tools-kitchen-2", svg: svg(`<path d="M19 3v12h-5c-.023 -3.681 .184 -7.406 5 -12m0 12v6h-1v-3m-10 -14v17m-3 -17v3a3 3 0 1 0 6 0v-3" />`) },
  snack: { label: "小食", icon: "dumpling", svg: svg(`<path d="M5.532 5.532a2.53 2.53 0 0 1 2.56 -.623a2.532 2.532 0 0 1 4.604 -.717q .146 -.24 .356 -.45a2.532 2.532 0 0 1 4.318 1.637a2.53 2.53 0 0 1 2.844 .511l.358 .358c1.384 1.385 -.7 5.713 -4.655 9.669c-3.956 3.955 -8.284 6.04 -9.669 4.655l-.358 -.358l-.114 -.122a2.53 2.53 0 0 1 -.398 -2.724a2.532 2.532 0 0 1 -1.186 -4.675a2.532 2.532 0 0 1 .718 -4.603a2.53 2.53 0 0 1 .622 -2.558" />`) },
  dessert: { label: "甜品", icon: "cake-roll", svg: svg(`<path d="M12 15c-4.97 0 -9 -2.462 -9 -5.5s4.03 -5.5 9 -5.5s9 2.462 9 5.5s-4.03 5.5 -9 5.5" />
  <path d="M12 6.97c3 0 4 1.036 4 1.979c0 2.805 -8 2.969 -8 -.99c0 -2.11 1.5 -3.959 4 -3.959" />
  <path d="M21 9.333v5.334c0 2.945 -4.03 5.333 -9 5.333c-4.97 0 -9 -2.388 -9 -5.333v-5.334" />`) },
  drink: { label: "饮品", icon: "cup", svg: svg(`<path d="M5 11h14v-3h-14l0 3" />
  <path d="M17.5 11l-1.5 10h-8l-1.5 -10" />
  <path d="M6 8v-1a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v1" />
  <path d="M15 5v-2" />`) },
};
const unclassified: FormPresentation = { label: "类型未标注", icon: "question-mark", svg: svg('<path d="M9 7a3 3 0 0 1 6 0c0 2 -3 2 -3 5m0 5h.01" />') };

export function getServingForm(form: ServingForm | null | undefined): FormPresentation {
  if (form == null) return unclassified;
  if (!Object.prototype.hasOwnProperty.call(servingForms, form)) throw new Error(`Invalid serving_form: ${String(form)}`);
  return servingForms[form];
}
export function formKey(record: Pick<Restaurant, "serving_form">): ServingForm | "unclassified" {
  return record.serving_form ?? "unclassified";
}
export function countServingForms(records: Pick<Restaurant, "serving_form">[]): FormCounts {
  const counts: FormCounts = { meal: 0, snack: 0, dessert: 0, drink: 0, unclassified: 0 };
  for (const record of records) counts[formKey(record)]++;
  return counts;
}
