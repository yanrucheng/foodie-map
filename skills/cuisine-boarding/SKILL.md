# Cuisine Boarding Skill

Onboard new Michelin guide restaurant data into the foodie-map system by mapping raw cuisine labels to canonical taxonomy groups.

## Prerequisites

- Python 3.11+
- [uv](https://docs.astral.sh/uv/) package manager

## Quick Start

```bash
cd skills/cuisine-boarding
uv run board.py --help
```

## Workflow: Onboard a New Guide

### 1. Prepare raw restaurant data

Scrape or collect restaurant data into a JSON array. Each record must have at minimum:

```json
{
  "id": 1,
  "name": "Restaurant Name",
  "cuisine": "粤菜"
}
```

### 2. Dry-run to detect unmapped labels

```bash
uv run board.py \
  --taxonomy ../../public/data/taxonomy/hong-kong.json \
  --mappings ../../public/data/taxonomy/hong-kong-mappings.json \
  --input /tmp/new-guide-raw.json \
  --output /tmp/new-guide-out.json
```

Any unmapped cuisine labels will emit `WARN` messages to stderr. The script will fail (exit code 1) if the fallback rate exceeds 5%.

### 3. Extend mappings for unmapped labels

Open `public/data/taxonomy/hong-kong-mappings.json` and add new entries:

```json
{ "raw": "新发现的菜系", "groupKey": "CANTONESE", "sources": ["new-guide"] }
```

Re-run the dry-run until 0 warnings appear.

### 4. Run final transformation

```bash
uv run board.py \
  --taxonomy ../../public/data/taxonomy/hong-kong.json \
  --mappings ../../public/data/taxonomy/hong-kong-mappings.json \
  --input /tmp/new-guide-raw.json \
  --output ../../public/data/hong-kong/new-guide.json
```

### 5. Validate and commit

- Verify the output JSON has correct `cuisine_group` values
- Run `npm run build` in the project root to ensure TypeScript passes
- Commit the updated data and mapping files

## CLI Reference

```
usage: board.py [-h] --taxonomy PATH --mappings PATH --input PATH --output PATH
                [--max-fallback-pct PCT]

Transform restaurant data by mapping cuisine labels to canonical groups.

required arguments:
  --taxonomy PATH        Path to the taxonomy registry JSON file
  --mappings PATH        Path to the cuisine mappings JSON file
  --input PATH           Path to the input restaurant JSON file
  --output PATH          Path to the output restaurant JSON file

optional arguments:
  --max-fallback-pct PCT Maximum allowed percentage of restaurants mapped to
                         OTHER (default: 5.0)
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success — all restaurants mapped, output written |
| 1 | Validation failure — fallback rate exceeded threshold or invalid group key |

## Resolution Logic

The script resolves `cuisine_group` for each restaurant in this order:

1. **Exact match** — raw cuisine string found in mapping table
2. **First-token fallback** — for compound values (e.g., `"时尚法国菜, 创新菜"`), split by `", "` and try the first token
3. **Fallback to OTHER** — emit a warning to stderr

## Extending the Taxonomy

### Add a new canonical group

1. Edit `public/data/taxonomy/hong-kong.json`:
   ```json
   { "key": "NEW_GROUP", "labelZh": "新菜系", "labelEn": "New Cuisine", "sortOrder": 13 }
   ```
2. Add color mapping in `src/config/cuisineRegistry.ts`
3. Add at least one mapping entry in `hong-kong-mappings.json`

### Add a new raw label mapping

Edit `public/data/taxonomy/hong-kong-mappings.json`:

```json
{ "raw": "新的原始标签", "groupKey": "EXISTING_GROUP", "sources": ["guide-name"] }
```

No frontend changes required — the frontend derives groups dynamically from data.

## Validation Criteria

| Criterion | Threshold |
|-----------|-----------|
| Fallback rate (% mapped to OTHER) | ≤ 5% per dataset |
| Enum membership | Every `cuisine_group` must exist in taxonomy registry |
| Coverage | 0 unmapped labels for known/committed data |

## Input/Output Contract

### Input (raw restaurant JSON)

```json
[
  {
    "id": 1,
    "name": "大班楼",
    "cuisine": "粤菜",
    "cuisine_group": "anything (will be overwritten)",
    "...": "other fields preserved as-is"
  }
]
```

### Output (transformed restaurant JSON)

```json
[
  {
    "id": 1,
    "name": "大班楼",
    "cuisine": "粤菜",
    "cuisine_group": "CANTONESE",
    "...": "other fields preserved as-is"
  }
]
```

All fields are passed through unchanged except `cuisine_group`, which is overwritten with the resolved canonical key.

## Directory Structure

```
skills/cuisine-boarding/
├── SKILL.md           ← This file
├── board.py           ← Pipeline script (stdlib only, no external deps)
├── pyproject.toml     ← uv-compatible project definition
└── uv.lock            ← Lockfile
```
