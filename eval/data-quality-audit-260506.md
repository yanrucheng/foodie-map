# Data Quality Audit — public/data

**Date:** 2026-05-06  
**Purpose:** Identify and fix data quality issues across all restaurant JSON files.  
**Action:** Each section below is a standalone fix task. Fix in order of severity (CRITICAL > HIGH > MEDIUM).

---

## Trustworthy Data Sources (Priority Order)

| Source | Use For | Notes |
|--------|---------|-------|
| Michelin Guide Website (`guide.michelin.com`) | name_zh, name_en, cuisine, area, price_range, guide_url | Single source of truth for all Michelin metadata |
| Google Maps Places API | lat, lon, address_en, phone, website | Most reliable geocoding for HK/Macau/international |
| Amap (高德地图) API | lat, lon, address (Chinese) | Most reliable for mainland China addresses |
| Restaurant's own website | phone, website | Secondary source for contact info |

---

## Global Schema Rules (Apply to ALL files)

1. Use `null` for missing values — NEVER use empty string `""`
2. Field order: `id, name_zh, name_en, name, guide_type, star_rating, edition_year, is_new, cuisine, cuisine_group, venue_type, city, area, primary_area, major_region, address, address_en, lat, lon, price_range, avg_price, guide_url, signature_dishes, geo_source, geocode_success, status`
3. Remove `phone` and `website` fields (too sparse to maintain)
4. `avg_price` should be numeric (integer) — strip "约" prefix, no currency in field name
5. Add a `currency` field: `"CNY"` / `"HKD"` / `"MOP"` per city
6. `name` field: when `name_zh === name_en`, store only one (no "X / X" duplication)
7. IDs: prefix with `{city}-{guide}-` for global uniqueness (e.g., `bj-starred-1`)

---

# HONG KONG

## Hong Kong — Michelin Starred

**Path:** `public/data/hong-kong/michelin-starred.json`  
**Purpose of file:** All Michelin-starred restaurants in Hong Kong for the 2026 edition.  
**Schema:** Keep as-is (add `currency: "HKD"`, remove `phone`/`website` if absent).  
**Record count:** 77

### CRITICAL

| ID(s) | Field | Current Value | Problem | Fix |
|--------|-------|---------------|---------|-----|
| 9, 20, 21, 39, 49, 55, 72 | `lat`, `lon` | `null` | No coordinates — cannot render on map | Search `name_en` + "Hong Kong" on Google Maps Places API. Extract lat/lon. |
| 8, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19 | `lat`, `lon` | `22.278354, 114.170714` (all identical) | Fallback coordinate from amap — all 10 entries show same wrong point | Search each `name_en` on Google Maps Places API individually. Verify against address. |
| 8, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19 | `geocode_success` | `true` | Lying — coordinates are clearly wrong | Set to `false` until properly geocoded. |

### HIGH

| ID(s) | Field | Current Value | Problem | Fix |
|--------|-------|---------------|---------|-----|
| 8–21, 39, 49, 55, 72, 76 | `name_zh` | `""` | No Chinese name | Look up each restaurant on `guide.michelin.com/en/hong-kong-region`. Copy the Chinese name shown on listing. |
| 8–21, 39, 49, 55, 72, 76 | `cuisine` | `""` | No cuisine type | Copy from Michelin Guide listing page for each restaurant. |
| 8–21, 39, 49, 55, 72, 76 | `area`, `primary_area` | `""` | No area classification | Copy district from Michelin Guide listing page. |
| 8–21, 39, 49, 55, 72, 76 | `address`, `address_en` | `""` | No address | Copy from Michelin Guide listing page. Verify on Google Maps. |
| 8–21, 39, 49, 55, 72, 76 | `price_range` | `""` | No price info | Copy price symbol (e.g., "$$$$") from Michelin listing. |
| 8–21, 39, 49, 55, 72, 76 | `guide_url` | `""` | No link to source | Construct from Michelin URL pattern: `https://guide.michelin.com/en/hong-kong-region/hong-kong/restaurant/{slug}`. |
| 8–21, 39, 49, 55, 72, 76 | `cuisine_group` | `"OTHER"` | Placeholder due to missing cuisine | Reassign after filling `cuisine` field — use `hong-kong-mappings.json` to determine correct group. |

