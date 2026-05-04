---
id: prd-260504-cuisine-taxonomy
title: "Foodie Map — Unified Cuisine Taxonomy Schema"
status: draft
created: 2026-05-04
updated: 2026-05-04
author: chengyanru
tags: [schema, cuisine, taxonomy, data-pipeline, filter, multi-guide]
parent: prd-foodie-map-frontend
---

# Foodie Map — Unified Cuisine Taxonomy Schema

## Context / Problem

The foodie-map application currently hard-codes 8 cuisine meta-groups in `cuisineGroups.ts`. These groups only match the bib-gourmand dataset. When the user switches to the Michelin Starred guide, the starred data carries raw cuisine labels (e.g., "粤菜", "时尚法国菜") that have **zero overlap** with the static registry — resulting in all markers being filtered out and the map showing nothing.

The root cause is a **schema design gap**: there is no authoritative, centrally managed cuisine taxonomy that all guides must conform to. Each data source currently invents its own `cuisine_group` values, and the frontend has no contract to enforce.

This PRD defines a unified cuisine taxonomy system that prevents this class of bug permanently, regardless of how many guides, cities, or years are added in the future.

## Product Goal

| Priority | Goal |
|----------|------|
| P0 | Define a **canonical enum** of cuisine groups that all guide datasets must use in the `cuisine_group` field |
| P0 | Every restaurant record across all guides resolves to exactly one canonical group — no unknown/unmapped values reach the frontend |
| P0 | The filter panel, marker styling, and legend derive their options from this single canonical registry |
| P1 | Raw cuisine labels from upstream sources (Michelin, etc.) are preserved in a separate `cuisine` field; grouping is a deterministic mapping applied at data-generation time |
| P1 | Adding a new guide type (e.g., Michelin Plate, Asia's 50 Best) requires only extending the mapping rules — no frontend code changes |
| P2 | Data pipeline validates every record against the enum at build time; invalid `cuisine_group` values fail the pipeline with a clear error |

## Persona / Target Users

| Persona | Context |
|---------|---------|
| **End user (food explorer)** | Sees a consistent set of cuisine filter chips regardless of which guide is active. Switching guides never produces a blank map. |
| **Data maintainer** | Adds a new guide by writing a mapping from that guide's raw cuisine labels to the canonical enum. The pipeline and frontend handle the rest. |
| **Frontend developer** | Consumes a single typed enum; never has to hard-code guide-specific group lists. |

## Non-Goals

- This PRD does **not** define the visual styling (colors, icons) for each group — that remains a frontend config concern.
- This PRD does **not** prescribe how the data scraping/crawling itself works — only the normalization contract after scraping.
- This PRD does **not** cover per-city taxonomy variations (all cities share the same canonical enum for now).
- Multi-language taxonomy (Chinese labels only for v1).
- Auto-detecting cuisine from restaurant descriptions via NLP.

## Scope

| In Scope | Out of Scope |
|----------|-------------|
| Canonical cuisine group enum definition | Scraper/crawler implementation |
| Mapping rules from raw labels to canonical groups | Frontend component refactoring details |
| Validation contract for data pipeline | Visual styling per group |
| Schema for the `cuisine_group` field in restaurant JSON | URL routing / deep-linking |
| Fallback/catch-all group for unmappable labels | Per-city taxonomy (future extension) |
| Per-city taxonomy file structure | Backend/API work (pure frontend project) |

## Assumptions

1. All guide datasets (current and future) describe restaurants that serve a cuisine classifiable into broad categories.
2. The number of canonical groups will stay in the range of 8–15 — manageable for a filter panel UI.
3. Raw cuisine labels from upstream sources are in Chinese (zh-CN). English labels are a future extension.
4. The data-generation pipeline is the single point where raw → canonical mapping happens. The frontend never performs this mapping.
5. A catch-all group ("其他" / "OTHER") is acceptable for edge cases rather than failing silently.

## Terminology

| Term | Definition |
|------|------------|
| **Raw cuisine label** | The original cuisine string from the upstream source (e.g., Michelin website). Stored in the `cuisine` field. Examples: "粤菜", "时尚法国菜", "寿司". |
| **Canonical cuisine group** | A value from the official enum. Stored in the `cuisine_group` field. Examples: `CANTONESE`, `FRENCH`, `JAPANESE`. |
| **Mapping rule** | A deterministic function that takes a raw cuisine label and returns exactly one canonical group. |
| **Catch-all group** | A designated canonical group (`OTHER`) for raw labels that no specific rule matches. |

## Domain Model

```
┌──────────────────────────────────────────────────┐
│ Taxonomy Registry (per city)                     │
├──────────────────────────────────────────────────┤
│ groups: CuisineGroupDef[]                        │
│ mappings: RawCuisine → GroupKey                  │
│ fallbackGroup: GroupKey                          │
└──────────────────────────────────────────────────┘

┌──────────────────────────────┐     ┌────────────────────────────┐
│ CuisineGroupDef              │     │ Restaurant (JSON record)   │
├──────────────────────────────┤     ├────────────────────────────┤
│ key: string (UPPER_SNAKE)    │     │ cuisine: string (raw)      │
│ labelZh: string              │     │ cuisine_group: GroupKey    │
│ labelEn: string              │     │ ...                        │
│ sortOrder: number            │     └────────────────────────────┘
│ color?: string (hex)         │
│ textColor?: string (hex)     │
└──────────────────────────────┘

┌──────────────────────────────┐
│ RawCuisineMapping            │
├──────────────────────────────┤
│ raw: string (exact match)    │
│ groupKey: string             │
│ sources: string[] (optional) │
└──────────────────────────────┘
```

## Expected Behavior

### 1. Canonical Cuisine Group Enum

The system maintains a single, authoritative list of cuisine groups. Each group has:

| Field | Type | Description |
|-------|------|-------------|
| `key` | string (UPPER_SNAKE_CASE) | Machine-readable identifier. Used in code and data files. |
| `labelZh` | string | Chinese display name (used in filter chips, legend). |
| `labelEn` | string | English display name. |
| `sortOrder` | number | Display order in filter panel and legend. |

**Initial enum values:**

| key | labelZh | labelEn | sortOrder |
|-----|---------|---------|-----------|
| `CANTONESE` | 粤菜 · 港式 | Cantonese | 1 |
| `NOODLES_CONGEE` | 面食 · 粥品 | Noodles & Congee | 2 |
| `DIM_SUM` | 点心 · 茶楼 | Dim Sum | 3 |
| `REGIONAL_CHINESE` | 地方菜系 | Regional Chinese | 4 |
| `SOUTHEAST_ASIAN` | 东南亚 · 南亚 | Southeast & South Asian | 5 |
| `JAPANESE` | 日本料理 | Japanese | 6 |
| `KOREAN` | 韩国料理 | Korean | 7 |
| `FRENCH` | 法国菜 | French | 8 |
| `ITALIAN_EUROPEAN` | 意大利 · 欧陆菜 | Italian & European | 9 |
| `WESTERN_OTHER` | 西餐 · 其他 | Western & Other | 10 |
| `INNOVATIVE` | 创新菜 | Innovative | 11 |
| `STEAKHOUSE_GRILL` | 扒房 · 烧烤 | Steakhouse & Grill | 12 |
| `OTHER` | 其他 | Other | 99 |

**Design decisions:**

| Decision | Rationale |
|----------|-----------|
| Separate `CANTONESE` from `REGIONAL_CHINESE` | Cantonese cuisine dominates Hong Kong guides; giving it its own group improves filter utility. |
| Add `INNOVATIVE` and `STEAKHOUSE_GRILL` | These are prominent Michelin Starred categories with no home in the original 8 groups. |
| `KOREAN` split from `JAPANESE` | Starred data has distinct Korean restaurants; lumping them creates a misleading filter label. |
| `OTHER` as explicit catch-all | Every raw label resolves to something. No restaurant is ever "unmapped". |
| UPPER_SNAKE_CASE keys | Machine-friendly, language-neutral, decoupled from display labels. Labels can change without breaking data. |

### 2. Taxonomy Registry File Format

The registry is stored as a JSON file per city:

```jsonc
// taxonomy/hong-kong.json
{
  "version": 1,
  "city": "hong-kong",
  "fallbackGroup": "OTHER",
  "groups": [
    { "key": "CANTONESE", "labelZh": "粤菜 · 港式", "labelEn": "Cantonese", "sortOrder": 1 },
    { "key": "NOODLES_CONGEE", "labelZh": "面食 · 粥品", "labelEn": "Noodles & Congee", "sortOrder": 2 },
    { "key": "DIM_SUM", "labelZh": "点心 · 茶楼", "labelEn": "Dim Sum", "sortOrder": 3 },
    { "key": "REGIONAL_CHINESE", "labelZh": "地方菜系", "labelEn": "Regional Chinese", "sortOrder": 4 },
    { "key": "SOUTHEAST_ASIAN", "labelZh": "东南亚 · 南亚", "labelEn": "Southeast & South Asian", "sortOrder": 5 },
    { "key": "JAPANESE", "labelZh": "日本料理", "labelEn": "Japanese", "sortOrder": 6 },
    { "key": "KOREAN", "labelZh": "韩国料理", "labelEn": "Korean", "sortOrder": 7 },
    { "key": "FRENCH", "labelZh": "法国菜", "labelEn": "French", "sortOrder": 8 },
    { "key": "ITALIAN_EUROPEAN", "labelZh": "意大利 · 欧陆菜", "labelEn": "Italian & European", "sortOrder": 9 },
    { "key": "WESTERN_OTHER", "labelZh": "西餐 · 其他", "labelEn": "Western & Other", "sortOrder": 10 },
    { "key": "INNOVATIVE", "labelZh": "创新菜", "labelEn": "Innovative", "sortOrder": 11 },
    { "key": "STEAKHOUSE_GRILL", "labelZh": "扒房 · 烧烤", "labelEn": "Steakhouse & Grill", "sortOrder": 12 },
    { "key": "OTHER", "labelZh": "其他", "labelEn": "Other", "sortOrder": 99 }
  ]
}
```

### 3. Mapping Rules (Raw → Canonical)

The mapping is a deterministic lookup table maintained alongside the taxonomy. It maps **raw cuisine labels** (as they appear in upstream sources) to canonical group keys.

```jsonc
// taxonomy/hong-kong-mappings.json
{
  "version": 1,
  "city": "hong-kong",
  "mappings": [
    { "raw": "粤菜", "groupKey": "CANTONESE", "sources": ["bib-gourmand", "starred"] },
    { "raw": "烧腊", "groupKey": "CANTONESE", "sources": ["bib-gourmand"] },
    { "raw": "港式小馆", "groupKey": "CANTONESE", "sources": ["bib-gourmand"] },
    { "raw": "面食", "groupKey": "NOODLES_CONGEE", "sources": ["bib-gourmand"] },
    { "raw": "云吞", "groupKey": "NOODLES_CONGEE", "sources": ["bib-gourmand"] },
    { "raw": "车仔面", "groupKey": "NOODLES_CONGEE", "sources": ["bib-gourmand"] },
    { "raw": "粥面", "groupKey": "NOODLES_CONGEE", "sources": ["bib-gourmand"] },
    { "raw": "点心", "groupKey": "DIM_SUM", "sources": ["bib-gourmand", "starred"] },
    { "raw": "茶楼", "groupKey": "DIM_SUM", "sources": ["bib-gourmand"] },
    { "raw": "潮州菜", "groupKey": "REGIONAL_CHINESE", "sources": ["bib-gourmand", "starred"] },
    { "raw": "客家菜", "groupKey": "REGIONAL_CHINESE", "sources": ["bib-gourmand"] },
    { "raw": "顺德菜", "groupKey": "REGIONAL_CHINESE", "sources": ["bib-gourmand"] },
    { "raw": "沪菜", "groupKey": "REGIONAL_CHINESE", "sources": ["starred"] },
    { "raw": "京菜", "groupKey": "REGIONAL_CHINESE", "sources": ["starred"] },
    { "raw": "川菜", "groupKey": "REGIONAL_CHINESE", "sources": ["starred"] },
    { "raw": "台州菜", "groupKey": "REGIONAL_CHINESE", "sources": ["starred"] },
    { "raw": "宁波菜", "groupKey": "REGIONAL_CHINESE", "sources": ["starred"] },
    { "raw": "印度菜", "groupKey": "SOUTHEAST_ASIAN", "sources": ["bib-gourmand", "starred"] },
    { "raw": "印度菜, 巴基斯坦菜", "groupKey": "SOUTHEAST_ASIAN", "sources": ["starred"] },
    { "raw": "泰国菜", "groupKey": "SOUTHEAST_ASIAN", "sources": ["bib-gourmand"] },
    { "raw": "越南菜", "groupKey": "SOUTHEAST_ASIAN", "sources": ["bib-gourmand"] },
    { "raw": "时尚亚洲菜", "groupKey": "SOUTHEAST_ASIAN", "sources": ["starred"] },
    { "raw": "日本菜", "groupKey": "JAPANESE", "sources": ["bib-gourmand", "starred"] },
    { "raw": "寿司", "groupKey": "JAPANESE", "sources": ["starred"] },
    { "raw": "铁板烧", "groupKey": "JAPANESE", "sources": ["starred"] },
    { "raw": "鸡肉串烧", "groupKey": "JAPANESE", "sources": ["starred"] },
    { "raw": "韩国菜", "groupKey": "KOREAN", "sources": ["starred"] },
    { "raw": "法国菜", "groupKey": "FRENCH", "sources": ["bib-gourmand", "starred"] },
    { "raw": "时尚法国菜", "groupKey": "FRENCH", "sources": ["starred"] },
    { "raw": "意大利菜", "groupKey": "ITALIAN_EUROPEAN", "sources": ["bib-gourmand", "starred"] },
    { "raw": "时尚欧陆菜", "groupKey": "ITALIAN_EUROPEAN", "sources": ["starred"] },
    { "raw": "创新菜", "groupKey": "INNOVATIVE", "sources": ["starred"] },
    { "raw": "扒房", "groupKey": "STEAKHOUSE_GRILL", "sources": ["starred"] },
    { "raw": "海鲜", "groupKey": "OTHER", "sources": ["bib-gourmand"] },
    { "raw": "", "groupKey": "OTHER", "sources": [] }
  ]
}
```

**Behavior:**
- Lookup is exact-match on the raw `cuisine` string.
- Comma-separated multi-cuisine values (e.g., "印度菜, 巴基斯坦菜") are registered as **atomic keys** — the exact string is matched, not split.
- If no exact match exists, split by `, ` (comma-space) and resolve the **first** token.
- Empty string → fallback group (`OTHER`).
- Unknown value (not in mappings) → fallback group + emit a warning during data generation.
- `sources[]` tracks which guides use this mapping (optional metadata for maintainability).

**Edge cases:**

| Scenario | Behavior |
|----------|----------|
| Raw label has comma-separated values (e.g., "印度菜, 巴基斯坦菜") | First check for exact match. If none, split by `, ` and map the first token. |
| Raw label is empty or whitespace-only | Maps to `OTHER`. |
| Raw label not found in any mapping rule | Maps to `OTHER`. A warning is logged during data generation. |
| A new raw label appears in a future data refresh | Pipeline logs it as unmapped → maps to `OTHER` → maintainer reviews and adds a rule. |
| A mapped canonical group is later removed from the enum | Not allowed. Enum values are append-only. Deprecated groups are kept but hidden from UI via a `deprecated: true` flag (future extension). |

### 4. Data Contract (Restaurant JSON Schema)

Every restaurant record in every guide JSON file must have:

| Field | Type | Constraint |
|-------|------|-----------|
| `cuisine` | string | Raw label from upstream source. Preserved as-is for reference. |
| `cuisine_group` | string | **Must** be one of the canonical enum `key` values (e.g., `"CANTONESE"`, `"JAPANESE"`). |

**Key rule:** `cuisine_group` is always populated at **data-generation time**, never at runtime. The frontend never performs cuisine → group mapping. It trusts the pre-computed `cuisine_group` field.

### 5. Data Pipeline Validation

At data-generation time, after the raw → canonical mapping is applied:

| Step | Behavior |
|------|----------|
| Read raw `cuisine` from source | Store as-is in `cuisine` field |
| Resolve `cuisine_group` | Lookup raw cuisine in mapping rules → assign group `key` |
| Handle multi-value | Check exact match first; if none, split by `, `, resolve first token |
| Handle empty/null | Assign `fallbackGroup` (`OTHER`) |
| Handle unknown | Assign `fallbackGroup` + log warning with restaurant name & raw value |
| Validate output | Every `cuisine_group` in output JSON MUST exist in the taxonomy `groups[].key` list |
| Block if > 5% fallback | If > 5% of restaurants map to `OTHER`, fail the build (signals mapping gaps) |

**Error handling:**

| Check | On Failure |
|-------|-----------|
| `cuisine_group` value not in canonical enum | **ERROR** — halt generation |
| `cuisine` → `cuisine_group` mapping doesn't match registry | **ERROR** — data inconsistency |
| `cuisine` is empty string | **WARNING** — assign `OTHER`, continue |
| > 5% of records map to `OTHER` | **ERROR** — mapping coverage insufficient |

**Validation summary:**

```
Mapped 77 restaurants: CANTONESE=12, FRENCH=9, JAPANESE=8, ... OTHER=3 (3.9%)
Pipeline validation PASSED
```

### 6. Frontend Consumption

The frontend reads the taxonomy registry and uses `cuisine_group` keys from restaurant data:

| Component | Behavior |
|-----------|----------|
| Filter panel | Reads `groups[]` from taxonomy → renders toggle per group. `sortOrder` drives display order. Only shows groups with ≥1 restaurant in current dataset. |
| Active filter | `activeGroups` is a `Set<GroupKey>`. Filter logic: `activeGroups.has(restaurant.cuisine_group)` |
| Marker styling | Lookup `groups.find(g => g.key === restaurant.cuisine_group)` → apply color/textColor |
| Unknown group at runtime | If a restaurant has a `cuisine_group` not in taxonomy (data error), render with fallback group styling. Never hide. |

### 7. Adding a New Guide (Walkthrough)

**Scenario:** A maintainer adds the "Michelin Plate 2026 Hong Kong" guide.

1. **Scrape** raw data → produces `michelin-plate.json` with raw `cuisine` labels.
2. **Dry-run** pipeline → see which raw labels map to `OTHER`.
3. **Extend mapping table** if needed: add new entries to `hong-kong-mappings.json`.
4. **Optionally extend enum** if a truly new category emerges.
5. **Run pipeline** → validation passes.
6. **Register guide** in `cities.ts` → frontend picks it up. No filter/legend code changes needed.

## Acceptance Criteria

1. **AC-1:** Given the canonical enum is defined with ≥ 13 groups, when the bib-gourmand dataset is processed, then 100% of restaurants have a `cuisine_group` value present in the enum.
2. **AC-2:** Given the canonical enum, when the michelin-starred dataset is processed, then 100% of restaurants have a valid `cuisine_group` (with ≤ 5% mapping to `OTHER`).
3. **AC-3:** Given both datasets are loaded in the frontend, when the user switches between guides, then all restaurants with valid coordinates appear as markers on the map (no zero-marker bug).
4. **AC-4:** Given a new guide JSON is added with a raw cuisine label not in the mapping table, when the pipeline runs, then the unmapped label maps to `OTHER` and a warning is logged naming the unmapped label.
5. **AC-5:** Given a record has `cuisine_group` set to a value **not** in the canonical enum, when the pipeline validation runs, then the build fails with a descriptive error.
6. **AC-6:** Given the filter panel renders, when any guide is active, then the filter chips match the canonical enum labels and the active count per chip is accurate.

## Output & Errors

| Scenario | Output |
|----------|--------|
| All records mapped successfully | Pipeline completes; summary printed with group distribution. |
| Unmapped raw label encountered | Record gets `cuisine_group: "OTHER"`; pipeline prints warning: `WARN: unmapped cuisine "街头小食" for restaurant id=15, defaulting to OTHER`. |
| Invalid `cuisine_group` in output | Pipeline fails: `ERROR: cuisine_group "BAD_VALUE" not in canonical enum for restaurant id=42`. |
| Empty `cuisine` field in source data | `cuisine_group` set to `OTHER`; warning logged. |
| > 5% fallback rate | Pipeline fails: `ERROR: 12% of restaurants mapped to OTHER. Review and extend mapping rules.` |

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Two-layer model (raw cuisine + display group) | Raw labels are source-specific and granular; display groups are curated for UX. Decoupling lets us add guides without touching UX groupings. |
| UPPER_SNAKE_CASE keys | Machine-friendly, language-neutral, decoupled from display labels. Labels can change without breaking data. |
| Mapping lives in per-city JSON files | Single source of truth per city. Consumed by both data pipeline (Python) and frontend (TypeScript). |
| `cuisine_group` is pre-computed in JSON, not resolved at runtime | Frontend stays simple (no mapping logic). Data is self-contained. |
| Dynamic filter derivation from loaded data | Eliminates the root cause — filters never reference a static list that may not match the data. |
| Validation at data-gen time, not runtime | Fail-fast. Bugs are caught before they reach users. |
| Catch-all group is explicit, not silent drop | Zero-marker bugs become impossible. Every restaurant either has a valid group or lands in catch-all. |
| Atomic comma-separated cuisines with first-match fallback | Deterministic. Exact match first preserves compound categories; fallback to first token handles unregistered compounds. |
| `sources[]` tracking in mappings | Auditability — easy to see which guides use which raw labels. |
| 5% threshold for fallback | Prevents silent degradation. If too many restaurants fall into "other", the pipeline forces a review. |

## Future Extensions

- **Per-city taxonomy overrides** — If Tokyo guides need different display groups than Hong Kong, the registry can support city-scoped group definitions.
- **Hierarchical taxonomy** — Two-level grouping (e.g., `ASIAN > JAPANESE > SUSHI`) for advanced filtering.
- **User-facing "Other" drill-down** — Let users see what raw cuisines are inside the `OTHER` bucket.
- **Enum versioning** — If the enum changes between years, a version field allows the pipeline to apply the correct mapping rules per vintage.
- **Internationalization** — `labelZh` and `labelEn` could be extended with more languages.
- **Auto-mapping via LLM** — For new cities, use LLM to bootstrap mapping rules from raw cuisine lists, then human-review.

## Related Documents

- [Eval: 260504-cuisine-group-schema-mismatch](../../eval/sessions/260504-cuisine-group-schema-mismatch/report.md) — Root cause analysis that motivated this PRD.
- Current static config: `src/config/cuisineGroups.ts` (to be replaced)
- City/guide registry: `src/config/cities.ts`
