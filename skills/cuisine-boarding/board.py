#!/usr/bin/env python3
"""Derive cuisine_group using the shared Node contract; preserve every other fact."""

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

CONTRACT_CLI = Path(__file__).resolve().parents[2] / "scripts" / "data-contract.ts"


def derive_groups(input_text: str, taxonomy_text: str, mappings_text: str) -> list[dict]:
    """Batch through the same rule implementation as TypeScript and validate:data."""
    result = subprocess.run(
        [os.environ.get("FOODIE_NODE", "node"), str(CONTRACT_CLI), "board"],
        input=json.dumps({"input": input_text, "taxonomy": taxonomy_text, "mappings": mappings_text}),
        text=True, capture_output=True, check=False,
    )
    if result.returncode:
        try:
            diagnostic = json.loads(result.stderr)
        except ValueError:
            diagnostic = {}
        if result.returncode == 1 and isinstance(diagnostic, dict) and diagnostic.get("kind") == "data":
            raise ValueError(result.stderr.strip())
        raise OSError(result.stderr.strip() or "Cannot run the shared contract")
    return json.loads(result.stdout)["resolutions"]


def atomic_write(path: Path, content: str) -> None:
    """Preserve the existing destination until a complete replacement is ready."""
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent,
                                         prefix=f".{path.name}.", suffix=".tmp", delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--taxonomy", type=Path, required=True)
    parser.add_argument("--mappings", type=Path, required=True)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--dry-run", action="store_true", help="Check without creating files or directories")
    args = parser.parse_args()
    try:
        inputs = [args.input, args.taxonomy, args.mappings]
        if args.output.resolve() in {item.resolve() for item in inputs} or (
            args.output.exists() and any(args.output.samefile(item) for item in inputs if item.exists())
        ):
            raise ValueError("Output must differ from the input, taxonomy and mappings")
        source = args.input.read_text(encoding="utf-8")
        resolutions = derive_groups(source, args.taxonomy.read_text(encoding="utf-8"),
                                    args.mappings.read_text(encoding="utf-8"))
        records = json.loads(source)
        if len(records) != len(resolutions):
            raise ValueError("Shared contract returned an incomplete result")
        counts = dict.fromkeys(("mapped", "explicit-other", "missing", "unmapped"), 0)
        for record, resolution in zip(records, resolutions, strict=True):
            if record["id"] != resolution["id"]:
                raise ValueError("Shared contract returned a mismatched record ID")
            record["cuisine_group"] = resolution["groupKey"]
            counts[resolution["reason"]] += 1
            if resolution["reason"] == "unmapped":
                print(json.dumps({"severity": "warning", "code": "UNMAPPED_CUISINE", "file": str(args.input),
                                  "record_id": record["id"], "field": "/cuisine", "raw": record.get("cuisine"),
                                  "reason": "Using OTHER for this exact raw label"}, ensure_ascii=False), file=sys.stderr)
        # Serialization also completes during dry-run so unsupported raw values fail without writing.
        content = json.dumps(records, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
        print(json.dumps({"file": str(args.input), "total": len(records), **counts, "dry_run": args.dry_run},
                         ensure_ascii=False), file=sys.stderr)
        if not args.dry_run:
            atomic_write(args.output, content)
        return 0
    except ValueError as error:
        print(f"ERROR: input={args.input} taxonomy={args.taxonomy} mappings={args.mappings}: {error}", file=sys.stderr)
        return 1
    except (OSError, subprocess.SubprocessError) as error:
        print(f"ERROR: {error}. Use the project Node runtime and npm ci.", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
