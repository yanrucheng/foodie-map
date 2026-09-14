import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { catalogCities } from "@/data/catalog";
import { parseRestaurantArray } from "@/data/contract";
import { listingIdentity, reconciliationSchema, reconcileEditions } from "@/data/reconciliation";
import { validateCatalogRoot } from "../../scripts/catalog";
import { p03Fixture, oldPath, nextPath, url } from "../fixtures/p03Catalog";

const temporary: string[] = [];
afterEach(() => temporary.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));
function setup() {
  const root = mkdtempSync(join(tmpdir(), "foodie-p03-test-")); temporary.push(root);
  const fixture = p03Fixture();
  const file = (ref: string) => join(root, ref.replace(/^\/data\//u, ""));
  const put = (ref: string, value: unknown) => { mkdirSync(dirname(file(ref)), { recursive: true }); writeFileSync(file(ref), JSON.stringify(value)); };
  for (const [ref, data] of Object.entries(fixture.payloads)) put(ref, data);
  put("/data/catalog.json", fixture.catalog);
  return { root, fixture, file, put, validate: () => validateCatalogRoot(root) };
}

describe("P03 raw catalog and evidence", () => {
  it("discovers custom references, both years, partial, unknown empty, verified empty and uncollected separately", () => {
    const { fixture, validate } = setup(); const result = validate();
    expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    expect(result.datasets.map((d) => [d.identity, d.counts?.listed ?? null, d.counts?.locatable ?? null, d.coverage?.complete ?? null])).toEqual([
      ["harbor-fixture/2026/michelin-starred", 3, 2, true], ["harbor-fixture/2027/michelin-starred", 2, 2, false],
      ["harbor-fixture/2027/michelin-bib-gourmand", 0, 0, null], ["empty-fixture/2027/michelin-starred", 0, 0, true], ["empty-fixture/2027/michelin-bib-gourmand", null, null, null],
    ]);
    expect(catalogCities(fixture.catalog)[1]!.guides).toHaveLength(1);
  });
  it.each(["missing-catalog", "bad-json", "duplicate-city", "duplicate-dataset", "wrong-year", "missing-published", "bad-reference", "bad-mapping", "missing-evidence", "composite-scope", "not-collected-file"])("rejects %s at actual catalog/file boundary", (failure) => {
    const { fixture, file, put, validate } = setup(); const c = fixture.catalog;
    if (failure === "missing-catalog") rmSync(file("/data/catalog.json"));
    if (failure === "bad-json") writeFileSync(file("/data/catalog.json"), "{");
    if (failure === "duplicate-city") c.cities.push(c.cities[0]!);
    if (failure === "duplicate-dataset") c.cities[0]!.guides.push(c.cities[0]!.guides[0]!);
    if (failure === "wrong-year") put(oldPath, parseRestaurantArray(fixture.payloads[oldPath]).map((row, i) => i === 1 ? { ...row, edition_year: 2027 } : row));
    if (failure === "missing-published") rmSync(file(oldPath));
    if (failure === "bad-reference") c.cities[0]!.taxonomyPath = "/data/../../outside.json";
    if (failure === "bad-mapping") put(c.cities[0]!.mappingsPath, { version: 1, city: "wrong-city", mappings: [] });
    if (failure === "missing-evidence") rmSync(file("/data/evidence/annual-source.json"));
    if (failure === "composite-scope") c.cities[0]!.scope.members.push("unverified-member");
    if (failure === "not-collected-file") put("/data/empty-fixture/2027/michelin-bib-gourmand.json", []);
    if (!["missing-catalog", "bad-json"].includes(failure)) put("/data/catalog.json", c);
    const result = validate(); expect(result.valid).toBe(false); expect(result.diagnostics.some((d) => d.severity === "error" && !!d.file && !!d.field)).toBe(true);
  });
  it("same count A/B/D is not official A/B/C, even with valid record fields", () => {
    const { fixture, put, validate } = setup(); const rows = parseRestaurantArray(fixture.payloads[oldPath]); rows[2]!.guide_url = url("d"); put(oldPath, rows);
    const result = validate(); expect(result.valid).toBe(false);
    expect(result.datasets[0]!.coverage).toMatchObject({ complete: false, missing: [listingIdentity(url("c"))], extra: [listingIdentity(url("d"))] });
  });
  it("a new year revision never mutates the old file; restoring the new year restores all inputs", () => {
    const { fixture, put, file, validate } = setup(); const before = readFileSync(file(oldPath), "utf8"), inputs = validate().inputs;
    put(nextPath, parseRestaurantArray(fixture.payloads[nextPath]).map((row) => ({ ...row, name: row.name + " revision" })));
    expect(readFileSync(file(oldPath), "utf8")).toBe(before); expect(validate().valid).toBe(true);
    put(nextPath, fixture.payloads[nextPath]); expect(validate().inputs).toEqual(inputs);
  });
  it("read-only CLI fails on missing raw catalog and coverage detects byte drift with unchanged counts", () => {
    const { root, put, fixture } = setup(); const document = join(root, "coverage.md");
    writeFileSync(document, "<!-- COVERAGE_TABLE_START -->\n<!-- COVERAGE_TABLE_END -->\n");
    const run = (...args: string[]) => spawnSync("python3", [resolve("scripts/render-coverage-table.py"), "--root", root, "--document", document, ...args], { encoding: "utf8", env: { ...process.env, FOODIE_NODE: process.execPath } });
    expect(run("--check").status).toBe(1); expect(run().status).toBe(0); const before = readFileSync(document, "utf8"); expect(run("--check").status).toBe(0);
    put(nextPath, parseRestaurantArray(fixture.payloads[nextPath]).map((row) => ({ ...row, name: row.name + " changed" })));
    expect(run("--check").status).toBe(1); expect(readFileSync(document, "utf8")).toBe(before); expect(run().status).toBe(0); expect(run("--check").status).toBe(0);
    fixture.catalog.cities[0]!.labelZh += "登记变动"; put("/data/catalog.json", fixture.catalog); expect(run("--check").status).toBe(1);
    put("/data/catalog.json", {});
    const invalid = spawnSync(process.execPath, [resolve("scripts/data-contract.ts"), "--root", root, "--json"], { encoding: "utf8" });
    expect(invalid.status).toBe(1); expect(JSON.parse(invalid.stdout).diagnostics[0].file).toContain("catalog.json");
  });
});

it("P03 annual diff ignores numeric IDs, explains aliases/name/rating/status and separates capture gaps from exits", () => {
  const { payloads } = p03Fixture();
  const before = parseRestaurantArray(payloads[oldPath]), after = parseRestaurantArray(payloads[nextPath]);
  const evidence = reconciliationSchema.parse(payloads["/data/evidence/harbor-fixture-2027.json"]);
  const diff = reconcileEditions(before, after, evidence);
  expect(diff.rows.find((row) => row.beforeIds.includes(1))).toMatchObject({ afterIds: [30], membership: "retained", changes: { name: { after: "甲店新名" }, star_rating: { after: 2 }, status: { after: "closed" } } });
  expect(diff.rows.find((row) => row.beforeIds.includes(2))?.membership).toBe("capture-gap");
  expect(diff.rows.find((row) => row.beforeIds.includes(3))?.membership).toBe("annual-exit");
  expect(diff.rows.find((row) => row.afterIds.includes(10))?.beforeIds).toEqual([]);
  expect(reconcileEditions(before, after).rows.find((row) => row.beforeIds.includes(3))?.membership).toBe("pending-missing-capture-or-exit");
  expect(reconcileEditions(before, before.map((row) => ({ ...row, id: row.id + 100 }))).rows.every((row) => row.membership === "retained")).toBe(true);
  expect(reconcileEditions(before, [{ ...after[0]!, guide_url: null }, after[0]!, { ...after[0]!, id: 99 }]).rows.map((row) => row.membership)).toContain("pending-identity-ambiguity");
});

it("official stable IDs and locale aliases retain identity; ambiguous alias collapse is rejected", () => {
  const { payloads } = p03Fixture();
  const before = parseRestaurantArray(payloads[oldPath]);
  const after = before.map((row) => ({ ...row, id: row.id + 100, guide_url: row.guide_url!.replace("/en/hk/", "/hk/zh_HK/") + "?view=map#detail" }));
  expect(reconcileEditions(before, after).rows.every((row) => row.membership === "retained")).toBe(true);
  expect(reconciliationSchema.safeParse({ dataset: "fixture", complete: true, sources: ["https://example.test/source"], identities: [url("a"), "michelin:123"], aliases: [{ from: url("a"), to: "michelin:123", reason: "official identity", evidence: "https://example.test/source" }] }).success).toBe(false);
});
