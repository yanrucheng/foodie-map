"""Apply reviewed records and reconcile against this stage's worktree snapshot."""
import argparse
import hashlib
import json
from pathlib import Path
import re

SESSION = Path(__file__).resolve().parent
ROOT = SESSION.parents[2]
CATEGORIES = {"staple", "meat", "seafood", "dessert_drink", "french", "chinese", "japanese_course", "other"}


def read(path):
    return json.loads(path.read_text())


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True,
                                    separators=(",", ":")).encode()).hexdigest()


def original_record(record, decision):
    original = dict(record)
    if decision["before"]["present"]:
        original["dining_category"] = decision["before"]["value"]
    else:
        original.pop("dining_category", None)
    return original


def revision(city):
    return {
        "id": f"p09-dining-{city}-20260915",
        "reason": "按 P09 逐店核实主打体验；只补 dining_category，其他餐厅事实、价格、coverage 及采集/完整性核验日期不变。",
        "evidence": "repo:" + str((SESSION / f"{city}-evidence.json").relative_to(ROOT)),
    }


def execute(mode, selected_city=None):
    baseline = read(SESSION / "baseline.json")
    catalog_path = ROOT / "public/data/catalog.json"
    catalog = read(catalog_path)
    allowed = {"public/data/catalog.json", "readme/data-onboarding-guide.md"}
    summary, reviewed, labeled = [], 0, 0
    for city in catalog["cities"]:
        city_id = city["id"]
        target = city_id != "tokyo" and (selected_city is None or city_id == selected_city)
        pack_path = SESSION / f"{city_id}-evidence.json"
        pack = read(pack_path) if target else None
        decisions = {row["key"]: row for row in pack["records"]} if pack else {}
        seen = set()
        for guide in city["guides"]:
            if not guide.get("dataPath"):
                continue
            dataset = f"{city_id}/{guide['year']}/{guide['id']}"
            path = ROOT / ("public" + guide["dataPath"])
            records = read(path)
            if target:
                expected = [row["key"] for row in pack["records"] if row["key"].startswith(dataset + "#")]
                assert [f"{dataset}#{row['id']}" for row in records] == expected, dataset
                for row in records:
                    key = f"{dataset}#{row['id']}"
                    decision = decisions[key]
                    assert decision["after"] is None or decision["after"] in CATEGORIES, key
                    assert key not in seen
                    seen.add(key)
                    assert digest(original_record(row, decision)) == decision["prior_record_sha256"], key
                    if mode == "apply" and decision["after"] is not None:
                        row["dining_category"] = decision["after"]
                    if mode == "audit":
                        assert row.get("dining_category") == decision["after"], key
                    if decision["after"] is None:
                        assert ("dining_category" in row) == decision["before"]["present"], key
                    reviewed += 1
                    labeled += decision["after"] is not None
                if mode == "apply":
                    write(path, records)
                allowed.add(str(path.relative_to(ROOT)))
                provenance = guide["provenance"]
                change = revision(city_id)
                note = {"kind": "membership", "ref": change["evidence"],
                        "note": "同一已收录门店的 P09 字段依据及未决缺口；不补证年度完整身份集合，不提升 coverage。"}
                if mode == "apply":
                    assert provenance.get("revision") in [baseline["previous_revisions"][dataset], change], dataset
                    provenance["revision"] = change
                    if not any(source["ref"] == change["evidence"] for source in provenance["sources"]):
                        provenance["sources"].append(note)
                else:
                    assert provenance["revision"] == change, dataset
                    assert [x for x in provenance["sources"] if x["ref"] == change["evidence"]] == [note], dataset
                    provenance["sources"] = [x for x in provenance["sources"] if x["ref"] != change["evidence"]]
                    provenance["revision"] = baseline["previous_revisions"][dataset]
            if guide.get("legacyPath"):
                alias = ROOT / ("public" + guide["legacyPath"])
                if mode == "audit":
                    assert alias.read_bytes() == path.read_bytes(), str(alias)
                if target:
                    allowed.add(str(alias.relative_to(ROOT)))
            summary.append({"dataset": dataset, "listed": len(records),
                            "ordered_identities_sha256": digest([(r["id"], r.get("guide_url")) for r in records])})
        if target:
            assert seen == set(decisions), city_id
    if mode == "apply":
        write(catalog_path, catalog)
        print(json.dumps({"reviewed": reviewed, "labeled": labeled, "unclassified": reviewed - labeled}))
        return
    assert selected_city is None, "Audit covers the complete final stage"
    assert digest(catalog) == baseline["catalog_semantic_sha256"], "unauthorized catalog change"
    text = (ROOT / "readme/data-onboarding-guide.md").read_text()
    outside = re.sub(r"<!-- COVERAGE_TABLE_START -->.*?<!-- COVERAGE_TABLE_END -->", "", text, flags=re.S)
    assert hashlib.sha256(outside.encode()).hexdigest() == baseline["onboarding_outside_coverage_sha256"]
    unchanged = []
    for name, expected in baseline["files"].items():
        if name in allowed:
            continue
        assert hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == expected, name
        unchanged.append(name)
    result = {"status": "passed", "reviewed": reviewed, "labeled": labeled,
              "unclassified": reviewed - labeled, "listed": sum(x["listed"] for x in summary),
              "datasets": summary, "unchanged_existing_files": len(unchanged),
              "allowed_existing_file_changes": sorted(allowed),
              "all_non_dining_fields_unchanged": True, "identities_and_order_unchanged": True,
              "existing_prices_unchanged": True, "tokyo_data_and_accepted_ui_unchanged": True,
              "coverage_scope_and_provenance_dates_unchanged": True, "aliases_byte_equal": True}
    write(SESSION / "reconciliation.json", result)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["apply", "audit"])
    parser.add_argument("--city")
    args = parser.parse_args()
    execute(args.mode, args.city)
