"""Scan public/data/ and render a coverage markdown table into readme/data-onboarding-guide.md."""

import json
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "public" / "data"
README_PATH = PROJECT_ROOT / "readme" / "data-onboarding-guide.md"

# Marker comments used to locate the auto-rendered section
START_MARKER = "<!-- COVERAGE_TABLE_START -->"
END_MARKER = "<!-- COVERAGE_TABLE_END -->"

# Human-readable city names
CITY_LABELS = {
    "beijing": "Beijing / 北京",
    "chengdu": "Chengdu / 成都",
    "guangzhou-shenzhen": "Guangzhou & Shenzhen / 广州·深圳",
    "hangzhou": "Hangzhou / 杭州",
    "hong-kong": "Hong Kong / 香港",
    "macau": "Macau / 澳門",
    "shanghai": "Shanghai / 上海",
    "taipei-taichung": "Taipei & Taichung / 台北·台中",
    "tainan-kaohsiung": "Tainan & Kaohsiung / 台南·高雄",
}

# Human-readable guide names
GUIDE_LABELS = {
    "michelin-starred": "Michelin Starred / 米其林星级",
    "michelin-bib-gourmand": "Michelin Bib Gourmand / 米其林必比登",
    "dianping-black-pearl": "Dianping Black Pearl / 黑珍珠",
}


def scan_data() -> list[dict]:
    """Scan data directory and return a list of dataset info dicts."""
    results = []
    for city_dir in sorted(DATA_DIR.iterdir()):
        if not city_dir.is_dir() or city_dir.name == "taxonomy":
            continue
        city_slug = city_dir.name
        for json_file in sorted(city_dir.glob("*.json")):
            guide_slug = json_file.stem
            with open(json_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            # Detect edition year from data
            edition_year = None
            if data and isinstance(data[0], dict):
                edition_year = data[0].get("edition_year")
            results.append(
                {
                    "city": city_slug,
                    "guide": guide_slug,
                    "entries": len(data),
                    "edition_year": edition_year,
                }
            )
    return results


def render_table(datasets: list[dict]) -> str:
    """Render the coverage markdown table from scanned datasets."""
    lines = [
        "| City | Guide | Year | Entries |",
        "|------|-------|------|---------|",
    ]
    total = 0
    for ds in datasets:
        city_label = CITY_LABELS.get(ds["city"], ds["city"])
        guide_label = GUIDE_LABELS.get(ds["guide"], ds["guide"])
        year = ds["edition_year"] or "—"
        lines.append(f"| {city_label} | {guide_label} | {year} | {ds['entries']} |")
        total += ds["entries"]
    lines.append(f"| **Total** | | | **{total}** |")
    return "\n".join(lines)


def update_readme(table_md: str) -> None:
    """Replace the section between markers in the readme with the new table."""
    content = README_PATH.read_text(encoding="utf-8")
    if START_MARKER not in content:
        raise ValueError(
            f"Missing {START_MARKER} in {README_PATH}. "
            "Add the markers to indicate where the table should be rendered."
        )
    before = content.split(START_MARKER)[0]
    after = content.split(END_MARKER)[1]
    new_content = (
        before
        + START_MARKER
        + "\n\n"
        + table_md
        + "\n\n"
        + END_MARKER
        + after
    )
    README_PATH.write_text(new_content, encoding="utf-8")
    print(f"✅ Updated coverage table in {README_PATH.relative_to(PROJECT_ROOT)}")
    print(f"   {len(datasets)} datasets, {sum(d['entries'] for d in datasets)} total entries")


if __name__ == "__main__":
    datasets = scan_data()
    table_md = render_table(datasets)
    update_readme(table_md)
