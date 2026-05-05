# Data Onboarding Guide

Operational guide for LLM agents contributing restaurant guide data to the Foodie Map project.

---

## Agent Task Specification

When you receive this guide alongside a task prompt, you MUST produce the following deliverables:

### Input

You will be told:
- **City** (e.g., "Shanghai")
- **Guide type** (e.g., "michelin-starred", "michelin-bib-gourmand", or "dianping-black-pearl")

### Output Requirements

1. **Primary deliverable — Restaurant data file**
   - Return a **valid JSON array** of restaurant objects conforming to the schema in the "Target Data Schema" section below.
   - The array must be complete (all restaurants for that city + guide type).
   - File path: `public/data/{city-slug}/{guide-type}.json`

2. **Secondary deliverable — Taxonomy files** (only if the city is new)
   - `public/data/taxonomy/{city-slug}.json` — cuisine group definitions
   - `public/data/taxonomy/{city-slug}-mappings.json` — raw label → group key mappings

### Output Format Rules

- Return **ONLY valid JSON**. Do NOT wrap in markdown code fences, do NOT return prose, analysis, or commentary alongside the data.
- Each deliverable must be a separate, clearly labeled JSON block if returning multiple files.
- If you cannot complete geocoding for some entries, set `geocode_success: false` and `lat: 0, lon: 0` — do NOT omit the entry.
- If a field value is unavailable, use `""` (empty string) for strings or `null` for optional fields. Do NOT omit required fields.

### Anti-Patterns (Do NOT do these)

- ❌ Return a summary or analysis of the data instead of the actual JSON
- ❌ Return partial data with "and so on..." or "..." placeholders
- ❌ Wrap JSON inside markdown code blocks or explanatory text
- ❌ Ask clarifying questions instead of producing output (use your best judgment from official sources)
- ❌ Fabricate data — every value must come from an official source listed in "Official Data Sources"

---

## Coverage Status

> **This table is auto-generated.** Run `python scripts/render-coverage-table.py` to refresh.

### Currently Supported

<!-- COVERAGE_TABLE_START -->

| City | Guide | Year | Entries |
|------|-------|------|---------|
| Beijing / 北京 | Michelin Bib Gourmand / 米其林必比登 | — | 26 |
| Beijing / 北京 | Michelin Starred / 米其林星级 | 2026 | 32 |
| Guangzhou & Shenzhen / 广州·深圳 | Michelin Bib Gourmand / 米其林必比登 | — | 44 |
| Guangzhou & Shenzhen / 广州·深圳 | Michelin Starred / 米其林星级 | 2026 | 20 |
| Hong Kong / 香港 | Michelin Bib Gourmand / 米其林必比登 | — | 70 |
| Hong Kong / 香港 | Michelin Starred / 米其林星级 | — | 77 |
| **Total** | | | **269** |

<!-- COVERAGE_TABLE_END -->

### Target Coverage (2026 Latest Data)

| City | Guide | Status |
|------|-------|--------|
| Hong Kong | Michelin Starred | ✅ Done |
| Hong Kong | Michelin Bib Gourmand | ✅ Done |
| Macau | Michelin Starred | ❌ Needed |
| Macau | Michelin Bib Gourmand | ❌ Needed |
| Beijing | Michelin Starred | ✅ Done |
| Beijing | Michelin Bib Gourmand | ✅ Done |
| Shanghai | Michelin Starred | ❌ Needed |
| Shanghai | Michelin Bib Gourmand | ❌ Needed |
| Guangzhou & Shenzhen | Michelin Starred | ⚠️ Needs 2026 update |
| Guangzhou & Shenzhen | Michelin Bib Gourmand | ✅ Done |
| Chengdu | Michelin Starred | ❌ Needed |
| Chengdu | Michelin Bib Gourmand | ❌ Needed |
| Hangzhou | Michelin Starred | ❌ Needed |
| Hangzhou | Michelin Bib Gourmand | ❌ Needed |
| Taipei & Taichung | Michelin Starred | ❌ Needed |
| Taipei & Taichung | Michelin Bib Gourmand | ❌ Needed |
| Tainan & Kaohsiung | Michelin Starred | ❌ Needed |
| Tainan & Kaohsiung | Michelin Bib Gourmand | ❌ Needed |
| All supported cities | 大众点评黑珍珠 (Dianping Black Pearl) | ❌ Needed |

