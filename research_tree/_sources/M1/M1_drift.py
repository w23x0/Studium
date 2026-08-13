#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
M1 原型 #2 —— 双真相消解与漂移验证（迁移后权威载体判定）
====================================================================================
任务卡 M1 Q2：双真相风险（YAML 保留 vs RDF 派生）在迁移路径上如何消解/避免——
迁移后权威载体是哪一个、如何验证不漂移？

设计主张（用实测回答）：
  1) 权威载体 = frontmatter YAML（md 文件内，人手编辑、git 跟踪、grep 直达）。
     RDF(N-Quads) 只是派生构件（build artifact），由 YAML 确定性再生，绝不手改。
  2) 双真相不会漂移的机理：RDF 是 YAML 的纯函数（同一输入必得同一输出）——
     本脚本用「确定性」实测证明。
  3) 漂移检测 = 再生比对：stored RDF == to_rdf(当前 YAML)？不等即漂移。
     本脚本注入两处人工漂移（改 RDF 一个字面量 / 改 YAML 一个值），实测检测命中。
  4) 反向恢复：from_rdf(stored RDF) 能还原回与 YAML 一致的字段数据——
     证明 RDF 是 YAML 的忠实投影，RDF 丢失可重建、YAML 丢失可还原，二者不构成
     相互矛盾的两份权威。

用法（在 Studium 根目录）：
  tmp/venv_b7a/Scripts/python.exe research_tree/_sources/M1/M1_drift.py \
      --root "docs/图工程调研/M08实验-Apostol微积分卷1/obsidian" \
      --outdir research_tree/_sources/M1/out
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import time

import yaml  # PyYAML
import yaml_ld
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
    "@vocab": "https://studium.example/vocab#",
}


def extract_frontmatter(text: str) -> dict | None:
    if not (text.startswith("---\n") or text.startswith("---\r\n")):
        return None
    m = re.match(r"^---\r?\n", text)
    end = text.find("\n---", m.end() if m else 3)
    if end < 0:
        return None
    block = text[m.end() if m else 3:end]
    try:
        return yaml.safe_load(block)
    except Exception:
        return None


def relid(root: pathlib.Path, filepath: pathlib.Path) -> str:
    return BASE + filepath.relative_to(root).as_posix().replace(".md", "")


def make_doc(root, files) -> tuple[dict, list[str]]:
    nodes = []
    parse_failures = []
    for f in sorted(files):
        fm = extract_frontmatter(f.read_text(encoding="utf-8"))
        if not isinstance(fm, dict):
            if f.suffix == ".md":
                txt = f.read_text(encoding="utf-8")
                if txt.startswith("---\n") or txt.startswith("---\r\n"):
                    parse_failures.append(str(f))
            continue
        node = {"@id": relid(root, f)}
        node.update({k: v for k, v in fm.items() if not k.startswith("@")})
        nodes.append(node)
    return {"@context": CONTEXT, "@graph": nodes}, parse_failures


def gen_nquads(doc) -> str:
    return yaml_ld.to_rdf(doc, ToRDFOptions(format="application/n-quads"))


