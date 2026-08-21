#!/usr/bin/env python3
"""Export the layered graph to an Obsidian vault: one note per node.

Usage:
    python tools/export_obsidian.py [--out obsidian] [--force]

Reads every data/nodes-*.jsonl, data/inherited/nodes-*.jsonl and
data/structures-L*.jsonl, plus every edge file, and writes one Markdown note
per node with YAML frontmatter and [[wikilinks]] for edges and members.

Nothing in data/graveyard/ is exported -- killed nodes stay killed, but they
remain on disk there so the kills are reversible.

Model-inferred edges are marked *(模型推断)* in the rendered edge lists so a
reader can never mistake an inference for something Apostol or Strang wrote.
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import re
import sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

NODE_GLOBS = [
    "data/nodes-*.jsonl",
    "data/inherited/nodes-*.jsonl",
    "data/structures-L*.jsonl",
]
EDGE_GLOBS = [
    "data/edges-*.jsonl",
    "data/inherited/edges-*.jsonl",
]

# Which bucket a file's nodes belong to, for the `layer` frontmatter field.
LAYER_RE = [
    (re.compile(r"inherited[/\\]nodes-A1"), "L1-apostol"),
    (re.compile(r"inherited[/\\]nodes-S1"), "L1-strang"),
    (re.compile(r"nodes-A2-x"), "L1-counterexample"),
    (re.compile(r"nodes-A2-"), "L1-apostol"),
    (re.compile(r"nodes-D(\d)"), r"D\1"),
    (re.compile(r"nodes-X"), "X"),
    (re.compile(r"structures-L(\d)"), r"L\1"),
]

REL_ZH = {
    "is-a": "是一种",
    "part-of": "是其组成部分",
    "requires": "依赖",
    "implies": "推出",
    "equivalent": "等价于",
    "contrasts": "对照辨析",
    "applies-to": "作用于",
    "generalizes": "推广了",
    "alias-of": "别名",
    "other": "其他",
}
SYMMETRIC = {"equivalent", "contrasts", "alias-of"}


def layer_of(path: str) -> str:
    for pat, repl in LAYER_RE:
        m = pat.search(path)
        if m:
            return m.expand(repl) if "\\" in repl else repl
    return "unknown"


def load_jsonl(path: str) -> list[dict]:
    out = []
    with open(path, encoding="utf-8") as fh:
        for lineno, line in enumerate(fh, 1):
            line = line.strip()
            if not line:
                continue
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError as exc:
                sys.exit(f"{path}:{lineno} is not valid JSON: {exc}")
    return out


def slug(node_id: str) -> str:
    """Filesystem-safe note name that still round-trips to the id by eye."""
    return node_id.replace(":", "__").replace("/", "-")


def yaml_scalar(value) -> str:
    """Quote a YAML scalar. Frontmatter holds statements with ':' and '#'."""
    if value is None:
        return '""'
    if isinstance(value, bool):
        return "true" if value else "false"
    text = str(value).replace('"', '\\"').replace("\n", " ")
    return f'"{text}"'


def yaml_list(values) -> str:
    if not values:
        return "[]"
    return "[" + ", ".join(yaml_scalar(v) for v in values) + "]"


def link(node_id: str, nodes: dict) -> str:
    """A wikilink to a node, aliased to its Chinese name when we have one."""
    target = slug(node_id)
    node = nodes.get(node_id)
    if node is None:
        # Should not happen: check_graph.py rejects dangling refs. Render it
        # visibly rather than silently dropping the reference.
        return f"[[{target}]] ⚠️ **未在图中找到此 id**"
    label = node.get("name_zh") or node.get("name_en") or node_id
    return f"[[{target}|{label}]]"


_ID_TOKEN = re.compile(r"(?<![\w:-])((?:apostol|strang|d|x|L\d+):[a-z0-9][a-z0-9-]*)")


def autolink(text: str, nodes: dict, *, self_id: str) -> str:
    """Turn bare node ids written inside prose into wikilinks.

    Statements routinely say "...carried by d:angle-well-defined-because-...".
    Those are real cross-references and should be clickable. Ids not in the
    graph are left as plain text -- they are prose, not a reference.
    """
    def repl(m: re.Match) -> str:
        nid = m.group(1)
        if nid == self_id or nid not in nodes:
            return m.group(0)
        return link(nid, nodes)

    return _ID_TOKEN.sub(repl, text)


def render_anchors(node: dict) -> list[str]:
    lines = []
    for anchor in node.get("anchors") or []:
        f = anchor.get("file", "?")
        quote = (anchor.get("quote") or "").strip()
        lines.append(f"- `{f}`")
        lines.append(f"  > {quote}")
    return lines


def render_edge(edge: dict, nodes: dict, *, outgoing: bool) -> str:
    rel = edge.get("rel", "other")
    rel_label = REL_ZH.get(rel, rel)
    other = edge["dst"] if outgoing else edge["src"]
    if rel in SYMMETRIC:
        # Written one direction only per SPEC; both endpoints render it the same.
        arrow = f"{rel_label} —"
    else:
        arrow = f"{rel_label} →" if outgoing else f"← 被{rel_label}"
    parts = [f"- {arrow} {link(other, nodes)}"]
    if edge.get("rel_note"):
        parts.append(f" — {edge['rel_note']}")
    if edge.get("origin") == "model":
        parts.append(" *(模型推断)*")
    line = "".join(parts)
    ev = edge.get("evidence") or {}
    if ev.get("quote"):
        line += f"\n  > {ev['quote'].strip()}  \n  > <sub>`{ev.get('file','?')}`</sub>"
    return line


def render_note(node: dict, nodes: dict, out_edges, in_edges) -> str:
    nid = node["id"]
    name_zh = node.get("name_zh") or node.get("name_en") or nid
    fm = [
        "---",
        f"id: {yaml_scalar(nid)}",
        f"name: {yaml_scalar(name_zh)}",
        f"name_en: {yaml_scalar(node.get('name_en'))}",
        f"node_type: {yaml_scalar(node.get('node_type') or 'structure')}",
        f"layer: {yaml_scalar(node.get('layer') or node.get('_layer'))}",
        f"sections: {yaml_list(node.get('sections'))}",
        f"aliases: {yaml_list(node.get('aliases'))}",
    ]
    if node.get("origin"):
        fm.append(f"origin: {yaml_scalar(node['origin'])}")
    if node.get("atomic") is not None:
        fm.append(f"atomic: {yaml_scalar(node['atomic'])}")
    if node.get("audit_fix"):
        fm.append(f"audit_fix: {yaml_scalar(node['audit_fix'])}")
    fm.append("---")

    body = [f"# {name_zh}", ""]
    if node.get("name_en"):
        body += [f"*{node['name_en']}*", ""]

    # Prose fields get bare ids autolinked; anchors and evidence quotes never
    # do -- they must stay byte-identical to the textbook.
    def prose(field: str) -> str:
        return autolink(node[field].strip(), nodes, self_id=nid)

    if node.get("statement"):
        body += ["## 陈述", "", prose("statement"), ""]

    # L2+ structures carry members/boundary/abstraction_gain instead of anchors.
    if node.get("members"):
        body += ["## 统摄的下层成员", ""]
        body += [f"- {link(m, nodes)}" for m in node["members"]]
        body += [""]
    if node.get("boundary"):
        body += ["## 边界（什么看起来属于它但不属于）", "", prose("boundary"), ""]
    if node.get("abstraction_gain"):
        body += ["## 抽象增益", "", prose("abstraction_gain"), ""]

    # X-layer cross-textbook invariants.
    if node.get("apostol_ids") or node.get("strang_ids"):
        body += ["## 两侧对应节点", "", "**Apostol**", ""]
        body += [f"- {link(m, nodes)}" for m in node.get("apostol_ids") or []] or ["- （无）"]
        body += ["", "**Strang**", ""]
        body += [f"- {link(m, nodes)}" for m in node.get("strang_ids") or []] or ["- （无）"]
        body += [""]
    if node.get("divergence"):
        body += ["## 两书分歧", "", prose("divergence"), ""]

    anchors = render_anchors(node)
    if anchors:
        body += ["## 原文锚点", ""] + anchors + [""]

    if node.get("atomic_reason"):
        body += ["## 原子性判据", "", prose("atomic_reason"), ""]
    if node.get("origin_note"):
        body += ["## 来源说明", "", prose("origin_note"), ""]

    outs = out_edges.get(nid, [])
    if outs:
        body += ["## 出边", ""]
        body += [render_edge(e, nodes, outgoing=True) for e in outs]
        body += [""]
    ins = in_edges.get(nid, [])
    if ins:
        body += ["## 入边", ""]
        body += [render_edge(e, nodes, outgoing=False) for e in ins]
        body += [""]

    return "\n".join(fm + [""] + body).rstrip() + "\n"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="obsidian")
    ap.add_argument("--force", action="store_true",
                    help="overwrite an existing output directory")
    args = ap.parse_args()

    os.chdir(ROOT)

    nodes: dict[str, dict] = {}
    dupes: list[str] = []
    for pattern in NODE_GLOBS:
        for path in sorted(glob.glob(pattern)):
            bucket = layer_of(path)
            for node in load_jsonl(path):
                nid = node.get("id")
                if not nid:
                    sys.exit(f"{path}: a record has no id")
                if nid in nodes:
                    dupes.append(f"{nid} (again in {path})")
                    continue
                node["_layer"] = bucket
                node["_file"] = path
                nodes[nid] = node

    out_edges = defaultdict(list)
    in_edges = defaultdict(list)
    n_edges = 0
    for pattern in EDGE_GLOBS:
        for path in sorted(glob.glob(pattern)):
            for edge in load_jsonl(path):
                if not edge.get("src") or not edge.get("dst"):
                    sys.exit(f"{path}: an edge is missing src or dst")
                out_edges[edge["src"]].append(edge)
                in_edges[edge["dst"]].append(edge)
                n_edges += 1

    out_dir = args.out
    if os.path.isdir(out_dir) and os.listdir(out_dir) and not args.force:
        sys.exit(f"{out_dir}/ already exists and is not empty; pass --force to overwrite")
    os.makedirs(out_dir, exist_ok=True)

    written = 0
    for nid, node in sorted(nodes.items()):
        path = os.path.join(out_dir, slug(nid) + ".md")
        with open(path, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(render_note(node, nodes, out_edges, in_edges))
        written += 1

    # Dangling refs are a hard error in check_graph.py, so report them loudly
    # here too rather than letting a ⚠️ marker hide in 500 notes.
    dangling = sorted(
        {e["dst"] for es in out_edges.values() for e in es if e["dst"] not in nodes}
        | {e["src"] for es in in_edges.values() for e in es if e["src"] not in nodes}
        | {m for n in nodes.values() for m in (n.get("members") or []) if m not in nodes}
        | {m for n in nodes.values()
           for m in (n.get("apostol_ids") or []) + (n.get("strang_ids") or [])
           if m not in nodes}
    )

    print(f"wrote {written} notes to {out_dir}/  ({n_edges} edges rendered)")
    by_layer = defaultdict(int)
    for node in nodes.values():
        by_layer[str(node.get("layer") or node["_layer"])] += 1
    for k in sorted(by_layer):
        print(f"  {k}: {by_layer[k]}")
    if dupes:
        print(f"DUPLICATE IDS ({len(dupes)}):")
        for d in dupes:
            print("  " + d)
    if dangling:
        print(f"DANGLING REFS ({len(dangling)}):")
        for d in dangling:
            print("  " + d)
    if dupes or dangling:
        sys.exit(1)


if __name__ == "__main__":
    main()
