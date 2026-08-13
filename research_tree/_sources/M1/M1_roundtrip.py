#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
M1 原型 #1 —— 语义无损往返：真实 Obsidian frontmatter (YAML) -> RDF(N-Quads) -> YAML
====================================================================================
任务卡 M1 Q1：python-yaml-ld 能否把真实带 frontmatter 的 md 文件语义无损转成 RDF 并往返？

用法（在 Studium 根目录）：
  tmp/venv_b7a/Scripts/python.exe research_tree/_sources/M1/M1_roundtrip.py \
      --root "docs/图工程调研/M08实验-Apostol微积分卷1/obsidian" \
      --limit 81 --with-anchors

  --root          Obsidian 目录（含 L1-基础网络 等子目录）
  --limit N       只处理前 N 个带 frontmatter 的 md 文件（0 = 全部）
  --with-anchors  额外把正文「原文锚点」的逐字引文并入 YAML-LD 文档，测引文过 RDF
  --outdir        输出目录（默认脚本所在目录/out）

判定标准（语义无损）：
  A) N-Quads 字节往返：to_rdf(doc) == to_rdf(from_rdf(to_rdf(doc)))
  B) rdflib 图同构：isomorphic(graph1, graph2) 且三元组数相等
  C) 字段级往返：compact(from_rdf(RDF), ctx) 与原 frontmatter 数据逐键相等
任何一条不满足即该文件判「违规」，计入 violations。
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys
import time

import yaml  # PyYAML
import yaml_ld
import rdflib
from rdflib.compare import isomorphic

from yaml_ld.to_rdf import ToRDFOptions
from yaml_ld.from_rdf import FromRDFOptions

BASE = "https://studium.example/"
CONTEXT = {
    "name": "https://studium.example/vocab#name",
    "name_en": "https://studium.example/vocab#nameEn",
    "node_type": "https://studium.example/vocab#nodeType",
    "origin": "https://studium.example/vocab#origin",
    "layer": "https://studium.example/vocab#layer",
    "sections": {"@id": "https://studium.example/vocab#sections", "@container": "@list"},
    "aliases": {"@id": "https://studium.example/vocab#aliases", "@container": "@list"},
    "anchors": {"@id": "https://studium.example/vocab#anchorQuote", "@container": "@list"},
    "@vocab": "https://studium.example/vocab#",
}

ANCHOR_RE = re.compile(r"^-\s*`[^`]+`[:：]?\s*[“\"](.*)[”\"]\s*$")


def extract_frontmatter(text: str) -> tuple[dict | None, str]:
    """返回 (frontmatter dict, body) 。frontmatter 必须是文件首部 --- 块。
    严格 YAML 解析失败时返回 (None, body)，由调用方计入 parse-fail（迁移阻塞）。"""
    if not text.startswith("---\n") and not text.startswith("---\r\n"):
        return None, text
    m = re.match(r"^---\r?\n", text)
    end = text.find("\n---", m.end() if m else 3)
    if end < 0:
        return None, text
    block = text[m.end() if m else 3:end]
    try:
        data = yaml.safe_load(block)
    except Exception:
        return None, text
    body = text[end + 4:]
    return data, body


def extract_anchors(body: str) -> list[str]:
    """从正文「原文锚点」小节抓逐字引文。"""
    anchors = []
    for line in body.splitlines():
        line = line.strip()
        m = ANCHOR_RE.match(line)
        if m:
            anchors.append(m.group(1).strip())
    return anchors


def relid(root: pathlib.Path, filepath: pathlib.Path) -> str:
    rel = filepath.relative_to(root).as_posix().replace(".md", "")
    return BASE + rel


