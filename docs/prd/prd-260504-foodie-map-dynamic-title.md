---
id: prd-foodie-map-dynamic-title
title: "Foodie Map — Dynamic Title Switcher"
status: draft
created: 2026-05-04
updated: 2026-05-04
author: chengyanru
tags: [frontend, map, title, switcher, ux]
parent: prd-foodie-map-frontend
---

# Foodie Map — Dynamic Title Switcher

## Context / Problem

The map title is currently hardcoded as `2026 香港米其林必比登餐厅地图 · {count} 家高性价比美食` in `App.tsx`. The app already has a `cities.ts` registry designed for multi-city/multi-guide expansion, but the title cannot react to user selection. As new cities, years, and guide types are added, the title must dynamically reflect the active data context without code changes.

## Product Goal

| Priority | Goal |
|----------|------|
| P0 | Title dynamically composes from three independently switchable segments: **year**, **location**, and **guide name** |
| P0 | Each segment is user-switchable via inline controls embedded in the title itself |
| P1 | Switching a segment updates the map data to match the new selection |
| P2 | URL reflects current selection state (deep-linkable) |

## Persona / Target Users

- **Food enthusiasts** — Quickly switch between cities, years, or guide types to explore different curated restaurant sets.
- **Maintainer** — Add a new year/city/guide by updating the registry config; the title switcher picks it up automatically with zero UI code changes.

## Non-Goals

- Redesign the overall page layout or color scheme.
- Full-text search across multiple datasets simultaneously.
- Animated transitions between data loads.
- Backend APIs — all data remains static JSON.

## Scope

| In Scope | Out of Scope |
|----------|--------------|
| Title composition formula: `{yyyy} {location} · {guide name}餐厅地图` | Subtitle changes (keep existing behavior) |
| Inline dropdown/pill selectors for each segment | Sidebar or modal-based settings page |
| Data switching when selection changes | Data aggregation across multiple selections |
| Mobile-responsive title layout | PWA offline caching of all datasets |
| Registry-driven options (no hardcoded lists in UI) | Admin UI to manage the registry |

## Assumptions

1. Each unique combination of (year, city, guide) maps to exactly one JSON data file.
2. The `cities.ts` registry will be extended with a `year` field per guide entry.
3. Only one combination is active at a time (no multi-select).
4. Available options are small in number (≤5 per segment) — dropdown is appropriate.

## Domain Model

```
┌─────────────────────────────────────────────────┐
│  Title Formula (constant structure)             │
│  "{year} {location} · {guideName}餐厅地图"      │
└───┬──────────┬────────────────┬─────────────────┘
    │          │                │
    ▼          ▼                ▼
┌────────┐ ┌──────────┐ ┌─────────────┐
│ Year   │ │ Location │ │ Guide Name  │
│ Picker │ │ Picker   │ │ Picker      │
└───┬────┘ └────┬─────┘ └──────┬──────┘
    │           │               │
    ▼           ▼               ▼
┌─────────────────────────────────────────────────┐
│  CityConfig[] registry (cities.ts)              │
│  → derives available years, locations, guides   │
└─────────────────────────────────────────────────┘
```

**Entities:**

| Entity | Description |
|--------|-------------|
| `Year` | Publication year of the guide data (e.g. 2025, 2026) |
| `Location` | Display name of the city in Chinese (e.g. 香港, 东京) |
| `GuideName` | Display name of the guide type in Chinese (e.g. 米其林毕比登, 米其林星级) |
| `Selection` | The active tuple of (year, location, guideName) → resolves to one `dataPath` |

## Data Model Extension

```typescript
interface GuideConfig {
  id: string;
  label: string;           // "Michelin Bib Gourmand 2026"
  labelZh: string;         // "米其林毕比登" (display name without year)
  year: number;            // 2026
  dataPath: string;
}

interface CityConfig {
  id: string;
  label: string;           // "Hong Kong"
  labelZh: string;         // "香港"
  center: [number, number];
  zoom: number;
  guides: GuideConfig[];
}
```

## Expected Behavior

### Title Rendering

The `<Header>` component renders the title as:

```
[2026 ▾] [香港 ▾] · [米其林毕比登 ▾]餐厅地图
```

Each bracketed segment is a clickable inline selector (dropdown pill). The `▾` caret indicates interactivity. The constant suffix `餐厅地图` is plain text.

### Segment Interaction

| Action | Result |
|--------|--------|
| User clicks a segment pill | A dropdown appears below it showing all available options for that dimension |
| User selects an option | Dropdown closes, title updates immediately, map data reloads |
| Only one option exists for a segment | Segment renders as static text (no caret, not clickable) |
| Data is loading after switch | Title shows new selection immediately; map shows loading state |

### Option Derivation

Options are derived at runtime from the `cities.ts` registry:

- **Years**: Deduplicated list of all `guide.year` values across all cities.
- **Locations**: Deduplicated list of all `city.label` values that have at least one guide matching the currently selected year.
- **Guide Names**: List of guide labels for the currently selected (year, city) pair.

### Cascading Selection Logic

