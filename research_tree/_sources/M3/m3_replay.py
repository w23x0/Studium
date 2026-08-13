# -*- coding: utf-8 -*-
"""
M3 原型-1：从 L0 JSONL 全量重建目标载体（RDF）——回放时间与一致性
=================================================================
问题 1 实测：522 节点 / 1433 边全量回放。
- 回放时间（build + serialize 两段分别计时）
- 一致性自检：
    a) 节点 subject 数 == 522
    b) 直连边三元组数 == 1433
    c) 重化证据边记录数 == 1433
    d) 悬空引用（边端点不在节点集）== 0
    e) 锚点规则违规（某节点 anchors 为空）== 0
    f) RDF->dict 全字段重建回读，逐字段通过率
    g) 两次独立重建序列化字节一致（从源重建确定性/幂等）
- 内存峰值（tracemalloc，仅 Python 层分配）
解释器: tmp/venv_b7a/Scripts/python.exe (rdflib 7.6.0)
运行:   python m3_replay.py
"""
import sys
import os
import time
import tracemalloc
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import (load_nodes, load_edges, build_graph, node_uri, rel_uri,
                    P_NS, REL_NS, NODE_NS, TYPE_NS, EDGE_NS, dec_id, M3_DIR, DATA_DIR)

from rdflib import Graph, URIRef, Literal, RDF

RDF_TYPE_STR = str(RDF.type)


