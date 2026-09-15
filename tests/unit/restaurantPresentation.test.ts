// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import * as presentation from "@/config/restaurantPresentation";
import { servingFormSchema, parseRestaurantArray } from "@/data/contract";
import { validateDataset, presentationDiagnostics } from "@/data/validation";
import { restaurantFacts } from "@/data/display";
import { context, restaurant, taxonomy } from "./dataFixtures";
import hongKong from "../../public/data/taxonomy/hong-kong.json";
import beijing from "../../public/data/taxonomy/beijing.json";
const { getGroupStyle, getGroupLabel, getServingForm, servingForms } = presentation;
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
    expect(rows.map((row) => restaurantFacts(row).form.label)).toEqual(["餐食", "小食", "甜品", "饮品", ...Array(5).fill("类型未标注")]);
    expect(new Set(rows.map((row) => restaurantFacts(row).groupStyle.color)).size).toBe(1);
  });
  it.each(["unknown", "", "other", "unclassified", [], 0, false, {}])("rejects %j with file/id/field diagnostics", (serving_form) => {
    const result = validateDataset([{ ...restaurant(), serving_form }], context, "bad-form.json");
    expect(result.records).toEqual([]);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ severity: "error", file: "bad-form.json", record_id: 1, field: "/0/serving_form" }));
  });
  it("has valid local SVG for every schema form and unknown, with pinned Tabler identities", () => {
    expect(Object.keys(servingForms)).toEqual(servingFormSchema.options);
    expect(Object.values(servingForms).map((form) => form.icon)).toEqual(["tools-kitchen-2", "dumpling", "cake-roll", "cup"]);
    for (const form of [...servingFormSchema.options, null]) {
      const svg = new DOMParser().parseFromString(getServingForm(form).svg, "image/svg+xml");
      expect(svg.querySelector("parsererror")).toBeNull();
      expect(svg.documentElement.tagName).toBe("svg");
      expect(svg.querySelectorAll("path").length).toBeGreaterThan(0);
      expect(svg.querySelector("script, image, use, foreignObject, [href], [onload]")).toBeNull();
      expect(svg.documentElement.getAttribute("viewBox")).toBe("0 0 24 24");
    }
    expect(getServingForm(null)).toEqual(getServingForm(undefined));
  });
  it.each(["color", "icon", "svg"])("rejects data overrides of %s", (field) => {
    expect(() => parseRestaurantArray([{ ...restaurant(), [field]: "<svg/>" }])).toThrow();
  });
});
