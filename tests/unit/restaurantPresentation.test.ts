// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import * as presentation from "@/config/restaurantPresentation";
import { diningCategorySchema, servingFormSchema, parseRestaurantArray } from "@/data/contract";
import { validateDataset, presentationDiagnostics } from "@/data/validation";
import { restaurantFacts } from "@/data/display";
import { context, restaurant, taxonomy } from "./dataFixtures";
import hongKong from "../../public/data/taxonomy/hong-kong.json";
import beijing from "../../public/data/taxonomy/beijing.json";
const { getGroupStyle, getGroupLabel, getDiningCategory, diningCategories, parsePriceGrade, diningDistribution, diningDisplayCounts } = presentation;
afterEach(() => vi.restoreAllMocks());

describe("P08 deterministic category colors", () => {
  it("pins FNV-1a colors and reserves gray for OTHER", () => {
    expect(getGroupStyle("CANTONESE")).toEqual({ color: "hsl(337 62% 28%)", textColor: "#fff" });
    expect(getGroupStyle("OTHER")).toEqual({ color: "#666666", textColor: "#fff" });
    expect(getGroupStyle("")).toEqual(getGroupStyle("OTHER"));
    expect(getGroupStyle("NEW_GROUP")).not.toEqual(getGroupStyle("OTHER"));
  });
  it("generates all 360 hues with white contrast >=4.5, independent of group order or city labels", () => {
    const seen = new Set<number>();
    for (let index = 0; seen.size < 360 && index < 10000; index++) {
      const key = `FUTURE_${index}`;
      const pair = getGroupStyle(key);
      const match = /^hsl\((\d+) (\d+)% (\d+)%\)$/u.exec(pair.color)!;
      expect(match).not.toBeNull();
      const [h, s, l] = [Number(match[1]), Number(match[2]) / 100, Number(match[3]) / 100];
      seen.add(h);
      // Independent HSL -> sRGB calculation; production returns CSS HSL without conversion.
      const channel = (n: number) => { const k = (n + h / 30) % 12; return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
      const luminance = [channel(0), channel(8), channel(4)].map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
        .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i]!, 0);
      expect(1.05 / (luminance + 0.05), pair.color).toBeGreaterThanOrEqual(4.5);
    }
    expect(seen.size).toBe(360);
    expect(getGroupLabel("CANTONESE", beijing.groups)).not.toBe(getGroupLabel("CANTONESE", hongKong.groups));
    const keys = ["SUSHI", "RAMEN", "NEVER_SEEN", "CANTONESE"];
    const before = Object.fromEntries(keys.map((key) => [key, getGroupStyle(key)]));
    for (const key of [...keys].reverse()) expect(getGroupStyle(key)).toEqual(before[key]);
  });
  it("checks unused taxonomy groups and catches broken color generation", () => {
    expect(presentationDiagnostics(taxonomy, "taxonomy.json")).toEqual([]);
    vi.spyOn(presentation, "getGroupStyle").mockReturnValue({ color: "#666666", textColor: "#fff" });
    expect(presentationDiagnostics(taxonomy, "taxonomy.json")).toEqual([
      expect.objectContaining({ code: "INVALID_PRESENTATION", file: "taxonomy.json", field: "/groups/0/key" }),
    ]);
  });
});

describe("P08 optional independent forms and local icons", () => {
  it("preserves four forms, missing/null and every legacy-only value without inference", () => {
    const rows = [
      ...servingFormSchema.options.map((serving_form) => ({ serving_form, venue_type: "street_food" as const })),
      { serving_form: null }, {}, ...(["restaurant", "street_food", "dessert"] as const).map((venue_type) => ({ venue_type })),
    ].map((overrides, index) => restaurant({ ...overrides, id: index + 1 }));
    expect(parseRestaurantArray(rows)).toEqual(rows);
    const result = validateDataset(rows, context, "forms.json");
    expect(result.counts.serving_form).toEqual({ meal: 1, snack: 1, dessert: 1, drink: 1, unclassified: 5 });
    expect(result.diagnostics).toEqual([]);
    expect(rows.map((row) => restaurantFacts(row).category.label)).toEqual(Array(9).fill("主打体验未标注"));
    expect(new Set(rows.map((row) => restaurantFacts(row).groupStyle.color)).size).toBe(1);
  });
  it.each(["unknown", "", "other", "unclassified", [], 0, false, {}])("rejects %j with file/id/field diagnostics", (serving_form) => {
    const result = validateDataset([{ ...restaurant(), serving_form }], context, "bad-form.json");
    expect(result.records).toEqual([]);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ severity: "error", file: "bad-form.json", record_id: 1, field: "/0/serving_form" }));
  });
  it("has valid local SVG for every schema form and unknown, with pinned Tabler identities", () => {
    expect(Object.keys(diningCategories)).toEqual(diningCategorySchema.options);
    expect(Object.values(diningCategories).map((form) => form.icon)).toEqual(["bowl-chopsticks", "meat", "fish", "cake-roll", "chef-hat", "cooking-pot", "kaiseki-tray", "tools-kitchen-2"]);
    for (const form of [...diningCategorySchema.options, null]) {
      const svg = new DOMParser().parseFromString(getDiningCategory(form).svg, "image/svg+xml");
      expect(svg.querySelector("parsererror")).toBeNull();
      expect(svg.documentElement.tagName).toBe("svg");
      expect(svg.querySelectorAll("path").length).toBeGreaterThan(0);
      expect(svg.querySelector("script, image, use, foreignObject, [href], [onload]")).toBeNull();
      expect(svg.documentElement.getAttribute("viewBox")).toBe("0 0 24 24");
    }
    expect(getDiningCategory(null)).toEqual(getDiningCategory(undefined));
  });
  it.each(["color", "icon", "svg"])("rejects data overrides of %s", (field) => {
    expect(() => parseRestaurantArray([{ ...restaurant(), [field]: "<svg/>" }])).toThrow();
  });
});