When a segment changes, dependent segments may need adjustment:

| Changed Segment | Cascade Rule |
|-----------------|--------------|
| Year | If current location has no guide for the new year → reset location to first available. Then revalidate guide name. |
| Location | If current guide name is unavailable for new location → reset guide to first available for (year, location). |
| Guide Name | No cascade — directly resolves to a `dataPath`. |

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| Registry has only one city, one guide, one year | All three segments render as static text; no dropdowns. Title looks identical to current hardcoded version. |
| Data file fails to load after switch | Map shows error state; title retains the new selection (does not revert). User can switch again. |
| Registry is empty (zero entries) | App renders a fallback message: "No data available". Title area is hidden. |
| Very long guide name (e.g. >8 chars) | Pill truncates with ellipsis on mobile; full text shown in dropdown. |
| User rapidly switches segments | Each switch cancels the previous in-flight fetch; only the latest selection's data is rendered. |

### Mobile Behavior

On mobile viewports (≤768px):

- Title renders in a single scrollable line within `MobileShell`.
- Tapping a segment opens a bottom-sheet selector instead of a dropdown.
- Behavior and cascade logic remain identical.

## Visual Design

### Desktop — Title Bar

```
┌─────────────────────────────────────────────────────┐
│  [2026 ▾]  [香港 ▾]  ·  [米其林毕比登 ▾]餐厅地图    │
└─────────────────────────────────────────────────────┘
```

- Each `[segment ▾]` is a chip with subtle background (`var(--surface-elevated)`), rounded corners, and a small dropdown caret.
- On hover: background lightens slightly; cursor becomes pointer.
- Active/open state: chip gets a ring/border highlight (`var(--accent)`).
- The `·` separator and `餐厅地图` suffix are static, non-interactive text.

### Desktop — Dropdown

```
┌───────────────┐
│  ● 香港       │  ← selected (accent dot)
│    東京       │
│    上海       │
└───────────────┘
```

- Appears directly below the chip, aligned to its left edge.
- Max height: 240px with scroll for long lists.
- Clicking outside or pressing Escape closes it.

### Mobile — Compact Title

```
┌─────────────────────────────────────────┐
│  2026 香港 · 米其林毕比登餐厅地图  [▾]   │
└─────────────────────────────────────────┘
```

- Single tappable line; the `[▾]` icon indicates expandability.
- Tap opens a bottom-sheet selector panel with all three segments stacked vertically.

### Dropdown States

| State | Visual Treatment |
|-------|------------------|
| Default | Subtle border, dropdown chevron |
| Hover | Background color change |
| Open | Border accent, dropdown visible |
| Disabled (single option) | Muted text, no interaction |
| Selected | Bold text, checkmark in dropdown |

## Acceptance Criteria

1. **AC-1**: Given a registry with 2 cities and 2 guides each, the title renders three clickable segment pills; clicking each shows the correct options derived from the registry.
2. **AC-2**: Selecting "东京" in the location picker updates the title to show "东京", triggers a data fetch for the corresponding Tokyo guide, and renders Tokyo restaurants on the map.
3. **AC-3**: Given a registry with exactly one year, the year segment renders as static text with no dropdown affordance.
4. **AC-4**: On mobile (≤768px), tapping a segment opens a bottom-sheet list; selecting an option updates the title and map data.
5. **AC-5**: Rapidly switching location three times results in only the final selection's data being displayed (no race conditions).
6. **AC-6**: Cascading constraint — switching city updates the available guide list; if current guide is invalid, the first valid guide auto-selects.
7. **AC-7**: URL query params reflect active selection; navigating to a URL with valid params restores that state.

## Output & Errors

| State | Title Output |
|-------|--------------|
| Normal | `2026 香港 · 米其林毕比登餐厅地图` |
| After switching | `2025 东京 · 米其林星级餐厅地图` |
| Loading after switch | Title shows new text; map shows spinner overlay |
| Fetch error | Title retains selection; map shows inline error banner |
| Invalid URL params on load | Silently fallback to first valid option per segment |

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Inline pill selectors in the title (not a separate toolbar) | Keeps the UI minimal; the title IS the control. Reduces cognitive load — users see what's active and can change it in-place. |
| Cascade resets to "first available" rather than showing an error | Prevents invalid states without user intervention; smooth exploratory flow. |
| Derive options from registry (not from hardcoded UI arrays) | Single source of truth; adding a city/guide requires zero UI code changes. |
| Bottom-sheet on mobile instead of dropdown | Better touch UX for small targets; consistent with iOS/Android patterns. |
| Cancel in-flight fetches on rapid switching | Prevents stale data from rendering; ensures consistency between title and map state. |

## Future Extensions

- Animated map fly-to when switching cities.
- "Compare" mode showing two guides side-by-side.
- Persist selection via localStorage for returning visitors.

## Related Documents

- [foodie-map-frontend.md](foodie-map-frontend.md) — Parent PRD (project foundation)
- [tech-dev-plan-260504-foodie-map-migration.md](../plan/tech-dev-plan-260504-foodie-map-migration.md) — Migration plan
