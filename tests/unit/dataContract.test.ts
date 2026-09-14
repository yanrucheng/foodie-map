import { describe, expect, it } from "vitest";
import { getMapPosition, parseRestaurantArray, restaurantSchema } from "@/data/contract";
import { displayName, displayPrice, searchNames } from "@/data/display";
import { deriveCuisine, taxonomyBundleSchema } from "@/data/taxonomy";
import { validateDataset } from "@/data/validation";
import { context, mappings, restaurant, taxonomy } from "./dataFixtures";

describe("minimal record contract (P02-R1)", () => {
  it("accepts missing optional information and preserves existing or extra facts", () => {
    const minimal = restaurant();
    expect(parseRestaurantArray([minimal])).toEqual([minimal]);
    const partial = restaurant({ name_en: null, price: " ", guide_url: "", status: "active", source_note: { unverified: true } });
    expect(parseRestaurantArray([partial])).toEqual([partial]);
    expect(parseRestaurantArray([restaurant({ status: "closed" })])).toHaveLength(1);
    expect(validateDataset([partial], context, "fixture.json").diagnostics).toEqual([
      expect.objectContaining({ severity: "warning", code: "EXTRA_FIELD", field: "/0/source_note" }),
    ]);
  });
  it.each([
    { id: "1" }, { id: 0 }, { id: Number.MAX_SAFE_INTEGER + 1 }, { name: " " },
    { city: undefined }, { guide_type: "unsupported" }, { edition_year: "2026" }, { cuisine_group: null },
    { star_rating: 2 }, { guide_type: "michelin-starred", star_rating: 0 }, { venue_type: "unknown-venue" },
    { is_new: "false" }, { price: { min: 200, max: 400 } }, { currency: "USD" },
    { guide_url: "javascript:alert(1)" }, { guide_url: "https://guide.michelin.com.evil.test/restaurant/foo" },
    { website: "data:text/html,hello" }, { website: "https://user:secret@example.com" },
    { avg_price_hkd: "約 200–400" },
  ])("rejects wrong types and meanings: %j", (overrides) => {
    expect(restaurantSchema.safeParse({ ...restaurant(), ...overrides }).success).toBe(false);
  });
  it("accepts international official URLs and rejects duplicate local IDs", () => {
    expect(restaurantSchema.safeParse(restaurant({ guide_url: "https://guide.michelin.com/hk/en/hong-kong-region/hong-kong/restaurant/8½-otto-e-mezzo-bombana" })).success).toBe(true);
    expect(() => parseRestaurantArray([restaurant(), restaurant()])).toThrow(/Duplicate/);
    expect(() => parseRestaurantArray({})).toThrow();
    expect(parseRestaurantArray([])).toEqual([]);
  });
});

describe("position meaning (P02-R4)", () => {
  it.each([true, null, undefined])("uses valid coordinates with status %s without requiring evidence", (geocode_success) => {
    const record = restaurant({ lat: 22.3, lon: 114.1, geocode_success });
    expect(restaurantSchema.safeParse(record).success).toBe(true);
    expect(getMapPosition(record)).toEqual([22.3, 114.1]);
    expect(record).not.toHaveProperty("provenance");
  });
  it("keeps absent and explicitly failed positions in the list", () => {
    const rows = [restaurant(), restaurant({ id: 2, lat: null, lon: null }), restaurant({ id: 3, lat: 22.3, lon: 114.1, geocode_success: false })];
    expect(parseRestaurantArray(rows)).toEqual(rows);
    expect(rows.map((record) => getMapPosition(record))).toEqual([null, null, null]);
  });
  it.each([
    { lat: 0, lon: 0 }, { lat: 91, lon: 114 }, { lat: 22, lon: 181 },
    { lat: NaN, lon: 114 }, { lat: Infinity, lon: 114 }, { lat: 22, lon: null },
    { lat: 22 }, { lat: "22", lon: 114 }, { geocode_success: true },
  ])("rejects contradictory or invalid positions: %j", (overrides) => {
    const record = { ...restaurant(), ...overrides };
    expect(restaurantSchema.safeParse(record).success).toBe(false);
    expect(getMapPosition(record as ReturnType<typeof restaurant>)).toBeNull();
  });
  it("respects explicit unknown systems and bounds, and does not silently ignore invalid context", () => {
    const record = restaurant({ lat: 22.3, lon: 114.1 });
    expect(getMapPosition(record, { coordinateSystem: "unknown" })).toBeNull();
    expect(getMapPosition(record, { bounds: [22, 114, 23, 115] })).toEqual([22.3, 114.1]);
    expect(getMapPosition(record, { bounds: [30, 120, 32, 122] })).toBeNull();
    expect(getMapPosition(record, { bounds: [23, 115, 22, 114] })).toBeNull();
    expect(getMapPosition(record, { bounds: [NaN, 114, 23, 115] })).toBeNull();
    expect(validateDataset([record], { ...context, spatial: { coordinateSystem: "unknown" } }, "f.json").diagnostics[0]?.severity).toBe("warning");
    expect(validateDataset([record], { ...context, spatial: { bounds: [30, 120, 32, 122] } }, "f.json").diagnostics[0]?.severity).toBe("error");
    expect(validateDataset([{ ...record, geocode_success: false }], { ...context, spatial: { bounds: [30, 120, 32, 122] } }, "f.json").diagnostics[0]?.severity).toBe("warning");
  });
  it("warns about duplicates without deleting or blocking either restaurant", () => {
    const result = validateDataset([restaurant({ lat: 22.3, lon: 114.1 }), restaurant({ id: 2, lat: 22.3, lon: 114.1 })], context, "f.json");
    expect(result.records).toHaveLength(2); expect(result.counts.locatable).toBe(2);
    expect(result.diagnostics).toEqual([expect.objectContaining({ severity: "warning", code: "DUPLICATE_COORDINATES", record_id: 2 })]);
  });
});

