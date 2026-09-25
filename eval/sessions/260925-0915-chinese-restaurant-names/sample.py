"""Reproduce only the designed eight-record sample; never write production data."""
import copy
import hashlib
import html
import json
import pathlib
import shutil
import sys
from datetime import datetime, timezone
from urllib.parse import urlsplit

SESSION = pathlib.Path(__file__).resolve().parent
REPO = SESSION.parents[2]
OUT = SESSION / "outputs"
CANDIDATE = OUT / "candidate/public/data"
EVIDENCE = json.loads((SESSION / "source-evidence.json").read_text())
RECORDS = EVIDENCE["records"]
ALLOWED = {"beijing/2026/michelin-starred#7", "beijing/2026/michelin-starred#11",
           "beijing/2026/michelin-bib-gourmand#10", "beijing/2026/michelin-bib-gourmand#13"}


def digest(body):
    return hashlib.sha256(body).hexdigest()


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def manifest(root):
    return {str(p.relative_to(root)): digest(p.read_bytes())
            for p in sorted(root.rglob("*")) if p.is_file()}


def check_sources():
    results = []
    for item in RECORDS:
        record = next(r for r in json.loads((REPO / item["data_path"]).read_text()) if r["id"] == item["id"])
        assert record == item["before_record"], item["key"]
        assert digest(json.dumps(record, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()) == item["before_record_sha256"]
        assert digest((REPO / item["local_capture"]).read_bytes()) == item["capture_sha256"]
        original = urlsplit(item["guide_url"])
        translated = urlsplit(item["final_url"])
        assert original.netloc == translated.netloc == "guide.michelin.com"
        assert original.path.startswith("/en/") and translated.path.startswith("/sg/zh_CN/")
        # These are explicit evidence URL pairs, not a generic matching algorithm.
        assert original.path.removeprefix("/en/") == translated.path.removeprefix("/sg/zh_CN/")
        browser = json.loads((REPO / item["local_browser_record"]).read_text())
        assert item["source_heading"] in browser["h1"]
        assert item["source_address"] == browser["address"]
        results.append({"key": item["key"], "capture_sha256": item["capture_sha256"],
                        "path_without_known_locale": original.path.removeprefix("/en/"),
                        "record_address": record["address"], "source_address": item["source_address"],
                        "identity_basis": item["identity_basis"], "limitations": item["limitations"]})
    return results


def render_preview():
    esc = html.escape
    cards = []
    for item in RECORDS:
        changed = item["key"] in ALLOWED
        stem = pathlib.Path(item["local_capture"]).stem
        browser = json.loads((REPO / item["local_browser_record"]).read_text())
        (OUT / "sources" / (stem + ".txt")).write_text(
            f'{item["source_url"]}\n读取时间：{item["captured_at"]}\n'
            f'目标主标题：{item["source_heading"]}\n目标地址：{item["source_address"]}\n\n'
            + browser["text"])
        guide = item["before_record"]["guide_type"]
        status = "修改" if changed else "保持"
        limitations = " ".join(item["limitations"] + ([item["candidate_scope_note"]] if item.get("candidate_scope_note") else []))
        cards.append(f'''<article class="card {'changed' if changed else ''}">
<div class="eyebrow">北京 · {'星级' if guide == 'michelin-starred' else '必比登'} #{item['id']} <span>{status}</span></div>
<div class="comparison"><div><small>当前显示名</small><p>{esc(item['before']['name_zh'])}</p></div>
<div><small>候选显示名</small><h2>{esc(item['candidate_name_zh'])}</h2></div></div>
<p class="address">{esc(item['before_record']['address'])}</p>
<div class="source"><small>米其林原始主标题</small><p class="quote">{esc(item['source_heading'])}</p>
<small>来源原始地址</small><p>{esc(item['source_address'])}</p></div>
<p>{esc(item['reason'])}</p><p class="limits">{esc(limitations)}</p>
<p class="time">读取：{esc(item['captured_at'])}（UTC）</p>
<nav><a href="{esc(item['source_url'])}" target="_blank" rel="noopener">官方来源 ↗</a>
<a href="sources/{stem}.txt" target="_blank">本地原文摘录</a>
<a href="sources/{stem}.html" target="_blank">原始 DOM 文本</a>
<a href="/?city=beijing&amp;year=2026&amp;guide={guide}" target="_blank">在真实应用中搜索 ↗</a></nav>
</article>''')
    page = '''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>北京 8 家小样，待用户确认</title><style>
*{box-sizing:border-box}body{margin:0;background:#f5f3ee;color:#26332f;font:16px/1.65 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}
main{max-width:1100px;margin:auto;padding:42px 24px 70px}header{max-width:860px;margin-bottom:32px}h1{font-size:34px;line-height:1.35;margin:12px 0}h2{font-size:24px;line-height:1.4;margin:8px 0;color:#115846}p{margin:8px 0}small,.time{font-size:13px;color:#596660}
.badge{color:#84510b;background:#f4e6ca;border-radius:20px;padding:6px 12px;font-size:14px}.intro{font-size:18px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.card{background:white;border:1px solid #d8dfd8;border-radius:14px;padding:24px}.card:first-child{grid-column:1/-1;border-top:4px solid #17664f}.eyebrow{font-size:13px;color:#596660}.eyebrow span{float:right;color:#52615c}.changed .eyebrow span{color:#11634b;font-weight:700}.comparison{display:grid;grid-template-columns:1fr 1.25fr;gap:18px;margin:18px 0}.comparison p{font-size:20px}.source{background:#f4f6f3;padding:16px;border-radius:8px;margin:16px 0}.quote{font-size:19px;font-weight:600}.limits{font-size:14px;color:#715530}.address{font-size:14px}a{color:#11634b;text-underline-offset:4px}nav{display:flex;gap:14px;flex-wrap:wrap;font-size:14px;margin-top:16px}.note{border-left:3px solid #cda766;padding-left:16px;margin-top:20px}
@media(max-width:700px){main{padding:24px 16px}.grid{grid-template-columns:1fr}h1{font-size:28px}.card{padding:20px}.comparison{grid-template-columns:1fr}.card:first-child{grid-column:auto}}
</style><main><header><span class="badge">4 家修改 · 4 家保持 · 隔离候选</span>
<h1>北京 8 家小样，待用户确认</h1><p class="intro">按同一门店的米其林中文原文，展示完整正式门店名。</p>
<p>先看旧名、候选名与原始依据，再到真实应用中搜索。京艳一项采用完整名称「京艳 ‧ 翰林书院」；分店名保留，仅统一括号排版。</p>
<p class="note">这 8 家是供确认名称口径的小样。正式数据尚未修改，独立验收通过也不代表用户已确认。国内 402 条（含港澳、排除东京）仅为后续范围建议，须另获用户明确确认。</p>
<nav><a href="/?city=beijing&amp;year=2026&amp;guide=michelin-starred" target="_blank">打开候选应用 · 星级 ↗</a><a href="/?city=beijing&amp;year=2026&amp;guide=michelin-bib-gourmand" target="_blank">打开候选应用 · 必比登 ↗</a></nav>
</header><section class="grid">''' + "\n".join(cards) + "</section></main></html>"
    (OUT / "preview.html").write_text(page)


def prepare():
    sources = check_sources()
    for ref, expected in EVIDENCE["baseline_public_data_sha256"].items():
        assert digest((REPO / ref).read_bytes()) == expected, ref
    assert not CANDIDATE.exists(), "Candidate already exists; audit it instead of overwriting."
    OUT.mkdir(exist_ok=True)
    write_json(OUT / "production-baseline.json", manifest(REPO / "public/data"))
    shutil.copytree(REPO / "public", OUT / "candidate/public", ignore=shutil.ignore_patterns(".DS_Store"))
    files = {}
    for item in RECORDS:
        if item["key"] not in ALLOWED:
            continue
        path = OUT / "candidate" / item["data_path"]
        rows = files.setdefault(path, json.loads(path.read_text()))
        record = next(r for r in rows if r["id"] == item["id"])
        record["name_zh"] = item["candidate_name_zh"]
        record["name"] = item["candidate_name"]
    for path, rows in files.items():
        write_json(path, rows)
    catalog = json.loads((CANDIDATE / "catalog.json").read_text())
    ref = "repo:" + str((SESSION / "source-evidence.json").relative_to(REPO))
    for city in catalog["cities"]:
        if city["id"] != "beijing":
            continue
        for guide in city["guides"]:
            key = f'beijing/{guide["year"]}/{guide["id"]}'
            assert guide["provenance"]["revision"] == EVIDENCE["previous_revisions"][key]
            guide["provenance"]["revision"] = {
                "id": "chinese-names-beijing-sample-20260925",
                "reason": "待用户确认的北京8家隔离小样；本榜单仅2条name_zh及组合name按中文来源修订，不改变其他事实或coverage。",
                "evidence": ref,
            }
            guide["provenance"]["sources"].append({"kind": "membership", "ref": ref,
                "note": "已有门店的中文名称小样依据；当前观察不补证年度完整身份集合，待用户确认。"})
    write_json(CANDIDATE / "catalog.json", catalog)
    write_json(OUT / "source-check.json", sources)
    render_preview()
    print("Prepared isolated sample. Run candidate aliases, validation, then audit.")


def audit():
    baseline = json.loads((OUT / "production-baseline.json").read_text())
    assert manifest(REPO / "public/data") == baseline, "Production data changed"
    check_sources()
    old_catalog = json.loads((REPO / "public/data/catalog.json").read_text())
    new_catalog = json.loads((CANDIDATE / "catalog.json").read_text())
    restored = copy.deepcopy(new_catalog)
    diffs, revisions, listed, aliases = [], [], 0, 0
    for ci, city in enumerate(old_catalog["cities"]):
        for gi, guide in enumerate(city["guides"]):
            if not guide["dataPath"]:
                continue
            rel = guide["dataPath"].removeprefix("/data/")
            before = json.loads((REPO / "public/data" / rel).read_text())
            after = json.loads((CANDIDATE / rel).read_text())
            assert len(before) == len(after)
            listed += len(before)
            for a, b in zip(before, after):
                assert a.keys() == b.keys(), "Record fields must not be added or removed"
                key = f'{city["id"]}/{guide["year"]}/{guide["id"]}#{a["id"]}'
                fields = {k: {"before": a.get(k), "after": b.get(k)} for k in a.keys() | b.keys() if a.get(k) != b.get(k)}
                if fields:
                    assert key in ALLOWED and set(fields) == {"name_zh", "name"}, (key, fields)
                    expected = next(r for r in RECORDS if r["key"] == key)
                    assert b["name_zh"] == expected["candidate_name_zh"] and b["name"] == expected["candidate_name"]
                    diffs.append({"key": key, "fields": fields})
            if guide.get("legacyPath"):
                assert (CANDIDATE / guide["legacyPath"].removeprefix("/data/")).read_bytes() == (CANDIDATE / rel).read_bytes()
                aliases += 1
            if city["id"] == "beijing":
                p = restored["cities"][ci]["guides"][gi]["provenance"]
                revisions.append({"dataset": f'beijing/{guide["year"]}/{guide["id"]}',
                                  "before": guide["provenance"]["revision"], "after": copy.deepcopy(p["revision"])})
                p["revision"] = copy.deepcopy(guide["provenance"]["revision"])
                added = p["sources"].pop()
                assert added["ref"].endswith("260925-0915-chinese-restaurant-names/source-evidence.json")
    assert restored == old_catalog, "Unexpected catalog changes"
    assert {r["key"] for r in diffs} == ALLOWED
    candidate_hashes = manifest(CANDIDATE)
    expected_files = {"catalog.json", "beijing/2026/michelin-starred.json", "beijing/2026/michelin-bib-gourmand.json",
                      "beijing/michelin-starred.json", "beijing/michelin-bib-gourmand.json"}
    assert set(candidate_hashes) == {p for p in baseline if ".DS_Store" not in p}
    assert {p for p, sha in candidate_hashes.items() if sha != baseline[p]} == expected_files
    result = {"passed": True, "checked_at": datetime.now(timezone.utc).isoformat(),
              "listed": listed, "changed_records": len(diffs), "changed_fields": 8, "kept_sample_records": 4,
              "legacy_aliases_equal": aliases, "production_files_unchanged": len(baseline),
              "coverage_and_other_catalog_fields_unchanged": True, "diffs": diffs,
              "catalog_revisions": revisions,
              "candidate_tree_sha256": digest(json.dumps(candidate_hashes, sort_keys=True, separators=(",", ":")).encode()),
              "candidate_files": candidate_hashes}
    write_json(OUT / "reconciliation.json", result)
    print(json.dumps({k: v for k, v in result.items() if k not in ["candidate_files", "diffs", "catalog_revisions"]}, ensure_ascii=False))


if __name__ == "__main__":
    {"prepare": prepare, "audit": audit}[sys.argv[1]]()
