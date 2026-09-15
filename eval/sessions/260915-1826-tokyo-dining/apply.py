"""Apply only the reviewed Tokyo P09 decisions; preserve all other facts."""
import hashlib
import json
from pathlib import Path

SESSION = Path(__file__).resolve().parent
ROOT = SESSION.parents[2]


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True,
                                    separators=(",", ":")).encode()).hexdigest()


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def original_record(record, evidence):
    original = dict(record)
    before = evidence["before"]
    if before["present"]:
        original["dining_category"] = before["value"]
    else:
        original.pop("dining_category", None)
    return original


if __name__ == "__main__":
    evidence = json.loads((SESSION / "source-evidence.json").read_text())
    baseline = json.loads((SESSION / "baseline.json").read_text())
    decisions = {row["key"]: row for row in evidence["records"]}
    catalog_path = ROOT / "public/data/catalog.json"
    catalog = json.loads(catalog_path.read_text())
    ref = "repo:" + str((SESSION / "source-evidence.json").relative_to(ROOT))
    for city in catalog["cities"]:
        if city["id"] != "tokyo":
            continue
        for guide in city["guides"]:
            dataset = f"tokyo/{guide['year']}/{guide['id']}"
            path = ROOT / ("public" + guide["dataPath"])
            records = json.loads(path.read_text())
            for record in records:
                decision = decisions[f"{dataset}#{record['id']}"]
                assert digest(original_record(record, decision)) == decision["prior_record_sha256"]
                assert record["guide_url"] == decision["guide_url"]
                if decision["after"] is not None:
                    record["dining_category"] = decision["after"]
                else:
                    assert record.get("dining_category") is None
            write(path, records)
            provenance = guide["provenance"]
            assert provenance.get("revision") in [baseline["tokyo_previous_revisions"][guide["id"]], {
                "id": evidence["revision"],
                "reason": "按 P09 逐店核实主打体验并补充 dining_category；其他餐厅事实、已有价格、coverage 和采集/完整性核验时间不变。",
                "evidence": ref,
            }]
            provenance["revision"] = {
                "id": evidence["revision"],
                "reason": "按 P09 逐店核实主打体验并补充 dining_category；其他餐厅事实、已有价格、coverage 和采集/完整性核验时间不变。",
                "evidence": ref,
            }
            if not any(source["ref"] == ref for source in provenance["sources"]):
                provenance["sources"].append({
                    "kind": "membership", "ref": ref,
                    "note": "同一已收录门店的 P09 字段核实证据及未决缺口；不补证年度身份集合完整性，不提升 partial。",
                })
            print(dataset, len(records), "records;", sum(r.get("dining_category") is not None for r in records), "labeled")
    write(catalog_path, catalog)
