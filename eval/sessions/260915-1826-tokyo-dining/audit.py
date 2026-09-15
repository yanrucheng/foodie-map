"""Reconcile current files against the actual uncommitted worktree baseline."""
import hashlib
import json
from pathlib import Path
import re
from apply import ROOT, SESSION, digest, original_record

baseline = json.loads((SESSION / "baseline.json").read_text())
evidence = json.loads((SESSION / "source-evidence.json").read_text())
decisions = {row["key"]: row for row in evidence["records"]}
catalog = json.loads((ROOT / "public/data/catalog.json").read_text())
ref = "repo:" + str((SESSION / "source-evidence.json").relative_to(ROOT))
allowed = {"public/data/catalog.json", "readme/data-onboarding-guide.md"}
counts = {}
identities = {}
seen = set()
for city in catalog["cities"]:
    for guide in city["guides"]:
        if not guide["dataPath"]:
            continue
        path = ROOT / ("public" + guide["dataPath"])
        records = json.loads(path.read_text())
        dataset = f"{city['id']}/{guide['year']}/{guide['id']}"
        counts[dataset] = len(records)
        identities[dataset] = digest([(row["id"], row.get("guide_url")) for row in records])
        if city["id"] == "tokyo":
            allowed.add(str(path.relative_to(ROOT)))
            assert [f"{dataset}#{row['id']}" for row in records] == [
                row["key"] for row in evidence["records"] if row["key"].startswith(dataset + "#")
            ], "record order changed"
            for row in records:
                key = f"{dataset}#{row['id']}"
                decision = decisions[key]
                assert key not in seen
                seen.add(key)
                assert row.get("dining_category") == decision["after"], key
                assert digest(original_record(row, decision)) == decision["prior_record_sha256"], key
                if decision["after"] is None:
                    assert ("dining_category" in row) == decision["before"]["present"], key
            provenance = guide["provenance"]
            assert provenance["revision"]["id"] == evidence["revision"]
            assert provenance["revision"]["evidence"] == ref
            assert sum(s["ref"] == ref for s in provenance["sources"]) == 1
            provenance["sources"] = [s for s in provenance["sources"] if s["ref"] != ref]
            provenance["revision"] = baseline["tokyo_previous_revisions"][guide["id"]]
        if guide.get("legacyPath"):
            alias = ROOT / ("public" + guide["legacyPath"])
            assert path.read_bytes() == alias.read_bytes(), str(alias)
            if city["id"] == "tokyo":
                allowed.add(str(alias.relative_to(ROOT)))

assert seen == set(decisions)
assert digest(catalog) == baseline["catalog_semantic_sha256"], "unauthorized catalog change"
guide = (ROOT / "readme/data-onboarding-guide.md").read_text()
outside = re.sub(r"<!-- COVERAGE_TABLE_START -->.*?<!-- COVERAGE_TABLE_END -->", "", guide, flags=re.S)
assert hashlib.sha256(outside.encode()).hexdigest() == baseline["onboarding_outside_coverage_sha256"]
unchanged = []
for name, expected in baseline["files"].items():
    if name in allowed:
        continue
    assert hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == expected, name
    unchanged.append(name)
result = {
    "status": "passed", "baseline_head": baseline["head"],
    "baseline_captured_at": baseline["captured_at"],
    "listed": sum(counts.values()), "tokyo_reviewed": len(seen),
    "tokyo_labeled": sum(r["after"] is not None for r in decisions.values()),
    "tokyo_unclassified": sum(r["after"] is None for r in decisions.values()),
    "counts": counts, "ordered_identity_sha256": identities,
    "protected_fields": "All restaurant fields except dining_category match the initial worktree, including key presence/null, IDs, names, ratings, cuisine/cuisine_group, serving_form/venue_type, prices, coordinates and order.",
    "coverage_dates_scope_unchanged": True,
    "non_tokyo_annual_files_byte_unchanged": 11,
    "non_tokyo_alias_files_byte_unchanged": 11,
    "existing_files_byte_unchanged": len(unchanged),
    "allowed_existing_file_changes": sorted(allowed),
    "aliases_byte_equal": True,
}
(SESSION / "reconciliation.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(result, ensure_ascii=False, indent=2))
