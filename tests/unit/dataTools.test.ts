import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync, readdirSync, existsSync, linkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fixtureCatalog } from "../fixtures/catalog";
import { cities } from "@/config/cities";
import { mappings, restaurant, taxonomy } from "./dataFixtures";

const temporary: string[] = [];
afterEach(() => temporary.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true })));
function directory(): string { const dir = mkdtempSync(join(tmpdir(), "foodie-data-")); temporary.push(dir); return dir; }
function writeJson(file: string, value: unknown) { mkdirSync(resolve(file, ".."), { recursive: true }); writeFileSync(file, JSON.stringify(value)); }

function boardingFixture(records: unknown = [{ id: 1, name: "raw", cuisine: "粵菜", dining_category: "seafood", price_range: " ￥￥￥ ", price: " 150–250 ", currency: "JPY", serving_form: "meal", venue_type: "street_food", avg_price_hkd: "約 200–400", source: { notes: ["keep", { number: 123 }] } }]) {
  const dir = directory();
  const files = { input: join(dir, "input.json"), output: join(dir, "output.json"), taxonomy: join(dir, "taxonomy.json"), mappings: join(dir, "mappings.json") };
  writeJson(files.input, records); writeJson(files.taxonomy, taxonomy); writeJson(files.mappings, mappings); writeFileSync(files.output, "existing output\n");
  const run = (...extra: string[]) => spawnSync("python3", ["-B", resolve("skills/cuisine-boarding/board.py"), ...Object.entries(files).flatMap(([key, value]) => [`--${key}`, value]), ...extra], { encoding: "utf8", env: { ...process.env, FOODIE_NODE: process.execPath } });
  return { dir, files, run };
}

describe("boarding file boundary (P02-R2)", () => {
  it("preserves all source fields except cuisine_group and is repeatable", () => {
    const { files, run } = boardingFixture();
    const before = readFileSync(files.input, "utf8");
    expect(run().status).toBe(0);
    expect(JSON.parse(readFileSync(files.output, "utf8"))).toEqual([{ ...JSON.parse(before)[0], cuisine_group: "CANTONESE" }]);
    expect(readFileSync(files.input, "utf8")).toBe(before);
    const output = readFileSync(files.output, "utf8"); expect(run().status).toBe(0); expect(readFileSync(files.output, "utf8")).toBe(output);
  });
  it("writes no files or directories during dry-run", () => {
    const { dir, files, run } = boardingFixture();
    const before = Object.fromEntries(readdirSync(dir).map((name) => [name, readFileSync(join(dir, name), "utf8")]));
    expect(run("--dry-run").status).toBe(0);
    expect(Object.fromEntries(readdirSync(dir).map((name) => [name, readFileSync(join(dir, name), "utf8")]))).toEqual(before);
    expect(run("--output", join(dir, "missing/output.json"), "--dry-run").status).toBe(0);
    expect(existsSync(join(dir, "missing"))).toBe(false);
    expect(readFileSync(files.output, "utf8")).toBe("existing output\n");
  });
  it("writes OTHER for unmapped or absent cuisine, separately from explicit OTHER", () => {
    const { files, run } = boardingFixture([{ id: 1, name: "unmapped", cuisine: "粵菜, new" }, { id: 2, name: "missing" }, { id: 3, name: "explicit", cuisine: "街頭小吃" }]);
    const result = run(); expect(result.status).toBe(0);
    expect(result.stderr).toContain('"code": "UNMAPPED_CUISINE"');
    expect(result.stderr).toContain('"explicit-other": 1'); expect(result.stderr).toContain('"missing": 1');
    expect(JSON.parse(readFileSync(files.output, "utf8")).map((record: { cuisine_group: string }) => record.cuisine_group)).toEqual(["OTHER", "OTHER", "OTHER"]);
  });
  it.each(["object-mapping", "target", "duplicate-rule", "duplicate-id", "bad-json", "bad-cuisine"])("fails safely for %s", (failure) => {
    const { files, run } = boardingFixture();
    if (failure === "object-mapping") writeJson(files.mappings, { ...mappings, mappings: { 粵菜: "CANTONESE" } });
    if (failure === "target") writeJson(files.mappings, { ...mappings, mappings: [{ raw: "粵菜", groupKey: "ABSENT" }] });
    if (failure === "duplicate-rule") writeJson(files.mappings, { ...mappings, mappings: [...mappings.mappings, mappings.mappings[0]] });
    if (failure === "duplicate-id") writeJson(files.input, [{ id: 1, name: "one" }, { id: 1, name: "two" }]);
    if (failure === "bad-json") writeFileSync(files.input, "[");
    if (failure === "bad-cuisine") writeJson(files.input, [{ id: 1, name: "one", cuisine: [] }]);
    const before = readFileSync(files.input, "utf8");
    expect(run().status).toBe(1); expect(readFileSync(files.output, "utf8")).toBe("existing output\n"); expect(readFileSync(files.input, "utf8")).toBe(before);
  });
  it("rejects same-path and hardlink output and cleans up after replacement failure", () => {
    const { dir, files, run } = boardingFixture();
    const before = readFileSync(files.input, "utf8");
    expect(run("--output", files.input).status).toBe(1);
    const hardlink = join(dir, "hardlink.json"); linkSync(files.input, hardlink);
    expect(run("--output", hardlink).status).toBe(1);
    rmSync(files.output); mkdirSync(files.output); writeFileSync(join(files.output, "sentinel"), "keep");
    expect(run().status).toBe(2); expect(readFileSync(join(files.output, "sentinel"), "utf8")).toBe("keep");
    expect(readFileSync(files.input, "utf8")).toBe(before); expect(readdirSync(dir).some((file) => file.endsWith(".tmp"))).toBe(false);
  });
  it("distinguishes an unavailable Node runtime from invalid source data", () => {
    const { files } = boardingFixture();
    const result = spawnSync("python3", ["-B", resolve("skills/cuisine-boarding/board.py"), ...Object.entries(files).flatMap(([key, value]) => [`--${key}`, value])], {
      encoding: "utf8", env: { ...process.env, FOODIE_NODE: "python3" },
    });
    expect(result.status).toBe(2);
    expect(readFileSync(files.output, "utf8")).toBe("existing output\n");
  });
});