**Supported languages:** Simplified Chinese (zh-CN), Traditional Chinese (zh-TW), English (en)

---

## Target Data Schema

All restaurant data files MUST conform to the following unified JSON schema. Each file is a JSON array of restaurant objects.

### Unified Restaurant Object

```jsonc
{
  // === IDENTITY (Required) ===
  "id": 1,                              // Sequential integer, unique within file
  "name_zh": "御寶軒",                   // Restaurant name in Chinese (zh-CN for mainland, zh-TW for HK/TW/Macau)
  "name_en": "Imperial Treasure",        // Restaurant name in English
  "name": "御寶軒 / Imperial Treasure",  // Combined display name: "{name_zh} / {name_en}"

  // === GUIDE METADATA (Required) ===
  "guide_type": "michelin-starred",      // One of: "michelin-starred" | "michelin-bib-gourmand" | "dianping-black-pearl"
  "star_rating": 2,                      // Michelin: 1/2/3; Bib Gourmand: 0; Black Pearl: 1/2/3
  "edition_year": 2026,                  // The guide edition year
  "is_new": false,                       // Whether newly added in this edition

  // === CLASSIFICATION (Required) ===
  "cuisine": "粤菜",                     // Raw cuisine label from the official source (always in Chinese)
  "cuisine_group": "CANTONESE",          // Canonical group key (see Cuisine Taxonomy section)
  "venue_type": "restaurant",            // One of: "restaurant" | "street_food" | "dessert"

  // === LOCATION (Required) ===
  "city": "guangzhou",                   // City slug (kebab-case, matches folder name)
  "area": "天河",                        // District/area in Chinese
  "primary_area": "天河",                // Primary area for grouping
  "major_region": "广州",                // Major region for display
  "address": "天河区兴民路222号天汇广场5楼", // Full address in Chinese
  "address_en": "L514B, 5F, IGC Mall, 222 Xingmin Road, Tianhe, Guangzhou", // Full address in English
  "lat": 23.118473,                      // Latitude (WGS84, decimal degrees)
  "lon": 113.326514,                     // Longitude (WGS84, decimal degrees)

  // === PRICING (Required) ===
  "price_range": "¥¥¥",                  // Michelin/Dianping price indicator string
  "avg_price_cny": "约 500-1000",        // Average price in CNY (mainland/Macau). Use "avg_price_hkd" for HK

  // === CONTACT (Optional — include if available) ===
  "phone": "+86 20 3885 6382",           // Phone number with country code
  "website": "https://example.com",      // Official website URL

  // === REFERENCE (Required) ===
  "guide_url": "https://guide.michelin.com/...", // Official guide page URL
  "signature_dishes": "叉烧, 烧鹅",      // Comma-separated signature dishes (if available, else "")

  // === GEOCODING METADATA (Required) ===
  "geo_source": "google_maps",           // Source of lat/lon: "michelin_exact" | "google_maps" | "nominatim" | "manual"
  "geocode_success": true,               // Whether geocoding succeeded

  // === STATUS (Required) ===
  "status": "active"                     // One of: "active" | "closed" | "relocated"
}
```

### Field Requirements by Guide Type

| Field | Michelin Starred | Michelin Bib Gourmand | Dianping Black Pearl |
|-------|-----------------|----------------------|---------------------|
| `star_rating` | 1, 2, or 3 | Always `0` | 1, 2, or 3 (diamond level) |
| `price_range` | Required | Required | Required |
| `avg_price_cny` / `avg_price_hkd` | Optional | Required | Required |
| `signature_dishes` | Optional | Required (key feature) | Optional |
| `phone` | Include if available | Optional | Optional |
| `website` | Include if available | Optional | Optional |
| `venue_type` | Always `"restaurant"` | Can be `"street_food"` or `"dessert"` | Always `"restaurant"` |

### Currency Field Rules

| City | Currency Field | Example |
|------|---------------|---------|
| Mainland China cities | `avg_price_cny` | `"约 200-500"` |
| Hong Kong | `avg_price_hkd` | `"约 300-700"` |
| Macau | `avg_price_cny` | `"约 300-800"` (use CNY equivalent) |
| Taiwan | `avg_price_twd` | `"約 1000-3000"` |

