#!/usr/bin/env python3
"""图的结构统计:节点/边分布、悬挂引用、方向冗余、词表使用率。

不做语义判断,只做机械核对。用法:
  python graph_stats.py <nodes.jsonl> <edges.jsonl>
"""
import json
import sys
from collections import Counter
from pathlib import Path

SYMMETRIC = {"equivalent", "contrasts", "alias-of"}
VOCAB = {
    "is-a", "part-of", "requires", "implies", "equivalent",
    "contrasts", "applies-to", "generalizes", "alias-of", "other",
}
TYPES = {"concept", "method", "theorem", "notation"}


def read_jsonl(p: Path) -> list[dict]:
    out = []
    for lineno, line in enumerate(p.read_text(encoding="utf-8").splitlines(), 1):
        line = line.strip()
        if not line:
            continue
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError as e:
            print(f"  !! {p.name}:{lineno} malformed JSON: {str(e)[:80]}")
    return out


def main() -> None:
    nodes = read_jsonl(Path(sys.argv[1]))
    edges = read_jsonl(Path(sys.argv[2]))

    ids = {n.get("id") for n in nodes}
    print(f"nodes: {len(nodes)}  (unique ids: {len(ids)})")
    if len(ids) != len(nodes):
        dupes = [k for k, v in Counter(n.get("id") for n in nodes).items() if v > 1]
        print(f"  !! DUPLICATE ids: {dupes}")

    print("\nnode_type:")
    for t, c in Counter(n.get("node_type") for n in nodes).most_common():
        flag = "" if t in TYPES else "  <-- OFF-VOCAB"
        print(f"  {t:<10} {c:>4}{flag}")

    print(f"\nedges: {len(edges)}   (edges/node = {len(edges) / max(len(nodes), 1):.2f})")
    print("\nrel:")
    for r, c in Counter(e.get("rel") for e in edges).most_common():
        flag = "" if r in VOCAB else "  <-- OFF-VOCAB"
        print(f"  {r:<12} {c:>4}  {c / max(len(edges), 1):>5.1%}{flag}")

    origins = Counter(e.get("origin") for e in edges)
    print("\norigin:")
    for o, c in origins.most_common():
        print(f"  {o:<8} {c:>4}  {c / max(len(edges), 1):.1%}")

    # 悬挂引用
    dangling = [
        (e.get("src"), e.get("rel"), e.get("dst"))
        for e in edges
        if e.get("src") not in ids or e.get("dst") not in ids
    ]
    print(f"\ndangling edge endpoints: {len(dangling)}")
    for d in dangling[:15]:
        print(f"  {d}")

    # 自环
    loops = [e for e in edges if e.get("src") == e.get("dst")]
    if loops:
        print(f"self-loops: {len(loops)}")

    # 对称关系被写了两次
    dup_sym = []
    seen: set[tuple[str, str, str]] = set()
    for e in edges:
        if e.get("rel") in SYMMETRIC:
            key = (e.get("rel"), *sorted([str(e.get("src")), str(e.get("dst"))]))
            if key in seen:
                dup_sym.append(key)
            seen.add(key)
    print(f"symmetric rels written twice: {len(dup_sym)}")
    for d in dup_sym[:10]:
        print(f"  {d}")

    # is-a / generalizes 同时存在反向对
    isa = {(e.get("src"), e.get("dst")) for e in edges if e.get("rel") == "is-a"}
    gen = {(e.get("src"), e.get("dst")) for e in edges if e.get("rel") == "generalizes"}
    redundant = [(a, b) for (a, b) in isa if (b, a) in gen]
    print(f"is-a/generalizes redundant inverse pairs: {len(redundant)}")
    for r in redundant[:10]:
        print(f"  {r}")

    # other 未写 rel_note
    bad_other = [e for e in edges if e.get("rel") == "other" and not e.get("rel_note")]
    if bad_other:
        print(f"!! rel=other missing rel_note: {len(bad_other)}")

    # source 边缺 evidence
    no_ev = [e for e in edges if e.get("origin") == "source" and not (e.get("evidence") or {}).get("quote")]
    if no_ev:
        print(f"!! origin=source missing evidence.quote: {len(no_ev)}")

    # 孤立节点
    touched = {e.get("src") for e in edges} | {e.get("dst") for e in edges}
    isolated = sorted(ids - touched)
    print(f"\nisolated nodes (no edges): {len(isolated)}")
    for i in isolated[:15]:
        print(f"  {i}")


if __name__ == "__main__":
    main()
