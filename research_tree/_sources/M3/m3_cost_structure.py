# -*- coding: utf-8 -*-
"""
M3 原型-3：双写 vs 影子读 vs 从源重建 —— 实测成本结构
======================================================
问题 3 实测：用真实数字支撑三条迁移维护路线的成本对比。

说明：本脚本给出"单进程可行性数字"（非正式性能基准）；微秒级增量
操作做 3 次重复取最小/均值以压低噪声，并如实标注。

- 从源重建(rebuild):  全量 522/1433 重建 RDF + 序列化 的一次性耗时
- 双写(dual-write):   每条新记录同时写 JSONL 与 RDF 的边际成本
- 影子读(shadow-read): 一轮 6 查询新旧并行比对 的单次验证成本
- 批量对比: 一个 100 条新边的批次，双写 vs 重建 vs 影子读 各需多少时间

解释器: tmp/venv_b7a/Scripts/python.exe (rdflib 7.6.0)
运行:   python m3_cost_structure.py
"""
import sys
import os
import time
import tempfile
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import load_nodes, load_edges, build_graph, add_node, add_edge, M3_DIR

from rdflib import Graph


def timed_once(fn):
    t0 = time.perf_counter()
    fn()
    return time.perf_counter() - t0


def main():
    print("== M3 cost structure: dual-write vs shadow-read vs rebuild ==")
    print("interpreter:", sys.executable)
    nodes = load_nodes()
    edges = load_edges()
    print("node_records:", len(nodes), "edge_records:", len(edges))

    # ---------- 1) 从源重建（一次性） ----------
    print("\n--- rebuild_from_source (one-time per rebuild) ---")
    t_build = timed_once(lambda: build_graph(nodes, edges))
    g = build_graph(nodes, edges)
    print("build_522_1433_seconds: %.4f" % t_build)
    t_nt = timed_once(lambda: g.serialize(format="nt"))
    print("serialize_nt_seconds: %.4f (bytes %d)" % (t_nt, len(g.serialize(format="nt").encode("utf-8") if isinstance(g.serialize(format="nt"), str) else g.serialize(format="nt"))))
    t_ttl = timed_once(lambda: g.serialize(format="turtle"))
    print("serialize_turtle_seconds: %.4f" % t_ttl)
    print("rebuild_one_time_build_plus_nt_seconds: %.4f" % (t_build + t_nt))

    # ---------- 2) 双写边际成本 ----------
    print("\n--- dual_write marginal cost (per record; min/mean of 3 repeats) ---")

    def measure_add_nodes():
        gg = Graph()
        for n in nodes:
            add_node(gg, n)
        return len(gg)

    def measure_add_edges():
        gg = build_graph(nodes, [])  # 稳态：节点已就位
        for i, e in enumerate(edges):
            add_edge(gg, e, i)
        return len(gg)

    t_nodes = sorted(timed_once(measure_add_nodes) for _ in range(3))
    t_edges = sorted(timed_once(measure_add_edges) for _ in range(3))
    t_jsonl_nodes = []
    t_jsonl_edges = []
    for _ in range(3):
        f = os.path.join(tempfile.gettempdir(), "m3_dualwrite_scratch.jsonl")
        t0 = time.perf_counter()
        with open(f, "w", encoding="utf-8") as fh:
            fh.writelines(json.dumps(n, ensure_ascii=False) + "\n" for n in nodes)
        t_jsonl_nodes.append(time.perf_counter() - t0)
        os.remove(f)
    for _ in range(3):
        f = os.path.join(tempfile.gettempdir(), "m3_dualwrite_scratch.jsonl")
        t0 = time.perf_counter()
        with open(f, "w", encoding="utf-8") as fh:
            fh.writelines(json.dumps(e, ensure_ascii=False) + "\n" for e in edges)
        t_jsonl_edges.append(time.perf_counter() - t0)
        os.remove(f)
    t_jsonl_nodes.sort()
    t_jsonl_edges.sort()

    per_node_rdf = 1000 * t_nodes[0] / len(nodes)   # ms/node
    per_edge_rdf = 1000 * t_edges[0] / len(edges)   # ms/edge
    per_node_js = 1000 * t_jsonl_nodes[0] / len(nodes)
    per_edge_js = 1000 * t_jsonl_edges[0] / len(edges)
    print("rdf_add_per_node_ms (min): %.4f" % per_node_rdf)
    print("rdf_add_per_edge_ms (min): %.4f" % per_edge_rdf)
    print("jsonl_append_per_node_ms (min): %.4f" % per_node_js)
    print("jsonl_append_per_edge_ms (min): %.4f" % per_edge_js)
    print("dual_write_per_node_ms (rdf+jsonl): %.4f" % (per_node_rdf + per_node_js))
    print("dual_write_per_edge_ms (rdf+jsonl): %.4f" % (per_edge_rdf + per_edge_js))
    print("(runs of 3, min shown; full: node %.4f/%.4f, edge %.4f/%.4f s)" %
          (t_nodes[0], t_nodes[2], t_edges[0], t_edges[2]))

    # ---------- 3) 影子读单轮成本 ----------
    print("\n--- shadow_read per verification (clean run, 6 queries) ---")
    import m3_shadow_read as sr
    g0 = build_graph(nodes, edges)
    props, edge_src = sr.new_build_index(g0)
    t0 = time.perf_counter()
    o1 = sr.old_node_type_counts(nodes)
    o2 = sr.old_rel_counts(edges)
    o3 = sr.old_node_inventory(nodes)
    o4 = sr.old_edge_inventory(edges)
    o5 = sr.old_edge_provenance(edges)
    o6 = sr.old_dangling(nodes, edges)
    t_old = time.perf_counter() - t0
    t0 = time.perf_counter()
    n1 = sr.new_node_type_counts(props)
    n2 = sr.new_rel_counts(g0)
    n3 = sr.new_node_inventory(props)
    n4 = sr.new_edge_inventory(g0)
    n5 = sr.new_edge_provenance(props, edge_src)
    n6 = sr.new_dangling(props, g0)
    t_new = time.perf_counter() - t0
    t0 = time.perf_counter()
    sr.compare(o1, n1); sr.compare(o2, n2); sr.compare(o3, n3, is_idmap=True)
    sr.compare(o4, n4, is_counter=True); sr.compare(o5, n5, is_counter=True); sr.compare(o6, n6)
    t_cmp = time.perf_counter() - t0
    print("old_side_seconds: %.4f" % t_old)
    print("new_side_seconds: %.4f" % t_new)
    print("compare_seconds: %.4f" % t_cmp)
    print("shadow_total_per_verification_seconds: %.4f" % (t_old + t_new + t_cmp))

    # ---------- 4) 批量对比：100 条新边 ----------
    print("\n--- batch comparison: 100 new edges ---")
    K = 100
    sub_edges = edges[:K]
    # 双写：K 条边增量写 RDF + JSONL
    gg = build_graph(nodes, [])
    t0 = time.perf_counter()
    for i, e in enumerate(sub_edges):
        add_edge(gg, e, i)
    t_rdf_batch = time.perf_counter() - t0
    f = os.path.join(tempfile.gettempdir(), "m3_dualwrite_scratch.jsonl")
    t0 = time.perf_counter()
    with open(f, "w", encoding="utf-8") as fh:
        fh.writelines(json.dumps(e, ensure_ascii=False) + "\n" for e in sub_edges)
    t_js_batch = time.perf_counter() - t0
    os.remove(f)
    t_dual_batch = t_rdf_batch + t_js_batch
    # 从源重建：一次全量
    t_rebuild_batch = t_build + t_nt
    # 影子读：一轮验证
    t_shadow_batch = t_old + t_new + t_cmp
    print("dual_write_100_edges_seconds: %.4f (rdf %.4f + jsonl %.4f)" %
          (t_dual_batch, t_rdf_batch, t_js_batch))
    print("rebuild_full_522_1433_seconds: %.4f (build %.4f + nt %.4f)" %
          (t_rebuild_batch, t_build, t_nt))
    print("shadow_verification_seconds: %.4f" % t_shadow_batch)
    print("ratio_rebuild_over_dualwrite_100_edges: %.2f" % (t_rebuild_batch / t_dual_batch))
    print("ratio_shadow_over_dualwrite_100_edges: %.2f" % (t_shadow_batch / t_dual_batch))
    print("DONE")


if __name__ == "__main__":
    main()