def compact_to_data(doc, nquads) -> list[dict]:
    back = yaml_ld.from_rdf(nquads, FromRDFOptions(format="application/n-quads"))
    comp = yaml_ld.compact(back, CONTEXT)
    g = comp.get("@graph", comp if isinstance(comp, list) else [comp])
    rows = []
    for node in g if isinstance(g, list) else []:
        nid = node.get("@id")
        if nid:
            rows.append({"@id": nid, **{k: v for k, v in node.items() if k not in ("@context", "@id")}})
    return rows


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True)
    ap.add_argument("--outdir", default=None)
    args = ap.parse_args()

    root = pathlib.Path(args.root)
    outdir = pathlib.Path(args.outdir or pathlib.Path(__file__).parent / "out")
    (outdir / "migrated").mkdir(parents=True, exist_ok=True)

    files = sorted(root.rglob("*.md"))
    doc, parse_failures = make_doc(root, files)

    # --- 迁移：YAML -> RDF（派生构件）---
    t0 = time.perf_counter()
    stored_nq = gen_nquads(doc)
    t_migrate = time.perf_counter() - t0
    (outdir / "migrated" / "graph.nq").write_text(stored_nq, encoding="utf-8")

    # --- 检验 1：确定性（同一输入两次转换字节相等）---
    t1 = time.perf_counter()
    nq_again = gen_nquads(doc)
    t_det = time.perf_counter() - t1
    deterministic = stored_nq == nq_again

    # --- 检验 2：再生比对（stored == 当前 YAML 重新转换）---
    #   注：与检验 1 等价，这里把「再次生成」当作独立一次运行来计时与比较
    t2 = time.perf_counter()
    regenerated_nq = gen_nquads(doc)
    t_reg = time.perf_counter() - t2
    regen_match = stored_nq == regenerated_nq

    # --- 检验 3a：注入 RDF 漂移（手改一个字面量），再生比对应检测命中 ---
    drifted_rdf = stored_nq.replace(
        '"theorem" .', '"theoremXXX" .', 1
    ) if '"theorem" .' in stored_nq else stored_nq
    drifted_rdf_detected = drifted_rdf != regenerated_nq

    # --- 检验 3b：注入 YAML 漂移（改一个 frontmatter 值后重新转换），与 stored 比对应命中 ---
    drifted_doc = json.loads(json.dumps(doc))  # deep copy
    node0 = drifted_doc["@graph"][0]
    for k in list(node0):
        if isinstance(node0[k], str) and k != "@id":
            node0[k] = node0[k] + " (drifted)"
            break
    drifted_nq = gen_nquads(drifted_doc)
    yaml_drift_detected = drifted_nq != stored_nq

    # --- 检验 4：反向恢复（RDF -> YAML），逐字段对比原 frontmatter ---
    rows = compact_to_data(doc, stored_nq)
    orig_by_id = {}
    for f in files:
        fm = extract_frontmatter(f.read_text(encoding="utf-8"))
        if isinstance(fm, dict):
            orig_by_id[relid(root, f)] = {k: v for k, v in fm.items() if not k.startswith("@")}

    field_stats = {"checked": 0, "ok": 0, "mismatch": 0, "missing": 0}
    mismatches = []
    for row in rows:
        nid = row["@id"]
        orig = orig_by_id.get(nid, {})
        for k, v in orig.items():
            field_stats["checked"] += 1
            got = row.get(k)
            if k not in row:
                field_stats["missing"] += 1
                mismatches.append({"@id": nid, "field": k, "reason": "missing"})
            elif got != v:
                field_stats["mismatch"] += 1
                mismatches.append({"@id": nid, "field": k, "orig": v, "got": got})
            else:
                field_stats["ok"] += 1
    n_nodes_recovered = len(rows)
    n_nodes_orig = len(orig_by_id)

    summary = {
        "n_files": len(files),
        "n_parse_failed": len(parse_failures),
        "parse_failed_files": parse_failures,
        "n_nodes_orig": n_nodes_orig,
        "n_nodes_recovered_from_rdf": n_nodes_recovered,
        "nquads_bytes": len(stored_nq),
        "nquads_triples": stored_nq.count("\n") - (0 if stored_nq.endswith("\n") else 1),
        "authoritative": "frontmatter YAML in .md (hand-edited source); RDF = derived build artifact",
        "deterministic_bytes_equal": deterministic,
        "regen_matches_stored": regen_match,
        "injected_rdf_drift_detected": drifted_rdf_detected,
        "injected_yaml_drift_detected": yaml_drift_detected,
        "recovery_field_stats": field_stats,
        "timings_sec": {
            "migrate": round(t_migrate, 4),
            "determinism_rerun": round(t_det, 4),
            "regenerate": round(t_reg, 4),
        },
    }

    (outdir / "drift_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=1), encoding="utf-8")
    (outdir / "drift_recovery_mismatches.json").write_text(json.dumps(mismatches, ensure_ascii=False, indent=1), encoding="utf-8")

    print("=" * 70)
    print("M1 原型#2 双真相消解与漂移验证 (frontmatter YAML 权威 / RDF 派生)")
    print("=" * 70)
    print(f"files={len(files)} parse_failed={len(parse_failures)} nodes_orig={n_nodes_orig} nodes_recovered_from_rdf={n_nodes_recovered}")
    print(f"nquads: {summary['nquads_triples']} triples / {len(stored_nq)} bytes, migrate={t_migrate:.4f}s")
    print(f"[1] deterministic (regenerate twice byte-equal): {deterministic}  ({t_det:.4f}s)")
    print(f"[2] regen == stored RDF                          : {regen_match}  ({t_reg:.4f}s)")
    print(f"[3a] injected RDF edit detected by regen-diff    : {drifted_rdf_detected}")
    print(f"[3b] injected YAML edit detected by regen-diff   : {yaml_drift_detected}")
    print(f"[4] recovery RDF->YAML field checks              : {field_stats}")
    print(f"    n_mismatches={len(mismatches)}")
    print(f"authoritative carrier = {summary['authoritative']}")
    print(f"outputs: {outdir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
