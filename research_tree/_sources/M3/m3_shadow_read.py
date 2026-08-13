# -*- coding: utf-8 -*-
"""
M3 原型-2：影子读（shadow read）—— JSONL+脚本 与 重建 RDF 逐条并行比对
======================================================================
问题 2 实测：新旧并行比对的落地方式与差异暴露。

语义（GitHub Scientist 框架）:
  old = 生产路径 = JSONL 记录 + Python 脚本查询
  new = 候选路径 = 重建 RDF + SPARQL 查询
  同一逻辑查询分别实现两遍, 逐条比对结果。

运行序列:
  - clean   : 真实 522/1433 -> 全查询 MATCH（零差异基线）
  - M1 丢边 : new 侧少一条边        -> 计数级 + 行级同时暴露
  - M2 反向 : new 侧把一条边 src/dst 对调 -> 计数级 BLIND, 仅行级暴露
  - M3 改文 : new 侧篡改一个节点 statement -> 仅字段级暴露
  - M4 丢节点: new 侧少一个被边引用的节点  -> 计数 + 行级 + 新侧悬空暴露

解释器: tmp/venv_b7a/Scripts/python.exe (rdflib 7.6.0)
运行:   python m3_shadow_read.py
"""
import sys
import os
import time
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import (load_nodes, load_edges, build_graph, node_uri, dec_id,
                    P_NS, REL_NS, TYPE_NS, EDGE_NS, DATA_DIR)

from rdflib import URIRef

RDF_TYPE_STR = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"


# ============ old 侧：JSONL + Python 脚本查询 ============
def old_node_type_counts(nodes):
    return dict(Counter(n["node_type"] for n in nodes))


def old_rel_counts(edges):
    return dict(Counter(e["rel"] for e in edges))


def old_node_row(n):
    sections = tuple(sorted(n.get("sections", [])))
    aliases = tuple(sorted(n.get("aliases", [])))
    anchors = tuple(sorted((a["file"], a["quote"]) for a in n.get("anchors", [])))
    parent = n.get("parent") or ""
    a = n.get("atomic")
    atomic_str = "1" if a is True else ("0" if a is False else "")
    return (n["node_type"], n.get("name_en", ""), n.get("name_zh", ""), n.get("statement", ""),
            sections, aliases, anchors, parent, atomic_str)


def old_node_inventory(nodes):
    return {n["id"]: old_node_row(n) for n in nodes}


def old_edge_inventory(edges):
    return Counter((e["src"], e["rel"], e["dst"]) for e in edges)


def old_edge_provenance(edges):
    out = Counter()
    for e in edges:
        ev = e.get("evidence") or {}
        out[(e["src"], e["rel"], e["dst"], e.get("origin", ""),
             ev.get("file", ""), ev.get("quote", ""), e.get("rel_note", ""))] += 1
    return out


def old_dangling(nodes, edges):
    ids = {n["id"] for n in nodes}
    return {x for e in edges for x in (e["src"], e["dst"]) if x not in ids}


# ============ new 侧：重建 RDF + SPARQL 查询 ============
def new_build_index(g):
    """一次性把图扫成 {subject_uri -> {prop_key -> [values]}} 与 edge->src 索引。"""
    props = {}
    edge_src = {}
    for s, p, o in g:
        ss, ps = str(s), str(p)
        if ps == RDF_TYPE_STR:
            props.setdefault(ss, {}).setdefault("node_type", []).append(
                str(o)[len(TYPE_NS):] if str(o).startswith(TYPE_NS) else str(o))
        elif ps.startswith(P_NS):
            key = ps[len(P_NS):]
            props.setdefault(ss, {}).setdefault(key, []).append(o)
            if key == "hasEdge":
                edge_src[str(o)] = ss
    return props, edge_src


def _first(pr, key, dec=False):
    vals = pr.get(key, [])
    if not vals:
        return ""
    v = vals[0]
    if dec and isinstance(v, URIRef):
        return dec_id(str(v))
    return v.toPython() if hasattr(v, "toPython") else str(v)


def new_node_row(nid, props):
    pr = props.get(node_uri(nid), {})
    sections = tuple(sorted(str(x) for x in pr.get("section", [])))
    aliases = tuple(sorted(str(x) for x in pr.get("alias", [])))
    anchors = tuple(sorted(
        (str(props.get(str(a), {}).get("file", [""])[0]),
         str(props.get(str(a), {}).get("quote", [""])[0]))
        for a in pr.get("hasAnchor", [])))
    atomic = _first(pr, "atomic")
    atomic_str = "1" if atomic is True else ("0" if atomic is False else "")
    return (_first(pr, "node_type"), str(_first(pr, "name_en")), str(_first(pr, "name_zh")),
            str(_first(pr, "statement")), sections, aliases, anchors,
            _first(pr, "parent", dec=True), atomic_str)


