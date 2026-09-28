"""M07 最小版：把 MinerU 转出的整本书按目录切成小节文件 + 索引，供模型按需读取。

    python3 -m studium.m07 split --book <MinerU 输出目录> --toc 59-243

产出 <book>/m07/（在书库里，不进 git——书的原文不进仓库）：
    index.md                 目录：编号、类型、标题、页码、文件、节内例题
    chNN/sec-4.7.md          小节（含其中的例题与子节）
    chNN/note-4.1.md         章末附注
    chNN/prob-4.md           本章习题
    chNN/ans-4.md            书末答案（部分习题）
以目录为准：按目录顺序在正文里逐个找对应标题（章标题格式不一、习题编号与小节编号重复，不能只看标题）。
"""

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path


@dataclass
class Unit:
    kind: str  # sec / note / prob
    id: str  # 4.7 / 4.1 / 4
    title: str
    page: int
    chapter: int
    line: int = -1  # 在合并正文中的起始行


def _key(t: str) -> str:
    return re.sub(r"[^a-z]", "", t.lower())


def parse_toc(lines: list[str]) -> tuple[list[Unit], dict[int, str]]:
    units, chapters, ch = [], {}, 0
    for raw in lines:
        l = raw.strip()
        if m := re.match(r"^(\d+)\s+([A-Z][A-Z’'\- ]+?)\s+(\d+)$", l):
            ch = int(m.group(1)); chapters[ch] = m.group(2).strip()
        elif m := re.match(r"^(\d+)\.(\d+)\s+(.+?)\s+(\d+)$", l):
            units.append(Unit("sec", f"{m.group(1)}.{m.group(2)}", m.group(3), int(m.group(4)), int(m.group(1))))
        elif m := re.match(r"^Note\s+(\d+)\.(\d+)\s+(.+?)\s+(\d+)$", l):
            units.append(Unit("note", f"{m.group(1)}.{m.group(2)}", m.group(3), int(m.group(4)), int(m.group(1))))
        elif m := re.match(r"^Problems\s+(\d+)$", l):
            units.append(Unit("prob", str(ch), "Problems", int(m.group(1)), ch))
    return units, chapters


def _matches(head: str, u: Unit) -> bool:
    h = head.lstrip("#").strip()
    if u.kind == "prob":
        return h == "Problems"
    prefix = "Note" if u.kind == "note" else ""
    m = re.match(rf"^{prefix}\s*{re.escape(u.id)}\s+(.*)$", h)
    return bool(m) and _key(m.group(1))[:10] == _key(u.title)[:10]


def locate(units: list[Unit], text: list[str], start: int) -> list[Unit]:
    pos = start
    for k, u in enumerate(units):
        for i in range(pos, len(text)):
            if text[i].startswith("#") and _matches(text[i], u):
                u.line, pos = i, i + 1
                break
        else:  # 标题没被转成标题行（如 Note 7.2）：在下一个已找到单元之前找以编号开头的正文行
            label = ("Note " if u.kind == "note" else "") + u.id + " "
            stop = next((j for j in range(pos, len(text)) if k + 1 < len(units) and text[j].startswith("#") and _matches(text[j], units[k + 1])), len(text))
            hit = next((i for i in range(pos, stop) if text[i].startswith(label) and _key(text[i][len(label):])[:10] == _key(u.title)[:10]), None)
            if hit is not None:
                u.line, pos = hit, hit + 1
    return units


def _clean(lines: list[str]) -> str:
    out = []
    for l in lines:
        if l.startswith("![]("):
            out.append("[图]")
        elif l.strip() in ("<div class=\"mineru-algorithm\" style=\"white-space: pre-wrap; font-family:monospace;\">", "</div>"):
            continue
        else:
            out.append(l)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(out)).strip() + "\n"


