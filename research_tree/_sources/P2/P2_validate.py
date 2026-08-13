#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""P2 原型实验主脚本：pyshacl 0.40.1 在 522 节点/921 锚点规模下的实测。

用法（venv 解释器）：
  tmp/venv_b7a/Scripts/python.exe research_tree/_sources/P2/P2_validate.py \
      "C:/Users/Wang/Desktop/Studium/docs/图工程调研/M08实验-第15章分层图谱/data"

输出：全部实测数字打到 stdout（保存为 run_output.txt）。不做跨工具横向基准（项目红线），
只测 pyshacl 自身的可行性与量级。

实验内容：
  [A] 全量 522 节点：graph 构建耗时、validate 耗时、峰值 RSS、结果数、按约束分组
  [B] 负对照：给 1 个节点注入词表外谓词，封闭词表应恰好 +1 条违规
  [C] 量级探针：取前 N 个节点子图（N=100/200/300/400/522），测 validate 耗时随规模变化
  [D] CLI 退出码：pyshacl 命令行在 合规模(经子图)/不合规模 下的进程退出码
"""
from __future__ import annotations

import ctypes
import os
import subprocess
import sys
import time
import tracemalloc
from pathlib import Path

from rdflib import Graph, Literal, Namespace, URIRef
from rdflib.namespace import RDF, SH

sys.path.insert(0, str(Path(__file__).parent))
from P2_common import EX, REL_VOCAB, build_graph, rel_predicate, node_uri

SHAPES_FILE = Path(__file__).parent / "P2_shapes.ttl"
GRAPH_TTL = Path(__file__).parent / "graph.ttl"
NODE_BASE = "urn:studium:node:"


# ---------- Windows 峰值工作集 ----------
def _mem_counters():
    """Windows PROCESS_MEMORY_COUNTERS。argtypes 必须显式声明否则调用失败返回 0。"""
    from ctypes import wintypes

    class PROCESS_MEMORY_COUNTERS(ctypes.Structure):
        _fields_ = [
            ("cb", wintypes.DWORD),
            ("PageFaultCount", wintypes.DWORD),
            ("PeakWorkingSetSize", ctypes.c_size_t),
            ("WorkingSetSize", ctypes.c_size_t),
            ("QuotaPeakPagedPoolUsage", ctypes.c_size_t),
            ("QuotaPagedPoolUsage", ctypes.c_size_t),
            ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
            ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
            ("PagefileUsage", ctypes.c_size_t),
            ("PeakPagefileUsage", ctypes.c_size_t),
        ]

    pmc = PROCESS_MEMORY_COUNTERS()
    pmc.cb = ctypes.sizeof(PROCESS_MEMORY_COUNTERS)
    fn = ctypes.windll.psapi.GetProcessMemoryInfo
    fn.argtypes = [wintypes.HANDLE, ctypes.POINTER(PROCESS_MEMORY_COUNTERS), wintypes.DWORD]
    fn.restype = wintypes.BOOL
    if not fn(ctypes.windll.kernel32.GetCurrentProcess(), ctypes.byref(pmc), pmc.cb):
        return None
    return pmc


def peak_working_set_kb() -> float:
    pmc = _mem_counters()
    return float(pmc.PeakWorkingSetSize / 1024.0) if pmc else float("nan")


def current_working_set_kb() -> float:
    pmc = _mem_counters()
    return float(pmc.WorkingSetSize / 1024.0) if pmc else float("nan")


# ---------- SHACL 运行 ----------
def load_shapes() -> Graph:
    sg = Graph()
    sg.parse(str(SHAPES_FILE), format="turtle")
    return sg


def run_validate(data_graph: Graph, shapes_graph: Graph, tag: str,
                 with_tracemalloc: bool = False) -> dict:
    import pyshacl
    if with_tracemalloc:
        tracemalloc.start()
    t0 = time.perf_counter()
    conforms, report_graph, report_text = pyshacl.validate(
        data_graph, shacl_graph=shapes_graph, abort_on_first=False, meta_shacl=False)
    elapsed = time.perf_counter() - t0
    peak_py = None
    if with_tracemalloc:
        _cur, peak_py = tracemalloc.get_traced_memory()
        tracemalloc.stop()

    # 结果数 + 按约束组件分组（sh:result 的 object 才是结果节点，root 上的 sh:result 是聚合）
    result_nodes = list(report_graph.objects(None, SH.result))
    counts: dict[str, int] = {}
    for r in result_nodes:
        comp = report_graph.value(r, SH.sourceConstraintComponent)
        counts[str(comp).rsplit("#", 1)[-1]] = counts.get(str(comp).rsplit("#", 1)[-1], 0) + 1
    return {
        "conforms": conforms,
        "elapsed": elapsed,
        "n_results": len(result_nodes),
        "counts": counts,
        "peak_python_bytes": peak_py,
        "report_text_head": report_text[:2000],
    }


# ---------- 子图抽取（量级探针）----------
def subset_graph(full: Graph, node_uris: set) -> Graph:
    rels = {rel_predicate(r) for r in REL_VOCAB}
    g = Graph()
    g.bind("ex", EX)
    for s, p, o in full:
        if s in node_uris and (p not in rels or o in node_uris):
            g.add((s, p, o))
    return g


def main() -> int:
    data_dir = sys.argv[1] if len(sys.argv) > 1 else (
        r"C:\Users\Wang\Desktop\Studium\docs\图工程调研\M08实验-第15章分层图谱\data")
    python = sys.executable

    print("=" * 70)
    print(f"P2 原型实测 — pyshacl 0.40.1 / rdflib 7.6.0")
    print(f"data_dir : {data_dir}")
    import pyshacl, rdflib
    print(f"pyshacl  : {pyshacl.__version__}   rdflib: {rdflib.__version__}")
    print("=" * 70)

    # ---- [A] 构建 + 全量校验 ----
    print("\n[A] 构建 RDF 图（简化建模）")
    r = build_graph(data_dir, ttl_out=str(GRAPH_TTL))
    st = r["stats"]
    full = r["graph"]
    print(f"  nodes={st['nodes']} anchors={st['anchors']} edges={st['edges']} "
          f"edge_evidence={st['edge_evidence']} triples={st['triples']}")
    print(f"  build_seconds={st['build_seconds']:.4f}")
    print(f"  graph.ttl bytes={st.get('ttl_bytes')}")

    print("\n[A] 全量 validate（计时用无 tracemalloc 的干净通道）")
    shapes = load_shapes()
    ws_before = current_working_set_kb()
    res = run_validate(full, shapes, "full", with_tracemalloc=False)
    ws_after = current_working_set_kb()
    print(f"  conforms        = {res['conforms']}")
    print(f"  validate_sec    = {res['elapsed']:.4f}   (无 tracemalloc 干净计时)")
    print(f"  results         = {res['n_results']}")
    print(f"  by component    = {res['counts']}")
    print(f"  process working set: before={ws_before:.0f} KB after={ws_after:.0f} KB "
          f"delta={ws_after-ws_before:.0f} KB peak={peak_working_set_kb():.0f} KB")
    # 单独一次 tracemalloc 通道，只取 Python 分配峰值（其计时被 ~5x 放大，仅作内存量级参考）
    res_mem = run_validate(full, shapes, "full-mem", with_tracemalloc=True)
    print(f"  [tracemalloc pass] peak_python_bytes = {res_mem['peak_python_bytes']} "
          f"({res_mem['peak_python_bytes']/1024/1024:.2f} MB), 该次 validate_sec={res_mem['elapsed']:.2f}s(含 tracer 开销)")
    print(f"  report head:")
    print("\n".join("    " + l for l in res["report_text_head"].splitlines()[:25]))

    # ---- [B] 负对照：注入词表外谓词 ----
    print("\n[B] 负对照：对 1 个节点注入词表外谓词 ex:bogusField")
    node_list = sorted({s for s in full.subjects(RDF.type, EX.Node)},
                       key=lambda u: str(u))
    bogus_node = node_list[0]
    g2 = subset_graph(full, set(node_list))
    g2.add((bogus_node, URIRef("urn:studium:bogusField"), Literal("x")))
    res2 = run_validate(g2, shapes, "negative-control")
    print(f"  injected node   = {bogus_node}")
    print(f"  conforms        = {res2['conforms']}")
    print(f"  results         = {res2['n_results']}  (vs clean {res['n_results']})")
    print(f"  by component    = {res2['counts']}")
    closed_delta = res2["counts"].get("ClosedConstraintComponent", 0)
    print(f"  ClosedConstraintComponent count = {closed_delta} (期望 1，证明封闭词表有牙齿)")

    # ---- [C] 量级探针 ----
    print("\n[C] 量级探针：取前 N 个节点子图，测 validate 耗时随规模变化（单工具自比，非跨工具基准）")
    print(f"  {'N':>6} {'triples':>8} {'validate_sec':>12} {'results':>8}")
    full_sorted = sorted({s for s in full.subjects(RDF.type, EX.Node)}, key=lambda u: str(u))
    for n in [100, 200, 300, 400, 522]:
        sub_nodes = set(full_sorted[:n])
        sub = subset_graph(full, sub_nodes)
        rr = run_validate(sub, shapes, f"subset-{n}")
        print(f"  {n:>6} {len(sub):>8} {rr['elapsed']:>12.4f} {rr['n_results']:>8}")

    # ---- [D] CLI 退出码 ----
    print("\n[D] pyshacl CLI 退出码语义（合规模 / 不合规模 / 非法 shapes）")
    # 不合规模：graph.ttl（真违规，conforms=False）
    cmd = [python, "-m", "pyshacl", "-s", str(SHAPES_FILE), str(GRAPH_TTL)]
    t0 = time.perf_counter()
    proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    t1 = time.perf_counter()
    print(f"  non-conforming graph: exit={proc.returncode}  elapsed={t1-t0:.4f}s")
    # 合规模：空图（conforms=True）
    empty_ttl = Path(__file__).parent / "empty.ttl"
    empty_ttl.write_text("", encoding="utf-8")
    cmd2 = [python, "-m", "pyshacl", "-s", str(SHAPES_FILE), str(empty_ttl)]
    proc2 = subprocess.run(cmd2, capture_output=True, text=True, encoding="utf-8", errors="replace")
    print(f"  conforming (empty data) graph: exit={proc2.returncode}")
    # 合法但空 shapes：无约束，一切通过（假阴性风险点）
    empty_shapes = Path(__file__).parent / "empty_shapes.ttl"
    empty_shapes.write_text("@prefix sh: <http://www.w3.org/ns/shacl#> .\n", encoding="utf-8")
    proc4 = subprocess.run([python, "-m", "pyshacl", "-s", str(empty_shapes), str(GRAPH_TTL)],
                           capture_output=True, text=True, encoding="utf-8", errors="replace")
    print(f"  empty-but-valid shapes file: exit={proc4.returncode}  (空 shapes 图 -> 无约束全通过)")
    # 非法 shapes 文件：语法错误，触发引擎/解析错误
    bad_ttl = Path(__file__).parent / "bad_shapes.ttl"
    bad_ttl.write_text("this is not valid turtle @@@ {{", encoding="utf-8")
    proc3 = subprocess.run([python, "-m", "pyshacl", "-s", str(bad_ttl), str(GRAPH_TTL)],
                           capture_output=True, text=True, encoding="utf-8", errors="replace")
    print(f"  invalid shapes file: exit={proc3.returncode}")
    if proc3.stderr:
        print("  [D] invalid-shapes stderr tail:", proc3.stderr.strip()[:300])

    print("\n[DONE]")
    return 0


if __name__ == "__main__":
    sys.exit(main())
