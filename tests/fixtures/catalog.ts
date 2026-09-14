import type { CityConfig } from "../../src/config/cities.ts";
import { catalogSchema } from "../../src/data/catalog.ts";

/** Synthetic evidence only. No entry created here is a real Michelin claim. */
export function fixtureCatalog(cities: CityConfig[]) {
  return catalogSchema.parse({ version: 1, cities: cities.map((city) => ({ ...city,
    taxonomyPath: city.taxonomyPath ?? `/data/taxonomy/${city.id}.json`,
    mappingsPath: city.mappingsPath ?? `/data/taxonomy/${city.id}-mappings.json`,
    spatialContext: city.spatialContext ?? { coordinateSystem: "WGS84" },
    scope: city.scope ?? { description: "Isolated synthetic city; not official coverage", members: [city.id] },
    guides: city.guides.map((guide) => ({ ...guide,
      coverage: guide.coverage ?? { status: "partial", note: "Synthetic partial capture", verifiedMembers: [], officialCount: null, reconciliationPath: null },
      provenance: guide.provenance ?? { collectedAt: null, verifiedAt: null,
        sources: [{ kind: "gap", ref: "https://example.test/synthetic-evidence", note: "Synthetic fixture only" }],
        revision: { id: "fixture-A", reason: "Isolated rehearsal", evidence: "https://example.test/synthetic-evidence" } },
    })),
  })) });
}