### MEDIUM

| ID(s) | Field | Current Value | Problem | Fix |
|--------|-------|---------------|---------|-----|
| ALL (1–77) | `signature_dishes` | `""` | Universally empty | Either populate from Michelin "Inspector's Favorites" or remove field from schema. |
| ALL | `avg_price_hkd` | mixed `""` / values | Inconsistent — some have data, stubs don't | Populate from Michelin listing. Convert to numeric integer. |

---

## Hong Kong — Michelin Bib Gourmand

**Path:** `public/data/hong-kong/michelin-bib-gourmand.json`  
**Purpose of file:** All Bib Gourmand restaurants in Hong Kong for the 2026 edition.  
**Schema:** Keep as-is (add `currency: "HKD"`).  
**Record count:** 70

### HIGH

| ID(s) | Field | Current Value | Problem | Fix |
|--------|-------|---------------|---------|-----|
| 9 (Art & Taste) | `area` | `"九龍城"` | Contradicts `address_en` which says "Wyndham Street, Central" (HK Island) | Check Michelin Guide listing. If Central, change area to `"中環"`. |
| 11 (Banana Boy) | `area` | `"深水埗"` | Contradicts `address_en` which says "Yuen Long" (New Territories) | Check Michelin Guide listing. If Yuen Long, change area to `"元朗"`. |
| 14 (Chiu Ka Banquet) | `area` | `"尖沙咀"` | Contradicts `address_en` which says "Des Voeux Road Central, Sheung Wan" | Check Michelin Guide. If Sheung Wan, change area to `"上環"`. |
| 27 (Hung's Delicacies) | `area` | `"九龍灣"` | Contradicts `address_en` which says "Jaffe Road, Causeway Bay" (HK Island) | Check Michelin Guide. If Causeway Bay, change area to `"銅鑼灣"`. |

### MEDIUM

| ID(s) | Field | Current Value | Problem | Fix |
|--------|-------|---------------|---------|-----|
| 9, 11, 14, 15, 18, 19, 20, 21, 23, 25, 26, 27, 34, 38, 39, 42, 44, 46, 48, 49, 52, 56, 57, 58, 62, 67, 68 | `address` | `""` | Missing Chinese address (English address exists) | Copy Chinese address from Michelin Guide listing page. |
| 18 (Dragon Inn), 41 (Megan's Kitchen) | `price_range`, `avg_price_hkd` | `""` | Missing price info | Copy from Michelin Guide listing. |
| 52 (Sing Kee) | `area` | `"中環 / 灣仔"` | Uses slash separator — inconsistent with single-value pattern | Pick primary area from Michelin listing. Use one value only. |

---

## Hong Kong — Taxonomy

**Path:** `public/data/taxonomy/hong-kong-mappings.json`  
**Purpose of file:** Maps raw cuisine strings to cuisine group keys for filtering.  
**Schema:** Keep as-is.

### MEDIUM

| Mapping | Current groupKey | Problem | Fix |
|---------|-----------------|---------|-----|
| `"街頭小吃"` (street food) | `WESTERN_OTHER` | Semantically wrong — street food is not Western cuisine | Change to `"OTHER"` or create a dedicated `"STREET_FOOD"` group in `hong-kong.json`. |
| `""` (empty string) | `"OTHER"` | Catch-all for stubs — acceptable as fallback | Keep. Will resolve naturally once stubs are filled. |

---

# MACAU

## Macau — Michelin Starred

**Path:** `public/data/macau/michelin-starred.json`  
**Purpose of file:** All Michelin-starred restaurants in Macau for the 2026 edition.  
**Schema:** Rename `avg_price_cny` → `avg_price`. Add `currency: "MOP"`.  
**Record count:** 21

### MEDIUM

| ID(s) | Field | Current Value | Problem | Fix |
|--------|-------|---------------|---------|-----|
| ALL (1–21) | `avg_price_cny` | `""` | Field name says CNY but Macau uses MOP. Also universally empty. | Rename field to `avg_price`. Populate numeric value from Michelin Macau listing. Set `currency: "MOP"`. |
| ALL (1–21) | `signature_dishes` | `""` | Universally empty | Populate from Michelin listing or remove. |

---

## Macau — Michelin Bib Gourmand

**Path:** `public/data/macau/michelin-bib-gourmand.json`  
**Purpose of file:** All Bib Gourmand restaurants in Macau for the 2026 edition.  
**Schema:** Same rename as starred. Add `currency: "MOP"`.  
**Record count:** 13

### MEDIUM

| ID(s) | Field | Current Value | Problem | Fix |
|--------|-------|---------------|---------|-----|
| ALL (1–13) | `avg_price_cny` | `""` | Wrong currency code + empty | Same fix as starred file above. |
| 4 (Din Tai Fung COD) | `area` | `"路氹"` | Inconsistent with starred file which uses `"路氹城"` for same area | Standardize to `"路氹城"` (matches Michelin's classification). |

---

# SHANGHAI

## Shanghai — Michelin Starred

**Path:** `public/data/shanghai/michelin-starred.json`  
**Purpose of file:** All Michelin-starred restaurants in Shanghai for the 2026 edition.  
**Schema:** Remove `phone`, `website` (too sparse). Convert `avg_price_cny` to numeric `avg_price` + `currency: "CNY"`.  
**Record count:** 51

### HIGH

| ID(s) | Field | Current Value | Problem | Fix |
|--------|-------|---------------|---------|-----|
| 11 entries (unspecified) | `guide_url` | `""` | Missing link to authoritative source | Search each restaurant on `guide.michelin.com/en/shanghai`. Copy the full URL. |
| 3 (8½ Otto e Mezzo BOMBANA) | `area`, `primary_area` | `""` | Empty — breaks geographic filtering | Look up on Michelin Guide Shanghai. Should be "黄浦" or "外滩". |
| 48 of 51 entries | `address` | `""` | Nearly all Chinese addresses missing | Scrape from Michelin Guide listing page (shows Chinese address). Or search `name_zh` + "上海" on Amap API. |

### MEDIUM

| ID(s) | Field | Current Value | Problem | Fix |
|--------|-------|---------------|---------|-----|
| ALL (1–51) | `avg_price_cny` | `null` | All null — no price data | Scrape from Michelin Guide listing (shows price range). Store as integer (e.g., `800`). |
| ALL (1–51) | `signature_dishes` | `""` | Universally empty | Populate from Michelin "Inspector's Favorites" or remove. |
| 15 entries | `price_range` | `""` | Missing pricing category | Copy price symbol from Michelin listing (e.g., "$$", "$$$"). |

---

## Shanghai — Michelin Bib Gourmand

**Path:** `public/data/shanghai/michelin-bib-gourmand.json`  
**Purpose of file:** All Bib Gourmand restaurants in Shanghai for the 2026 edition.  
**Schema:** Remove `phone`, `website`. Convert `avg_price_cny` to numeric.  
**Record count:** 35

### MEDIUM

| ID(s) | Field | Current Value | Problem | Fix |
|--------|-------|---------------|---------|-----|
| ALL (1–35) | `address_en` | `""` | All English addresses missing | Use Google Maps Geocoding API: input Chinese `address` field → extract English formatted address. |
| ALL (1–35) | `avg_price_cny` | `""` | Empty string (should be `null` or numeric) | Populate from Michelin listing. Convert to integer. |
| 2 (阿娘面) | `price_range` | `""` | Missing | Copy from Michelin listing. |

---

## Shanghai — Taxonomy

**Path:** `public/data/taxonomy/shanghai-mappings.json`  
**Purpose of file:** Maps raw cuisine strings to group keys.  
**Schema:** Keep as-is.

No issues found. Clean and well-structured.

---

# BEIJING

## Beijing — Michelin Starred

**Path:** `public/data/beijing/michelin-starred.json`  
**Purpose of file:** All Michelin-starred restaurants in Beijing for the 2026 edition.  
**Schema:** Add `avg_price_cny` field (missing entirely — present in bib file). Add `currency: "CNY"`.  
**Record count:** 32

### MEDIUM

| ID(s) | Field | Current Value | Problem | Fix |
|--------|-------|---------------|---------|-----|
| — | `avg_price_cny` | FIELD MISSING | Schema mismatch with bib-gourmand file | Add field. Populate from Michelin Guide Beijing listing. Store as integer. |
| ALL (1–32) | `signature_dishes` | `""` | Universally empty | Populate from Michelin listing or remove. |
| ALL | `area` vs `primary_area` | Always identical | Redundant | Decide: either differentiate (area=sub-district, primary_area=district) or drop `primary_area`. |

### LOW

| ID(s) | Field | Current Value | Problem | Fix |
|--------|-------|---------------|---------|-----|
| 19 & 30 | `lat`, `lon` | `39.867402, 116.4882929` | Duplicate coords (same building, diff floors) | Acceptable — document as known. No action needed unless map shows overlap. |
| 20 & 26 | `lat`, `lon` | `39.91032, 116.481995` | Duplicate coords (same hotel) | Same as above. |

---

## Beijing — Michelin Bib Gourmand

**Path:** `public/data/beijing/michelin-bib-gourmand.json`  
**Purpose of file:** All Bib Gourmand restaurants in Beijing for the 2026 edition.  
**Schema:** Convert `avg_price_cny` from string `"约 150"` to integer `150`. Add `currency: "CNY"`.  
**Record count:** 26

### MEDIUM

| ID(s) | Field | Current Value | Problem | Fix |
|--------|-------|---------------|---------|-----|
| ALL | `avg_price_cny` | String like `"约 150"` | Should be numeric integer, not text | Strip "约 " prefix. Convert to integer. (e.g., `"约 150"` → `150`) |
| ALL | `star_rating` | `0` | Semantically `null` (Bib Gourmand is not a star category) | Change to `null` to distinguish "not applicable" from "zero stars". |

---

## Beijing — Taxonomy

**Path:** `public/data/taxonomy/beijing-mappings.json`  
**Purpose of file:** Maps raw cuisine strings to group keys for filtering.  
**Schema:** Keep as-is.

### MEDIUM

| Mapping | Current groupKey | Problem | Fix |
|---------|-----------------|---------|-----|
| `"东北菜"` (Dongbei) | `SHANDONG` | Dongbei and Shandong are distinct culinary traditions | Either create a `NORTHEASTERN` group in `beijing.json`, or remap to `REGIONAL_CHINESE`. Check Michelin's own classification. |
| Multiple cuisines | `sources` array | Lists only `["bib-gourmand"]` but cuisine appears in starred too (京菜, 粤菜, 鲁菜, 素食, 台州菜, 川菜) | Run a script against both restaurant files to auto-populate correct sources. |

---

# GUANGZHOU-SHENZHEN

## Guangzhou-Shenzhen — Michelin Starred

**Path:** `public/data/guangzhou-shenzhen/michelin-starred.json`  
**Purpose of file:** All Michelin-starred restaurants in Guangzhou (and Shenzhen) for the 2026 edition.  
**Schema:** Add `avg_price_cny` (missing). Remove `phone`, `website` (too sparse). Fix field order. Add `currency: "CNY"`.  
**Record count:** 20

### CRITICAL

| ID(s) | Field | Current Value | Problem | Fix |
|--------|-------|---------------|---------|-----|
| 15 (岁集院子) | `lat`, `lon` | `0, 0` | Renders at "Null Island" in the Atlantic | Search "岁集院子 广州" on Amap API. Verify address against Michelin listing. |
| 19 (屿 / Yu Garden) | `lat`, `lon` | `null, null` | Cannot render on map | Search "屿 Yu Garden 广州" on Amap API. Cross-reference with Michelin GZ listing. |

### HIGH

| ID(s) | Field | Current Value | Problem | Fix |
|--------|-------|---------------|---------|-----|
| 3, 7, 9, 11, 14, 15, 16, 17 | `address` | `""` | 8/20 entries (40%) missing Chinese address | Look up each on Amap by `name_zh` + "广州". Or scrape from Michelin Guide GZ listing. |
| — | field order | `id, name, name_zh, name_en, ...` | Inconsistent with all other files (`id, name_zh, name_en, name, ...`) | Reorder to match canonical schema. |

### MEDIUM

| ID(s) | Field | Current Value | Problem | Fix |
|--------|-------|---------------|---------|-----|
| — | `avg_price_cny` | FIELD MISSING | Present in bib file but absent here | Add field. Populate from Michelin listing. |
| ALL (1–20) | `signature_dishes` | `""` | Universally empty | Populate or remove. |
| 9 of 20 | `phone` | `null` | Too sparse to be useful | Remove field from schema. |

---

## Guangzhou-Shenzhen — Michelin Bib Gourmand

**Path:** `public/data/guangzhou-shenzhen/michelin-bib-gourmand.json`  
**Purpose of file:** All Bib Gourmand restaurants in Guangzhou for the 2026 edition.  
**Schema:** Convert `avg_price_cny` to numeric. Add `currency: "CNY"`.  
**Record count:** 44

### MEDIUM

| ID(s) | Field | Current Value | Problem | Fix |
|--------|-------|---------------|---------|-----|
| ALL (1–44) | `avg_price_cny` | `""` | Universally empty string | Populate from Michelin listing as integer. |
| ALL (1–44) | `signature_dishes` | `""` | Universally empty | Populate or remove. |

---

## Guangzhou-Shenzhen — Taxonomy

**Path:** `public/data/taxonomy/guangzhou-shenzhen-mappings.json`  
**Purpose of file:** Maps raw cuisine strings to group keys.  
**Schema:** Keep as-is.

### LOW

| Mapping | Current sources | Problem | Fix |
|---------|----------------|---------|-----|
| `"点心"`, `"川菜"`, `"闽菜"`, `"西餐"` | `["bib-gourmand"]` | Also appear in starred file but sources array is incomplete | Auto-generate from both restaurant files. |

---

# CHENGDU

## Chengdu — Michelin Starred

**Path:** `public/data/chengdu/michelin-starred.json`  
**Purpose of file:** All Michelin-starred restaurants in Chengdu for the 2026 edition.  
**Schema:** Remove `phone`, `website` (empty). Convert `avg_price_cny` to numeric. Add `currency: "CNY"`.  
**Record count:** 13

### MEDIUM

| ID(s) | Field | Current Value | Problem | Fix |
|--------|-------|---------------|---------|-----|
| ALL | `area` | `"武侯区"`, `"青羊区"`, etc. | Uses "区" suffix — inconsistent with all other cities which use bare names ("天河", "朝阳") | Strip "区" suffix to match convention (e.g., `"武侯区"` → `"武侯"`). |
| ALL | `avg_price_cny` | `""` | Universally empty | Populate from Michelin listing as integer. |
| ALL | `signature_dishes` | `""` | Universally empty | Populate or remove. |

---

## Chengdu — Taxonomy

**Path:** `public/data/taxonomy/chengdu-mappings.json`  
**Purpose of file:** Maps raw cuisine strings to group keys.  
**Schema:** Keep as-is.

### LOW (Cross-city note)

| Key | Chengdu | GZ-Shenzhen | Problem |
|-----|---------|-------------|---------|
| Sichuan cuisine group key | `SICHUANESE` | `SICHUAN_HUNAN` | Same underlying cuisine `"川菜"` maps to different group keys across cities | Acceptable if no cross-city filtering exists. Document as intentional. |

---

# CROSS-CUTTING ISSUES (Apply to all files)

| # | Issue | Affected Files | Fix |
|---|-------|---------------|-----|
| 1 | `null` vs `""` for missing values | All files | Normalize: use `null` only. Never `""`. |
| 2 | `star_rating: 0` for Bib Gourmand | All bib-gourmand files | Change to `null` (Bib Gourmand is not in the star system). |
| 3 | Non-unique IDs across files | All files | Prefix: `{city}-{guide}-{id}` (e.g., `hk-starred-1`). |
| 4 | `name` = "X / X" when zh === en | All files | Deduplicate: if `name_zh === name_en`, set `name = name_zh`. |
| 5 | `signature_dishes` empty everywhere in starred | All starred files | Bulk-populate from Michelin "Inspector's Favorites" or drop field. |
| 6 | `phone`/`website` inconsistently present | Mixed | Remove from all files (>90% empty, not worth maintaining). |

---

# PRIORITY EXECUTION ORDER

1. **CRITICAL (4 items):** Fix broken coordinates in HK starred (17 entries) and GZ-SZ starred (2 entries).
2. **HIGH (3 items):** Fill HK starred stub records (25 entries), Shanghai missing addresses (48 entries), HK bib area/address mismatches (4 entries).
3. **MEDIUM:** Schema normalization (null vs "", field presence, currency), populate empty fields from Michelin source.
4. **LOW:** Taxonomy source arrays, cosmetic field ordering.
