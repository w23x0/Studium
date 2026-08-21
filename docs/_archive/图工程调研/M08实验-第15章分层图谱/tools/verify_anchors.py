#!/usr/bin/env python3
"""锚点机器校验:每条 quote 必须在其 file 中逐字连续出现。

这是本实验唯一的硬校验。它不判断数学对错,只判断"这句话是否真的在书里"。
用法: python verify_anchors.py <nodes.jsonl> <source_dir>
"""
import json
import sys
from pathlib import Path


def load_sources(src_dir: Path) -> dict[str, str]:
    """把源目录下所有 .md 读进内存,按文件名索引。"""
    out = {}
    for p in src_dir.rglob("*.md"):
        out[p.name] = p.read_text(encoding="utf-8", errors="replace")
    return out


def main() -> int:
    nodes_path = Path(sys.argv[1])
    src_dirs = [Path(d) for d in sys.argv[2:]]

    sources: dict[str, str] = {}
    for d in src_dirs:
        sources.update(load_sources(d))

    total = ok = 0
    failures: list[tuple[str, str, str]] = []
    nodes_without_anchor: list[str] = []
    bad_json = 0

    for lineno, line in enumerate(nodes_path.read_text(encoding="utf-8").splitlines(), 1):
        line = line.strip()
        if not line:
            continue
        try:
            node = json.loads(line)
        except json.JSONDecodeError as e:
            bad_json += 1
            failures.append((f"<line {lineno}>", "JSON_PARSE", str(e)[:120]))
            continue

        anchors = node.get("anchors") or []
        if not anchors:
            nodes_without_anchor.append(node.get("id", f"<line {lineno}>"))
            continue

        for a in anchors:
            total += 1
            fname = a.get("file", "")
            quote = a.get("quote", "")
            text = sources.get(fname)
            if text is None:
                failures.append((node.get("id", "?"), fname, "FILE_NOT_FOUND"))
            elif quote and quote in text:
                ok += 1
            else:
                failures.append((node.get("id", "?"), fname, quote[:90]))

    print(f"file            : {nodes_path.name}")
    print(f"anchors total   : {total}")
    print(f"anchors verified: {ok}")
    print(f"anchors FAILED  : {len(failures)}")
    if total:
        print(f"pass rate       : {ok / total:.1%}")
    if bad_json:
        print(f"malformed JSON lines: {bad_json}")
    if nodes_without_anchor:
        print(f"nodes with NO anchor: {len(nodes_without_anchor)} -> {nodes_without_anchor[:10]}")
    if failures:
        print("\n--- failures ---")
        for nid, fname, quote in failures:
            print(f"  [{nid}] {fname}: {quote}")
    return 1 if failures or bad_json else 0


if __name__ == "__main__":
    sys.exit(main())
