"""Render/check coverage through the production catalog validator; never infer dataset identity."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent
START_MARKER = "<!-- COVERAGE_TABLE_START -->"
END_MARKER = "<!-- COVERAGE_TABLE_END -->"


def render(root: Path) -> str:
    result = subprocess.run([os.environ.get("FOODIE_NODE", "node"), str(PROJECT_ROOT / "scripts/data-contract.ts"), "--root", str(root), "--json"], capture_output=True, text=True, check=False)
    if result.returncode:
        raise ValueError(result.stdout or result.stderr)
    validated = json.loads(result.stdout)
    by_identity = {row["identity"]: row for row in validated["datasets"]}
    checksum = hashlib.sha256(json.dumps(validated["inputs"], sort_keys=True).encode()).hexdigest()
    lines = [f"<!-- catalog-and-inputs-sha256: {checksum} -->", "", "| 城市 / 实际范围 | 榜单 | 年度 | 收录 | 可定位 | 名单状态 | 官方总数 |", "|---|---|---:|---:|---:|---|---:|"]
    total = locatable = 0
    labels = {"not-collected": "未采集", "unverified": "未核验", "partial": "部分", "verified": "已核验完整"}
    def escape(value: str) -> str:
        return value.replace("|", "\\|").replace("\n", " ")
    for city in validated["catalog"]["cities"]:
        for guide in city["guides"]:
            row = by_identity[f"{city['id']}/{guide['year']}/{guide['id']}"]
            counts = row["counts"]
            listed, located = (counts["listed"], counts["locatable"]) if counts else ("—", "—")
            if counts:
                total += listed
                locatable += located
            state = labels[guide["coverage"]["status"]]
            if listed == 0 and state != "已核验完整":
                state += "；空文件，非官方零收录"
            count = guide["coverage"]["officialCount"]
            lines.append(f"| {escape(city['labelZh'])} / {escape(city['scope']['description'])} | {escape(guide['labelZh'])} | {guide['year']} | {listed} | {located} | {state} | {count if count is not None else '未知'} |")
    lines += [f"| **合计** | | | **{total}** | **{locatable}** | | |", "", "可定位按 P02 getMapPosition(record, catalog.spatialContext) 计算，不代表精度已验收。未采集无文件不计为零条；已发布缺文件是错误。来源、采集/核验时间、范围成员与修订见 [catalog](../public/data/catalog.json)。"]
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=PROJECT_ROOT / "public/data")
    parser.add_argument("--document", type=Path, default=PROJECT_ROOT / "readme/data-onboarding-guide.md")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    content = args.document.read_text(encoding="utf-8")
    if content.count(START_MARKER) != 1 or content.count(END_MARKER) != 1 or content.index(START_MARKER) > content.index(END_MARKER):
        raise ValueError("Coverage document must contain exactly one ordered marker pair")
    before, rest = content.split(START_MARKER)
    _, after = rest.split(END_MARKER)
    expected = before + START_MARKER + "\n\n" + render(args.root.resolve()) + "\n\n" + END_MARKER + after
    if args.check:
        if expected != content:
            print(f"STALE_COVERAGE: {args.document}; run npm run readme", file=sys.stderr)
            return 1
        print("PASS: coverage matches catalog and all referenced input bytes")
    else:
        args.document.write_text(expected, encoding="utf-8")
        print(f"Updated {args.document}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, OSError) as error:
        print(error, file=sys.stderr)
        sys.exit(1)
