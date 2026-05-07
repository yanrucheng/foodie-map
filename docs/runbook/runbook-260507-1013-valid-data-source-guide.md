---
id: "runbook-260507-1013-valid-data-source-guide"
title: "Operational Guide - Finding Valid Restaurant Data Sources"
type: runbook
status: active
created: 2026-05-07
updated: 2026-05-07
parent: "index-runbook"
depends-on:
  - "prd-foodie-map-frontend"
  - "prd-260504-cuisine-taxonomy"
superseded-by: ""
author: "gpt-5.4"
tags: ["data", "source-validation", "geocoding", "michelin", "runbook"]
source: "readme/data-onboarding-guide.md; eval/data-quality-audit-260506.md"
---

# Operational Guide - Finding Valid Restaurant Data Sources

## Purpose

This runbook explains how to determine whether a source is valid before using it to create or repair restaurant data in this repository.

It is based on two project realities:

1. `readme/data-onboarding-guide.md` already defines the official upstream sources and the target schema.
2. `eval/data-quality-audit-260506.md` shows what happens when data is taken from the wrong source, copied without verification, or marked as successful when it is only a fallback guess.

The goal is not just to "find some data." The goal is to find a source that is valid for the specific field being filled, verify it, and preserve enough provenance so the next maintainer can trust the record.

## Core Finding

The most important finding is this:

**A source is not globally valid. A source is valid only for the fields it naturally owns.**

Examples:

- Michelin is the source of truth for guide metadata such as star level, cuisine label, guide URL, and the listing-level address shown by Michelin.
- Google Maps Places API is usually the best source for `lat`, `lon`, `address_en`, `phone`, and `website` in Hong Kong, Macau, Taiwan, and other internationalized address systems.
- Amap is usually the best source for `lat`, `lon`, and Chinese address normalization in mainland China.
- A restaurant's own website is often valid for `phone`, `website`, booking links, and sometimes address wording, but it is not authoritative for Michelin-specific fields.

This means a source can be:

- valid for one field,
- weak for another field,
- and unacceptable for a third field.

Do not promote a source beyond the scope it actually owns.

## What "Valid" Means In This Repo

A source is valid only when it passes all of the checks below.

### 1. Authoritative

The source must be the organization that owns the fact, or the closest machine-readable derivative of that owner's publication.

- Michelin owns Michelin guide metadata.
- Map providers own map coordinates and normalized location records.
- The restaurant itself owns its own website URL and direct phone number.

### 2. Field-Appropriate

The source must be suitable for the exact field being filled.

- A review article may mention an address, but it is still not an acceptable primary source for `guide_url`.
- A Michelin listing may contain an address, but if the coordinates are missing from Michelin structured data, you still need a geocoding source for `lat` and `lon`.

### 3. Current Enough

The source must correspond to the current guide edition or current restaurant state.

- Use the latest Michelin edition targeted by the dataset.
- Reject stale snapshots that refer to closed, moved, or pre-renaming locations unless the dataset intentionally models historical state.

### 4. Individually Verifiable

Another maintainer must be able to re-run the lookup and reach the same conclusion.

- Prefer stable URLs over search-result-only evidence.
- Prefer detail pages over snippets.
- Prefer exact listing matches over approximate name matches.

### 5. Geographically Coherent

The source must place the restaurant in the correct city, district, and street context.

- If the area says Central but the English address says Yuen Long, the record is not yet trustworthy.
- If ten unrelated restaurants share one identical point, the coordinates are almost certainly a fallback and not valid.

## Source Priority By Field

Use this table as the default operating policy.

