#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
M1 原型 #3 —— L0 锚点红线：迁移后「回到可 grep 文本」实测
====================================================================================
任务卡 M1 Q3：迁移产出的 RDF 能否回到可 grep 文本（守住 L0 锚点红线）？

实测四条路：
  A) 原文直 grep：锚点逐字串是否仍可 grep 于原 .md 文件（迁移不改正文）→ 用
     Python 固定子串（等价 grep -F），另对 3 个样本跑真实 `grep -F` 佐证。
  B) RDF 文本内 grep：锚点逐字串是否出现在 N-Quads 序列化文本里（字面量转义下）。
  C) RDF->YAML 恢复文本内 grep：from_rdf + compact + YAML dump 后的文本里能否 grep。
  D) 损坏检测：C 中因 pyld 双转义 bug（\\n \\t \\r -> 反斜杠+控制符）而不可 grep 的
     锚点计数与示例。

用法（在 Studium 根目录）：
  tmp/venv_b7a/Scripts/python.exe research_tree/_sources/M1/M1_grep.py \
      --root "docs/图工程调研/M08实验-Apostol微积分卷1/obsidian" \
      --limit 81
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import subprocess
import sys

import yaml  # PyYAML
import yaml_ld
from yaml_ld.to_rdf import ToRDFOptions
from yaml_ld.from_rdf import FromRDFOptions

BASE = "https://studium.example/"
ANCHOR_RE = re.compile(r"^-\s*`[^`]+`[:：]?\s*[“\"](.*)[”\"]\s*$")


def extract_frontmatter(text: str) -> dict | None:
    if not (text.startswith("---\n") or text.startswith("---\r\n")):
        return None
    m = re.match(r"^---\r?\n", text)
    end = text.find("\n---", m.end() if m else 3)
    if end < 0:
        return None
    try:
        return yaml.safe_load(text[m.end() if m else 3:end])
    except Exception:
        return None


def extract_anchors(body: str) -> list[str]:
    out = []
    for line in body.splitlines():
        line = line.strip()
        m = ANCHOR_RE.match(line)
        if m:
            out.append(m.group(1).strip())
    return out


