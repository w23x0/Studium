# -*- coding: utf-8 -*-
"""
P1 原型：N-Quads 转义还原 grep 等价性 —— grep -F 等价性对比
===========================================================
问题2: 与直接对原始 JSONL 跑 grep -F 相比, N-Quads 路径在哪些锚点上会丢/变?

方法: 对每个 anchor 的原始 quote(解码后)做 byte 级子串匹配(grep -F 即字节级
固定串搜索):
  A) baseline: q 的 UTF-8 字节是否出现在 原始 nodes-*.jsonl(含 inherited) 文本字节中
  B) nquads  : q 的 UTF-8 字节是否出现在 p1_roundtrip 生成的 N-Quads 文件字节中
报告: 仅 A 命中 = 在 N-Quads 路径丢失; 仅 B 命中 = N-Quads 路径虚假多命中。
并给出按原因(含双引号/含反斜杠/含非 ASCII/其他)分类的丢失清单。

解释器: tmp/venv_b7a/Scripts/python.exe
运行:  python p1_grep_compare.py
"""

import json
import glob
import os
import sys

DATA_DIR = "C:/Users/Wang/Desktop/Studium/docs/图工程调研/M08实验-第15章分层图谱/data"
OUT_DIR = "C:/Users/Wang/Desktop/Studium/research_tree/_sources/P1"
NQ_PATH = os.path.join(OUT_DIR, "anchors_921.nq")


def load_anchors():
    anchors = []
    files = (sorted(glob.glob(os.path.join(DATA_DIR, "nodes-*.jsonl")))
             + sorted(glob.glob(os.path.join(DATA_DIR, "inherited", "nodes-*.jsonl"))))
    for f in files:
        with open(f, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                n = json.loads(line)
                for a in n.get("anchors", []):
                    anchors.append({
                        "src_file": os.path.relpath(f, DATA_DIR),
                        "node_id": n["id"],
                        "md_file": a["file"],
                        "quote": a["quote"],
                    })
    return anchors


def main():
    anchors = load_anchors()
    n = len(anchors)
    print("== P1 grep -F equivalence: raw JSONL vs N-Quads path ==")
    print("interpreter:", sys.executable)
    print("total_anchors:", n)

    # 原始 JSONL 字节 (grep -F 的基线对象)
    jsonl_bytes = b""
    files = (sorted(glob.glob(os.path.join(DATA_DIR, "nodes-*.jsonl")))
             + sorted(glob.glob(os.path.join(DATA_DIR, "inherited", "nodes-*.jsonl"))))
    for f in files:
        with open(f, "rb") as fh:
            jsonl_bytes += fh.read()
    print("raw_jsonl_bytes:", len(jsonl_bytes))

    # N-Quads 文件字节
    if not os.path.exists(NQ_PATH):
        print("FATAL: %s not found; run p1_roundtrip.py first" % NQ_PATH)
        sys.exit(1)
    with open(NQ_PATH, "rb") as fh:
        nq_bytes = fh.read()
    print("nquads_bytes:", len(nq_bytes))

    # 逐锚点 byte 级子串匹配 (grep -F 语义)
    only_a = []   # 基线命中、N-Quads 未命中 = 丢
    only_b = []   # 基线未命中、N-Quads 命中 = 多(变)
    both = 0
    neither = 0
    for i, a in enumerate(anchors):
        qb = a["quote"].encode("utf-8")
        hit_a = qb in jsonl_bytes
        hit_b = qb in nq_bytes
        if hit_a and hit_b:
            both += 1
        elif hit_a and not hit_b:
            only_a.append((i, a))
        elif not hit_a and hit_b:
            only_b.append((i, a))
        else:
            neither += 1

    print("both_hit:", both)
    print("lost_on_nquads_path (A hit, B miss):", len(only_a))
    print("gained_on_nquads_path (A miss, B hit):", len(only_b))
    print("neither:", neither)

    # 丢失原因分类
    def classify(q):
        tags = []
        if '"' in q:
            tags.append("doublequote")
        if "\\" in q:
            tags.append("backslash")
        if any(ord(c) > 127 for c in q):
            tags.append("nonascii")
        if any(ord(c) < 32 or ord(c) == 127 for c in q):
            tags.append("control")
        return tags or ["plain"]

    from collections import Counter
    lost_reasons = Counter()
    for (i, a) in only_a:
        for t in classify(a["quote"]):
            lost_reasons[t] += 1
    print("--- lost_on_nquads reasons ---")
    for t, c in lost_reasons.most_common():
        print("  %s: %d" % (t, c))

    print("--- lost anchors detail (first 40) ---")
    for (i, a) in only_a[:40]:
        print("idx=%d node=%s md=%s reasons=%s" % (i, a["node_id"], a["md_file"], classify(a["quote"])))
        print("  quote=%r" % a["quote"][:120])

    print("--- gained on nquads (A miss, B hit) detail ---")
    for (i, a) in only_b[:20]:
        print("idx=%d node=%s md=%s quote=%r" % (i, a["node_id"], a["md_file"], a["quote"][:120]))

    # 全语料里短 quote 在 N-Quads 文件中出现次数>1 的(潜在虚假命中放大)统计
    multi = 0
    for i, a in enumerate(anchors):
        qb = a["quote"].encode("utf-8")
        cnt = nq_bytes.count(qb)
        if cnt > 1:
            multi += 1
    print("anchors_appearing_more_than_once_in_nquads:", multi)

    # 基线在原始 JSONL 中多命中的统计(反方向: JSONL 里出现多次)
    multi_a = 0
    for i, a in enumerate(anchors):
        qb = a["quote"].encode("utf-8")
        if jsonl_bytes.count(qb) > 1:
            multi_a += 1
    print("anchors_appearing_more_than_once_in_jsonl:", multi_a)

    print("DONE")


if __name__ == "__main__":
    main()
