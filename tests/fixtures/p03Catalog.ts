import { fixtureCatalog } from "./catalog.ts";
import { type Catalog } from "../../src/data/catalog.ts";
import type { Restaurant } from "../../src/data/contract.ts";

export const url = (name: string) => `https://guide.michelin.com/en/hk/fixture/fixture/restaurant/${name}`;
export const oldPath = "/data/harbor-fixture/2026/michelin-starred.json";
export const nextPath = "/data/harbor-fixture/2027/michelin-starred.json";
export function p03Fixture(): { catalog: Catalog; payloads: Record<string, unknown> } {
  const city = "harbor-fixture";
  const guide = (id: string, year: number) => ({ id, year, label: id, labelZh: id === "michelin-starred" ? "米其林星级" : "米其林必比登", dataPath: `/data/${city}/${year}/${id}.json` });
  const catalog = fixtureCatalog([{ id: city, label: "Harbor fixture", labelZh: "港湾测试城", center: [22.302, 114.177], zoom: 11,
    taxonomyPath: "/data/custom/harbor-cuisine.json", mappingsPath: "/data/custom/harbor-rules.json",
    guides: [guide("michelin-starred", 2026), guide("michelin-starred", 2027), guide("michelin-bib-gourmand", 2027)] },
    { id: "empty-fixture", label: "Empty fixture", labelZh: "零收录测试城", center: [22.3, 114.17], zoom: 11,
      guides: [{ ...guide("michelin-starred", 2027), dataPath: "/data/empty-fixture/2027/michelin-starred.json" }] }]);
  const a = catalog.cities[0]!, empty = catalog.cities[1]!;
  const source = "/data/evidence/annual-source.json";
  const payloads: Record<string, unknown> = { [source]: { synthetic: true, note: "Controlled official-list stand-in for deterministic tests only; never production evidence" } };
  for (const city of catalog.cities) {
    payloads[city.taxonomyPath] = { version: 1, city: city.id, fallbackGroup: "OTHER", groups: [{ key: "OTHER", labelZh: "测试菜系", labelEn: "Fixture", sortOrder: 1 }] };
    payloads[city.mappingsPath] = { version: 1, city: city.id, mappings: [] };
    for (const guide of city.guides) {
      payloads[guide.dataPath!] = [];
      guide.provenance.sources = ["edition", "scope", "membership"].map((kind) => ({ kind: kind as "edition" | "scope" | "membership", ref: source, note: "Explicit synthetic annual evidence" }));
      guide.provenance.revision.evidence = source;
    }
  }
  const row = (id: number, name: string, slug: string, year: number, extra = {}): Restaurant => ({ id, name, city, guide_type: "michelin-starred", edition_year: year, cuisine_group: "OTHER", star_rating: 1, guide_url: url(slug), lat: 22.30 + id / 100000, lon: 114.17, ...extra });
  payloads[oldPath] = [row(1, "甲店", "a", 2026), row(2, "同名分店", "b", 2026), row(3, "丙店", "c", 2026, { lat: null, lon: null })];
  payloads[nextPath] = [row(30, "甲店新名", "a-new", 2027, { star_rating: 2, status: "closed" }), row(10, "同名分店", "d", 2027)];
  for (const [city, guide, ids, complete] of [[a, a.guides[0]!, [url("a"), url("b"), url("c")], true], [a, a.guides[1]!, [url("a-new"), url("b"), url("d")], false], [empty, empty.guides[0]!, [], true]] as const) {
    const ref = `/data/evidence/${city.id}-${guide.year}.json`;
    guide.coverage = { status: complete ? "verified" as const : "partial" as const, note: complete ? "Synthetic identities fully reconciled" : "Missing B despite complete official fixture", officialCount: ids.length, verifiedMembers: complete ? [...city.scope.members] : [], reconciliationPath: ref };
    guide.provenance.verifiedAt = complete ? "2026-09-14" : null;
    payloads[ref] = { dataset: `${city.id}/${guide.year}/${guide.id}`, complete: true, sources: [source], identities: ids,
      aliases: guide.year === 2027 && city.id === a.id ? [{ from: url("a"), to: url("a-new"), evidence: source, reason: "Synthetic publisher redirects old listing to renamed restaurant" }] : [] };
  }
  empty.guides.push({ ...empty.guides[0]!, id: "michelin-bib-gourmand", labelZh: "米其林必比登", dataPath: null,
    coverage: { status: "not-collected", note: "Registered but no capture", officialCount: null, verifiedMembers: [], reconciliationPath: null },
    provenance: { ...empty.guides[0]!.provenance, verifiedAt: null } });
  return { catalog, payloads };
}
