# Cuisine Boarding

Map raw cuisine labels to city groups using the project's [shared executable contract](../../src/data/contract.ts) and [taxonomy rules](../../src/data/taxonomy.ts). Only `cuisine_group` may change. Serving form, legacy venue type, prices, names, raw cuisine and extra source fields pass through unchanged.

## Environment

Use the project's Node 24/npm environment with `npm ci`, plus Python 3.11+ standard library. `FOODIE_NODE` optionally selects a matching Node executable. Python calls the same TS implementation in one batch; do not duplicate field or mapping rules in Python.

## Usage

```sh
rtk proxy python3 -B skills/cuisine-boarding/board.py \
  --taxonomy public/data/taxonomy/hong-kong.json \
  --mappings public/data/taxonomy/hong-kong-mappings.json \
  --input /tmp/restaurants-raw.json \
  --output /tmp/restaurants-boarded.json \
  --dry-run
```

Raw input is a JSON array with positive file-local integer `id` and nonempty `name`; `cuisine` may be absent/null. Additional fields are retained. The full published contract is checked separately by `npm run validate:data`.

Remove `--dry-run` to write after all validation and serialization complete. Output must differ from input, taxonomy and mappings, including aliases to the same file. A failure preserves the input and existing output. Writes use a same-directory temporary file and atomic replacement. Dry-run creates no file or directory.

## Mapping meaning

All cities use `{version, city, mappings: [{raw, groupKey, sources?}]}`. Targets must exist in taxonomy; raw keys and group keys are unique. `sources` preserves optional source tags without making verification claims.

Match full raw text exactly. No first-token or translation fallback. Results are reported separately:

- `mapped`: exact mapping to a regular group.
- `explicit-other`: exact mapping to OTHER; any percentage is allowed.
- `missing`: no raw cuisine; use OTHER and include in the summary.
- `unmapped`: nonempty unknown label; use OTHER, emit a record/raw warning, and allow output.

Conflicting/duplicate rules, unknown targets or invalid input fail; missing information does not. Do not invent classifications to remove a warning. Normalization of price fields or coordinates belongs to an explicit migration, never to boarding.

Exit codes: 0 success (warnings allowed), 1 invalid input/rules, 2 command/read/write failure. Diagnostics are on stderr. Run `npm run validate:data` after producing complete published records; `npm run build` alone does not check JSON.

The [onboarding guide](../../readme/data-onboarding-guide.md) owns the usage workflow; P03 owns version registration and official completeness. No per-restaurant proof or confirmation process is required by this skill.

## P08 serving form and automatic presentation

The published contract now supports optional `serving_form`: `meal`, `snack`, `dessert`, `drink`, or absent/null. Absent/null stays unclassified; unknown/other/mixed, empty strings and non-string values fail published validation. This tool does not infer or convert either type field, and raw boarding remains a mapping-only operation; validate complete records afterward.

Use the existing [P08 labeling rules](../../docs/runbook/runbook-260507-1013-valid-data-source-guide.md#p08-labeling) to judge primary supply/consumption purpose from traceable evidence. Reuse a stable taxonomy key for the same meaning across cities; add a key only when existing categories cannot express the supported meaning. Full composite cuisine text maps explicitly to one key and stays intact. Every valid non-OTHER key automatically receives a deterministic color; collisions are allowed. No frontend color registration, icon URL or record-level SVG is needed or accepted.

`npm run validate:data` reports the four forms and unclassified count, including records without positions, and checks styles for all referenced taxonomy groups. Missing annotations do not cause per-record warnings or coverage failures. Production annotation and synonymous-key cleanup remain separate data tasks; implementation does not certify their completion.