def new_node_inventory(props):
    # 只有带 node_type 属性的 subject 才是节点；anchor/edge 重化 URI 排除
    return {dec_id(s): new_node_row(dec_id(s), props)
            for s in props if "node_type" in props[s]}


def new_node_type_counts(props):
    c = Counter()
    for s in props:
        if "node_type" in props[s]:
            c[_first(props[s], "node_type")] += 1
    return dict(c)


def new_edge_inventory(g):
    q = "SELECT ?s ?p ?o WHERE { ?s ?p ?o . FILTER(strstarts(str(?p), \"" + REL_NS + "\")) }"
    return Counter((dec_id(str(r[0])), str(r[1])[len(REL_NS):], dec_id(str(r[2]))) for r in g.query(q))


def new_rel_counts(g):
    q = ("SELECT ?r (COUNT(*) AS ?c) WHERE { ?s ?r ?o . "
         "FILTER(strstarts(str(?r), \"" + REL_NS + "\")) } GROUP BY ?r")
    return {str(r[0])[len(REL_NS):]: int(r[1]) for r in g.query(q)}


def new_edge_provenance(props, edge_src):
    out = Counter()
    for eu, su in edge_src.items():
        pr = props.get(eu, {})
        dv = pr.get("dst", [None])[0]
        dst = dec_id(str(dv)) if isinstance(dv, URIRef) else (str(dv) if dv else "")
        rv = pr.get("rel", [None])[0]
        rel = str(rv)[len(REL_NS):] if str(rv).startswith(REL_NS) else str(rv)
        rn = pr.get("rel_note", [])
        out[(dec_id(su), rel, dst,
             str(_first(pr, "edgeOrigin")),
             str(_first(pr, "evFile")),
             str(_first(pr, "evQuote")),
             str(rn[0]) if rn else "")] += 1
    return out


def new_dangling(props, g):
    # 只有带 rdf:type 的 subject 才是节点；仅作为边端点/重化主体的 URI 不算
    node_ids = {dec_id(s) for s in props if "node_type" in props[s]}
    q = "SELECT ?s ?o WHERE { ?s ?p ?o . FILTER(strstarts(str(?p), \"" + REL_NS + "\")) }"
    bad = set()
    for s, o in g.query(q):
        if str(s).startswith(node_uri("")) and dec_id(str(s)) not in node_ids:
            bad.add(dec_id(str(s)))
        if str(o).startswith(node_uri("")) and dec_id(str(o)) not in node_ids:
            bad.add(dec_id(str(o)))
    return bad


# ============ 比对 ============
def compare(old, new, is_counter=False, is_idmap=False):
    """返回 (matched, [diff_rows])。diff_row 形如 (key, old_val, new_val)。"""
    if is_counter:
        keys = set(old) | set(new)
        diffs = [(k, old.get(k, 0), new.get(k, 0)) for k in keys if old.get(k, 0) != new.get(k, 0)]
        return (len(diffs) == 0, diffs)
    if is_idmap:
        keys = set(old) | set(new)
        diffs = []
        for k in sorted(keys):
            if k not in old:
                diffs.append((k, "<absent>", new[k]))
            elif k not in new:
                diffs.append((k, old[k], "<absent>"))
            elif old[k] != new[k]:
                diffs.append((k, old[k], new[k]))
        return (len(diffs) == 0, diffs)
    if isinstance(old, set) or isinstance(new, set):
        sd = (old | new) - (old & new)
        diffs = [(x, "in_new_only" if x not in old else "in_old_only", None) for x in sorted(sd)]
        return (len(diffs) == 0, diffs)
    # 普通 dict {key: count}
    keys = set(old) | set(new)
    diffs = [(k, old.get(k), new.get(k)) for k in keys if old.get(k) != new.get(k)]
    return (len(diffs) == 0, diffs)


QUERIES = [
    ("q_node_type_counts", "node_type_counts", {}, {"is_counter": False}),
    ("q_rel_counts", "rel_counts", {}, {"is_counter": False}),
    ("q_node_inventory", "node_inventory", {}, {"is_idmap": True}),
    ("q_edge_inventory", "edge_inventory", {}, {"is_counter": True}),
    ("q_edge_provenance", "edge_provenance", {}, {"is_counter": True}),
    ("q_dangling", "dangling", {}, {"is_counter": False}),
]