| Field Group | Primary Source | Secondary Source | Last Resort | Notes |
|-------------|----------------|------------------|-------------|-------|
| `name_zh`, `name_en`, `name`, `guide_type`, `star_rating`, `edition_year`, `is_new`, `cuisine`, `price_range`, `guide_url` | Michelin Guide listing/detail page | Michelin page structured data | None | Michelin owns these facts |
| `area`, `primary_area`, `address`, `address_en` | Michelin listing/detail page | Region-appropriate map provider | Restaurant website | Michelin is preferred, map provider is for normalization or gap fill |
| `lat`, `lon` in Hong Kong, Macau, Taiwan, mixed-language addresses | Michelin structured data if present | Google Maps Places API | Manual map lookup with evidence | Best when querying exact name + address |
| `lat`, `lon` in mainland China | Michelin structured data if present | Amap API | Manual map lookup with evidence | Prefer Chinese name + Chinese address |
| `phone`, `website` | Restaurant official site | Michelin listing | Google Maps Places API | Use only if the repo still stores these fields |
| `signature_dishes` | Michelin inspector copy if explicit | Restaurant official site | Empty string or null per schema rules | Do not invent dishes from reviews |
| `cuisine_group` | Local taxonomy mapping file | Fallback to `OTHER` per taxonomy rules | None | This is derived, not scraped directly |

## Approved Sources

### Tier 1 - Direct Official Source

Use these first whenever available.

#### Michelin Guide

Use Michelin as the single source of truth for:

- restaurant names,
- guide membership,
- star or Bib status,
- cuisine labels,
- Michelin-visible address strings,
- price symbols,
- guide detail URL,
- and sometimes structured location metadata.

Why it is valid:

- It is the publisher of the guide being modeled.
- It provides stable entity pages.
- It aligns with the business meaning of the dataset.

Weaknesses:

- Some entries are sparse.
- Some pages may not expose all fields in visible HTML.
- Structured data may be absent or blocked in some fetch contexts.

#### Michelin Structured Data

Before using an external geocoder, inspect Michelin detail pages for JSON-LD, meta tags, or structured fields that already contain exact coordinates or canonical address strings.

Why it is especially valuable:

- It keeps metadata and coordinates tied to the same canonical restaurant page.
- It reduces mismatch risk when names are duplicated or translated differently on map platforms.

### Tier 2 - Region-Appropriate Geospatial Source

Use these when coordinates or normalized addresses are missing from Michelin.

#### Google Maps Places API

Prefer for:

- Hong Kong,
- Macau,
- Taiwan,
- multilingual or internationalized addresses,
- English address normalization,
- phone and website backfill when needed.

Query pattern:

- `name_en + city`
- then `name_en + address_en`
- then `name_zh + city` if English fails

Why it is valid:

- It handles mixed-language address systems well.
- It usually resolves English-friendly address formatting.
- It is strong at public-facing POI matching in dense urban environments.

Validation rule:

- Never accept the first result blindly.
- Match the result name, district, and address against Michelin before copying coordinates.

#### Amap API

Prefer for:

- mainland China,
- Chinese address normalization,
- Chinese district and locality confirmation,
- geocoding when English spellings are noisy or inconsistent.

Query pattern:

- `name_zh + city`
- then `name_zh + address`
- then `name_en + city` only if Chinese inputs fail

Why it is valid:

- It is stronger on mainland Chinese addressing and locality matching than western map providers.

Validation rule:

- Use the Chinese Michelin address or Chinese restaurant name whenever possible.
- Confirm the returned district matches the Michelin listing.

### Tier 3 - Restaurant-Owned Source

Use only for fields the restaurant truly owns.

Valid uses:

- official website URL,
- phone number,
- reservation link,
- branding spelling used on the venue's own channels.

Invalid uses:

- Michelin star rating,
- Michelin cuisine classification,
- Michelin guide inclusion,
- inferred coordinates from a footer address without map confirmation.

### Tier 4 - Manual Lookup

Manual lookup is allowed only when machine-readable sources fail.

Examples:

- direct page fetch is blocked,
- structured data is missing,
- API queries are ambiguous,
- the restaurant has recently moved and the official site and map provider disagree.

Manual lookup is only valid if you preserve evidence in the data or commit context:

- exact page used,
- why the match is believed correct,
- what conflicting candidates were rejected.

Set `geo_source` truthfully. Do not hide manual work behind a fake automated source label.

## Rejected Sources

These are not acceptable as primary sources for canonical dataset fields.

- random blogs,
- food review roundups,
- social posts,
- aggregator rewrites that do not own the original fact,
- AI summaries,
- search engine snippets without opening the real page,
- map search results accepted without address confirmation,
- copied coordinates from another restaurant in the same building,
- any value that was inferred only because "it looks nearby."

These sources may help discovery, but not final truth.

## Operational Workflow

Follow this workflow every time you add or repair restaurant data.