describe("cuisine and price (P02-R3/R5)", () => {
  it("keeps explicit OTHER separate from missing and unmapped labels", () => {
    expect(deriveCuisine("粵菜", taxonomy, mappings).reason).toBe("mapped");
    expect(deriveCuisine("街頭小吃", taxonomy, mappings).reason).toBe("explicit-other");
    expect(deriveCuisine(null, taxonomy, mappings).reason).toBe("missing");
    expect(deriveCuisine(" ", taxonomy, mappings).reason).toBe("missing");
    expect(deriveCuisine("粵菜, 新菜系", taxonomy, mappings)).toEqual({ groupKey: "OTHER", reason: "unmapped" });
    const result = validateDataset([restaurant({ cuisine: "街頭小吃" }), restaurant({ id: 2, cuisine: "新菜系" })], context, "f.json");
    expect(result.diagnostics).toEqual([expect.objectContaining({ code: "UNMAPPED_CUISINE", severity: "warning", raw: "新菜系" })]);
    expect(result.counts).toMatchObject({ explicit_other: 1, unmapped: 1 });
  });
  it("rejects duplicate rules, unknown targets, wrong cities and stale derived values", () => {
    for (const bad of [
      { ...mappings, mappings: [...mappings.mappings, mappings.mappings[0]] },
      { ...mappings, city: "different-city" },
      { ...mappings, mappings: [{ raw: "粵菜", groupKey: "ABSENT" }] },
      { ...mappings, mappings: { 粵菜: "CANTONESE" } },
    ]) expect(taxonomyBundleSchema.safeParse({ taxonomy, mappings: bad }).success).toBe(false);
    expect(taxonomyBundleSchema.safeParse({ taxonomy: { ...taxonomy, groups: [...taxonomy.groups, taxonomy.groups[0]] }, mappings }).success).toBe(false);
    const diagnostics = validateDataset([restaurant({ cuisine: "粵菜" })], context, "f.json").diagnostics;
    expect(diagnostics[0]).toMatchObject({ code: "CUISINE_GROUP_MISMATCH", raw: "粵菜", actual: "OTHER", expected: "CANTONESE" });
  });
  it.each(["約 200–400", "約 700 以上", "约 150"])("preserves price text %s and known currencies", (price) => {
    for (const currency of ["CNY", "HKD", "MOP", "JPY"] as const) {
      const record = restaurant({ price, currency });
      expect(parseRestaurantArray([record])[0]?.price).toBe(price);
      expect(displayPrice(record)).toBe(`${currency} ${price}`);
    }
    expect(displayPrice(restaurant({ price }))).toBe(price);
  });
  it("uses only available price/name content", () => {
    const japanese = restaurant({ name: "日本語の店名", name_en: "Official English Name", price: "12,000–18,000（税・サービス料込）", currency: "JPY" });
    expect(parseRestaurantArray([japanese])[0]).toEqual(japanese);
    expect(displayPrice(japanese)).toBe("JPY 12,000–18,000（税・サービス料込）");
    expect(searchNames(japanese)).toEqual(["日本語の店名", "Official English Name"]);
    expect(displayPrice(restaurant({ currency: "MOP", price: null, price_range: "$$" }))).toBe("价格等级 $$");
    expect(displayPrice(restaurant({ price: " ", price_range: "" }))).toBeNull();
    expect(displayName(restaurant({ name_zh: " ", name_en: null }))).toBe("测试餐厅");
    expect(searchNames(restaurant({ name_en: null }))).toEqual(["测试餐厅"]);
  });
  it("reports wrong edition with file/record/field diagnostics", () => {
    expect(validateDataset([restaurant({ edition_year: 2027 })], context, "f.json").diagnostics[0]).toMatchObject({ severity: "error", code: "DATASET_MISMATCH", file: "f.json", record_id: 1, field: "/0/edition_year" });
  });
});
