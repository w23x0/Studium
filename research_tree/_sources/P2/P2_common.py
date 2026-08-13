#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""P2 原型共享模块：第15章分层图谱 JSONL -> 简化 RDF 映射 + 数据统计。

建模（从简，任务卡 P2 规定）：
  - 节点 = subject（IRI `<urn:studium:node:<id>>`，每个节点另加 `a ex:Node`）
  - 节点元字段 = 字面量属性（ex:nodeType / ex:nameEn / ex:nameZh / ex:statement /
    ex:section / ex:origin / ex:originNote）
  - 锚点 quote = 字面量（ex:anchorQuote，一个 anchor 一条）
  - 关系边 = predicate（`src <urn:studium:rel:<rel>> dst`，dst 为 IRI）
  - 边的 evidence quote = src 上的字面量属性 ex:edgeEvidence

SHACL 侧需要三类可测约束：
  1. 封闭词表（sh:closed + sh:in 值封闭）
  2. 锚点引用存在性（SHACL-SPARQL：edgeEvidence 必须出现在本节点 anchorQuote 中）
  3. 边端点存在性（SHACL-SPARQL：所有 rel 谓词的目标必须是已知节点）

数据目录布局（M08实验-第15章分层图谱/data/）：
  主层: nodes-*.jsonl + edges-*.jsonl
  继承层: inherited/nodes-*.jsonl + inherited/edges-*.jsonl
  合计 522 节点 / 1433 边 / 921 锚点 quote（与任务卡规模一致）
"""
from __future__ import annotations

import glob
import json
import os
import time
from pathlib import Path

from rdflib import Graph, Literal, Namespace, URIRef

EX = Namespace("urn:studium:")
NODE_BASE = "urn:studium:node:"
REL_VOCAB = [
    "is-a", "part-of", "requires", "implies", "equivalent",
    "contrasts", "applies-to", "generalizes", "alias-of", "other",
]
NODE_TYPES = {"concept", "method", "theorem", "notation"}


def node_uri(node_id: str) -> URIRef:
    return URIRef(NODE_BASE + node_id)


def rel_predicate(rel: str) -> URIRef:
    return URIRef("urn:studium:rel:" + rel.replace("_", "-"))


def iter_jsonl(path: Path):
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        yield json.loads(line)


def find_data_files(data_dir: str) -> tuple[list[Path], list[Path]]:
    """返回 (node_files, edge_files)，覆盖主层 + inherited 层。"""
    d = Path(data_dir)
    node_files = sorted(glob.glob(str(d / "nodes-*.jsonl"))) + sorted(
        glob.glob(str(d / "inherited" / "nodes-*.jsonl"))
    )
    edge_files = sorted(glob.glob(str(d / "edges-*.jsonl"))) + sorted(
        glob.glob(str(d / "inherited" / "edges-*.jsonl"))
    )
    return [Path(p) for p in node_files], [Path(p) for p in edge_files]


def build_graph(data_dir: str, ttl_out: str | None = None) -> dict:
    """从 JSONL 构建简化 RDF 图，返回 {graph, stats}。stats 含构建耗时。"""
    t0 = time.perf_counter()
    node_files, edge_files = find_data_files(data_dir)

    g = Graph()
    g.bind("ex", EX)
    g.bind("rdf", "http://www.w3.org/1999/02/22-rdf-syntax-ns#")
    g.bind("rdfs", "http://www.w3.org/2000/01/rdf-schema#")
    g.bind("xsd", "http://www.w3.org/2001/XMLSchema#")
    g.bind("sh", "http://www.w3.org/ns/shacl#")

    n_nodes = n_anchors = n_edges = n_evidence = 0
    node_types: dict[str, int] = {}
    rel_counts: dict[str, int] = {}

    # ---- 节点 ----
    seen_ids: set[str] = set()
    for f in node_files:
        for obj in iter_jsonl(f):
            nid = obj.get("id")
            if not nid:
                continue
            if nid in seen_ids:
                continue  # 去重（主层与 inherited 理论上不重叠，防手误）
            seen_ids.add(nid)
            s = node_uri(nid)
            g.add((s, URIRef("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), EX.Node))
            nt = obj.get("node_type", "")
            node_types[nt] = node_types.get(nt, 0) + 1
            g.add((s, EX.nodeType, Literal(nt)))
            if obj.get("name_en"):
                g.add((s, EX.nameEn, Literal(obj["name_en"])))
            if obj.get("name_zh"):
                g.add((s, EX.nameZh, Literal(obj["name_zh"])))
            if obj.get("statement"):
                g.add((s, EX.statement, Literal(obj["statement"])))
            for sec in obj.get("sections", []):
                g.add((s, EX.section, Literal(sec)))
            if obj.get("origin"):
                g.add((s, EX.origin, Literal(obj["origin"])))
            if obj.get("origin_note"):
                g.add((s, EX.originNote, Literal(obj["origin_note"])))
            for a in obj.get("anchors", []):
                q = a.get("quote")
                if q:
                    g.add((s, EX.anchorQuote, Literal(q)))
                    n_anchors += 1
            n_nodes += 1

    # ---- 边 ----
    for f in edge_files:
        for obj in iter_jsonl(f):
            src, rel, dst = obj.get("src"), obj.get("rel"), obj.get("dst")
            if not (src and rel and dst):
                continue
            g.add((node_uri(src), rel_predicate(rel), node_uri(dst)))
            n_edges += 1
            rel_counts[rel] = rel_counts.get(rel, 0) + 1
            ev = obj.get("evidence") or {}
            q = ev.get("quote")
            if q:
                g.add((node_uri(src), EX.edgeEvidence, Literal(q)))
                n_evidence += 1

    build_s = time.perf_counter() - t0

    stats = {
        "nodes": n_nodes,
        "anchors": n_anchors,
        "edges": n_edges,
        "edge_evidence": n_evidence,
        "triples": len(g),
        "node_types": node_types,
        "rel_counts": rel_counts,
        "build_seconds": build_s,
        "node_files": [str(p) for p in node_files],
        "edge_files": [str(p) for p in edge_files],
    }

    if ttl_out:
        g.serialize(destination=ttl_out, format="turtle")
        stats["ttl_bytes"] = os.path.getsize(ttl_out)

    return {"graph": g, "stats": stats}


if __name__ == "__main__":
    import sys
    data_dir = sys.argv[1] if len(sys.argv) > 1 else (
        r"C:\Users\Wang\Desktop\Studium\docs\图工程调研\M08实验-第15章分层图谱\data")
    out = r"C:\Users\Wang\Desktop\Studium\research_tree\_sources\P2\graph.ttl" \
        if len(sys.argv) < 3 else sys.argv[2]
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
