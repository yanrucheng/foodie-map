"""Compile reviewed name evidence, apply the authorized scope, and audit all fields."""
import copy
import hashlib
import html
import json
import pathlib
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from urllib.parse import unquote, urlsplit

SESSION = pathlib.Path(__file__).resolve().parent
REPO = SESSION.parents[2]
OUT = SESSION / "outputs/full"
BASE = OUT / "baseline/public/data"
PRODUCTION = REPO / "public/data"
LEDGER = SESSION / "full-source-evidence.json"
CITIES = ["beijing", "guangzhou-shenzhen", "shanghai", "chengdu", "hong-kong", "macau"]
USER_HELD = {"hong-kong/2026/michelin-bib-gourmand#9", "hong-kong/2026/michelin-bib-gourmand#39"}
PENDING_EVIDENCE = USER_HELD | {"shanghai/2026/michelin-bib-gourmand#2"}


def read(path):
    return json.loads(path.read_text())


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def sha(body):
    return hashlib.sha256(body).hexdigest()


def record_sha(record):
    return sha(json.dumps(record, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode())


def manifest(root):
    return {str(p.relative_to(root)): sha(p.read_bytes()) for p in sorted(root.rglob("*")) if p.is_file()}


def listing(url):
    parsed = urlsplit(url)
    parts = unquote(parsed.path).strip("/").split("/")
    if parts[0] in ["en", "zh_CN", "zh_HK", "zh_TW"]:
        parts = parts[1:]
    elif len(parts[0]) == 2 and len(parts) > 1 and parts[1] in ["en", "zh_CN", "zh_HK", "zh_TW"]:
        parts = parts[2:]
    return parsed.netloc.lower() + "/" + "/".join(parts)


def chinese(value):
    return bool(re.search(r"[\u3400-\u9fff]", value))


def typography(value):
    # Only the disclosed branch-parenthesis presentation change, no Han conversion.
    return re.sub(r"\s*[（(]", "（", value).replace(")", "）")


def names(record):
    return {field: record.get(field) for field in ["name_zh", "name_en", "name"]}


def assembled_name(record, candidate):
    if candidate == record["name_zh"]:
        return record["name"]
    if record["name"] == record["name_zh"]:
        return candidate
    if record["name"].startswith(record["name_zh"] + " / "):
        return candidate + record["name"][len(record["name_zh"]):]
    assert record["name"] == record["name_en"], "Unexpected combined-name structure"
    return record["name"]  # A pure English name contains no erroneous Chinese segment.


def assemble():
    catalog = read(BASE / "catalog.json")
    annotations = read(OUT / "extra-decisions.json") if (OUT / "extra-decisions.json").exists() else {}
    rows, previous = [], {}
    for city in catalog["cities"]:
        if city["id"] not in CITIES:
            continue
        for guide in city["guides"]:
            if not guide["dataPath"]:
                continue
            dataset = f'{city["id"]}/{guide["year"]}/{guide["id"]}'
            previous[dataset] = guide["provenance"]["revision"]
            for record in read(BASE / guide["dataPath"].removeprefix("/data/")):
                key = f'{dataset}#{record["id"]}'
                capture = read(OUT / "sources" / f'{city["id"]}-{guide["id"]}-{record["id"]}.json')
                note = annotations.get(key, {})
                source = None
                rejected = None
                if note.get("extra_source"):
                    extra = read(OUT / "extra" / (note["extra_source"] + ".json"))
                    address_extra = read(OUT / "extra" / (note["address_source"] + ".json")) if note.get("address_source") else extra
                    assert note["source_heading"] in extra["text"] or note["source_heading"] in extra["title"]
                    assert note["source_address"] in address_extra["text"]
                    source = {"kind": note["source_kind"], "url": extra["final_url"], "heading": note["source_heading"],
                              "address": note["source_address"], "captured_at": extra["captured_at"],
                              "local_capture": extra["local_capture"], "sha256": extra["capture_sha256"],
                              "excerpt": note["excerpt"]}
                    assert note["excerpt"] in extra["text"]
                    if address_extra is not extra:
                        source["address_source"] = {"kind": "official-award-profile", "url": address_extra["final_url"],
                            "excerpt": note["source_address"], "captured_at": address_extra["captured_at"],
                            "local_capture": address_extra["local_capture"], "sha256": address_extra["capture_sha256"]}
                    rejected = {"url": capture.get("final_url"), "heading": (capture.get("h1") or [None])[0],
                                "address": capture.get("address"), "reason": note["prior_source_issue"]}
                elif capture.get("success"):
                    source = {"kind": "michelin-chinese-listing", "url": capture["final_url"], "heading": capture["h1"][0],
                              "address": capture["address"], "captured_at": capture["captured_at"],
                              "local_capture": capture["local_capture"], "sha256": capture["capture_sha256"]}
                candidate, decision = record["name_zh"], "unresolved"
                identity = note.get("identity_basis", "")
                limitations = ["当前来源仅证明本次观察到的门店名称，不证明2026全年名称、年度完整性或获奖变化。"]
                reason = "目标官方中文页面不可读，继续补证，原名称未改。"
                if source:
                    assert sha((REPO / source["local_capture"]).read_bytes()) == source["sha256"]
                    same_listing = listing(source["url"]) == listing(record["guide_url"])
                    if same_listing or note.get("extra_source") or capture.get("url_override"):
                        if not identity:
                            identity = "去除显式单/双段语言前缀后，完整地域/城市/分店listing路径相同；逐店对照下列中英文地址及官方原文。"
                            if capture.get("url_override"):
                                identity = capture["url_override"]["basis"] + " 本次详情主标题及分店地址再次核对；原guide_url不改。"
                        h = source["heading"]
                        if chinese(h):
                            candidate = typography(h)
                            decision = "evidenced-keep" if candidate == record["name_zh"] else "evidenced-change"
                            reason = "同一门店官方中文标题；只统一分店括号，保留原始汉字、间隔点和品牌文字。"
                        elif not chinese(record["name_zh"]) or key in {"shanghai/2026/michelin-starred#3", "shanghai/2026/michelin-starred#7"}:
                            decision = "official-foreign-keep"
                            reason = "官方中文页仍使用该外文品牌，保持既有外文品牌写法及原有地域标识，不另造中文名或清理外文排版。"
                        else:
                            reason = "官方中文页仅给外文品牌，旧中文名称未获证实；未获额外处置确认前保留原值并列未决。"
                        if note.get("candidate_name_zh") is not None:
                            candidate = note["candidate_name_zh"]
                            decision = "evidenced-keep" if candidate == record["name_zh"] else "evidenced-change"
                            reason = note["reason"]
                    else:
                        reason = "来源跳到不同地域/门店，拒绝将其作为当前记录依据。"
                    if record.get("address") and record["address"] not in source["address"]:
                        limitations.append("旧中文地址与来源原文存在差异，见并列字段；不据此修地址、坐标或断言迁址，稳定listing的名称依据不等于旧地址已验证。")
                if note.get("limitations"):
                    limitations.extend(note["limitations"])
                if key.startswith("chengdu/"):
                    limitations.append("当前页面版次可能为2027；名称按读取时点注记，数据edition_year=2026和年度覆盖不变。")
                after = names(record)
                after["name_zh"] = candidate
                after["name"] = note.get("candidate_name", assembled_name(record, candidate))
                rows.append({"key": key, "before_record_sha256": record_sha(record), "before": names(record), "after": after,
                             "decision": decision, "reason": reason, "guide_url": record["guide_url"],
                             "record_address": record.get("address"), "record_address_en": record.get("address_en"),
                             "source": source, "identity_basis": identity, "limitations": limitations,
                             **({"user_disposition": note["user_disposition"]} if note.get("user_disposition") else {}),
                             **({"prior_source_issue": rejected} if rejected else {}),
                             **({"url_override": capture["url_override"]} if capture.get("url_override") else {})})
    assert len(rows) == 402 and len({r["key"] for r in rows}) == 402
    result = {"purpose": "国内402条名称逐条核实；年度JSON仍为正式字段唯一维护源，本文件不参与运行时名称选择。",
              "authorization": {"date": "2026-09-25", "response": "确认，推进国内 402 条（含港澳，排除东京）",
                                "channel": "用户在orchestrator会话直接答复，由orchestrator原文转交开发会话", "deploy_authorized": False},
              "compiled_at": datetime.now(timezone.utc).isoformat(), "reviewed_scope": CITIES,
              "baseline_files": manifest(BASE), "previous_revisions": previous,
              "summary": dict(Counter(r["decision"] for r in rows)), "records": rows}
    write(LEDGER, result)
    print(json.dumps(result["summary"], ensure_ascii=False))
    for r in rows:
        if r["decision"] == "unresolved":
            print(r["key"], r["before"]["name_zh"], r["reason"])


def apply():
    evidence = read(LEDGER)
    for r in evidence["records"]:
        if r["decision"] == "unresolved":
            assert r["key"] in PENDING_EVIDENCE and r["before"] == r["after"], "Unresolved names must retain all original values"
    catalog = read(BASE / "catalog.json")
    current_catalog = read(PRODUCTION / "catalog.json")
    if current_catalog != catalog:
        restored = copy.deepcopy(current_catalog)
        for ci, city in enumerate(catalog["cities"]):
            if city["id"] not in CITIES:
                continue
            for gi, guide in enumerate(city["guides"]):
                if guide["dataPath"]:
                    p = restored["cities"][ci]["guides"][gi]["provenance"]
                    assert p["sources"].pop()["ref"] == "repo:" + str(LEDGER.relative_to(REPO))
                    p["revision"] = copy.deepcopy(guide["provenance"]["revision"])
        assert restored == catalog, "Unexpected catalog drift"
    grouped = {}
    for row in evidence["records"]:
        dataset, record_id = row["key"].split("#")
        records = grouped.setdefault(dataset, read(BASE / (dataset + ".json")))
        record = next(r for r in records if r["id"] == int(record_id))
        assert record_sha(record) == row["before_record_sha256"]
        assert row["before"]["name_en"] == row["after"]["name_en"]
        current_rows = read(PRODUCTION / (dataset + ".json"))
        assert [r["id"] for r in current_rows] == [r["id"] for r in read(BASE / (dataset + ".json"))]
        current = next(r for r in current_rows if r["id"] == int(record_id))
        assert current.keys() == record.keys()
        assert {k: v for k, v in current.items() if k not in ["name_zh", "name"]} == {k: v for k, v in record.items() if k not in ["name_zh", "name"]}
        assert names(current) in [row["before"], row["after"]], "Unexpected intervening name change"
        for field in ["name_zh", "name"]:
            record[field] = row["after"][field]
    for dataset, records in grouped.items():
        original = read(PRODUCTION / (dataset + ".json"))
        if records != original:
            write(PRODUCTION / (dataset + ".json"), records)
    ref = "repo:" + str(LEDGER.relative_to(REPO))
    for city in catalog["cities"]:
        if city["id"] not in CITIES:
            continue
        for guide in city["guides"]:
            if guide["dataPath"]:
                guide["provenance"]["sources"].append({"kind": "membership", "ref": ref,
                    "note": "用户确认范围内已有门店的正式名称逐条依据；不补证年度完整性，不提升coverage。"})
                guide["provenance"]["revision"] = {"id": "chinese-names-domestic-20260925",
                    "reason": "按用户确认的完整正式门店名口径逐条核实名称；仅有依据的name_zh及组合name修订，其余事实和coverage保持。", "evidence": ref}
    write(PRODUCTION / "catalog.json", catalog)
    print("Applied authorized names only. Derive aliases and coverage, then audit.")


def audit():
    evidence = read(LEDGER)
    old_catalog, new_catalog = read(BASE / "catalog.json"), read(PRODUCTION / "catalog.json")
    rows = {r["key"]: r for r in evidence["records"]}
    restored = copy.deepcopy(new_catalog)
    changes, listed, alias_count = [], 0, 0
    for ci, city in enumerate(old_catalog["cities"]):
        for gi, guide in enumerate(city["guides"]):
            if not guide["dataPath"]:
                continue
            rel = guide["dataPath"].removeprefix("/data/")
            before, after = read(BASE / rel), read(PRODUCTION / rel)
            assert len(before) == len(after)
            listed += len(before)
            for a, b in zip(before, after):
                assert a.keys() == b.keys()
                key = f'{city["id"]}/{guide["year"]}/{guide["id"]}#{a["id"]}'
                if key in rows:
                    assert record_sha(a) == rows[key]["before_record_sha256"]
                    assert names(b) == rows[key]["after"]
                else:
                    assert a == b, "Out-of-scope record changed"
                diff = {k: {"before": a[k], "after": b[k]} for k in a if a[k] != b[k]}
                if diff:
                    assert city["id"] in CITIES and set(diff) <= {"name_zh", "name"}
                    changes.append({"key": key, "fields": diff})
            if guide.get("legacyPath"):
                assert (PRODUCTION / guide["legacyPath"].removeprefix("/data/")).read_bytes() == (PRODUCTION / rel).read_bytes()
                alias_count += 1
            if city["id"] in CITIES:
                provenance = restored["cities"][ci]["guides"][gi]["provenance"]
                assert provenance["sources"].pop()["ref"] == "repo:" + str(LEDGER.relative_to(REPO))
                provenance["revision"] = copy.deepcopy(guide["provenance"]["revision"])
    assert restored == old_catalog
    for rel, digest in manifest(BASE).items():
        if rel.startswith(("tokyo/", "taxonomy/")):
            assert sha((PRODUCTION / rel).read_bytes()) == digest
    for row in rows.values():
        if row["decision"] == "unresolved":
            assert row["key"] in PENDING_EVIDENCE and row["before"] == row["after"]
        source = row["source"]
        if source:
            assert sha((REPO / source["local_capture"]).read_bytes()) == source["sha256"]
            if source.get("address_source"):
                address_source = source["address_source"]
                assert sha((REPO / address_source["local_capture"]).read_bytes()) == address_source["sha256"]
        else:
            assert row["decision"] == "unresolved"
    result = {"passed": True, "checked_at": datetime.now(timezone.utc).isoformat(), "listed": listed,
              "scope_count": len(rows), "name_records_changed": len(changes),
              "name_fields_changed": sum(len(r["fields"]) for r in changes), "aliases_equal": alias_count,
              "tokyo_and_taxonomy_unchanged": True, "all_non_name_fields_and_order_unchanged": True,
              "coverage_and_non_provenance_catalog_unchanged": True, "changes": changes,
              "all_names_resolved": not any(r["decision"] == "unresolved" for r in rows.values()),
              "unresolved_keys": [r["key"] for r in rows.values() if r["decision"] == "unresolved"],
              "production_files": manifest(PRODUCTION), "evidence_sha256": sha(LEDGER.read_bytes())}
    write(OUT / "reconciliation.json", result)
    print(json.dumps({k: v for k, v in result.items() if k not in ["changes", "production_files"]}, ensure_ascii=False))


def review():
    evidence = read(LEDGER)
    server = read(OUT / "server.json") if (OUT / "server.json").exists() else {}
    origin = server.get("origin", "")
    esc = html.escape
    labels = {"evidenced-change": "有依据修改", "evidenced-keep": "有依据保持", "official-foreign-keep": "外文品牌保持", "unresolved": "未核实 · 保留原值"}
    city_labels = {"beijing": "北京", "shanghai": "上海", "guangzhou-shenzhen": "广州·深圳", "chengdu": "成都", "hong-kong": "香港", "macau": "澳门"}
    cards = []
    (OUT / "excerpts").mkdir(exist_ok=True)
    for row in evidence["records"]:
        dataset, local_id = row["key"].split("#")
        city, year, guide = dataset.split("/")
        source = row["source"]
        source_html = "<p>尚未取得可支持中文名称的原文；按用户最新决定保留原值，本轮不再要求补证。</p>"
        if source:
            stem = row["key"].replace("/", "-").replace("#", "-")
            excerpt = f'名称来源：{source["url"]}\n原始名称：{source["heading"]}\n地址原文：{source["address"]}\n读取：{source["captured_at"]}\n原始材料：{source["local_capture"]}\nSHA-256：{source["sha256"]}\n'
            if source.get("address_source"):
                excerpt += f'地址来自另一份原文：{source["address_source"]["url"]}\n地址材料SHA-256：{source["address_source"]["sha256"]}\n'
            (OUT / "excerpts" / (stem + ".txt")).write_text(excerpt)
            source_html = f'<p><small>来源原始名称</small><br><strong>{esc(source["heading"])}</strong></p><p><small>来源地址</small><br>{esc(source["address"])}</p>'
            source_html += f'<p><a href="{esc(source["url"])}" target="_blank" rel="noopener">名称官方来源 ↗</a> · <a href="excerpts/{stem}.txt" target="_blank">本地原文摘录与哈希</a></p>'
            if source.get("address_source"):
                source_html += f'<p><a href="{esc(source["address_source"]["url"])}" target="_blank" rel="noopener">独立地址依据 ↗</a>（地址原文来自此页）</p>'
            source_html += f'<p class="muted">读取时间：{esc(source["captured_at"])}（UTC）</p>'
        application = f'<a href="{origin}/?city={city}&amp;year={year}&amp;guide={guide}" target="_blank">真实应用中查看 ↗</a>' if origin else ""
        display_reason = "用户最新决定：保留原值并明确未核实，本轮不再补证、不阻塞完成，也不计作已核实。" if row["decision"] == "unresolved" else row["reason"]
        cards.append(f'''<article data-city="{city}" data-state="{row['decision']}">
<div class="meta">{city_labels[city]} · {'星级' if guide == 'michelin-starred' else '必比登'} #{local_id}<span>{labels[row['decision']]}</span></div>
<div class="names"><div><small>原显示名</small><p>{esc(row['before']['name_zh'])}</p></div><div><small>当前本地名称</small><h2>{esc(row['after']['name_zh'])}</h2></div></div>
<p class="muted">{esc(row['record_address'] or row['record_address_en'] or '原记录缺地址')}</p>
<p>{esc(display_reason)}</p><details><summary>查看原文、同店依据与限制</summary>{source_html}
<p>{esc(row['identity_basis'])}</p><p class="limits">{esc(' '.join(row['limitations']))}</p></details><nav>{application}</nav></article>''')
    options = ''.join(f'<option value="{key}">{label}</option>' for key, label in city_labels.items())
    counts = evidence["summary"]
    document = '''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>国内402条餐厅名称核对</title><style>
*{box-sizing:border-box}body{margin:0;background:#f5f3ee;color:#26332f;font:16px/1.65 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}main{max-width:1100px;margin:auto;padding:32px 24px}h1{font-size:30px}h2{font-size:21px;margin:6px 0;color:#115846}p{margin:8px 0}small,.muted,.meta{font-size:13px;color:#596660}.meta span{float:right}.filters{display:flex;gap:12px;flex-wrap:wrap;position:sticky;top:0;background:#f5f3ee;padding:12px 0;z-index:1}input,select{font:inherit;padding:10px;border:1px solid #bcc9c0;border-radius:8px;max-width:100%}input{flex:1;min-width:160px}article{background:#fff;border:1px solid #d8dfd8;border-radius:12px;padding:22px;margin:16px 0}article[data-state="unresolved"]{border-left:4px solid #b47c2e}.names{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:14px 0}.names p{font-size:19px}.notice{border-left:4px solid #b47c2e;padding-left:14px}summary{cursor:pointer;color:#115846}details{background:#f4f6f3;padding:14px;border-radius:8px;margin-top:16px}.limits{color:#715530;font-size:14px}a{color:#11634b;text-underline-offset:4px}nav{margin-top:14px}article[hidden]{display:none}@media(max-width:600px){main{padding:22px 14px}.names{grid-template-columns:1fr}.meta span{float:none;display:block}h1{font-size:26px}}
</style><main><h1>国内 402 条餐厅名称核对</h1>'''
    document += f'<p>{counts.get("evidenced-change",0)} 条有依据修改 · {counts.get("evidenced-keep",0)} 条有依据保持 · {counts.get("official-foreign-keep",0)} 条外文品牌保持 · {counts.get("unresolved",0)} 条未核实</p>'
    document += '<p>用户已确认完整正式门店名口径及国内402条范围，含港澳、排除东京。此处展示当前本地数据及逐条依据。</p><p class="notice">按用户最新决定，台灣味、璐璐豹豹、阿娘面保留原值并明确未核实，本轮不再要求补证，不阻塞完成，也不计作已核实。仅名称字段修订，地址、坐标、英文名、评级和其他事实保持。待用户本地验证通过后提交、推送和部署。</p>'
    document += f'<div class="filters"><select id="city" aria-label="城市"><option value="">全部城市</option>{options}</select><select id="state" aria-label="处理结果"><option value="">全部结果</option>'
    document += ''.join(f'<option value="{key}">{label}</option>' for key, label in labels.items())
    document += '</select><input id="query" aria-label="搜索名称或地址" placeholder="搜索名称或地址"></div><p id="count">当前显示402条</p><section>' + ''.join(cards) + '</section></main>'
    document += '''<script>const cards=[...document.querySelectorAll('article')];function filter(){let n=0;for(const c of cards){const show=(!city.value||c.dataset.city===city.value)&&(!state.value||c.dataset.state===state.value)&&c.textContent.toLowerCase().includes(query.value.trim().toLowerCase());c.hidden=!show;if(show)n++;}document.getElementById('count').textContent='当前显示'+n+'条';}const city=document.getElementById('city'),state=document.getElementById('state'),query=document.getElementById('query');for(const e of [city,state,query])e.addEventListener('input',filter);</script></html>'''
    (OUT / "review.html").write_text(document)
    print("Rendered full review page and readable excerpts.")


if __name__ == "__main__":
    {"assemble": assemble, "apply": apply, "audit": audit, "review": review}[sys.argv[1]]()