def build_node(root, filepath, data, anchors):
    node = {"@id": relid(root, filepath)}
    node.update({k: v for k, v in data.items() if not k.startswith("@")})
    if anchors:
        node["anchors"] = anchors
    return node


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--with-anchors", action="store_true")
    ap.add_argument("--outdir", default=None)
    args = ap.parse_args()

    root = pathlib.Path(args.root)
    outdir = pathlib.Path(args.outdir or pathlib.Path(__file__).parent / "out")
    outdir.mkdir(parents=True, exist_ok=True)

    files = sorted(root.rglob("*.md"))
    data = {}
    parse_failures = []
    for f in files:
        txt = f.read_text(encoding="utf-8")
        fm, body = extract_frontmatter(txt)
        if isinstance(fm, dict) and not fm.get("__yaml_error__"):
            anchors = extract_anchors(body) if args.with_anchors else []
            data[f] = (fm, body, anchors)
        elif fm is None and (txt.startswith("---\n") or txt.startswith("---\r\n")):
            parse_failures.append(str(f))
    n_total = len(data) + len(parse_failures)
    n_parse_fail = len(parse_failures)
    if args.limit and args.limit < n_total:
        # 按路径排序后取前 N，保证可复现
        sel = sorted(data.keys())[: args.limit]
        data = {k: data[k] for k in sel}
    n = len(data)

    doc = {
        "@context": CONTEXT,
        "@graph": [build_node(root, f, fm, anchors) for f, (fm, body, anchors) in sorted(data.items(), key=lambda kv: str(kv[0]))],
    }

    t0 = time.perf_counter()
    nq1 = yaml_ld.to_rdf(doc, ToRDFOptions(format="application/n-quads"))
    t1 = time.perf_counter()
    back = yaml_ld.from_rdf(nq1, FromRDFOptions(format="application/n-quads"))
    t2 = time.perf_counter()
    nq2 = yaml_ld.to_rdf(back, ToRDFOptions(format="application/n-quads"))
    t3 = time.perf_counter()

    dt_to_rdf = t1 - t0
    dt_from_rdf = t2 - t1
    dt_to_rdf2 = t3 - t2

    # 字节级往返
    byte_equal = nq1 == nq2

    # 图同构
    g1 = rdflib.Graph(); g1.parse(data=nq1, format="nquads")
    g2 = rdflib.Graph(); g2.parse(data=nq2, format="nquads")
    iso = isomorphic(g1, g2)
    t1c, t2c = len(g1), len(g2)

    # 字段级比较（compact 回 YAML）
    comp = yaml_ld.compact(back, CONTEXT)
    comp_graph = comp.get("@graph", comp if isinstance(comp, list) else [comp])
    comp_by_id = {}
    for node in comp_graph if isinstance(comp_graph, list) else []:
        nid = node.get("@id")
        if nid:
            comp_by_id[nid] = {k: v for k, v in node.items() if k not in ("@context", "@id")}

    violations = []
    field_stats = {"checked": 0, "ok": 0, "mismatch": 0, "missing": 0}
    for f, (fm, body, anchors) in sorted(data.items(), key=lambda kv: str(kv[0])):
        nid = relid(root, f)
        orig = {k: v for k, v in fm.items() if not k.startswith("__")}
        if args.with_anchors and anchors:
            orig["anchors"] = anchors
        got = comp_by_id.get(nid)
        if got is None:
            violations.append({"file": str(f), "reason": "node missing in roundtrip"})
            continue
        for key, val in sorted(orig.items()):
            field_stats["checked"] += 1
            if key not in got:
                field_stats["missing"] += 1
                violations.append({"file": str(f), "field": key, "reason": "missing"})
            elif got[key] != val:
                field_stats["mismatch"] += 1
                violations.append({"file": str(f), "field": key, "orig": val, "got": got[key], "reason": "value-diff"})
            else:
                field_stats["ok"] += 1

    # 汇总
    n_violations = len(violations)
    passed = n_violations == 0 and byte_equal and iso
    passed_files = n - n_violations

    summary = {
        "files_total": n_total,
        "files_parse_failed": n_parse_fail,
        "files_processed": n,
        "parse_failed_files": parse_failures,
        "with_anchors": args.with_anchors,
        "nquads_triples_g1": t1c,
        "nquads_triples_g2": t2c,
        "byte_equal_nquads": byte_equal,
        "graph_isomorphic": iso,
        "field_stats": field_stats,
        "n_violations": n_violations,
        "n_files_with_violation": len({v["file"] for v in violations}),
        "passed_files": passed_files,
        "overall_pass": passed,
        "timings_sec": {
            "to_rdf_pass1": round(dt_to_rdf, 4),
            "from_rdf": round(dt_from_rdf, 4),
            "to_rdf_pass2": round(dt_to_rdf2, 4),
            "total": round(t1 - t0 + t3 - t2, 4),
        },
    }

    (outdir / "roundtrip_nquads_pass1.nq").write_text(nq1, encoding="utf-8")
    (outdir / "roundtrip_nquads_pass2.nq").write_text(nq2, encoding="utf-8")
    (outdir / "roundtrip_compacted.yaml").write_text(
        yaml.safe_dump(comp, allow_unicode=True, sort_keys=False), encoding="utf-8"
    )
    (outdir / "violations.json").write_text(
        json.dumps(violations, ensure_ascii=False, indent=1), encoding="utf-8"
    )

    print("=" * 70)
    print("M1 原型#1 语义无损往返 (frontmatter YAML -> RDF -> YAML)")
    print("=" * 70)
    print(f"files_total={n_total} files_parse_failed={n_parse_fail} files_processed={n} with_anchors={args.with_anchors}")
    if parse_failures:
        print("parse-failed (strict YAML 拒绝，未参与往返):")
        for p in parse_failures:
            print("   ", p)
    print(f"N-Quads triples: pass1={t1c}  pass2={t2c}")
    print(f"[A] byte_equal nquads  : {byte_equal}")
    print(f"[B] graph isomorphic   : {iso}")
    print(f"[C] field-level checks : {field_stats}")
    print(f"n_violations={n_violations}  n_files_with_violation={len({v['file'] for v in violations})}  passed_files={passed_files}/{n}")
    print(f"OVERALL PASS = {passed}")
    print(f"timings: to_rdf#1={dt_to_rdf:.4f}s from_rdf={dt_from_rdf:.4f}s to_rdf#2={dt_to_rdf2:.4f}s total={summary['timings_sec']['total']}s")
    print(f"outputs: {outdir}")
    for v in violations[:10]:
        print("  VIOLATION:", json.dumps(v, ensure_ascii=False))
    if len(violations) > 10:
        print(f"  ... and {len(violations)-10} more")

    (outdir / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=1), encoding="utf-8")
    return 0 if passed else 2


if __name__ == "__main__":
    sys.exit(main())
