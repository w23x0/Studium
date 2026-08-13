#!/usr/bin/env python3
"""抽象层候选检查器。适用于 L2 及以上任意层。

用法:
  python check_layer.py --layer 2 \
      --candidates data/structures-L2-a.jsonl data/structures-L2-b.jsonl ... \
      --nodes data/inherited/nodes-A1.jsonl data/nodes-D2.jsonl ... \
      [--lower data/structures-L2-surviving.jsonl]

检查项:
  ID_DUP          候选 id 重复
  ID_PREFIX       id 前缀与 --layer 不符
  MISSING_FIELD   必填字段缺失或为空
  LAYER_MISMATCH  layer 字段与 --layer 不符
  FEW_MEMBERS     成员数 < 3
  DANGLING_MEMBER 成员 id 不在已知节点池中
  DUP_MEMBER      同一候选内成员 id 重复
  FEW_SECTIONS    sections < 2
  SELF_MEMBER     候选把自己列为成员

报告项(不算错误,供审计参考):
  单层取材集中度 —— 成员几乎全来自同一 id 命名空间时提示
  候选间成员重叠 —— Jaccard >= 阈值的候选对
"""
import argparse
import json
import sys
from collections import Counter
from itertools import combinations

REQUIRED = ("id", "name_zh", "name_en", "layer", "statement",
            "members", "boundary", "abstraction_gain", "sections")
OVERLAP_THRESHOLD = 0.5
CONCENTRATION_THRESHOLD = 0.85


def load_jsonl(path):
    rows = []
    with open(path, encoding="utf-8") as fh:
        for lineno, line in enumerate(fh, 1):
            line = line.strip()
            if not line:
                continue
            try:
                rows.append((lineno, json.loads(line)))
            except json.JSONDecodeError as exc:
                print(f"BAD_JSON {path}:{lineno} {exc}")
                sys.exit(1)
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--layer", type=int, required=True)
    ap.add_argument("--candidates", nargs="+", required=True)
    ap.add_argument("--nodes", nargs="*", default=[])
    ap.add_argument("--lower", nargs="*", default=[],
                    help="下层存活结构文件,其 id 也可作为成员被引用")
    args = ap.parse_args()

    pool = set()
    for path in list(args.nodes) + list(args.lower):
        for _, row in load_jsonl(path):
            pool.add(row["id"])

    cands = []
    for path in args.candidates:
        for lineno, row in load_jsonl(path):
            cands.append((path, lineno, row))

    problems = []
    seen = {}
    prefix = f"L{args.layer}:"

    for path, lineno, c in cands:
        cid = c.get("id", "")
        where = f"{path}:{lineno}"

        if cid in seen:
            problems.append(f"ID_DUP {where} {cid} (also {seen[cid]})")
        else:
            seen[cid] = where

        if not cid.startswith(prefix):
            problems.append(f"ID_PREFIX {where} {cid} expected prefix {prefix}")

        for field in REQUIRED:
            if not c.get(field):
                problems.append(f"MISSING_FIELD {where} {cid} {field}")

        if c.get("layer") != args.layer:
            problems.append(f"LAYER_MISMATCH {where} {cid} layer={c.get('layer')}")

        members = c.get("members") or []
        if len(members) < 3:
            problems.append(f"FEW_MEMBERS {where} {cid} n={len(members)}")

        dups = [m for m, n in Counter(members).items() if n > 1]
        for m in dups:
            problems.append(f"DUP_MEMBER {where} {cid} {m}")

        if cid in members:
            problems.append(f"SELF_MEMBER {where} {cid}")

        if pool:
            for m in members:
                if m not in pool:
                    problems.append(f"DANGLING_MEMBER {where} {cid} -> {m}")

        if len(set(c.get("sections") or [])) < 2:
            problems.append(f"FEW_SECTIONS {where} {cid} {c.get('sections')}")

    print(f"候选 {len(cands)} 个,已知节点池 {len(pool)} 个 id")

    notes = []
    for path, lineno, c in cands:
        members = c.get("members") or []
        if not members:
            continue
        ns = Counter(m.split(":")[0] for m in members)
        top, n = ns.most_common(1)[0]
        if n / len(members) >= CONCENTRATION_THRESHOLD:
            notes.append(f"取材集中 {c['id']}: {n}/{len(members)} 成员来自 `{top}:`"
                         f" —— 单层取材,审计需重点查是否伪抽象")

    for (p1, l1, a), (p2, l2, b) in combinations(cands, 2):
        ma, mb = set(a.get("members") or []), set(b.get("members") or [])
        if not ma or not mb:
            continue
        j = len(ma & mb) / len(ma | mb)
        if j >= OVERLAP_THRESHOLD:
            notes.append(f"成员重叠 Jaccard={j:.2f}: {a['id']} <-> {b['id']}"
                         f" (共享 {len(ma & mb)} 个) —— 可能是同一结构的两种说法")

    if notes:
        print("\n--- 审计提示(非错误) ---")
        for n in notes:
            print(n)

    if problems:
        print(f"\n--- 问题 {len(problems)} 处 ---")
        for p in problems:
            print(p)
        sys.exit(1)

    print("\n无问题。")


if __name__ == "__main__":
    main()
