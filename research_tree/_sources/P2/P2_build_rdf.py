#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""P2 原型 — 仅构建 RDF 图并写 Turtle（可选；主实验直接由 P2_validate.py 完成）。

用法：
  "tmp/venv_b7a/Scripts/python.exe" research_tree/_sources/P2/P2_build_rdf.py \
      <data_dir> [graph.ttl 输出路径]
缺省 data_dir = M08 数据目录，缺省输出 = research_tree/_sources/P2/graph.ttl。
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from P2_common import build_graph  # noqa: E402

DEFAULT_DATA = r"C:\Users\Wang\Desktop\Studium\docs\图工程调研\M08实验-第15章分层图谱\data"
DEFAULT_OUT = str(Path(__file__).parent / "graph.ttl")


def main() -> int:
    data_dir = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DATA
    out = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_OUT
    r = build_graph(data_dir, ttl_out=out)
    st = r["stats"]
    print(f"nodes           : {st['nodes']}")
    print(f"anchors (quotes): {st['anchors']}")
    print(f"edges           : {st['edges']}")
    print(f"edge evidence   : {st['edge_evidence']}")
    print(f"triples         : {st['triples']}")
    print(f"node types      : {st['node_types']}")
    print(f"rel counts      : {st['rel_counts']}")
    print(f"build seconds   : {st['build_seconds']:.4f}")
    print(f"turtle out      : {out} ({st.get('ttl_bytes', 'n/a')} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
