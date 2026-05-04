---
id: tech-dev-plan-260504-foodie-map-cuisine-taxonomy-candidate-4
title: "Dev Plan — Unified Cuisine Taxonomy (Candidate 4)"
type: tech-dev-plan
status: draft
created: 2026-05-04
source: docs/prd/prd-260504-cuisine-taxonomy.md
dev-unit-size: 0.5
tags: [cuisine, taxonomy, data-pipeline, skill, filter, multi-guide]
---

# Dev Plan — Unified Cuisine Taxonomy (Candidate 4)

> Dev unit size: 0.5 developer-day

## Architecture Summary

This plan implements the cuisine taxonomy PRD with a **skill-first** strategy: the reusable Python boarding script is built first, then used to produce the corrected data, then the frontend is adapted to consume canonical keys. This ensures the skill is the single source of truth for all data transformations — past and future.

**Key design decisions for this candidate:**

| Decision | Rationale |
|----------|-----------|
| Taxonomy JSON lives in `public/data/taxonomy/` | Co-located with restaurant data; frontend can fetch at runtime if needed, or import at build-time. Single deployment unit. |
| Python boarding script at `skills/cuisine-boarding/` | Self-contained tool. Uses `uv` for deps. Reads taxonomy + raw data → outputs validated JSON. Reusable for any future guide. |
| Frontend reads taxonomy from static import | No runtime fetch. Taxonomy is small (< 2KB). Build-time type safety via generated TypeScript. |
| No backend. No runtime mapping. | PRD contract: `cuisine_group` is pre-computed. Frontend trusts the data. |
| Color/style stays in frontend config | PRD explicitly excludes styling from taxonomy. Styling maps canonical keys → visual props. |

## Current State → Target State

```
CURRENT                              TARGET
─────────────────────────────────    ─────────────────────────────────
cuisineGroups.ts (8 Chinese keys)    taxonomy/hong-kong.json (13 canonical keys)
                                     taxonomy/hong-kong-mappings.json
bib-gourmand: cuisine_group =        bib-gourmand: cuisine_group = "CANTONESE"
  "粤菜 / 烧腊 / 港式小馆"
starred: cuisine_group = cuisine     starred: cuisine_group = "FRENCH"
  (raw, ungrouped)                     (mapped from raw)
No pipeline                          skills/cuisine-boarding/ (Python CLI)
No ./skills/ directory               ./skills/ with reusable boarding tool
```

---

## Phase 1: Foundation — Taxonomy Data + Boarding Skill

| Track | Components | Owner | Deliverables | Dev Units | Depends On |
|-------|-----------|-------|--------------|-----------|------------|
| A — Taxonomy Registry | Data schema | Data | `public/data/taxonomy/hong-kong.json` with 13 canonical groups | 1 | — |
| B — Mapping Rules | Data schema | Data | `public/data/taxonomy/hong-kong-mappings.json` covering all known raw labels from both guides | 1 | — |
| C — Boarding Script | Pipeline tool | Script | `skills/cuisine-boarding/board.py` — Python CLI that reads taxonomy + mappings + raw data → outputs validated restaurant JSON with canonical `cuisine_group` | 1 | — |

**Track A deliverable spec:**
- JSON file matching PRD §2 (Taxonomy Registry File Format)
- 13 groups with `key`, `labelZh`, `labelEn`, `sortOrder`
- `fallbackGroup: "OTHER"`

**Track B deliverable spec:**
- JSON file matching PRD §3 (Mapping Rules)
- Must cover ALL distinct raw `cuisine` values from both current datasets:
  - Bib-gourmand: ~30 unique raw labels
  - Starred: ~23 unique raw labels + empty string
- Include `sources[]` metadata for auditability

**Track C deliverable spec:**
- Single Python script (`board.py`) with CLI interface via `argparse`
- Input: `--taxonomy <path>` `--mappings <path>` `--input <raw-json>` `--output <output-json>`
- Logic: load taxonomy → load mappings → for each restaurant: resolve `cuisine` → set `cuisine_group`
- Validation: every output `cuisine_group` in canonical enum; fallback rate ≤ 5%; emit warnings for unmapped
- Dependencies managed via `skills/cuisine-boarding/pyproject.toml` (minimal: no external deps beyond stdlib)
- Exit code 0 = success, 1 = validation failure

**Gate 1:** Taxonomy + mappings JSON pass schema validation. Boarding script runs on both datasets without error. Coverage: 0 unmapped labels for known data.

---

## Phase 2: Data Transformation (Parallel Tracks)

| Track | Components | Owner | Deliverables | Dev Units | Depends On |
|-------|-----------|-------|--------------|-----------|------------|
| A — Transform Bib-Gourmand | Data | Data | Updated `public/data/hong-kong/michelin-bib-gourmand.json` with canonical `cuisine_group` keys | 1 | Phase 1 Gate |
| B — Transform Starred | Data | Data | Updated `public/data/hong-kong/michelin-starred.json` with canonical `cuisine_group` keys (from raw `cuisine`) | 1 | Phase 1 Gate |

