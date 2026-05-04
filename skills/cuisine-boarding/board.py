#!/usr/bin/env python3
"""
Cuisine Boarding Script

Transforms restaurant JSON data by mapping raw cuisine labels to canonical taxonomy groups.
This is the single source of truth for all cuisine data transformations.

Usage:
    uv run board.py --taxonomy <path> --mappings <path> --input <raw-json> --output <output-json>
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Any


def load_json(path: Path) -> dict | list:
    """Load and parse a JSON file."""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(data: dict | list, path: Path) -> None:
    """Save data to a JSON file with pretty formatting."""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def build_mapping_lookup(mappings: list[dict]) -> dict[str, str]:
    """
    Build a lookup dictionary from raw cuisine to canonical group key.

    Args:
        mappings: List of mapping entries with 'raw' and 'groupKey' fields.

    Returns:
        Dictionary mapping raw cuisine strings to canonical group keys.
    """
    return {m["raw"]: m["groupKey"] for m in mappings}


def resolve_cuisine_group(
    raw_cuisine: str,
    mapping_lookup: dict[str, str],
    fallback_group: str,
    restaurant_name: str,
) -> tuple[str, bool]:
    """
    Resolve a raw cuisine label to a canonical group key.

    Resolution order:
    1. Exact match in mapping table
    2. Split by ', ' and resolve first token
    3. Fallback to OTHER group

    Args:
        raw_cuisine: The raw cuisine string from source data.
        mapping_lookup: Dictionary mapping raw cuisines to group keys.
        fallback_group: The fallback group key for unmapped values.
        restaurant_name: Restaurant name for warning messages.

    Returns:
        Tuple of (group_key, was_unmapped).
    """
    if not raw_cuisine or not raw_cuisine.strip():
        return fallback_group, False

    raw_cuisine = raw_cuisine.strip()

    # Try exact match first
    if raw_cuisine in mapping_lookup:
        return mapping_lookup[raw_cuisine], False

    # Try first token for compound values (e.g., "时尚法国菜, 创新菜")
    if ", " in raw_cuisine:
        first_token = raw_cuisine.split(", ")[0]
        if first_token in mapping_lookup:
            return mapping_lookup[first_token], False

    # No match found - use fallback
    print(
        f"WARN: unmapped cuisine '{raw_cuisine}' for restaurant '{restaurant_name}', defaulting to {fallback_group}",
        file=sys.stderr,
    )
    return fallback_group, True


def transform_restaurants(
    restaurants: list[dict],
    mapping_lookup: dict[str, str],
    canonical_keys: set[str],
    fallback_group: str,
) -> tuple[list[dict], dict[str, int], int]:
    """
    Transform restaurant data by resolving cuisine_group for each entry.

    Args:
        restaurants: List of restaurant records.
        mapping_lookup: Dictionary mapping raw cuisines to group keys.
        canonical_keys: Set of valid canonical group keys.
        fallback_group: The fallback group key for unmapped values.

    Returns:
        Tuple of (transformed_restaurants, group_counts, unmapped_count).
    """
    transformed = []
    group_counts: dict[str, int] = {}
    unmapped_count = 0

    for restaurant in restaurants:
        # Create a copy to avoid mutating the original
        new_restaurant = dict(restaurant)

        raw_cuisine = restaurant.get("cuisine", "")
        name = restaurant.get("name", f"id={restaurant.get('id', 'unknown')}")

        group_key, was_unmapped = resolve_cuisine_group(
            raw_cuisine, mapping_lookup, fallback_group, name
        )

        # Validate that the resolved group is canonical
        if group_key not in canonical_keys:
            print(
                f"ERROR: resolved group '{group_key}' not in canonical enum for restaurant '{name}'",
                file=sys.stderr,
            )
            sys.exit(1)

        new_restaurant["cuisine_group"] = group_key
        transformed.append(new_restaurant)

        # Track statistics
        group_counts[group_key] = group_counts.get(group_key, 0) + 1
        if was_unmapped:
            unmapped_count += 1

    return transformed, group_counts, unmapped_count


def validate_coverage(
    total_count: int, unmapped_count: int, max_fallback_pct: float = 5.0
) -> bool:
    """
    Validate that fallback rate is within acceptable threshold.

    Args:
        total_count: Total number of restaurants processed.
        unmapped_count: Number of restaurants mapped to fallback.
        max_fallback_pct: Maximum allowed fallback percentage.

    Returns:
        True if validation passes, False otherwise.
    """
    if total_count == 0:
        return True

    fallback_pct = (unmapped_count / total_count) * 100

    if fallback_pct > max_fallback_pct:
        print(
            f"ERROR: {fallback_pct:.1f}% of restaurants mapped to OTHER. Review and extend mapping rules.",
            file=sys.stderr,
        )
        return False

    return True


def print_summary(group_counts: dict[str, int], total_count: int) -> None:
    """Print a summary of the transformation results."""
    sorted_counts = sorted(group_counts.items(), key=lambda x: x[1], reverse=True)
    parts = [f"{k}={v}" for k, v in sorted_counts]
    other_count = group_counts.get("OTHER", 0)
    other_pct = (other_count / total_count * 100) if total_count > 0 else 0

    print(f"Mapped {total_count} restaurants: {', '.join(parts)}")
    print(f"OTHER: {other_count} ({other_pct:.1f}%)")
    print("Pipeline validation PASSED")


def main() -> int:
    """Main entry point for the boarding script."""
    parser = argparse.ArgumentParser(
        description="Transform restaurant data by mapping cuisine labels to canonical groups."
    )
    parser.add_argument(
        "--taxonomy",
        type=Path,
        required=True,
        help="Path to the taxonomy registry JSON file",
    )
    parser.add_argument(
        "--mappings",
        type=Path,
        required=True,
        help="Path to the cuisine mappings JSON file",
    )
    parser.add_argument(
        "--input",
        type=Path,
        required=True,
        help="Path to the input restaurant JSON file",
    )
    parser.add_argument(
        "--output",
        type=Path,
        required=True,
        help="Path to the output restaurant JSON file",
    )
    parser.add_argument(
        "--max-fallback-pct",
        type=float,
        default=5.0,
        help="Maximum allowed percentage of restaurants mapped to OTHER (default: 5.0)",
    )

    args = parser.parse_args()

    # Load input files
    taxonomy = load_json(args.taxonomy)
    mappings_data = load_json(args.mappings)
    restaurants = load_json(args.input)

    if not isinstance(restaurants, list):
        print("ERROR: Input JSON must be an array of restaurants", file=sys.stderr)
        return 1

    # Extract canonical keys
    canonical_keys = {g["key"] for g in taxonomy["groups"]}
    fallback_group = taxonomy.get("fallbackGroup", "OTHER")

    # Build mapping lookup
    mapping_lookup = build_mapping_lookup(mappings_data["mappings"])

    # Transform restaurants
    transformed, group_counts, unmapped_count = transform_restaurants(
        restaurants, mapping_lookup, canonical_keys, fallback_group
    )

    # Validate coverage
    if not validate_coverage(
        len(transformed), unmapped_count, args.max_fallback_pct
    ):
        return 1

    # Save output
    save_json(transformed, args.output)

    # Print summary
    print_summary(group_counts, len(transformed))
    print(f"Output written to: {args.output}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