function validationFixture() {
  const root = directory();
  writeJson(join(root, "catalog.json"), fixtureCatalog(cities.map((city) => ({ ...city, guides: city.guides.map(({ id, label, labelZh, year, dataPath }) => ({ id, label, labelZh, year, dataPath })) }))));
  for (const city of cities) {
    writeJson(join(root, "taxonomy", `${city.id}.json`), { ...taxonomy, city: city.id });
    writeJson(join(root, "taxonomy", `${city.id}-mappings.json`), { ...mappings, city: city.id });
    for (const guide of city.guides) writeJson(join(root, guide.dataPath.replace(/^\/data\//u, "")), []);
  }
  const file = join(root, "hong-kong/2026/michelin-bib-gourmand.json");
  const row = restaurant({ city: "hong-kong" }); writeJson(file, [row]);
  const run = () => spawnSync(process.execPath, [resolve("scripts/data-contract.ts"), "--root", root, "--json"], { encoding: "utf8" });
  return { root, file, row, run };
}

describe("validation command (P02-R6)", () => {
  it("uses the existing registry for empty and partial arrays and is read-only/repeatable", () => {
    const { file, run } = validationFixture();
    const before = readFileSync(file, "utf8"); const first = run(); const second = run();
    expect(first.status).toBe(0); expect(second.status).toBe(0); expect(first.stdout).toBe(second.stdout); expect(readFileSync(file, "utf8")).toBe(before);
    expect(JSON.parse(first.stdout).datasets).toHaveLength(cities.flatMap((city) => city.guides).length);
  });
  it.each(["json", "payload", "duplicate", "group", "position", "field", "serving-form", "dining-category", "missing-file", "unregistered", "mapping"])("returns failure and useful diagnostics for %s", (failure) => {
    const { root, file, row, run } = validationFixture();
    if (failure === "json") writeFileSync(file, "[");
    if (failure === "payload") writeJson(file, {});
    if (failure === "duplicate") writeJson(file, [row, row]);
    if (failure === "group") writeJson(file, [{ ...row, cuisine_group: "ABSENT" }]);
    if (failure === "position") writeJson(file, [{ ...row, lat: 0, lon: 0, geocode_success: true }]);
    if (failure === "dining-category") writeJson(file, [{ ...row, dining_category: "sweet" }]);
    if (failure === "serving-form") writeJson(file, [{ ...row, serving_form: "unknown" }]);
    if (failure === "field") writeJson(file, [{ ...row, is_new: "yes" }]);
    if (failure === "missing-file") rmSync(file);
    if (failure === "unregistered") writeJson(join(root, "hong-kong/unregistered.json"), []);
    if (failure === "mapping") writeJson(join(root, "taxonomy/hong-kong-mappings.json"), { ...mappings, city: "hong-kong", mappings: [{ raw: "粵菜", groupKey: "ABSENT" }] });
    const result = run(); expect(result.status).toBe(1);
    const errors = JSON.parse(result.stdout).diagnostics.filter((item: { severity: string }) => item.severity === "error");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatchObject({ file: expect.stringContaining(root), field: expect.any(String), reason: expect.any(String) });
    if (failure === "mapping") expect(errors[0].field).toBe("/mappings/0/groupKey");
  });
  it("allows an unmapped fallback without changing the file", () => {
    const { file, row, run } = validationFixture(); writeJson(file, [{ ...row, cuisine: "new label" }]);
    const before = readFileSync(file, "utf8"); const result = run();
    expect(result.status).toBe(0); expect(result.stdout).toContain("UNMAPPED_CUISINE"); expect(readFileSync(file, "utf8")).toBe(before);
  });
});