**Track A notes:**
- Bib-gourmand currently has Chinese meta-group labels in `cuisine_group` (e.g., `"粤菜 / 烧腊 / 港式小馆"`)
- Must re-map using the raw `cuisine` field → canonical key via boarding script
- All 70 restaurants must resolve to a canonical group

**Track B notes:**
- Starred currently has `cuisine_group === cuisine` (no grouping applied)
- Must map all 77 restaurants using the raw `cuisine` field
- ~18 records have empty `cuisine` (due to missing detail URLs) → map to `OTHER`
- Compound values (e.g., `"时尚法国菜, 创新菜"`) → exact match first, then first-token fallback

**Gate 2:** Both output JSONs pass validation. Every `cuisine_group` value exists in taxonomy registry. Fallback rate ≤ 5% per dataset. Data files committed.

---

## Phase 3: Frontend Refactor (Parallel Tracks)

| Track | Components | Owner | Deliverables | Dev Units | Depends On |
|-------|-----------|-------|--------------|-----------|------------|
| A — Taxonomy Config Module | `src/config/` | FE | New `src/config/cuisineRegistry.ts` — imports taxonomy JSON, exports typed registry + style map. Replaces `cuisineGroups.ts`. | 1 | Phase 2 Gate |
| B — Filter + Legend | `src/components/`, `src/hooks/` | FE | `useFilters.ts`, `FilterPanel.tsx`, `Legend.tsx` consume canonical registry. Dynamic group list derived from loaded data. | 1 | Track A |
| C — Marker Styling | `src/components/` | FE | `RestaurantMarker.ts` looks up style by canonical key. Fallback to `OTHER` style for unknown keys. | 1 | Track A |

**Track A deliverable spec:**
- Delete `cuisineGroups.ts`
- New `cuisineRegistry.ts`:
  - Imports `public/data/taxonomy/hong-kong.json` (Vite JSON import)
  - Exports `CuisineGroup` type, `cuisineRegistry: CuisineGroup[]`, `cuisineStyleMap: Record<string, {color, textColor}>`
  - Style assignments (hex colors) for each of the 13 canonical keys
  - Typed: `GroupKey` union type from registry keys

**Track B deliverable spec:**
- `useFilters.ts`: `allGroups` derived from loaded restaurant data's distinct `cuisine_group` values (not from static enum). Initial state = all active.
- `FilterPanel.tsx`: Renders group chips from taxonomy registry (filtered to groups present in current dataset). Uses `labelZh` for display. Sorted by `sortOrder`.
- `Legend.tsx`: Same derivation — only shows groups with ≥1 restaurant in active dataset.

**Track C deliverable spec:**
- `RestaurantMarker.ts`: Lookup `cuisineStyleMap[restaurant.cuisine_group]` → apply color. Fallback to `cuisineStyleMap["OTHER"]`.

**Gate 3:** `npm run build` succeeds. No TypeScript errors. Both guides render all restaurants with correct colors on the map. Filter panel shows appropriate groups per guide.

---

## Phase 4: Skill Packaging + Integration Validation

| Track | Components | Owner | Deliverables | Dev Units | Depends On |
|-------|-----------|-------|--------------|-----------|------------|
| A — Skill Documentation | Skill | Ops | `skills/cuisine-boarding/SKILL.md` — usage instructions, input/output contract, example invocations for onboarding a new guide | 1 | Phase 3 Gate |
| B — End-to-End Validation | QA | QA | Manual verification: switch between bib-gourmand and starred guides → all markers visible, filters functional, no blank map | 1 | Phase 3 Gate |

**Track A deliverable spec:**
- `SKILL.md` covers:
  - Purpose: onboard new Michelin guide data into the foodie-map system
  - Prerequisites: Python 3.11+, uv
  - Step-by-step workflow: scrape → dry-run → extend mappings → validate → commit
  - CLI reference for `board.py`
  - How to extend taxonomy (add new group) vs. extend mappings (add new raw label)
  - Validation criteria (5% threshold, enum membership)

**Track B validation criteria:**
- Bib-gourmand: 70 restaurants rendered, filter chips match canonical groups present in data
- Starred: 77 restaurants rendered (including `OTHER` for empty-cuisine records), filter chips match
- Switching guides updates filter panel dynamically
- No console errors related to unknown `cuisine_group`

**Gate 4 (Final):** Skill usable standalone (dry-run with sample data). Both guides fully functional in browser. Git commit with all changes.

---

## Summary Table