def run_shadow(old_nodes, old_edges, graph, tag="clean"):
    """old 侧读真实 JSONL（old_nodes/old_edges），new 侧读 graph。
    graph 若由被篡改的数据重建，则模拟“新载体偏离真源”，shadow read 负责暴露。"""
    print("\n===== SHADOW RUN [%s] =====" % tag)
    t_all = {}
    old = {}
    new = {}

    def timed(name, fn):
        t0 = time.perf_counter()
        r = fn()
        t_all[name] = time.perf_counter() - t0
        return r

    old["node_type_counts"] = timed("old_node_type_counts", lambda: old_node_type_counts(old_nodes))
    old["rel_counts"] = timed("old_rel_counts", lambda: old_rel_counts(old_edges))
    old["node_inventory"] = timed("old_node_inventory", lambda: old_node_inventory(old_nodes))
    old["edge_inventory"] = timed("old_edge_inventory", lambda: old_edge_inventory(old_edges))
    old["edge_provenance"] = timed("old_edge_provenance", lambda: old_edge_provenance(old_edges))
    old["dangling"] = timed("old_dangling", lambda: old_dangling(old_nodes, old_edges))

    props, edge_src = timed("new_index", lambda: new_build_index(graph))
    new["node_type_counts"] = timed("new_node_type_counts", lambda: new_node_type_counts(props))
    new["rel_counts"] = timed("new_rel_counts", lambda: new_rel_counts(graph))
    new["node_inventory"] = timed("new_node_inventory", lambda: new_node_inventory(props))
    new["edge_inventory"] = timed("new_edge_inventory", lambda: new_edge_inventory(graph))
    new["edge_provenance"] = timed("new_edge_provenance", lambda: new_edge_provenance(props, edge_src))
    new["dangling"] = timed("new_dangling", lambda: new_dangling(props, graph))

    summary = {}
    for qname, key, _, opts in QUERIES:
        matched, diffs = compare(old[key], new[key], **opts)
        summary[key] = (matched, len(diffs))
        verdict = "MATCH" if matched else "MISMATCH"
        print("  %-20s %s  (diff rows: %d)" % (qname, verdict, len(diffs)))
        for d in diffs[:5]:
            print("      diff:", repr(d))
        if len(diffs) > 5:
            print("      ... +%d more" % (len(diffs) - 5))

    t_old = sum(v for k, v in t_all.items() if k.startswith("old_"))
    t_new = sum(v for k, v in t_all.items() if k.startswith("new_") and k != "new_index")
    t_idx = t_all["new_index"]
    print("  timing_seconds:")
    print("    old_queries_total: %.4f" % t_old)
    print("    new_queries_total: %.4f (index %.4f + 6 queries %.4f)" % (t_new + t_idx, t_idx, t_new))
    print("    shadow_overhead_vs_old_only: %.4f" % (t_new + t_idx))
    return summary


def main():
    print("== M3 shadow read: JSONL+script vs rebuilt RDF, parallel compare ==")
    print("interpreter:", sys.executable)
    print("data_dir:", DATA_DIR)

    nodes = load_nodes()
    edges = load_edges()
    print("node_records:", len(nodes), "edge_records:", len(edges))

    # ---- clean 基线 ----
    g0 = build_graph(nodes, edges)
    run_shadow(nodes, edges, g0, tag="clean")

    # ---- M1 丢边：new 侧（重建 RDF）少一条边，old 侧仍读真实 JSONL ----
    drop_i = 0
    dropped = edges[drop_i]
    edges_m1 = edges[:drop_i] + edges[drop_i + 1:]
    g_m1 = build_graph(nodes, edges_m1)
    print("\n[M1] new-side graph built WITHOUT edge record index %d: (%s, %s, %s)" %
          (drop_i, dropped["src"], dropped["rel"], dropped["dst"]))
    run_shadow(nodes, edges, g_m1, tag="M1-drop-edge")

    # ---- M2 反向：new 侧把一条边 src/dst 对调 ----
    rev_i = 1
    rev = edges[rev_i]
    swapped = dict(rev)
    swapped["src"], swapped["dst"] = rev["dst"], rev["src"]
    edges_m2 = edges[:]
    edges_m2[rev_i] = swapped
    g_m2 = build_graph(nodes, edges_m2)
    print("\n[M2] new-side graph edge %d reversed: (%s, %s, %s) -> (%s, %s, %s)" %
          (rev_i, rev["src"], rev["rel"], rev["dst"], swapped["src"], swapped["rel"], swapped["dst"]))
    run_shadow(nodes, edges, g_m2, tag="M2-reverse-edge")

    # ---- M3 改文：new 侧篡改一个节点 statement ----
    tamper_id = "apostol:linear-space"
    nodes_m3 = [dict(n) for n in nodes]
    for n in nodes_m3:
        if n["id"] == tamper_id:
            n["statement"] = n["statement"] + " TAMPERED."
    g_m3 = build_graph(nodes_m3, edges)
    print("\n[M3] new-side node statement tampered: %s (appended ' TAMPERED.')" % tamper_id)
    run_shadow(nodes, edges, g_m3, tag="M3-tamper-statement")

    # ---- M4 丢节点：new 侧少一个被 22 条边引用的节点 ----
    drop_node = "apostol:theorem-15-15-orthogonal-decomposition"
    nodes_m4 = [n for n in nodes if n["id"] != drop_node]
    g_m4 = build_graph(nodes_m4, edges)
    print("\n[M4] new-side graph WITHOUT node: %s (22 edges still reference it)" % drop_node)
    run_shadow(nodes, edges, g_m4, tag="M4-drop-node")

    print("\nDONE")


if __name__ == "__main__":
    main()