def split(book: Path, toc: str) -> Path:
    parts = sorted(book.glob("p*-*"), key=lambda p: int(p.name[1:].split("-")[0]))
    text = []
    for p in parts:
        text += (p / "full.md").read_text(encoding="utf-8").splitlines()
    a, b = (int(x) for x in toc.split("-"))
    units, chapters = parse_toc(text[a - 1:b])
    locate(units, text, b)
    found = [u for u in units if u.line >= 0]
    missing = [u for u in units if u.line < 0]
    out = book / "m07"
    out.mkdir(exist_ok=True)
    rows = []
    ans_start = next((i for i in range(found[-1].line, len(text)) if re.match(r"^## Chapter 1$", text[i])), len(text))
    for k, u in enumerate(found):
        end = found[k + 1].line if k + 1 < len(found) else ans_start
        if u.kind == "prob" and u.chapter + 1 in chapters:  # 习题区截到下一章标题
            nxt = _key(chapters[u.chapter + 1])
            end = next((i for i in range(u.line + 1, end) if text[i].startswith("#") and _key(text[i]) in (nxt, "chapter" + str(u.chapter + 1) + nxt)), end)
        last = found[k + 1].page if k + 1 < len(found) and found[k + 1].page >= u.page else u.page
        pages = f"p.{u.page}" + (f"–{last}" if last > u.page else "")
        name = f"ch{u.chapter:02d}/{u.kind}-{u.id}.md"
        (out / name).parent.mkdir(exist_ok=True)
        label = {"sec": "§", "note": "Note ", "prob": "第 "}[u.kind] + u.id + (" 章习题" if u.kind == "prob" else f" {u.title}")
        body = text[u.line + 1:end]
        examples = [re.sub(r"^#+\s*", "", l) for l in body if re.match(r"^#+\s*Example\s+\d+\.\d+", l)]
        (out / name).write_text(f"# {label}（{pages}）\n\n" + _clean(body), encoding="utf-8")
        rows.append(f"| {u.id} | {u.kind} | {u.title} | {pages} | `{name}` | {'；'.join(examples)} |")
    # 书末答案：“## Chapter N”到下一章或 INDEX
    marks = [i for i in range(ans_start, len(text)) if re.match(r"^## (Chapter \d+|INDEX)$", text[i])]
    for i, j in zip(marks, marks[1:] + [len(text)]):
        if m := re.match(r"^## Chapter (\d+)$", text[i]):
            n = int(m.group(1))
            name = f"ch{n:02d}/ans-{n}.md"
            (out / name).write_text(f"# 第 {n} 章习题答案（书末）\n\n" + _clean(text[i + 1:j]), encoding="utf-8")
            rows.append(f"| {n} | ans | Answers | 书末 | `{name}` |  |")
    head = ("# M07 索引：Kleppner & Kolenkow, *An Introduction to Mechanics*, 2nd ed., 2014\n\n"
            "> 按全书目录切分；页码为书上印的页码（取自目录）。类型：sec 小节 / note 附注 / prob 习题 / ans 书末答案（部分习题）。\n\n"
            "| 编号 | 类型 | 标题 | 页 | 文件 | 节内例题 |\n| --- | --- | --- | --- | --- | --- |\n")
    (out / "index.md").write_text(head + "\n".join(rows) + "\n", encoding="utf-8")
    print(f"切出 {len(found)} / {len(units)} 个单元 → {out}")
    for u in missing:
        print(f"  未找到：{u.kind} {u.id} {u.title}", file=sys.stderr)
    return out


def section_of(book: Path, quote: str) -> str | None:
    """引文逐字（空白规整后）落在哪个小节文件；返回编号，如 '4.7'。"""
    q = re.sub(r"\s+", " ", quote).strip()
    for f in sorted((book / "m07").glob("ch*/*.md")):
        if q in re.sub(r"\s+", " ", f.read_text(encoding="utf-8")):
            return f.stem.split("-", 1)[1] if f.stem.startswith("sec-") else f.stem
    return None


def main(argv=None):
    ap = argparse.ArgumentParser(description="M07：书按目录切成小节")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sp = sub.add_parser("split")
    sp.add_argument("--book", type=Path, required=True)
    sp.add_argument("--toc", required=True, help="目录在 p1 段 full.md 中的行号范围")
    a = ap.parse_args(argv)
    split(a.book, a.toc)


if __name__ == "__main__":
    main()