| Phase | Tracks | Total Dev Units | Gate Criteria |
|-------|--------|-----------------|---------------|
| Phase 1: Foundation | A: Taxonomy Registry, B: Mappings, C: Boarding Script | 3 | Taxonomy validates; script runs clean on both datasets |
| Phase 2: Data Transform | A: Bib-Gourmand, B: Starred | 2 | Both JSONs pass enum validation; ≤5% fallback |
| Phase 3: Frontend Refactor | A: Config Module, B: Filter+Legend, C: Marker | 3 | `npm run build` clean; both guides render |
| Phase 4: Skill + Validation | A: Skill Docs, B: E2E Check | 2 | Skill standalone; zero-marker bug gone |
| **Total** | | **10** | |

## Dev Unit Metrics

| Metric | Value |
|--------|-------|
| Total dev units | 10 |
| Max parallel tracks | 3 (Phase 1, Phase 3) |
| Phases | 4 |
| Critical path length | 7 dev units (P1C → P2B → P3A → P3B → P4B) |

## Dependency Graph

```mermaid
graph LR
    P1A["P1A: Taxonomy Registry"] --> G1{Phase 1 Gate}
    P1B["P1B: Mapping Rules"] --> G1
    P1C["P1C: Boarding Script"] --> G1
    G1 --> P2A["P2A: Transform Bib"]
    G1 --> P2B["P2B: Transform Starred"]
    P2A --> G2{Phase 2 Gate}
    P2B --> G2
    G2 --> P3A["P3A: Taxonomy Config"]
    P3A --> P3B["P3B: Filter + Legend"]
    P3A --> P3C["P3C: Marker Styling"]
    P3B --> G3{Phase 3 Gate}
    P3C --> G3
    G3 --> P4A["P4A: Skill Docs"]
    G3 --> P4B["P4B: E2E Validation"]
```

**Critical path:** P1C → G1 → P2B → G2 → P3A → P3B → G3 → P4B

## Text Fallback

```
Phase 1 (Foundation)  [3 dev units]
  ├─ Track A: Taxonomy Registry
  ├─ Track B: Mapping Rules
  └─ Track C: Boarding Script
      └─→ Phase 2 (Data Transform)  [2 dev units]
          ├─ Track A: Transform Bib-Gourmand
          └─ Track B: Transform Starred
              └─→ Phase 3 (Frontend Refactor)  [3 dev units]
                  ├─ Track A: Taxonomy Config Module
                  ├─ Track B: Filter + Legend (depends on A)
                  └─ Track C: Marker Styling (depends on A)
                      └─→ Phase 4 (Skill + Validation)  [2 dev units]
                          ├─ Track A: Skill Documentation
                          └─ Track B: E2E Validation
```

## Implementation Wisdom Notes

### Why Skill-First?

Building the boarding script **before** transforming data means:
1. The transformation is reproducible — if source data updates, re-run the same tool
2. The skill is battle-tested on real data before being packaged
3. Future guides (Michelin Plate, Asia's 50 Best) use the exact same flow

### Why Not a Runtime Mapper?

The PRD is explicit: `cuisine_group` is pre-computed. But even beyond PRD compliance:
- Zero runtime cost (no mapping logic in bundle)
- Data is self-describing (open the JSON → see the group)
- Validation happens at build-time, not when users see a broken map

### Frontend Refactor Strategy

The minimal change set:
1. Replace `cuisineGroups.ts` (a 19-line file) with a new registry that maps canonical keys → colors
2. Update 4 consumers (FilterPanel, Legend, useFilters, RestaurantMarker) — all < 100 lines each
3. Dynamic filter derivation = never hard-code group lists again

### Skill Reusability Contract

The `skills/cuisine-boarding/` directory is designed to be self-contained:
```
skills/cuisine-boarding/
├── SKILL.md              # Human/AI readable usage guide
├── board.py              # The pipeline script (stdlib only)
├── pyproject.toml        # uv-compatible project definition
└── tests/
    └── test_board.py     # Smoke test with sample data
```

Any maintainer (or AI agent) can:
1. `cd skills/cuisine-boarding && uv run board.py --help`
2. Follow SKILL.md to onboard new guide data
3. Extend mappings without touching any frontend code

---

## Blockers / Risks

| Risk | Mitigation |
|------|-----------|
| ~18 starred restaurants have empty `cuisine` + missing URLs → permanently `OTHER` | Acceptable per PRD (≤5%). These are placeholder records without Michelin detail pages. |
| Compound cuisine labels (e.g., "时尚法国菜, 创新菜") | PRD defines exact-match-first + first-token fallback. Boarding script implements this. |
| Unknown raw labels in future data refreshes | Script logs warnings + maps to OTHER. SKILL.md documents the review process. |
| Frontend color assignment for new groups | `cuisineRegistry.ts` must assign a color for all 13 groups upfront. No runtime fallback needed. |
