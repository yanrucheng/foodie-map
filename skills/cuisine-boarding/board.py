#!/usr/bin/env python3
"""Cuisine boarding script — transforms raw external restaurant JSON into
validated output with canonical cuisine_group keys.

Usage:
    python board.py --taxonomy <path> --mappings <path> --input <raw.json> --output <out.json>
"""

import argparse
import json
import sys
from pathlib import Path


def load_json(path: Path) -> dict | list:
    """Load and parse a JSON file."""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def build_mapping_table(mappings_data: dict) -> dict[str, str]:
    """Build a raw cuisine label → canonical groupKey lookup table."""
    table: dict[str, str] = {}
    for entry in mappings_data["mappings"]:
        table[entry["raw"]] = entry["groupKey"]
    return table


def get_valid_keys(taxonomy_data: dict) -> set[str]:
    """Extract the set of valid canonical group keys from taxonomy."""
    return {g["key"] for g in taxonomy_data["groups"]}


def resolve_cuisine_group(
    cuisine: str,
    mapping_table: dict[str, str],
    fallback: str,
) -> tuple[str, bool]:
    """Resolve a raw cuisine label to a canonical group key.

    Returns (group_key, is_fallback).
    """
    if not cuisine:
        return fallback, True

    # Exact match
    if cuisine in mapping_table:
        return mapping_table[cuisine], False

    # First-token fallback for compound labels (e.g., "川菜, 火锅")
    first_token = cuisine.split(",")[0].strip()
    if first_token in mapping_table:
        return mapping_table[first_token], False

    return fallback, True


def transform_restaurant(
    restaurant: dict,
    mapping_table: dict[str, str],
    fallback: str,
) -> tuple[dict, bool]:
    """Transform a single restaurant entry.

    Returns (transformed_entry, used_fallback).
    """
    cuisine = restaurant.get("cuisine", "")
    group_key, is_fallback = resolve_cuisine_group(cuisine, mapping_table, fallback)

    out = dict(restaurant)
    out["cuisine_group"] = group_key

    # Remove venue_type if present (not part of Beijing schema)
    out.pop("venue_type", None)

    # Normalize avg_price field: keep avg_price_cny, drop avg_price_hkd if present
    if "avg_price_hkd" in out and "avg_price_cny" not in out:
        out["avg_price_cny"] = out.pop("avg_price_hkd")
    elif "avg_price_hkd" in out:
        out.pop("avg_price_hkd")

    return out, is_fallback


def main():
    """Entry point for the cuisine boarding pipeline."""
    parser = argparse.ArgumentParser(
        description="Transform raw restaurant JSON with canonical cuisine_group keys."
    )
    parser.add_argument("--taxonomy", required=True, help="Path to taxonomy registry JSON")
    parser.add_argument("--mappings", required=True, help="Path to mappings JSON")
    parser.add_argument("--input", required=True, help="Path to raw restaurant JSON")
    parser.add_argument("--output", required=True, help="Path to write transformed JSON")
    parser.add_argument("--dry-run", action="store_true", help="Validate only, don't write output")
    args = parser.parse_args()

    # Load inputs
    taxonomy = load_json(Path(args.taxonomy))
    mappings = load_json(Path(args.mappings))
    raw_data = load_json(Path(args.input))

    valid_keys = get_valid_keys(taxonomy)
    fallback = taxonomy.get("fallbackGroup", "OTHER")
    mapping_table = build_mapping_table(mappings)

    # Transform
    results = []
    fallback_count = 0
    unmapped_labels: set[str] = set()

    for restaurant in raw_data:
        transformed, used_fallback = transform_restaurant(restaurant, mapping_table, fallback)

        # Validate output group key is in taxonomy
        if transformed["cuisine_group"] not in valid_keys:
            print(
                f"ERROR: cuisine_group '{transformed['cuisine_group']}' not in taxonomy "
                f"(restaurant: {restaurant.get('name_en', 'unknown')})",
                file=sys.stderr,
            )
            sys.exit(1)

        if used_fallback:
            fallback_count += 1
            unmapped_labels.add(restaurant.get("cuisine", ""))
            print(
                f"WARNING: unmapped cuisine '{restaurant.get('cuisine', '')}' "
                f"→ {fallback} (restaurant: {restaurant.get('name_en', 'unknown')})",
                file=sys.stderr,
            )

        results.append(transformed)

    # Report
    total = len(results)
    fallback_rate = (fallback_count / total * 100) if total > 0 else 0
    print(f"\n--- Boarding Summary ---", file=sys.stderr)
    print(f"Total restaurants: {total}", file=sys.stderr)
    print(f"Fallback count:   {fallback_count} ({fallback_rate:.1f}%)", file=sys.stderr)

    if unmapped_labels:
        print(f"Unmapped labels:  {sorted(unmapped_labels)}", file=sys.stderr)

    # Validate fallback rate threshold (≤5%)
    if fallback_rate > 5:
        print(f"ERROR: Fallback rate {fallback_rate:.1f}% exceeds 5% threshold.", file=sys.stderr)
        sys.exit(1)

    # Write output
    if args.dry_run:
        print("Dry-run mode — no output written.", file=sys.stderr)
    else:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"Output written to: {output_path}", file=sys.stderr)

    sys.exit(0)


if __name__ == "__main__":
    main()
