import { fixtureCatalog } from "./catalog.ts";
import type { Restaurant } from "../../src/data/contract.ts";

/** Isolated semantics and dense coordinates; no claim about real restaurants. */
export function p08Fixture() {
  const cities = ["visual-fixture", "second-fixture"].map((id, index) => ({
    id, label: id, labelZh: index ? "第二测试城" : "视觉测试城", center: [35.68, 139.76] as [number, number], zoom: index ? 15 : 18,
    basemap: "gsi-standard" as const,
    guides: [2026, 2027].flatMap((year) => (["michelin-bib-gourmand", "michelin-starred"] as const).map((guide) => ({
      id: guide, label: guide, labelZh: guide === "michelin-starred" ? "米其林星级" : "米其林必比登", year, dataPath: `/data/${id}/${year}/${guide}.json`,
    }))),
  }));
  const catalog = fixtureCatalog(cities);
  const payloads: Record<string, unknown> = {};
  for (const [cityIndex, city] of catalog.cities.entries()) {
    const groups = [
      { key: "FERMENTED_GRAINS", labelZh: cityIndex ? "同类异名" : "新发酵品类", labelEn: "Fermented grains", sortOrder: cityIndex ? 3 : 1 },
      { key: "SECOND_CATEGORY", labelZh: "第二品类", labelEn: "Second", sortOrder: 2 },
      { key: "FUTURE_UNUSED", labelZh: "未用类别", labelEn: "Unused", sortOrder: 4 },
      { key: "OTHER", labelZh: "其他", labelEn: "Other", sortOrder: 99 },
    ];
    payloads[city.taxonomyPath] = { version: 1, city: city.id, fallbackGroup: "OTHER", groups: cityIndex ? [...groups].reverse() : groups };
    payloads[city.mappingsPath] = { version: 1, city: city.id, mappings: [
      { raw: "发酵谷物，现代料理", groupKey: "FERMENTED_GRAINS", sources: ["https://example.test/synthetic-menu"] },
      { raw: "第二品类原文", groupKey: "SECOND_CATEGORY" },
    ] };
    for (const guide of city.guides) {
      const overrides: Partial<Restaurant>[] = [
        { name: "餐食测试", serving_form: "meal", venue_type: "street_food", is_new: true },
        { name: "小食测试", serving_form: "snack", venue_type: "restaurant" },
        { name: "甜品测试", serving_form: "dessert" },
        { name: "饮品测试", serving_form: "drink", lat: 35.68001 },
        { name: "未标注测试", venue_type: "dessert" },
        { name: "空值无坐标", serving_form: null, lat: null, lon: null },
        { name: "第二品类餐食", cuisine: "第二品类原文", cuisine_group: "SECOND_CATEGORY", serving_form: "meal" },
      ];
      payloads[guide.dataPath!] = overrides.map((fields, index): Restaurant => ({
        id: index + 1, name: "测试", city: city.id, guide_type: guide.id, edition_year: guide.year,
        cuisine: "发酵谷物，现代料理", cuisine_group: "FERMENTED_GRAINS", primary_area: "测试区域", lat: 35.68, lon: 139.76, ...fields,
        // A separate city keeps individually visible targets during search flights.
        ...(cityIndex && fields.lat !== null ? {
          lat: [35.68, 35.68, 35.683, 35.677, 35.683, 35.68, 35.677][index],
          lon: [139.757, 139.763, 139.757, 139.757, 139.763, 139.76, 139.763][index],
        } : {}),
      }));
    }
  }
  return { catalog, payloads };
}
