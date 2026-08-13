# -*- coding: utf-8 -*-
"""
P1 原型：交叉校验与确定性验证
==============================
1) 用 rdflib 自己的 NQuadsParser 解析 p1_roundtrip 生成的 .nq, 逐一比对各
   字面量对象是否 == 原始 quote (独立 oracle, 对照手写 reduce_nt_string)。
2) 验证 canonicalize=True 是否为 no-op: 源码显示 NQuadsSerializer.serialize
   把 **kwargs 吞掉; 此处用"乱序插入 vs 顺序插入"两个 Dataset 的序列化输出做
   对照, 验证 canonicalize=True 没有产生确定性排序 (RDFC-1.0 未实现)。
解释器: tmp/venv_b7a/Scripts/python.exe
运行:  python p1_verify.py
"""

import json
import glob
import os
import re
import sys

DATA_DIR = "C:/Users/Wang/Desktop/Studium/docs/图工程调研/M08实验-第15章分层图谱/data"
OUT_DIR = "C:/Users/Wang/Desktop/Studium/research_tree/_sources/P1"
NQ_PATH = os.path.join(OUT_DIR, "anchors_921.nq")

from rdflib import Dataset, URIRef, Literal, ConjunctiveGraph
from rdflib.parser import create_input_source


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
                    anchors.append(a["quote"])
    return anchors


def main():
    print("== P1 verify: oracle cross-check + canonicalization no-op check ==")
    print("interpreter:", sys.executable)
    anchors = load_anchors()
    n = len(anchors)
    print("total_anchors:", n)

    # ---- 1) rdflib 自身解析器作 oracle ----
    g = ConjunctiveGraph()
    with open(NQ_PATH, "rb") as fh:
        g.parse(fh, format="nquads")
    # 收集 (urn:anchor:<i>, literal)
    parsed = {}
    for s, p, o in g:
        if str(p) == "urn:quote":
            m = re.match(r"urn:anchor:(\d+)", str(s))
            if m:
                parsed[int(m.group(1))] = str(o)
    n_ok = 0
    missing = []
    for i, q in enumerate(anchors):
        if i in parsed and parsed[i] == q:
            n_ok += 1
        else:
            missing.append(i)
    print("oracle_parsed_literals:", len(parsed))
    print("oracle_roundtrip_ok:", n_ok, "/", n)
    print("oracle_roundtrip_pass_rate: %.4f%%" % (100.0 * n_ok / n))
    print("oracle_missing_or_mismatch:", len(missing), missing[:10])

    # ---- 2) canonicalize=True 是否真做 RDFC-1.0 ----
    # 顺序插入 vs 乱序插入
    qs = anchors
    ds_ordered = Dataset()
    ds_shuffled = Dataset()
    import random
    rng = random.Random(42)
    order = list(range(n))
    rng.shuffle(order)
    for i in range(n):
        ds_ordered.add((URIRef("urn:anchor:%d" % i), URIRef("urn:quote"), Literal(qs[i])))
    for i in order:
        ds_shuffled.add((URIRef("urn:anchor:%d" % i), URIRef("urn:quote"), Literal(qs[i])))

    out_ordered = ds_ordered.serialize(format="nquads")
    out_shuffled = ds_shuffled.serialize(format="nquads")
    out_ordered_c = ds_ordered.serialize(format="nquads", canonicalize=True)
    out_shuffled_c = ds_shuffled.serialize(format="nquads", canonicalize=True)

    print("plain_serialize_ordered_bytes:", len(out_ordered))
    print("plain_serialize_shuffled_bytes:", len(out_shuffled))
    print("plain_ordered == plain_shuffled:", out_ordered == out_shuffled)
    print("canonical_ordered == canonical_shuffled:", out_ordered_c == out_shuffled_c)
    print("canonical_ordered == plain_ordered:", out_ordered_c == out_ordered)
    print("canonical_shuffled == plain_shuffled:", out_shuffled_c == out_shuffled)
    # 说明: 若 canonicalize 真实现 RDFC-1.0, 无论插入顺序都应有确定性排序输出,
    # 且 canonical 与 plain 不同; 上面两个 == 判断给出实测。
    print("DONE")


if __name__ == "__main__":
    main()
