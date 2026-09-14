import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fixtureCatalog } from "../fixtures/catalog";
import { cities } from "@/config/cities";
import { migrateMappings, migratePrice, migrateRecord, reconcileRecords } from "../../scripts/migrate-guide-data.ts";
import { restaurant, mappings, taxonomy } from "./dataFixtures";

describe("bounded migration (P02-R5/R7)", () => {
  it("preserves price text, known currency, and every unrelated fact", () => {
    const before = restaurant({ avg_price_hkd: "約 200–400", cuisine: "粵菜", lat: 22.3, lon: 114.1, geocode_success: true, status: "active", source: { notes: ["keep"] } });
    const after = migrateRecord(before, taxonomy, mappings);
    expect(after).toEqual({ ...Object.fromEntries(Object.entries(before).filter(([key]) => key !== "avg_price_hkd")), cuisine_group: "CANTONESE", price: "約 200–400", currency: "HKD" });
    expect(before.avg_price_hkd).toBe("約 200–400");
    expect(after).not.toHaveProperty("provenance"); expect(after).not.toHaveProperty("coordinate_system");
  });
  it("preserves empty prices and local currencies without computing amounts", () => {
    expect(migratePrice({ avg_price_cny: "", price_range: "¥¥" })).toEqual({ price: null, currency: "CNY", price_range: "¥¥" });
    expect(migratePrice({ avg_price: null, currency: "MOP", price_range: "$$" })).toEqual({ price: null, currency: "MOP", price_range: "$$" });
    expect(migratePrice({ price_range: "$$$" })).toEqual({ price_range: "$$$" });
    expect(migratePrice({ avg_price: 0 })).toEqual({ price: "0" });
    expect(migratePrice({ avg_price: "約 700 以上" })).toEqual({ price: "約 700 以上" });
  });
  it.each([
    { avg_price_hkd: "200", currency: "CNY" },
    { avg_price_hkd: "200", avg_price: 250 },
    { avg_price_hkd: null, avg_price_cny: null },
    { avg_price_cny: {}, currency: "CNY" },
    { avg_price: 200, price: "300" },
  ])("rejects ambiguous prices without choosing a value: %j", (before) => {
    const copy = structuredClone(before);
    expect(() => migratePrice(before)).toThrow(); expect(before).toEqual(copy);
  });
  it("changes only zero placeholders and preserves false candidate positions and operating state", () => {
    const zero = restaurant({ lat: 0, lon: 0, geocode_success: false, status: "closed" });
    expect(migrateRecord(zero, taxonomy, mappings)).toEqual({ ...zero, lat: null, lon: null });
    const candidate = restaurant({ lat: 22.3, lon: 114.1, geocode_success: false });
    expect(migrateRecord(candidate, taxonomy, mappings)).toEqual(candidate);
  });
  it("normalizes mapping format without inventing sources and corrects seafood semantics", () => {
    expect(migrateMappings({ version: 1, city: "shanghai", mappings: { 宁波菜: "NINGBO" } })).toEqual({ version: 1, city: "shanghai", mappings: [{ raw: "宁波菜", groupKey: "NINGBO" }] });
    expect(migrateMappings({ version: 1, city: "hong-kong", mappings: [{ raw: "", groupKey: "OTHER" }, { raw: "海鮮", groupKey: "WESTERN_OTHER", sources: ["starred"] }] })).toEqual({ version: 1, city: "hong-kong", mappings: [{ raw: "海鮮", groupKey: "OTHER", sources: ["starred"] }] });
  });
  it("detects same-count replacement and unrelated field edits instead of trusting record counts", () => {
    const before = [restaurant(), restaurant({ id: 2, name: "B", guide_url: "https://guide.michelin.com/en/restaurant/b" })];
    expect(reconcileRecords(before, [...before].reverse())).toEqual({ added: [], removed: [], changes: [] });
    expect(reconcileRecords(before, [before[0]!, restaurant({ id: 3, name: "C" })])).toMatchObject({ added: [3], removed: [2] });
    const change = reconcileRecords(before, [before[0]!, { ...before[1]!, geocode_success: false, guide_url: null }]);
    expect(change.changes.map((item) => item.field)).toEqual(["geocode_success", "guide_url"]);
    expect(() => reconcileRecords(before, [before[0]!, before[0]!])).toThrow(/Duplicate/);
  });
});

describe("migration command preparation", () => {
  const directories: string[] = [];
  afterEach(() => directories.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));
  it("is dry-run by default and validates every dataset before writing", () => {
    const root = mkdtempSync(join(tmpdir(), "foodie-migrate-")); directories.push(root);
    const files: string[] = [];
    function put(relative: string, value: unknown) {
      const file = join(root, relative); mkdirSync(resolve(file, ".."), { recursive: true }); writeFileSync(file, JSON.stringify(value)); files.push(file); return file;
    }
    put("catalog.json", fixtureCatalog(cities));
    for (const city of cities) {
      put(`taxonomy/${city.id}.json`, { ...taxonomy, city: city.id });
      put(`taxonomy/${city.id}-mappings.json`, { ...mappings, city: city.id });
      for (const guide of city.guides) put(guide.dataPath.replace(/^\/data\//u, ""), []);
    }
    const first = join(root, "hong-kong/2026/michelin-bib-gourmand.json");
    writeFileSync(first, JSON.stringify([restaurant({ city: "hong-kong", avg_price_hkd: "約 200–400" })]));
    const snapshot = () => Object.fromEntries(files.map((file) => [file, readFileSync(file, "utf8")]));
    const run = (...args: string[]) => spawnSync(process.execPath, [resolve("scripts/migrate-guide-data.ts"), "--root", root, ...args], { encoding: "utf8" });
    const before = snapshot(); expect(run().status).toBe(0); expect(snapshot()).toEqual(before);
    const last = join(root, "macau/2026/michelin-starred.json"); writeFileSync(last, JSON.stringify([{ id: "broken" }]));
    const invalid = snapshot(); expect(run("--write").status).toBe(1); expect(snapshot()).toEqual(invalid);
    writeFileSync(last, "[]"); expect(run("--write").status).toBe(0);
    expect(JSON.parse(readFileSync(first, "utf8"))[0]).toMatchObject({ price: "約 200–400", currency: "HKD" });
  });
});
