#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
M2 / prep_jsonl.py
------------------
Convert a JSON Lines (.jsonl) file into the two JSON *document* forms that
RMLMapper can actually parse (RMLMapper's JSON logical source reads one valid
JSON document; a raw .jsonl stream is NOT one).

Forms:
  array   ->  [ {..}, {..}, ... ]            iterator "$[*]"
  wrapped ->  { "nodes": [ {..}, {..} ] }    iterator "$.nodes[*]"

Also supports slicing the source by line range (1-based, inclusive) so the
"incremental mapping" experiment can feed only the NEW rows.

Usage:
  python prep_jsonl.py <in.jsonl> <out.json> --form array|wrapped [--start N] [--end N]
  python prep_jsonl.py data/nodes-A2-s1.jsonl data/array-full.json --form array
  python prep_jsonl.py data/nodes-A2-s1.jsonl data/part2-array.json --form array --start 7 --end 11

Each input line must be a valid JSON object (this is a documented precondition of
the Chapter-15 data). Non-JSON/blank lines are skipped and counted on stderr.
"""
import argparse
import json
import sys


def load_records(path, start, end):
    records = []
    skipped = 0
    lineno = 0
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            lineno += 1
            line = line.strip()
            if not line:
                continue
            if start is not None and lineno < start:
                continue
            if end is not None and lineno > end:
                break
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError as exc:
                skipped += 1
                print(
                    f"[prep] line {lineno} is not valid JSON: {exc}",
                    file=sys.stderr,
                )
    return records, skipped


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("in_file", help="source .jsonl path")
    ap.add_argument("out_file", help="output .json path")
    ap.add_argument("--form", choices=["array", "wrapped"], default="array")
    ap.add_argument("--start", type=int, default=None,
                    help="1-based first source line to include")
    ap.add_argument("--end", type=int, default=None,
                    help="1-based last source line to include (inclusive)")
    args = ap.parse_args()

    records, skipped = load_records(args.in_file, args.start, args.end)

    if args.form == "array":
        doc = records
    else:  # wrapped
        doc = {"nodes": records}

    with open(args.out_file, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, ensure_ascii=False, indent=None)
        fh.write("\n")

    print(f"[prep] {args.in_file} -> {args.out_file} "
          f"records={len(records)} skipped={skipped} form={args.form}")
    return 0 if skipped == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
