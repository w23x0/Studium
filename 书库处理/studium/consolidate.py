"""M08 整章收口：按节接力抽出的知识点偏碎，再用一次调用只决定合并，程序按合并表改写。

    python3 -m studium.consolidate --run NAME --book <MinerU 输出目录> [--model opus]

读 runs/NAME/raw.md（extract 的输出），写：
- merge.md    模型原样输出的合并表
- merged.md   合并后的两张表（引文并在一起、关系改连新编号、去掉自环和重复），再定页
- merged-anchors.md 匹配统计与合并表校验
"""

import argparse
import re
from pathlib import Path

from . import extract, llm
from .store import Session


def _cells(row: str) -> list[str]:
    return [c.strip() for c in row.strip().strip("|").split("|")]


def parse_merge(text: str) -> list[tuple[str, str, str, str, list[str]]]:
    out = []
    for line in text.splitlines():
        c = _cells(line) if line.startswith("|") else []
        if len(c) >= 5 and re.fullmatch(r"K\d+", c[0]):
            out.append((c[0], c[1], c[2], c[3], re.findall(r"K\d+", c[4])))
    return out


def apply(raw: str, merge: list) -> tuple[str, list[str]]:
    kn, rel = extract._rows(raw)
    old = {(_cells(r)[0]): _cells(r) for r in kn}
    olds = [k for k in old if k.startswith("K")]
    to_new, issues = {}, []
    for new, *_, src in merge:
        for o in src:
            if o in to_new:
                issues.append(f"{o} 出现两次")
            to_new[o] = new
    issues += [f"{o} 不在原表" for o in to_new if o not in old]
    for o in olds:
        if o not in to_new:  # 模型漏掉的：原样保留，改记“旧K7”，免得和新编号撞号
            issues.append(f"{o} 没有归入任何新编号，记作 旧{o} 保留")
            to_new[o] = f"旧{o}"
    rows = [r for r in kn if _cells(r)[0].startswith("P")]
    for new, name, kind, line, src in merge:
        parts = [old[o] for o in src if o in old]
        quotes = " ‖ ".join(q for p in parts for q in [p[4]] if q and q != "—")
        source = "资料抽取" if any(p[5] == "资料抽取" for p in parts) else (parts[0][5] if parts else "")
        rows.append(f"| {new} | {name} | {kind} | {line} | {quotes} | {source} |")
    rows += ["| " + " | ".join([to_new[c[0]]] + c[1:]) + " |"
             for r in kn if (c := _cells(r))[0] in olds and to_new[c[0]].startswith("旧")]
    seen, rels = set(), []
    for r in rel:
        c = _cells(r)
        if len(c) < 4:
            continue
        a, b = to_new.get(c[0], c[0]), to_new.get(c[1], c[1])
        if a == b or (a, b, c[2]) in seen:
            continue
        seen.add((a, b, c[2]))
        rels.append("| " + " | ".join([a, b] + c[2:]) + " |")
    text = ("## 1. 知识点\n| 编号 | 名称 | 类型 | 一句话 | 引文 | 来源 |\n| --- | --- | --- | --- | --- | --- |\n"
            + "\n".join(rows) + "\n\n## 2. 关系\n| 从 | 到 | 类型 | 依据 | 来源 |\n| --- | --- | --- | --- | --- |\n"
            + "\n".join(rels) + "\n")
    return text, issues


def where(raw: str, root: Path, book: Path) -> str:
    """给每个 K 补“出处”：引文落在原文哪个标题下（如 Example 4.6）。模型只看表时不知道哪条来自例题。"""
    src = dict(l.split("=", 1) for l in (root / "source.txt").read_text(encoding="utf-8").splitlines() if "=" in l)
    lines = (book / src["part"] / "full.md").read_text(encoding="utf-8").splitlines()
    spans = [tuple(int(x) for x in sp.split("-")) for sp in src["lines"].split(",")]
    a, b = spans[0][0], spans[-1][1]
    head, heads, keys = "", [], []
    for i in range(a - 1, b):
        if lines[i].startswith("#"):
            h = lines[i].lstrip("# ").strip()
            # 附注里的“1. Uniform ...”这类子标题，带上所属的上级标题
            head = f"{head.split(' › ')[0]} › {h}" if re.match(r"\d+\.\s", h) and head else h
        heads.append(head)
        keys.append(extract._keys(lines[i]))
    kn, rel = extract._rows(raw)
    out = []
    for r in kn:
        c = _cells(r)
        if c[0].startswith("K"):
            found = []
            for q in extract._QUOTE.findall(c[4]):
                qa, qb = extract._keys(q[0] or q[1])
                h = next((heads[i] for i, (ta, tb) in enumerate(keys) if qa in ta or qb in tb), None)
                if h and h not in found:
                    found.append(h)
            c.insert(5, "；".join(found) or "未定位")
            r = "| " + " | ".join(c) + " |"
        out.append(r)
    return ("## 1. 知识点\n| 编号 | 名称 | 类型 | 一句话 | 引文 | 出处 | 来源 |\n| --- | --- | --- | --- | --- | --- | --- |\n"
            + "\n".join(out) + "\n\n## 2. 关系\n| 从 | 到 | 类型 | 依据 | 来源 |\n| --- | --- | --- | --- | --- |\n"
            + "\n".join(rel) + "\n")


def chapter(root: Path, book: Path) -> str:
    """整章原文：表里只有逐节模型的转述，哪些只是例题里的内容、哪些是正文讲的，要看原文才分得清。"""
    src = dict(l.split("=", 1) for l in (root / "source.txt").read_text(encoding="utf-8").splitlines() if "=" in l)
    spans = src["lines"].split(",")
    return extract._lines(book / src["part"] / "full.md", f"{spans[0].split('-')[0]}-{spans[-1].split('-')[1]}")


def main(argv=None):
    ap = argparse.ArgumentParser(description="M08 整章收口：合并过碎的知识点")
    ap.add_argument("--run", required=True)
    ap.add_argument("--book", type=Path, required=True)
    ap.add_argument("--model", default="opus")
    a = ap.parse_args(argv)
    root = extract.RUNS / a.run
    raw = (root / "raw.md").read_text(encoding="utf-8")
    if not (root / "merge.md").exists():
        user = f"{where(raw, root, a.book)}\n## 本章原文\n\n{chapter(root, a.book)}\n"
        res = llm.call(a.model, (Path(__file__).parent / "prompts" / "m08_consolidate.md").read_text(encoding="utf-8"), user, timeout=1800)
        Session(root).log_call(99, "m08_consolidate", res)
        (root / "merge.md").write_text(res.text + "\n", encoding="utf-8")
        print(f"{res.input_tokens} in / {res.output_tokens} out；{res.seconds:.0f}s")
    merge = parse_merge((root / "merge.md").read_text(encoding="utf-8"))
    text, issues = apply(raw, merge)
    anchored, hit, total = extract.anchor(text, extract._pages(a.book))
    (root / "merged.md").write_text(anchored, encoding="utf-8")
    kn, rel = extract._rows(text)
    report = [f"知识点 {sum(1 for r in kn if r.startswith('| K'))}，前置 {sum(1 for r in kn if r.startswith('| P'))}，关系 {len(rel)}",
              f"引文匹配：{hit} / {total}"] + issues
    (root / "merged-anchors.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    print("\n".join(report))


if __name__ == "__main__":
    main()
