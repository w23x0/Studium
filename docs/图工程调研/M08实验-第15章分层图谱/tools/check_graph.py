#!/usr/bin/env python3
"""图完整性检查:id 唯一性、边端点可解析、边 evidence 逐字校验、词表封闭。

verify_anchors.py 只验节点锚点。本工具补上边一侧,并做全局一致性检查。

用法:
    python check_graph.py --nodes data/nodes-*.jsonl --edges data/edges-*.jsonl \
                          --source source/apostol-ch15 [source/strang-ch3 ...]
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

REL_VOCAB = {
    "is-a", "part-of", "requires", "implies", "equivalent",
    "contrasts", "applies-to", "generalizes", "alias-of", "other",
}
SYMMETRIC = {"equivalent", "contrasts", "alias-of"}
NODE_TYPES = {"concept", "method", "theorem", "notation"}


def load_sources(dirs: list[Path]) -> dict[str, str]:
    out: dict[str, str] = {}
    for d in dirs:
        for p in d.rglob("*.md"):
            out[p.name] = p.read_text(encoding="utf-8", errors="replace")
    return out


def iter_jsonl(path: Path):
    for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = line.strip()
        if not line:
            continue
        try:
            yield lineno, json.loads(line)
        except json.JSONDecodeError as e:
            yield lineno, {"__parse_error__": str(e)[:120]}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--nodes", nargs="+", required=True)
    ap.add_argument("--edges", nargs="*", default=[])
    ap.add_argument("--source", nargs="+", required=True)
    args = ap.parse_args()

    sources = load_sources([Path(d) for d in args.source])
    problems: list[str] = []

    # ---- nodes ----
    id_origin: dict[str, str] = {}
    node_types = Counter()
    dup_ids: list[str] = []
    n_nodes = 0

    for f in args.nodes:
        p = Path(f)
        for lineno, node in iter_jsonl(p):
            if "__parse_error__" in node:
                problems.append(f"[JSON] {p.name}:{lineno} {node['__parse_error__']}")
                continue
            n_nodes += 1
            nid = node.get("id")
            if not nid:
                problems.append(f"[NO_ID] {p.name}:{lineno}")
                continue
            if nid in id_origin:
                dup_ids.append(nid)
                problems.append(f"[DUP_ID] {nid} in {p.name}:{lineno}, first seen {id_origin[nid]}")
            else:
                id_origin[nid] = f"{p.name}:{lineno}"
            nt = node.get("node_type")
            node_types[nt] += 1
            if nt not in NODE_TYPES:
                problems.append(f"[BAD_TYPE] {nid}: {nt!r}")

    # ---- edges ----
    n_edges = 0
    rels = Counter()
    origins = Counter()
    ev_total = ev_ok = 0
    seen_pairs: set[tuple[str, str, str]] = set()

    for f in args.edges:
        p = Path(f)
        for lineno, e in iter_jsonl(p):
            if "__parse_error__" in e:
                problems.append(f"[JSON] {p.name}:{lineno} {e['__parse_error__']}")
                continue
            n_edges += 1
            src, dst, rel = e.get("src"), e.get("dst"), e.get("rel")
            rels[rel] += 1
            origins[e.get("origin")] += 1

            if rel not in REL_VOCAB:
                problems.append(f"[BAD_REL] {p.name}:{lineno} {rel!r}")
            if rel == "other" and not e.get("rel_note"):
                problems.append(f"[NO_REL_NOTE] {p.name}:{lineno} {src} -> {dst}")
            for endpoint, which in ((src, "src"), (dst, "dst")):
                if endpoint not in id_origin:
                    problems.append(f"[DANGLING_{which.upper()}] {p.name}:{lineno} {endpoint!r} ({src} -{rel}-> {dst})")
            if src == dst:
                problems.append(f"[SELF_LOOP] {p.name}:{lineno} {src}")

            key = (src, rel, dst)
            rkey = (dst, rel, src)
            if key in seen_pairs:
                problems.append(f"[DUP_EDGE] {p.name}:{lineno} {src} -{rel}-> {dst}")
            elif rel in SYMMETRIC and rkey in seen_pairs:
                problems.append(f"[SYMMETRIC_BOTH_WAYS] {p.name}:{lineno} {src} -{rel}-> {dst}")
            seen_pairs.add(key)

            ev = e.get("evidence")
            if e.get("origin") == "source":
                if not ev:
                    problems.append(f"[NO_EVIDENCE] {p.name}:{lineno} {src} -{rel}-> {dst} (origin=source)")
                else:
                    evs = ev if isinstance(ev, list) else [ev]
                    for a in evs:
                        ev_total += 1
                        text = sources.get(a.get("file", ""))
                        q = a.get("quote", "")
                        if text is None:
                            problems.append(f"[EV_FILE_NOT_FOUND] {p.name}:{lineno} {a.get('file')!r}")
                        elif q and q in text:
                            ev_ok += 1
                        else:
                            problems.append(f"[EV_QUOTE_FAIL] {p.name}:{lineno} {src} -{rel}-> {dst}: {q[:80]}")

    # ---- report ----
    print(f"nodes            : {n_nodes}  (unique ids: {len(id_origin)})")
    print(f"node types       : {dict(node_types)}")
    print(f"edges            : {n_edges}")
    print(f"rel distribution : {dict(rels.most_common())}")
    print(f"origin           : {dict(origins)}")
    if ev_total:
        print(f"edge evidence    : {ev_ok}/{ev_total} verified ({ev_ok/ev_total:.1%})")
    print(f"problems         : {len(problems)}")
    if problems:
        print("\n--- problems ---")
        for x in problems[:200]:
            print("  " + x)
        if len(problems) > 200:
            print(f"  ... and {len(problems)-200} more")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