def run_grep_f(filepath: pathlib.Path, pattern_file: pathlib.Path) -> bool:
    r = subprocess.run(
        ["grep", "-qF", "-f", str(pattern_file), str(filepath)],
        capture_output=True,
        text=True,
    )
    return r.returncode == 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--outdir", default=None)
    args = ap.parse_args()

    root = pathlib.Path(args.root)
    outdir = pathlib.Path(args.outdir or pathlib.Path(__file__).parent / "out")
    outdir.mkdir(parents=True, exist_ok=True)

    files = sorted(root.rglob("*.md"))
    anchors_by_file = {}
    for f in files:
        txt = f.read_text(encoding="utf-8")
        if extract_frontmatter(txt) is None:
            continue
        body = txt[txt.find("\n---", 3) + 4:] if txt.startswith("---") else txt
        anchors = extract_anchors(body)
        if anchors:
            anchors_by_file[f] = anchors
    if args.limit:
        anchors_by_file = {k: anchors_by_file[k] for k in sorted(anchors_by_file)[: args.limit]}

    # --- RDF 生成（整批，与原型#1 with-anchors 相同方式：anchors 为字面量 @list）---
    nodes2 = []
    for f, anchors in anchors_by_file.items():
        rel = f.relative_to(root).as_posix().replace(".md", "")
        nodes2.append({"@id": BASE + rel, "anchors": anchors})
    doc = {
        "@context": {
            "anchors": {"@id": "https://studium.example/vocab#anchorQuote", "@container": "@list"},
        },
        "@graph": nodes2,
    }
    nquads = yaml_ld.to_rdf(doc, ToRDFOptions(format="application/n-quads"))
    back = yaml_ld.from_rdf(nquads, FromRDFOptions(format="application/n-quads"))
    comp = yaml_ld.compact(back, {
        "anchors": {"@id": "https://studium.example/vocab#anchorQuote", "@container": "@list"},
    })
    recovered_yaml = yaml.safe_dump(comp, allow_unicode=True, sort_keys=False, width=4096)

    n_anchors = 0
    statA_ok = 0
    statB_ok = 0
    statC_ok = 0
    examples_b = []
    examples_c = []
    for f, anchors in sorted(anchors_by_file.items()):
        raw = f.read_text(encoding="utf-8")
        for a in anchors:
            n_anchors += 1
            if a in raw:  # A: 原文可 grep
                statA_ok += 1
            if a in nquads:  # B: N-Quads 文本可 grep（未转义命中）
                statB_ok += 1
            if a in recovered_yaml:  # C: RDF->YAML 恢复文本可 grep
                statC_ok += 1
            else:
                if len(examples_c) < 8:
                    examples_c.append({"file": str(f), "anchor": a})
            if a not in nquads and len(examples_b) < 8:
                examples_b.append({"file": str(f), "anchor": a})

    # 真实 grep -F 佐证（3 个文件，全部锚点）
    grep_f_checked = 0
    grep_f_ok = 0
    grep_f_samples = []
    for f in sorted(anchors_by_file)[:3]:
        pat = outdir / "_grep_pattern.txt"
        pat.write_text("\n".join(anchors_by_file[f]) + "\n", encoding="utf-8")
        ok = run_grep_f(f, pat)
        grep_f_checked += 1
        grep_f_ok += 1 if ok else 0
        grep_f_samples.append({"file": str(f), "grep_f_hit": ok, "n_anchors": len(anchors_by_file[f])})

    summary = {
        "n_files": len(anchors_by_file),
        "n_anchors": n_anchors,
        "A_grep_in_original_md": {"ok": statA_ok, "total": n_anchors, "rate": round(statA_ok / n_anchors, 4) if n_anchors else None},
        "B_grep_in_nquads_text": {"ok": statB_ok, "total": n_anchors, "rate": round(statB_ok / n_anchors, 4) if n_anchors else None},
        "C_grep_in_recovered_yaml": {"ok": statC_ok, "total": n_anchors, "rate": round(statC_ok / n_anchors, 4) if n_anchors else None},
        "real_grep_F": {"checked_files": grep_f_checked, "ok_files": grep_f_ok, "samples": grep_f_samples},
        "examples_not_greppable_in_nquads": examples_b,
        "examples_not_greppable_in_recovered": examples_c,
    }
    (outdir / "grep_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=1), encoding="utf-8")
    (outdir / "recovered_yaml.txt").write_text(recovered_yaml, encoding="utf-8")
    (outdir / "grep_nquads.nq").write_text(nquads, encoding="utf-8")

    print("=" * 70)
    print("M1 原型#3 L0 锚点红线：迁移后回到可 grep 文本")
    print("=" * 70)
    print(f"files={len(anchors_by_file)} anchors_total={n_anchors}")
    print(f"[A] grep in original .md   : {statA_ok}/{n_anchors}")
    print(f"[B] grep in N-Quads text   : {statB_ok}/{n_anchors}")
    print(f"[C] grep in RDF->YAML text : {statC_ok}/{n_anchors}")
    print(f"[D] real `grep -F` files   : {grep_f_ok}/{grep_f_checked}  {grep_f_samples}")
    print("--- C 不可 grep 示例（多为 LaTeX \\n \\t \\r 双转义 bug） ---")
    for e in examples_c[:8]:
        print("   ", e["file"].replace(str(root), "…"), "->", e["anchor"][:50])
    print("--- B 不可 grep 示例 ---")
    for e in examples_b[:8]:
        print("   ", e["file"].replace(str(root), "…"), "->", e["anchor"][:50])
    print(f"outputs: {outdir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
