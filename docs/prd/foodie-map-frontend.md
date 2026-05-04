---
id: prd-foodie-map-frontend
title: "Foodie Map — Frontend Productionization"
status: draft
created: 2026-05-04
updated: 2026-05-04
author: chengyanru
tags: [frontend, map, react, vite, github-pages]
---

# Foodie Map — Frontend Productionization

## Context / Problem

A high-quality, AI-generated single-page HTML file (`docs/external/hk_bib_2026_map.html`) exists today. It renders a dark-themed interactive Leaflet map of 70 Hong Kong Michelin Bib Gourmand 2026 restaurants with cuisine filtering, clustering, heat map toggle, search, and region statistics.

The page works well as a standalone prototype, but has no modularity, no build system, inline data (not maintainable), and cannot scale to additional cities or guide types. It needs to become a production-grade, GitHub-managed frontend project while preserving its visual design pixel-for-pixel.

## Product Goal

| Priority | Goal |
|----------|------|
| P0 | Convert the single HTML page into a modular React + Vite + TypeScript project with identical visual output |
| P0 | Externalize restaurant data into static JSON files with a convention that supports multi-city, multi-guide expansion |
| P1 | Deploy as a static site via GitHub Pages |
| P2 | Support city-switching and guide-switching UI in later iterations |

## Persona / Target Users

- **Food enthusiasts** — Browse curated restaurant maps by city and guide type.
- **Maintainer (author)** — Add new cities or guide sources by dropping JSON files, without touching application code.

## Non-Goals

- Redesign or alter the existing visual styling in any way.
- Server-side rendering, API backends, or databases.
- Authentication or user accounts.
- Mobile-native apps.
- Implementing the city/guide switcher UI in this iteration (architecture must support it; UI deferred).

## Scope

| In Scope | Out of Scope |
|----------|--------------|
| React + Vite + TS project scaffold | Backend / API |
| Verbatim CSS extraction (zero visual change) | CSS redesign, Tailwind, CSS-in-JS |
| Component decomposition (Map, Markers, Filter, Stats, Legend, Search, Header) | New UI features beyond current page |
| Data externalization to `public/data/<city>/<guide>.json` | Data scraping pipeline |
| City/guide config registry (`cities.ts`) | City switcher UI implementation |
| GitHub Actions deploy to GitHub Pages | Custom domain setup |
| TypeScript strict mode, typed data models | Unit/integration tests (deferred) |

## Assumptions

1. The existing HTML file is the single source of truth for visual design.
2. All 70 restaurant records are accurate and complete — no data cleanup needed.
3. Leaflet + MarkerCluster + Heat libraries remain the map stack (no migration to Mapbox/Google Maps).
4. Data files are committed to the repo (small JSON, no need for external storage).
5. Only one guide type (Michelin Bib Gourmand) and one city (Hong Kong) exist today; the architecture must not assume this.

## Expected Behavior

### Data Loading

- On page load, the app reads the city/guide config to determine which JSON file to fetch.
- Default: `public/data/hong-kong/michelin-bib-gourmand.json`.
- The JSON file contains an array of `Restaurant` objects (schema below).
- If the fetch fails, the map renders empty with a non-intrusive error indicator.

### Map Rendering

- Identical behavior to current page: Leaflet map centered on city config `center`/`zoom`.
- OpenStreetMap tile layer.
- Markers use `MarkerClusterGroup` with custom dark cluster badges.
- Each marker is color-coded by `cuisine_group` with a `NEW` badge for `is_new: true`.
- Popup shows: name (zh/en), cuisine tags, area, address, price, signature dishes, Michelin link.

### Filtering

- Left panel: cuisine group checkboxes (all checked by default).
- Unchecking hides markers of that group; at least one group must remain active.
- Filter state is local (no URL persistence needed now).

### Heat Map Toggle

- Button in filter panel switches between marker mode and heat map mode.
- Heat map uses the same visible (filtered) dataset.

### Search