### Step 1 - Identify The Field Owner

Before searching, classify the missing or suspicious field.

Questions:

- Is this guide metadata?
- Is this geospatial data?
- Is this contact data?
- Is this derived taxonomy data?

Do not search broadly before deciding the owner. Broad searching too early causes source drift.

### Step 2 - Start With The Canonical Entity Page

For Michelin datasets, first find the Michelin listing or detail page for the restaurant.

Capture:

- Chinese name,
- English name,
- cuisine,
- star level or Bib status,
- visible address,
- price symbols,
- canonical page URL.

If the Michelin page cannot be found, stop and question whether the record itself is valid.

### Step 3 - Extract Structured Data Before External Geocoding

Inspect the Michelin page for:

- JSON-LD,
- meta tags,
- embedded structured location objects,
- canonical URLs,
- hidden but parseable address fragments.

This is the highest-confidence shortcut for exact coordinates when present.

### Step 4 - Use The Correct Geocoder For The Region

Use:

- Google Maps Places API for Hong Kong, Macau, Taiwan, and international address contexts.
- Amap for mainland China.

Build the query from the most canonical fields first:

- official name,
- city,
- official address from Michelin.

Do not start from a fuzzy cuisine or hotel name search when the Michelin page already gives a better entity key.

### Step 5 - Cross-Check The Match

A geocoder result is valid only if it matches at least these dimensions:

- restaurant name or a clearly equivalent alias,
- city,
- district or area,
- street or mall/building context where applicable.

For dense cities, use stricter checks because the error surface is high.

Example:

- In Hong Kong Central, many restaurants may exist in the same commercial zone.
- A match that only shares the building but not the restaurant name is not acceptable.

### Step 6 - Record Provenance Truthfully

When you save the data:

- set `geo_source` to the real source,
- set `geocode_success` only if the coordinates are actually believed correct,
- preserve the Michelin `guide_url`,
- keep taxonomy derivation separate from raw cuisine extraction.

Do not mark `geocode_success: true` for fallback coordinates, district centroids, hotel centroids, or copied neighbor points.

### Step 7 - Validate In Dataset Context

A field can look correct in isolation and still be wrong in the file.

Check:

- duplicate coordinates across many unrelated entries,
- district/address contradictions,
- missing names paired with supposedly exact coordinates,
- `guide_url` missing while all other fields look filled,
- impossible city bounds,
- placeholder values marked as success.

The audit file in this repo is strong evidence that dataset-level validation is required after record-level lookup.

## How To Judge Coordinate Validity

Coordinates are the easiest field to get wrong while still looking superficially plausible.

Use this rubric.

### Valid Coordinate Match

Accept when all are true:

- the result name matches the restaurant or a known exact alias,
- the address matches Michelin at least at district and street/building level,
- the point is not obviously a district centroid or hotel centroid unless the restaurant truly occupies that location,
- the point is consistent with nearby venue context,
- the provenance field reflects the real source.

### Suspicious Coordinate Match

Treat as suspicious when any of these occur:

- many records share the exact same coordinate,
- the returned point is the district center,
- the provider returns a generic mall or hotel instead of the restaurant,
- the result only matches on cuisine or hotel brand,
- the district conflicts with the address,
- the result is outside the city or across the harbor/river without explanation.

### Invalid Coordinate Match

Reject when:

- the only evidence is a fuzzy name similarity,
- the point is `0,0`,
- the point belongs to another restaurant,
- the point is a copied fallback for multiple records,
- the coordinates were never actually verified but `geocode_success` is `true`.

## Failure Modes Seen In This Repo

These are concrete lessons extracted from the current repository state and audit work.

### 1. Null Coordinates Break Rendering

When `lat` and `lon` are absent, the restaurant cannot render on the map.

Operational lesson:

- geocoding is not optional for map viability,
- but fake geocoding is worse than incomplete geocoding because it creates silent misinformation.

### 2. Shared Fallback Coordinates Create False Confidence

The audit flagged multiple Hong Kong starred entries with the same identical point. This is a classic sign of fallback geocoding.

Operational lesson:

- identical coordinates across unrelated restaurants should trigger immediate review,
- `geocode_success` must not stay `true` for these rows.

### 3. Area And Address Can Contradict Each Other

