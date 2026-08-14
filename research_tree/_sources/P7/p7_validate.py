#!/usr/bin/env python3
"""P7: G2/G4 SHACL + JSONL field rules on 522-node corpus."""
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "docs/图工程调研/M08实验-第15章分层图谱/data"
P2 = ROOT / "research_tree/_sources/P2"
sys.path.insert(0, str(P2))
from P2_common import build_graph, find_data_files, iter_jsonl  # noqa: E402


def check_jsonl_rules():
    """G2/G1 rules not in P2 RDF: other=>rel_note/label."""
    other_missing = []
    other_ok = 0
    node_files, edge_files = find_data_files(str(DATA))
    for f in edge_files:
        for e in iter_jsonl(f):
            rel = e.get("rel")
            if rel == "other":
                note = e.get("rel_note") or e.get("label")
                if note:
                    other_ok += 1
                else:
                    other_missing.append(e.get("src", "?") + "->" + e.get("dst", "?"))
    return {
        "other_edges_ok": other_ok,
        "other_edges_missing_note": len(other_missing),
        "other_missing_samples": other_missing[:5],
    }


def run_pyshacl(g):
    from pyshacl import validate
    shapes = (Path(__file__).parent / "P7_shapes.ttl").read_text(encoding="utf-8")
    t0 = time.perf_counter()
    conforms, report_graph, report_text = validate(
        data_graph=g,
        shacl_graph=shapes,
        inference="none",
        abort_on_first=False,
        allow_infos=True,
        allow_warnings=True,
    )
    elapsed = time.perf_counter() - t0
    n_results = 0
    try:
        from rdflib.namespace import SH
        for _ in report_graph.subjects(predicate=SH.result, object=None):
            n_results += 1
    except Exception:
        n_results = -1
    return {
        "conforms": bool(conforms),
        "validate_seconds": round(elapsed, 4),
        "shacl_results": n_results,
        "report_chars": len(report_text or ""),
    }


def main():
    built = build_graph(str(DATA))
    g = built["graph"]
    stats = built["stats"]
    jsonl_rules = check_jsonl_rules()
    shacl_p2 = run_pyshacl(g)  # baseline P2-compatible shapes in P7
    out = {
        "graph_stats": {k: stats[k] for k in ("nodes", "edges", "triples", "build_seconds")},
        "jsonl_g2_rules": jsonl_rules,
        "shacl_p7": shacl_p2,
        "pass": jsonl_rules["other_edges_missing_note"] == 0,
    }
    print(json.dumps(out, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
