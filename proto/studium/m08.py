"""最小 M08 的读取：解析知识点 / 关系两张表，按场景的“锚定”行切出本闭环的 M08 片。

口径（M10 审查单、Harness 02 §6 读清单）：M05 设计闭环时索引出本次要用的 M08 片，教学调用与守卫读这片，
不自己翻整份 M08。切片是确定性的：信任 M05 在“锚定（M08）”行列出的节点（锚定 + 前置），
再带上这些节点之间的关系，以及锚定节点的“混淆”关系（辨析点）。
"""

import re
from pathlib import Path

_ID = re.compile(r"\b[KP]\d+\b")


def _rows(text: str, heading: str) -> list[str]:
    m = re.search(rf"^## {re.escape(heading)}.*?$(.*?)(?=^## |\Z)", text, flags=re.M | re.S)
    if not m:
        return []
    return [l for l in m.group(1).splitlines() if l.startswith("| ") and not l.startswith("| ---")]


def _cells(row: str) -> list[str]:
    return [c.strip() for c in row.strip().strip("|").split("|")]


def anchored_ids(scene: str) -> tuple[list[str], list[str]]:
    """场景里“锚定（M08）”行：(锚定节点, 前置节点)。"""
    line = next((l for l in scene.splitlines() if l.startswith("锚定")), "")
    head, _, pre = line.partition("前置")
    return list(dict.fromkeys(_ID.findall(head))), list(dict.fromkeys(_ID.findall(pre)))


def slice_for(m08: str, scene: str) -> str | None:
    core, pre = anchored_ids(scene)
    core += [i for i in re.findall(r"【([KP]\d+)】", scene) if i not in core and i not in pre]  # 确认前置的主张不算锚定
    ids = set(core) | set(pre)
    if not ids:
        return None
    nodes = _rows(m08, "1. 知识点")
    rels = _rows(m08, "2. 关系")
    header = nodes[:1]  # 表头
    picked = [r for r in nodes[1:] if _cells(r)[0] in ids]
    rel_head = rels[:1]
    rel_picked = []
    for r in rels[1:]:
        c = _cells(r)
        if (c[0] in ids and c[1] in ids) or (c[2] == "混淆" and (c[0] in core or c[1] in core)):
            rel_picked.append(r)
    title = next((l for l in m08.splitlines() if l.startswith("# ")), "# M08")
    source = [l for l in m08.splitlines() if l.startswith("> 资料") or l.startswith("> 来源")]
    sep = "| --- | --- | --- | --- | --- | --- |"
    return "\n".join([
        f"{title} · 本闭环片", *source,
        f"> 锚定：{'、'.join(core)}；前置：{'、'.join(pre) or '无'}（由 M05 设计闭环时索引）", "",
        "## 知识点", "", *header, sep, *picked, "",
        "## 关系", "", *rel_head, sep[:-6], *rel_picked, "",
    ])


PROTO = Path(__file__).resolve().parent.parent


def of_run(run: Path) -> str | None:
    """运行目录登记的 M08 全文（m08.txt 记路径，相对 proto/）；没有则 None。"""
    ref = run / "m08.txt"
    if not ref.exists():
        return None
    return (PROTO / ref.read_text(encoding="utf-8").strip()).read_text(encoding="utf-8")


def slice_of_run(run: Path, scene: str) -> str | None:
    """按当前场景现切（会中改线后场景变了，切片随之变）。"""
    m08 = of_run(run)
    return slice_for(m08, scene) if m08 else None