- Top-center floating search bar with datalist autocomplete.
- Matches on `name_zh`, `name_en`, or combined `name`.
- On match: fly to marker, open popup, ensure cuisine group is active.

### Stats Panel

- Top-right panel shows count of visible restaurants per `major_region` (港岛, 九龙, 新界, 离岛).

### Legend

- Bottom bar shows all cuisine groups with color swatches.
- Static; always shows all groups regardless of filter state.

### Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| JSON fetch failure (network error) | Map renders with empty markers; subtle error text appears |
| Empty search input + click "定位" | No-op |
| Search term matches no restaurant | No-op (no error toast) |
| All filter checkboxes unchecked by user | Last remaining checkbox re-checks automatically |
| City JSON has zero restaurants | Map renders at city center, stats show all zeros |
| Browser without JS | Blank page (acceptable for this product) |

## Data Format

### Restaurant JSON Schema

```typescript
interface Restaurant {
  id: number;
  name: string;          // "name_zh / name_en"
  name_zh: string;
  name_en: string;
  cuisine: string;
  cuisine_group: string;
  is_new: boolean;
  area: string;
  primary_area: string;
  major_region: string;
  address: string;
  address_en: string;
  avg_price_hkd: string;
  signature_dishes: string;
  michelin_url: string;
  lat: number;
  lon: number;
  geo_source: string;
  geocode_success: boolean;
  geocode_query: string;
  geocode_display_name: string;
  fallback_reason: string;
}
```

### Data File Convention

```
public/data/<city-id>/<guide-type>.json
```

Examples:
- `public/data/hong-kong/michelin-bib-gourmand.json`
- `public/data/tokyo/michelin-bib-gourmand.json` (future)
- `public/data/hong-kong/tabelog.json` (future)

### City Config Schema

```typescript
interface CityConfig {
  id: string;               // URL-safe slug, e.g. "hong-kong"
  label: string;            // Display name, e.g. "香港"
  center: [number, number]; // Map center [lat, lon]
  zoom: number;             // Default zoom level
  guides: string[];         // Available guide IDs, e.g. ["michelin-bib-gourmand"]
}
```

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| React + Vite + TypeScript | Strong ecosystem, fast DX, type safety; React's data-driven model fits map + filter state well |
| Global CSS file (verbatim extract from HTML) | Guarantees zero visual regression; no CSS-in-JS overhead |
| Static JSON in `public/` (runtime fetch) | Data changes don't require rebuild; adding a city = adding a file |
| react-leaflet for map container | Thin React wrapper over Leaflet; keeps marker/popup logic close to current implementation |
| Leaflet custom controls (not React portals) for Filter/Stats | Preserves exact positioning behavior of current page |
| GitHub Pages deployment | Free, fits static SPA, integrates with existing GitHub workflow |
| City/guide config as TS module | Type-checked registry; single place to add new cities |
| No routing library (single page) | Only one view exists; routing adds no value now. Revisit when city switcher lands. |

## Acceptance Criteria

1. Running `npm run dev` serves a page visually indistinguishable from `docs/external/hk_bib_2026_map.html` (same layout, colors, fonts, interactions).
2. Restaurant data is loaded from `public/data/hong-kong/michelin-bib-gourmand.json` at runtime (not bundled in JS).
3. All existing interactions work: cuisine filter, heat toggle, search + fly-to, stats update.
4. Adding a new city requires only: (a) a new JSON file in `public/data/<city>/`, (b) one entry in `cities.ts`.
5. `npm run build` produces a static bundle deployable to GitHub Pages with correct asset paths.
6. TypeScript compiles with strict mode, no `any` types in application code.

## Future Extensions

- **City switcher UI** — Dropdown/tabs in header to switch between cities; triggers data re-fetch and map re-center.
- **Guide switcher UI** — Tabs/pills per available guide within a city.
- **URL-based state** — Encode city + guide + active filters in URL hash for shareability.
- **i18n** — UI strings externalized for language switching.
- **PWA / offline** — Service worker caching for offline map tiles + data.

## Related Documents

- Source page: `docs/external/hk_bib_2026_map.html`