The audit found Bib Gourmand entries where the `area` field did not match `address_en`.

Operational lesson:

- area classification is not valid just because a string exists,
- use address and map context to confirm district-level consistency.

### 4. Sparse Stub Records Tend To Cascade Into Multiple Wrong Fields

Missing `name_zh`, `cuisine`, `address`, `price_range`, and `guide_url` often travel together.

Operational lesson:

- once a record is identified as a stub, restart from Michelin and rebuild the record systematically,
- do not patch such records field-by-field from mixed low-confidence sources.

## Decision Rules For Common Scenarios

### Scenario A - Michelin Page Exists And Contains Most Fields

Action:

- trust Michelin for metadata,
- attempt Michelin structured extraction for coordinates,
- only then geocode externally.

### Scenario B - Michelin Page Exists But Coordinates Are Missing

Action:

- use Michelin name and address as the query seed,
- use Google Maps for Hong Kong, Macau, Taiwan,
- use Amap for mainland China,
- cross-check result before saving.

### Scenario C - Search Result Returns Multiple Branches

Action:

- compare district,
- compare building or mall,
- compare Michelin cuisine and price context if useful,
- reject ambiguous results until one candidate is clearly better.

### Scenario D - Restaurant Website Conflicts With Michelin

Action:

- trust Michelin for guide metadata,
- trust the restaurant site for direct contact fields,
- use the more current location source only after checking whether the venue moved,
- if movement is real, update `status` and location carefully instead of silently replacing old data.

### Scenario E - No Reliable Coordinate Can Be Confirmed

Action:

- do not invent a point,
- follow the onboarding guide's sentinel convention for new data generation,
- keep `geocode_success` false,
- leave an audit trail in the commit or task notes.

## Evidence Collection Template

Use this checklist while sourcing each problematic record.

| Item | Required | Notes |
|------|----------|-------|
| Michelin page URL | Yes | Canonical identity anchor |
| Chinese and English restaurant names | Yes | Needed for cross-platform matching |
| Michelin-visible address | Yes | Query seed and district validator |
| Region-appropriate map result URL or evidence | Yes for geocoding | Needed to defend `lat` and `lon` |
| Reason selected candidate is correct | Yes | One-line justification is enough |
| Rejected conflicting candidates | When applicable | Important for branch names and hotel venues |
| Final `geo_source` value | Yes | Must reflect actual provenance |
| Final `geocode_success` value | Yes | Must reflect actual confidence |

## Practical Search Patterns

Use these patterns in descending order.

### Michelin Metadata Search

- `site:guide.michelin.com "<restaurant name>"`
- `site:guide.michelin.com "<restaurant name>" "<city>"`
- browse the correct Michelin regional landing page and filter manually when search is noisy

### Hong Kong / Macau / Taiwan Geocoding Search

- `"<name_en>" "<city>"`
- `"<name_en>" "<address_en>"`
- `"<name_zh>" "<city>"`

### Mainland China Geocoding Search

- `"<name_zh>" "<city>"`
- `"<name_zh>" "<address>"`
- `"<name_en>" "<city>"` only as fallback

## Anti-Patterns

Never do the following:

- fill coordinates from a generic city-center point,
- keep `geocode_success: true` after discovering the point is a fallback,
- use one map result for multiple restaurants without proof they share the same location,
- construct `guide_url` guesses without confirming the actual Michelin page,
- copy cuisine from a third-party review site,
- translate or romanize names first and search only on the translated version,
- accept a field because it "looks plausible" when it has not been cross-checked.

## Minimum Acceptance Checklist

Before considering a repaired record complete, confirm all of the following:

- the record has a canonical Michelin identity,
- every field came from a source that owns that field,
- coordinates were checked against address context,
- provenance fields are truthful,
- there are no obvious contradictions inside the record,
- the result does not introduce dataset-level anomalies.

If any item fails, the record is not ready.

## Recommended Operating Principle

When in doubt, use this hierarchy:

1. start from the source that owns the fact,
2. use the region-specific geocoder only for spatial fields,
3. cross-check before writing,
4. record provenance truthfully,
5. prefer an explicitly incomplete record over a confidently wrong record.

That principle is the safest way to keep the map usable while preventing silent data corruption.