def main():
    print("== M3 replay: JSONL -> RDF full rebuild, consistency ==")
    print("interpreter:", sys.executable)
    import rdflib
    print("rdflib_version:", rdflib.__version__)
    print("data_dir:", DATA_DIR)

    nodes = load_nodes()
    edges = load_edges()
    node_ids = {n["id"] for n in nodes}
    print("node_records:", len(nodes))
    print("edge_records:", len(edges))
    # 去重检查
    assert len(node_ids) == len(nodes), "duplicate node ids!"
    dup_edges = sum(1 for k, v in Counter((e["src"], e["rel"], e["dst"]) for e in edges).items() if v > 1)
    print("duplicate_(src,rel,dst)_groups:", dup_edges)

    # ---- 回放计时 ----
    tracemalloc.start()
    t0 = time.perf_counter()
    g = build_graph(nodes, edges)
    t_build = time.perf_counter() - t0
    _cur, peak = tracemalloc.get_traced_memory()
    t_tracemalloc = time.perf_counter() - t0

    print("--- build ---")
    print("build_wall_seconds: %.4f" % t_build)
    print("graph_triples:", len(g))
    print("peak_python_alloc_bytes:", peak, "=", "%.2f MiB" % (peak / 1048576))

    # ---- a) 节点 subject 数 ----
    q_nodes = ("SELECT (COUNT(DISTINCT ?s) AS ?c) WHERE { "
               "?s <" + RDF_TYPE_STR + "> ?t . FILTER(strstarts(str(?t), \"" + TYPE_NS + "\")) }")
    res = list(g.query(q_nodes))
    node_subjects = int(res[0][0])
    print("--- consistency ---")
    print("node_subjects:", node_subjects, "expected 522 ->", "OK" if node_subjects == 522 else "FAIL")

    # ---- b) 直连边三元组数 ----
    q_edges = ("SELECT (COUNT(*) AS ?c) WHERE { "
               "?s ?p ?o . FILTER(strstarts(str(?p), \"" + REL_NS + "\")) }")
    rel_triples = int(list(g.query(q_edges))[0][0])
    print("direct_rel_triples:", rel_triples, "expected 1433 ->", "OK" if rel_triples == 1433 else "FAIL")

    # ---- c) 重化边记录数 ----
    q_redges = ("SELECT (COUNT(DISTINCT ?e) AS ?c) WHERE { "
                "?e <" + P_NS + "rel> ?r . FILTER(strstarts(str(?e), \"" + EDGE_NS + "\")) }")
    reified_edges = int(list(g.query(q_redges))[0][0])
    print("reified_edge_records:", reified_edges, "expected 1433 ->", "OK" if reified_edges == 1433 else "FAIL")

    # ---- d) 悬空引用 ----
    dangling = set()
    for s, p, o in g:
        ps = str(p)
        if ps.startswith(REL_NS):
            if str(s).startswith(NODE_NS) and dec_id(str(s)) not in node_ids:
                dangling.add(dec_id(str(s)))
            if str(o).startswith(NODE_NS) and dec_id(str(o)) not in node_ids:
                dangling.add(dec_id(str(o)))
    print("dangling_ids:", len(dangling), "expected 0 ->", "OK" if not dangling else "FAIL", sorted(dangling)[:5])

    # ---- e) 锚点规则 ----
    no_anchor = [n["id"] for n in nodes if not n.get("anchors")]
    print("nodes_with_zero_anchors:", len(no_anchor), "expected 0 ->", "OK" if not no_anchor else "FAIL",
          no_anchor[:5])
    total_anchors = sum(len(n.get("anchors", [])) for n in nodes)
    print("total_anchors:", total_anchors)

    # ---- f) RDF -> dict 全字段回读，逐字段通过率 ----
    print("--- round-trip (RDF -> dict) per-field pass rate ---")
    # 构建 subject -> {prop_key -> [values]} 与 anchor 顺序、边重化
    props = {}
    anchor_src = {}
    edge_src = {}
    direct_edges = Counter()
    for s, p, o in g:
        ss, ps = str(s), str(p)
        if ps == RDF_TYPE_STR:
            if ss not in props:
                props[ss] = {}
            props[ss]["node_type"] = [str(o)[len(TYPE_NS):] if str(o).startswith(TYPE_NS) else str(o)]
            continue
        if ps.startswith(P_NS):
            key = ps[len(P_NS):]
            props.setdefault(ss, {}).setdefault(key, [])
            if isinstance(o, Literal):
                props[ss][key].append(o.toPython())
            else:
                props[ss][key].append(o)
            if key == "hasAnchor":
                anchor_src[str(o)] = ss
            continue
        if ps.startswith(REL_NS):
            direct_edges[(dec_id(ss), ps[len(REL_NS):], dec_id(str(o)))] += 1
            continue

    def one(nid, key, default=None, dec=False):
        v = props.get(node_uri(nid), {}).get(key, [])
        if not v:
            return default
        x = v[0]
        if dec and isinstance(x, URIRef):
            return dec_id(str(x))
        return x

    field_ok = Counter()
    field_total = Counter()
    node_mismatch = []
    SCALAR_FIELDS = [("node_type", "node_type"), ("name_en", "name_en"),
                     ("name_zh", "name_zh"), ("statement", "statement"),
                     ("parent", "parent"), ("atomic", "atomic"),
                     ("atomic_reason", "atomic_reason"), ("book", "book"),
                     ("origin_note", "origin_note"), ("audit_fix", "audit_fix"),
                     ("origin", "origin"), ("divergence", "divergence")]
    for n in nodes:
        nid = n["id"]
        pr = props.get(node_uri(nid), {})
        # 标量字段：原记录有则必须回读相等；原记录无则必须仍为无
        for name, key in SCALAR_FIELDS:
            old = n.get(key)
            vals = pr.get(key, [])
            if not vals:
                new = None
            else:
                v = vals[0]
                new = dec_id(str(v)) if (name == "parent" and isinstance(v, URIRef)) else v
            if old is None:
                if new is not None:
                    node_mismatch.append((nid, name, None, new))
                continue
            field_total[name] += 1
            if old == new:
                field_ok[name] += 1
            else:
                node_mismatch.append((nid, name, old, new))
        # 列表字段：JSONL 存于单数 key（section/alias），RDF 多值字面量；排序多集比较
        for name, key in (("sections", "section"), ("aliases", "alias")):
            old_l = sorted(n.get(name, []))
            new_l = sorted(str(x) for x in pr.get(key, []))
            field_total[name] += 1
            if old_l == new_l:
                field_ok[name] += 1
            else:
                node_mismatch.append((nid, name, old_l, new_l))
        # anchors：按 anchor URI 中编码的 index 有序重建，再排序比较
        old_anc = sorted((a["file"], a["quote"]) for a in n.get("anchors", []))
        new_anc = []
        for i in range(len(n.get("anchors", []))):
            au = node_uri(nid) + "/anchor/%d" % i
            apr = props.get(au, {})
            new_anc.append((str(apr.get("file", [""])[0]), str(apr.get("quote", [""])[0])))
        new_anc = sorted(new_anc)
        field_total["anchors"] += 1
        if old_anc == new_anc:
            field_ok["anchors"] += 1
        else:
            node_mismatch.append((nid, "anchors", old_anc[:2], new_anc[:2]))

    print("per_field_pass_rate (node fields, across %d nodes):" % len(nodes))
    for name in ["node_type", "name_en", "name_zh", "statement", "sections", "aliases",
                 "anchors", "parent", "atomic", "atomic_reason", "book",
                 "origin_note", "audit_fix", "origin", "divergence"]:
        tot = field_total.get(name, 0)
        ok = field_ok.get(name, 0)
        if tot:
            print("  %-15s %5d/%5d  %.4f%%" % (name, ok, tot, 100.0 * ok / tot))
        else:
            print("  %-15s (absent in dataset)" % name)
    print("node_field_mismatches:", len(node_mismatch))
    for m in node_mismatch[:5]:
        print("   MISMATCH", m)

    # 边回读（重化证据）
    edge_ok = 0
    edge_fail = []
    for idx, e in enumerate(edges):
        eu = EDGE_NS + str(idx)
        pr = props.get(eu, {})
        dv = pr.get("dst", [None])[0]
        dst_new = dec_id(str(dv)) if isinstance(dv, URIRef) else (str(dv) if dv else "")
        rv = pr.get("rel", [None])[0]
        rel_new = str(rv)[len(REL_NS):] if str(rv).startswith(REL_NS) else str(rv)
        row_new = (dst_new, rel_new,
                   str(pr.get("edgeOrigin", [""])[0]),
                   str(pr.get("evFile", [""])[0]),
                   str(pr.get("evQuote", [""])[0]))
        evd = e.get("evidence") or {}
        row_old = (e["dst"], e["rel"],
                   e.get("origin", ""),
                   evd.get("file", ""),
                   evd.get("quote", ""))
        if row_new == row_old:
            edge_ok += 1
        else:
            edge_fail.append((idx, e["src"], row_old, row_new))
    print("edge_reified_roundtrip_ok: %d/%d  %.4f%%" % (edge_ok, len(edges), 100.0 * edge_ok / len(edges)))
    for f in edge_fail[:5]:
        print("   EDGE MISMATCH", f)
    # 直连边与记录一致（无重数折叠）
    direct_match = sum(1 for e in edges if direct_edges.get((e["src"], e["rel"], e["dst"])) == 1)
    print("direct_edge_rows_exactly_one: %d/%d" % (direct_match, len(edges)))

    # ---- g) 两次独立重建字节一致 ----
    print("--- rebuild determinism ---")
    g2 = build_graph(nodes, edges)
    nt1 = g.serialize(format="nt")
    nt2 = g2.serialize(format="nt")
    if isinstance(nt1, str):
        nt1 = nt1.encode("utf-8")
    if isinstance(nt2, str):
        nt2 = nt2.encode("utf-8")
    print("nt_bytes_run1:", len(nt1))
    print("nt_bytes_run2:", len(nt2))
    print("rebuild_byte_identical:", nt1 == nt2)

    # ---- 序列化产物 ----
    print("--- serialize artifacts ---")
    t0 = time.perf_counter()
    nt_path = os.path.join(M3_DIR, "m3_replay_graph.nt")
    with open(nt_path, "w", encoding="utf-8") as fh:
        fh.write(g.serialize(format="nt"))
    t_nt = time.perf_counter() - t0
    t0 = time.perf_counter()
    ttl_path = os.path.join(M3_DIR, "m3_replay_graph.ttl")
    with open(ttl_path, "w", encoding="utf-8") as fh:
        fh.write(g.serialize(format="turtle"))
    t_ttl = time.perf_counter() - t0
    print("nt_written_bytes:", os.path.getsize(nt_path), "serialize_seconds: %.4f" % t_nt)
    print("ttl_written_bytes:", os.path.getsize(ttl_path), "serialize_seconds: %.4f" % t_ttl)
    print("artifacts:", nt_path)
    print("artifacts:", ttl_path)

    # 类型与关系分布（供报告）
    qtypes = "SELECT ?t (COUNT(?s) AS ?c) WHERE { ?s <" + RDF_TYPE_STR + "> ?t . FILTER(strstarts(str(?t), \"" + TYPE_NS + "\")) } GROUP BY ?t ORDER BY DESC(?c)"
    print("--- node_type distribution (RDF) ---")
    for row in g.query(qtypes):
        print("  %-9s %s" % (str(row[0])[len(TYPE_NS):], row[1]))
    qrels = "SELECT ?r (COUNT(*) AS ?c) WHERE { ?s ?r ?o . FILTER(strstarts(str(?r), \"" + REL_NS + "\")) } GROUP BY ?r ORDER BY DESC(?c)"
    print("--- rel distribution (RDF) ---")
    for row in g.query(qrels):
        print("  %-12s %s" % (str(row[0])[len(REL_NS):], row[1]))
    print("DONE")


if __name__ == "__main__":
    main()
