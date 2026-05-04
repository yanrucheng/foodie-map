---
title: "260504-cuisine-group-schema-mismatch"
date: 2026-05-04
purpose: "Diagnose why switching to 米其林星级 guide shows zero markers on the map"
baseline_ref: "none"
---

# Cuisine Group Schema Mismatch — Root Cause Analysis

## Symptom

When switching the guide selector to **米其林星级** (Michelin Starred), the map renders **zero markers**. The bib-gourmand guide works correctly.

## Root Cause

A hard-coded `cuisineGroups` config (`src/config/cuisineGroups.ts`) defines 8 cuisine group keys that only match the **bib-gourmand** dataset. The **michelin-starred** dataset uses completely different `cuisine_group` values. The filter system initializes `activeGroups` from these 8 static keys, so `activeGroups.has(r.cuisine_group)` returns `false` for every starred restaurant, hiding all markers.

## Detailed Evidence

### 1. Static Group Registry vs. Actual Data

The static registry in `src/config/cuisineGroups.ts` contains exactly these 8 keys:

| # | Static Key (cuisineGroups) |
|---|---------------------------|
| 1 | 粤菜 / 烧腊 / 港式小馆 |
| 2 | 面食 / 云吞 / 车仔面 |
| 3 | 点心 / 茶楼 |
| 4 | 潮州 / 客家 / 顺德 |
| 5 | 京沪 / 上海 / 川菜 |
| 6 | 东南亚 / 印度 / 泰 / 越 |
| 7 | 日料 / 韩餐 |
| 8 | 西餐 / 其他 |

### 2. Bib-Gourmand `cuisine_group` Values (Match ✓)

All 70 restaurants in `michelin-bib-gourmand.json` use values from the static registry above. Examples:
- "粤菜 / 烧腊 / 港式小馆", "面食 / 云吞 / 车仔面", "点心 / 茶楼", etc.

**Result:** All markers render correctly.

### 3. Michelin-Starred `cuisine_group` Values (Mismatch ✗)

The 77 restaurants in `michelin-starred.json` use a **completely different taxonomy** — raw, ungrouped cuisine labels:

| # | cuisine_group value in starred JSON | Present in static registry? |
|---|-------------------------------------|-----------------------------|
| 1 | 粤菜 | ✗ |
| 2 | 时尚法国菜 | ✗ |
| 3 | 寿司 | ✗ |
| 4 | 创新菜 | ✗ |
| 5 | 扒房 | ✗ |
| 6 | 印度菜 | ✗ |
| 7 | 日本菜 | ✗ |
| 8 | 法国菜 | ✗ |
| 9 | 韩国菜 | ✗ |
| 10 | 粥面 | ✗ |
| 11 | 铁板烧 | ✗ |
| 12 | 海鲜 | ✗ |
| 13 | 沪菜 | ✗ |
| 14 | 拉丁美洲菜 | ✗ |
| 15 | 时尚欧陆菜 | ✗ |
| 16 | 意大利菜 | ✗ |
| 17 | 鸡肉串烧 | ✗ |
| 18 | 台州菜 | ✗ |
| 19 | 宁波菜 | ✗ |
| 20 | 顺德菜 | ✗ |
| 21 | 时尚亚洲菜 | ✗ |
| 22 | 印度菜, 巴基斯坦菜 | ✗ |
| 23 | 时尚法国菜, 创新菜 | ✗ |
| 24 | (empty string) | ✗ |

**Zero overlap.** Every starred restaurant fails the filter.

Additionally, some starred restaurants have `lat: null, lon: null` (e.g., ids 9, 20, 21, 39, 49, 55, 72) — these would fail marker creation regardless.

### 4. Filter Chain — Where It Breaks

```
useFilters.ts
  → allGroups = Object.keys(cuisineGroups)           // 8 static keys
  → activeGroups = new Set(allGroups)                 // Set of 8 static keys

MapShell.tsx (line 204-208)
  → visibleRestaurants = restaurants.filter(r =>
      activeGroups.has(r.cuisine_group) && ...         // ✗ always false for starred data
    )

RestaurantMarker.ts (line 56)
  → groupStyle = cuisineGroups[item.cuisine_group]    // undefined for starred data
    ?? cuisineGroups["西餐 / 其他"]                    // falls back (color works, but filter already excluded)
```

The marker creation has a fallback for unknown groups (line 56), so if the filter didn't block them, they'd at least render with a fallback color. But the filter kills them first.

## Design Schema Issue

This is not a simple bug fix. The problem reveals a **schema design gap**:

1. **Two incompatible taxonomies** — Bib-gourmand data uses curated "meta-groups" (e.g., "粤菜 / 烧腊 / 港式小馆") while starred data uses raw Michelin cuisine labels (e.g., "粤菜", "时尚法国菜").

2. **Static config approach doesn't scale** — The current design assumes a single global group registry. Adding new guides with different taxonomies breaks the filter system.

3. **Possible design directions** (not prescriptive):
   - **A) Normalize at data-gen time**: Apply the same grouping logic during data scraping/generation so all JSON files share the same `cuisine_group` taxonomy.
   - **B) Data-driven filters**: Derive available groups from loaded data rather than a static config. Requires dynamic color assignment.
   - **C) Per-guide group config**: Each guide definition in `cities.ts` includes its own group-to-style mapping.

4. **Additional data quality issues in starred JSON**:
   - 8 restaurants have `lat: null` / `geocode_success: false` — they can never be displayed on map
   - ~12 restaurants have empty `cuisine_group` (and other fields), with `fallback_reason: "missing_michelin_detail_url"` — these are incomplete records that fell through the data pipeline

## Affected Files

| File | Role |
|------|------|
| `src/config/cuisineGroups.ts` | Static group registry — only covers bib-gourmand taxonomy |
| `src/hooks/useFilters.ts` | Initializes `activeGroups` from static keys |
| `src/components/MapShell.tsx` | Filters visible restaurants via `activeGroups.has()` |
| `src/components/FilterPanel.tsx` | Renders filter UI from static `cuisineGroups` object |
| `src/components/RestaurantMarker.ts` | Looks up group style from static config (has fallback) |
| `public/data/hong-kong/michelin-starred.json` | Uses raw cuisine labels instead of meta-groups |
| `public/data/hong-kong/michelin-bib-gourmand.json` | Uses curated meta-groups (matches static config) |

## Conclusion

The zero-marker bug is caused by a **schema mismatch between the starred data's `cuisine_group` taxonomy and the hard-coded filter registry**. A proper fix requires a design decision on how to unify or handle multiple cuisine taxonomies across different guide datasets.
