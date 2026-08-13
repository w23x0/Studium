# -*- coding: utf-8 -*-
"""
M3 共享模块：加载第 15 章全量 nodes/edges 并映射到 RDF。
========================================================
- 数据源: docs/图工程调研/M08实验-第15章分层图谱/data/
    nodes-*.jsonl + inherited/nodes-*.jsonl  (合计 522 节点)
    edges-*.jsonl + inherited/edges-*.jsonl  (合计 1433 边)
- 解释器: tmp/venv_b7a/Scripts/python.exe (rdflib 7.6.0)
- 用法:  被 m3_replay.py / m3_shadow_read.py / m3_cost_structure.py import。

RDF 映射（目标载体契约，本原型采用）:
  node  : http://studium.local/node/<id 中 ':' 转 '%3A'>  （可逆双射）
  rel   : http://studium.local/rel/<rel>                   （边直连谓词）
  node 属性 : http://studium.local/p/<field>
  node_type 类 : http://studium.local/type/<node_type>
  anchor  : <node_uri>/anchor/<index>                      （保留原顺序）
  edge 证据: http://studium.local/edge/<edge_index>         （重化 BNode 用确定 URI）
  直连三元组: <src_uri> <rel_uri> <dst_uri>                 （保证边计数 = 1433）
"""
import json
import glob
import os
import sys

DATA_DIR = os.path.abspath(r"C:/Users/Wang/Desktop/Studium/docs/图工程调研/M08实验-第15章分层图谱/data")
M3_DIR = os.path.abspath(os.path.dirname(os.path.abspath(__file__)))

NODE_NS = "http://studium.local/node/"
REL_NS = "http://studium.local/rel/"
P_NS = "http://studium.local/p/"
TYPE_NS = "http://studium.local/type/"
EDGE_NS = "http://studium.local/edge/"


def node_files():
    return (sorted(glob.glob(os.path.join(DATA_DIR, "nodes-*.jsonl")))
            + sorted(glob.glob(os.path.join(DATA_DIR, "inherited", "nodes-*.jsonl"))))


def edge_files():
    return (sorted(glob.glob(os.path.join(DATA_DIR, "edges-*.jsonl")))
            + sorted(glob.glob(os.path.join(DATA_DIR, "inherited", "edges-*.jsonl"))))


def load_nodes():
    nodes = []
    for f in node_files():
        with open(f, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                nodes.append(json.loads(line))
    return nodes


def load_edges():
    edges = []
    for f in edge_files():
        with open(f, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                edges.append(json.loads(line))
    return edges


def enc_id(i):
    return i.replace(":", "%3A")


def dec_id(s):
    return s[len(NODE_NS):].replace("%3A", ":")


def node_uri(i):
    return NODE_NS + enc_id(i)


def rel_uri(r):
    return REL_NS + r


def p(s):
    return P_NS + s


def type_uri(t):
    return TYPE_NS + t


def add_node(g, n):
    """把一个 node 记录的全部字段写入图。"""
    from rdflib import URIRef, Literal, RDF
    u = URIRef(node_uri(n["id"]))
    g.add((u, RDF.type, URIRef(type_uri(n["node_type"]))))
    for key in ("name_en", "name_zh", "statement", "origin_note",
                "audit_fix", "book", "origin", "divergence"):
        if n.get(key) is not None:
            g.add((u, URIRef(p(key)), Literal(str(n[key]))))
    for s in n.get("sections", []):
        g.add((u, URIRef(p("section")), Literal(s)))
    for a in n.get("aliases", []):
        g.add((u, URIRef(p("alias")), Literal(a)))
    for i, anc in enumerate(n.get("anchors", [])):
        au = URIRef(node_uri(n["id"]) + "/anchor/%d" % i)
        g.add((u, URIRef(p("hasAnchor")), au))
        g.add((au, URIRef(p("file")), Literal(anc["file"])))
        g.add((au, URIRef(p("quote")), Literal(anc["quote"])))
    if n.get("parent"):
        g.add((u, URIRef(p("parent")), URIRef(node_uri(n["parent"]))))
    if n.get("atomic") is not None:
        g.add((u, URIRef(p("atomic")), Literal(bool(n["atomic"]))))
    if n.get("atomic_reason"):
        g.add((u, URIRef(p("atomic_reason")), Literal(n["atomic_reason"])))
    for k in ("apostol_ids", "strang_ids"):
        for v in n.get(k, []):
            g.add((u, URIRef(p(k)), Literal(v)))


def add_edge(g, e, idx):
    """把一条 edge 记录写入图：直连三元组 + 重化证据。"""
    from rdflib import URIRef, Literal
    su = URIRef(node_uri(e["src"]))
    du = URIRef(node_uri(e["dst"]))
    ru = URIRef(rel_uri(e["rel"]))
    g.add((su, ru, du))  # 直连，保证 COUNT = 1433
    eu = URIRef(EDGE_NS + str(idx))  # 重化证据，确定 URI
    g.add((su, URIRef(p("hasEdge")), eu))
    g.add((eu, URIRef(p("rel")), ru))
    g.add((eu, URIRef(p("dst")), du))
    g.add((eu, URIRef(p("edgeOrigin")), Literal(e.get("origin", ""))))
    ev = e.get("evidence") or {}
    if ev.get("file"):
        g.add((eu, URIRef(p("evFile")), Literal(ev["file"])))
    if ev.get("quote"):
        g.add((eu, URIRef(p("evQuote")), Literal(ev["quote"])))
    if e.get("rel_note"):
        g.add((eu, URIRef(p("rel_note")), Literal(e["rel_note"])))


def build_graph(nodes, edges):
    from rdflib import Graph
    g = Graph()
    for n in nodes:
        add_node(g, n)
    for idx, e in enumerate(edges):
        add_edge(g, e, idx)
    return g