describe("P09 source category and price contracts", () => {
  it("preserves eight independent categories, legacy fields and source prices", () => {
    const rows = diningCategorySchema.options.map((dining_category, index) => restaurant({ id: index + 1, dining_category,
      serving_form: "drink", venue_type: "street_food", price_range: " ￥￥ ", price: " 150–250 ", currency: "JPY" }));
    const before = structuredClone(rows);
    expect(parseRestaurantArray(rows)).toEqual(before);
    const result = validateDataset(rows, context, "dining.json");
    expect(result.diagnostics).toEqual([]);
    expect(result.counts.serving_form.drink).toBe(8);
    expect(result.counts.dining_category.unclassified).toBe(0);
    expect(rows.map((row) => restaurantFacts(row).category.label)).toEqual(["面饭面点", "肉食主打", "鱼鲜主打", "甜饮", "法式", "中餐", "日式会席", "其他料理"]);
    expect(rows.every((row) => restaurantFacts(row).categoryAnnotated)).toBe(true);
    expect(rows).toEqual(before);
  });
  it.each(["", "unknown", "mixed", "meal", "snack", "sweet", "kaiseki", [], 3, false, {}])("rejects category %j with an actionable field path", (dining_category) => {
    const result = validateDataset([{ ...restaurant(), dining_category }], context, "bad-dining.json");
    expect(result.records).toEqual([]);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ severity: "error", file: "bad-dining.json", record_id: 1, field: "/0/dining_category" }));
  });
  it.each(["¥", "$$", " ￥￥￥ ", "££££", "€€", "＄＄", "₩₩", "\u{1e2ff}\u{1e2ff}"])("parses %s on a copy using Unicode symbol counts", (raw) => {
    const tier = [...raw.trim().normalize("NFKC")].length;
    expect(parsePriceGrade(raw)).toEqual({ status: "valid", tier, badge: "¥".repeat(tier) });
    const row = restaurant({ price_range: raw, price: "150 起", currency: "MOP" });
    const facts = restaurantFacts(row);
    expect(facts.details).toContainEqual(["价格", "MOP 150 起"]);
    expect(facts.details.find(([label]) => label === "价格等级")?.[1]).toContain(`原文 ${raw}`);
    expect(row.price_range).toBe(raw);
  });
  it.each([undefined, null, "", " \t\n", "　"])("has no badge for missing %j", (raw) => {
    expect(parsePriceGrade(raw)).toEqual({ status: "missing", tier: null, badge: null });
    expect(restaurantFacts(restaurant({ price: "150–250", currency: "CNY", price_range: raw })).priceGrade.badge).toBeNull();
  });
  it.each(["¥150–250", "150", "约200元", "¥¥¥¥¥", "$¥", "¥ ¥", '<img src=x onerror="alert(1)">'])("preserves unsupported price %s without guessing", (raw) => {
    expect(parsePriceGrade(raw)).toEqual({ status: "unrecognized", tier: null, badge: null });
    const row = restaurant({ price_range: raw });
    const result = validateDataset([row], context, "prices.json");
    expect(result.records).toEqual([row]);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ severity: "warning", code: "UNRECOGNIZED_PRICE_GRADE", file: "prices.json", record_id: 1, field: "/0/price_range", raw }));
    expect(restaurantFacts(row).details).toContainEqual(["价格等级", `${raw}（未识别等级）`]);
  });
  it("reconciles explicit other, absent/null and no-badge combinations with listed denominators", () => {
    const rows = [
      { dining_category: "other" as const, price_range: "¥" }, {}, { dining_category: null, price_range: "150" },
      { dining_category: "meat" as const, price_range: "$$" }, { dining_category: "meat" as const, price_range: "¥¥¥" },
      { dining_category: "meat" as const, price_range: "¥¥¥¥" },
    ];
    const result = diningDistribution(rows);
    expect(result.dining_category).toEqual({ staple: 0, meat: 3, seafood: 0, dessert_drink: 0, french: 0, chinese: 0, japanese_course: 0, other: 1, unclassified: 2 });
    expect(result.price_grade).toEqual({ 1: 1, 2: 1, 3: 1, 4: 1, missing: 1, unrecognized: 1 });
    expect(Object.values(diningDisplayCounts(result.dining_category)).reduce((a, b) => a + b, 0)).toBe(6);
    expect(result.largest_icon_group?.ratio).toBe(.5);
    expect(result.largest_icon_price_group).toEqual({ group: "other:no-badge", count: 2, ratio: 2 / 6 });
    expect(diningDistribution([]).largest_icon_group).toBeNull();
    expect(diningDistribution([]).largest_icon_price_group).toBeNull();
    expect(getDiningCategory(null).svg).toBe(getDiningCategory("other").svg);
    expect(getDiningCategory(null).label).not.toBe(getDiningCategory("other").label);
    const missing = restaurantFacts(restaurant());
    expect(missing.categoryAnnotated).toBe(false);
  });
});