---

## Official Data Sources

### Michelin Guide

| Region | URL | Notes |
|--------|-----|-------|
| Hong Kong & Macau | https://guide.michelin.com/hk/en | Select "Hong Kong" or "Macau" region filter |
| Beijing | https://guide.michelin.com/en/beijing-municipality | |
| Shanghai | https://guide.michelin.com/en/shanghai-municipality | |
| Guangzhou & Shenzhen | https://guide.michelin.com/hk/en/guangdong-province | Covers both cities |
| Chengdu | https://guide.michelin.com/en/sichuan-province | |
| Hangzhou | https://guide.michelin.com/en/zhejiang-province | |
| Taipei & Taichung | https://guide.michelin.com/tw/en | Select city filter |
| Tainan & Kaohsiung | https://guide.michelin.com/tw/en | Select city filter |

**Key data points to extract from Michelin:**
- Restaurant name (Chinese + English)
- Cuisine type
- Star rating / Bib Gourmand status
- Address
- Price range ($ symbols)
- Phone, website
- Whether it is new this edition (`is_new`)
- The full Michelin page URL

### 大众点评黑珍珠 (Dianping Black Pearl)

| Source | URL | Notes |
|--------|-----|-------|
| Official list | https://www.dianping.com/blackpearl | Annual awards page |
| Restaurant detail | Individual restaurant pages on dianping.com | For pricing, dishes |

**Key data points to extract from Black Pearl:**
- Restaurant name (Chinese — translate to English yourself or use the official English name if available)
- Diamond level (1/2/3)
- Cuisine type
- City
- Address
- Average price per person
- Signature recommended dishes

### Geocoding (for lat/lon)

Use the following sources in priority order:

1. **Michelin page structured data** — Extract from JSON-LD or `<meta>` tags on the Michelin restaurant page (field: `geo_source: "michelin_exact"`)
2. **Google Maps Geocoding API** — Query by restaurant name + address (field: `geo_source: "google_maps"`)
3. **Nominatim / OpenStreetMap** — Free alternative (field: `geo_source: "nominatim"`)
4. **Manual lookup** — Last resort, manually search on map services (field: `geo_source: "manual"`)

Set `geocode_success: false` if no reliable coordinates could be found. Do NOT invent coordinates.

---

## Cuisine Taxonomy

Each city has its own taxonomy file at `public/data/taxonomy/{city-slug}.json`. When onboarding a new city:

1. **Define cuisine groups** — Create `public/data/taxonomy/{city-slug}.json` with groups relevant to that city's culinary landscape
2. **Create mappings** — Create `public/data/taxonomy/{city-slug}-mappings.json` mapping raw cuisine labels to canonical group keys

### Taxonomy File Format

```json
{
  "version": 1,
  "city": "shanghai",
  "fallbackGroup": "OTHER",
  "groups": [
    { "key": "CANTONESE", "labelZh": "粤菜", "labelEn": "Cantonese", "sortOrder": 1 },
    { "key": "SHANGHAINESE", "labelZh": "本帮菜", "labelEn": "Shanghainese", "sortOrder": 2 },
    { "key": "OTHER", "labelZh": "其他", "labelEn": "Other", "sortOrder": 99 }
  ]
}
```

### Mappings File Format

```json
{
  "version": 1,
  "city": "shanghai",
  "mappings": {
    "本帮菜": "SHANGHAINESE",
    "上海菜": "SHANGHAINESE",
    "粤菜": "CANTONESE",
    "广东菜": "CANTONESE"
  }
}
```

**Rules:**
- `cuisine_group` value in the restaurant data MUST match a `key` in the taxonomy file
- Every raw `cuisine` value MUST have a mapping entry
- If unsure, map to `"OTHER"` — but keep `OTHER` below 5% of total entries
- `labelZh` should use Simplified Chinese for mainland cities, Traditional Chinese for HK/TW/Macau
- `labelEn` should be a concise English translation

---

## File Organization

```
public/data/
├── {city-slug}/
│   ├── michelin-starred.json
│   ├── michelin-bib-gourmand.json
│   └── dianping-black-pearl.json      (if applicable)
└── taxonomy/
    ├── {city-slug}.json
    └── {city-slug}-mappings.json
```

