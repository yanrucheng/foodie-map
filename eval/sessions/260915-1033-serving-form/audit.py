"""Apply reviewed serving-form decisions, or reconcile every record against the saved baseline."""
import argparse
import copy
import hashlib
import json
from collections import Counter
from pathlib import Path

SESSION = Path(__file__).resolve().parent
ROOT = SESSION.parents[2]
FORMS = ("meal", "snack", "dessert", "drink", "unclassified")


def read(path):
    return json.loads(path.read_text())


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True,
                                     separators=(",", ":")).encode()).hexdigest()


def without_form(records):
    return [{k: v for k, v in record.items() if k != "serving_form"} for record in records]


def counts(records):
    counter = Counter(record.get("serving_form") or "unclassified" for record in records)
    return {key: counter[key] for key in FORMS}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--baseline", type=Path, default=SESSION / "outputs/baseline")
    args = parser.parse_args()
    manifest = read(SESSION / "baseline.json")
    evidence = read(SESSION / "source-evidence.json")
    decisions = {row["key"]: row for row in evidence["records"]}
    assert len(decisions) == len(evidence["records"]), "Duplicate evidence identity"
    before_catalog = read(args.baseline / "public/data/catalog.json")
    catalog = read(ROOT / "public/data/catalog.json")
    changed_catalog = copy.deepcopy(before_catalog)
    consumed = set()
    summary = {"baseline_head": manifest["head"], "datasets": [], "records": [],
               "added": 0, "removed": 0, "changed_other_fields": 0}
    for city_index, city in enumerate(before_catalog["cities"]):
        for guide_index, guide in enumerate(city["guides"]):
            if not guide.get("dataPath"):
                continue
            path = "public" + guide["dataPath"]
            before_file = args.baseline / path
            assert hashlib.sha256(before_file.read_bytes()).hexdigest() == manifest["files"][path]
            before = read(before_file)
            current = read(ROOT / path)
            dataset = f"{city['id']}/{guide['year']}/{guide['id']}"
            assert [r["id"] for r in before] == [r["id"] for r in current], dataset + ": identity/order changed"
            assert without_form(before) == without_form(current), dataset + ": other fields changed"
            expected = copy.deepcopy(before)
            changed = 0
            for old, record in zip(before, expected):
                key = f"{dataset}#{old['id']}"
                decision = decisions.get(key)
                if decision is not None:
                    consumed.add(key)
                    assert decision["before"] == {"present": "serving_form" in old, "value": old.get("serving_form")}
                    assert decision["after"] in (*FORMS[:4], None)
                    if decision["after"] is not None:
                        record["serving_form"] = decision["after"]
                    else:
                        assert decision.get("needed") and decision.get("reason"), key + ": unexplained gap"
                changed += record != old
                summary["records"].append({"key": key, "in_scope": decision is not None, "before": old.get("serving_form"),
                                           "after": record.get("serving_form"),
                                           "other_fields_sha256": digest(without_form([old])[0]),
                                           "other_fields_equal": True})
            if changed:
                changed_catalog["cities"][city_index]["guides"][guide_index]["provenance"]["revision"] = {
                    "id": evidence["revision"],
                    "reason": "按门店主营供给及主要消费目的补齐 serving_form；餐厅其他事实及 coverage、采集/完整性核验时间不变。",
                    "evidence": "repo:" + str(SESSION.relative_to(ROOT) / "source-evidence.json"),
                }
            if args.apply:
                assert current == before, dataset + ": concurrent serving_form edits; refuse overwrite"
                if changed:
                    (ROOT / path).write_text(json.dumps(expected, ensure_ascii=False, indent=2) + "\n")
                current = expected
            assert current == expected, dataset + ": does not match reviewed decisions"
            alias = guide.get("legacyPath")
            if alias and not args.apply:
                assert (ROOT / ("public" + alias)).read_bytes() == (ROOT / path).read_bytes(), "stale alias"
            if not changed:
                assert hashlib.sha256((ROOT / path).read_bytes()).hexdigest() == manifest["files"][path]
                if alias:
                    assert hashlib.sha256((ROOT / ("public" + alias)).read_bytes()).hexdigest() == manifest["files"]["public" + alias]
            summary["datasets"].append({"dataset": dataset, "count": len(before), "changed": changed,
                                        "before": counts(before), "after": counts(current),
                                        "before_sha256": manifest["files"][path],
                                        "after_sha256": hashlib.sha256((ROOT / path).read_bytes()).hexdigest(),
                                        "other_fields_sha256": digest(without_form(before)),
                                        "other_fields_equal": True})
    assert consumed == set(decisions), "Evidence includes non-catalog records"
    if args.apply:
        assert catalog == before_catalog, "Concurrent catalog edits; refuse overwrite"
        (ROOT / "public/data/catalog.json").write_text(json.dumps(changed_catalog, ensure_ascii=False, indent=2) + "\n")
    else:
        assert catalog == changed_catalog, "Catalog changed beyond required revision entries"
    summary["total"] = {"count": len(summary["records"]), "processed": len(consumed),
                        "changed": sum(d["changed"] for d in summary["datasets"]),
                        "before": {k: sum(d["before"][k] for d in summary["datasets"]) for k in FORMS},
                        "after": {k: sum(d["after"][k] for d in summary["datasets"]) for k in FORMS}}
    (SESSION / "outputs/reconciliation.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(summary["total"], ensure_ascii=False))
    print("All record identities, order and non-serving_form fields match the baseline.")
    print("Catalog changes are restricted to revision entries; coverage and provenance dates are unchanged.")


if __name__ == "__main__":
    main()
