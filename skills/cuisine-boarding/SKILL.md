# Cuisine Boarding

Map raw cuisine labels to city groups using the project's [shared executable contract](../../src/data/contract.ts) and [taxonomy rules](../../src/data/taxonomy.ts). Only `cuisine_group` may change. Dining category when supplied, serving form, legacy venue type, prices, names, raw cuisine and extra source fields pass through unchanged.

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

## Labeling rules and automatic presentation

The [onboarding guide's support status](../../readme/data-onboarding-guide.md#权威入口与输入) owns which fields are implemented. [P09 dining-experience icons and price badges](../../docs/plan/plan-260915-1504-dining-experience-markers.md) is implemented locally: the optional `dining_category` is validated by the shared schema and consumed by icons, filters, details and per-guide diagnostics. Source `price_range` drives grade badges without rewriting prices. Legacy fields remain valid. See [P09 tasks](../../openspec/changes/p09-dining-experience-markers/tasks.md) for developer evidence and independent acceptance; formal annotation is a separate authorized data task.

Use the existing [P09 labeling rules](../../docs/runbook/runbook-260507-1013-valid-data-source-guide.md#p09-labeling) as the sole semantic procedure for primary dining experience, cuisine and price. The shared executable schema owns valid field values. This tool does not infer dining categories or convert legacy types. It performs exact full-raw cuisine mapping only; validate complete records afterward.

Reuse stable taxonomy keys for the same meaning across cities, preserve composite source labels and source prices, and let the shared presentation module choose colors, icons and grade badges. Missing information remains missing; an icon fallback is not a completed annotation. Do not add a second category table or price conversion in this skill or in Python.

Use the validation and per-guide handoff requirements in the onboarding guide/runbook. Production dining-category annotation and synonymous-key cleanup remain separate data tasks; framework implementation does not certify their completion. Existing source facts and uncommitted data revisions must be preserved.