### City Slug Convention

| City | Slug | Notes |
|------|------|-------|
| Hong Kong | `hong-kong` | |
| Macau | `macau` | |
| Beijing | `beijing` | |
| Shanghai | `shanghai` | |
| Guangzhou & Shenzhen | `guangzhou-shenzhen` | Combined in one folder |
| Chengdu | `chengdu` | |
| Hangzhou | `hangzhou` | |
| Taipei & Taichung | `taipei-taichung` | Combined in one folder |
| Tainan & Kaohsiung | `tainan-kaohsiung` | Combined in one folder |

---

## Language Requirements

All data must be **trilingual-ready**:

| Field | zh-CN (Simplified) | zh-TW (Traditional) | English |
|-------|-------|-------|---------|
| `name_zh` | Use for mainland cities | Use for HK/TW/Macau | — |
| `name_en` | — | — | Required for all |
| `address` | Simplified Chinese | Traditional Chinese | — |
| `address_en` | — | — | Required for all |
| `cuisine` | Always in Chinese (match source) | Always in Chinese (match source) | — |
| Taxonomy `labelZh` | Simplified for mainland | Traditional for HK/TW/Macau | — |
| Taxonomy `labelEn` | — | — | Required |

**Important:** Use the character set matching the city's locale:
- Mainland China: Simplified Chinese (简体中文)
- Hong Kong, Macau, Taiwan: Traditional Chinese (繁體中文)

---

## Onboarding Workflow

When adding a new city or guide:

1. **Collect raw data** from official sources (see Data Sources section)
2. **Structure into JSON** following the unified schema above
3. **Geocode all entries** — ensure `lat`/`lon` are accurate (WGS84)
4. **Create taxonomy** — `{city-slug}.json` + `{city-slug}-mappings.json`
5. **Validate** — Run schema validation (see below)
6. **Place files** in `public/data/{city-slug}/`
7. **Register in config** — Add city to `src/config/cities.ts`

### Validation Checklist

Before submitting data, verify:

- [ ] All required fields are present and non-null
- [ ] `id` values are sequential starting from 1
- [ ] `name_zh` and `name_en` are both non-empty
- [ ] `lat`/`lon` are within reasonable bounds for the city
- [ ] `cuisine_group` matches a key in the taxonomy file
- [ ] Every `cuisine` value has a mapping in the mappings file
- [ ] `guide_url` links are valid and accessible
- [ ] `edition_year` is 2026 (latest)
- [ ] No duplicate entries (same restaurant appearing twice)
- [ ] `status` is "active" for all current entries
- [ ] Address fields use correct character set (Simplified vs Traditional)
- [ ] `price_range` uses correct currency symbols (¥ for CNY, HK$ or ¥ for HKD, NT$ for TWD)

### City Config Registration

After data files are ready, register the city in `src/config/cities.ts`:

```typescript
{
  id: "shanghai",
  label: "Shanghai",
  labelZh: "上海",
  center: [31.2304, 121.4737],  // City center coordinates
  zoom: 11,
  guides: [
    {
      id: "michelin-starred",
      label: "Michelin Starred 2026",
      labelZh: "米其林星级",
      year: 2026,
      dataPath: "/data/shanghai/michelin-starred.json",
    },
    {
      id: "michelin-bib-gourmand",
      label: "Michelin Bib Gourmand 2026",
      labelZh: "米其林必比登",
      year: 2026,
      dataPath: "/data/shanghai/michelin-bib-gourmand.json",
    },
  ],
}
```

---

## Quality Standards

- **Accuracy over completeness** — It is better to omit a field than to guess wrong
- **Geocoding** — Coordinates must be within 200m of the actual location
- **No fabrication** — Every data point must come from an official source. If data is unavailable, leave the field as empty string `""` or `null`
- **Deduplication** — A restaurant appearing in multiple guides (e.g., both Michelin and Black Pearl) should have separate entries in separate files
- **Currency** — Always use the local currency for pricing. Do not convert
- **Freshness** — Only include restaurants with `status: "active"` in the 2026 edition. Remove closed/relocated entries or mark `status` accordingly
