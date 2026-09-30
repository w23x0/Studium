"""M07 → M08：一次模型调用把一章原文抽成知识点 + 关系，再用确定性匹配给引文定页。

    python3 -m studium.extract --book <MinerU 输出目录> --part p1-200 --lines 4330-5804 --toc 59-243 --run NAME
    --lines 给多段（逗号分隔，按书中顺序的各节）时按节接力：每节一次调用，带上前文已抽出的知识点表，
    编号接着往下编；各节原样输出存 raw-NN.md（已有则跳过，可断点续跑），合并成 raw.md。

产出 runs/NAME/{source.txt, raw.md, m08.md, anchors.md, calls.log}（不存书的原文）：
- raw.md    模型原样输出
- m08.md    引文逐字匹配 content_list 后补上页码；匹配不上的引文标“未匹配”（设计口径：找不到合法锚点不进入）
- anchors.md 匹配统计
页码 = PDF 页 + source.json 的 printed_offset（书上印的页码；没有则按 PDF 页）。
"""

import argparse
import glob
import json
import re
import sys
from pathlib import Path

from . import assemble, llm
from .store import Session

RUNS = Path(__file__).resolve().parent.parent / "runs"
_QUOTE = re.compile(r'"([^"\n]{8,}?)"|“([^”\n]{8,}?)”')  # 直引号与弯引号分开配对：原文里自带的弯引号不打乱直引号


_MATH = re.compile(r"\$\$?[^$]*\$\$?|\\\(.*?\\\)")
_TEX_CMD = re.compile(r"\\[A-Za-z]+")


def _keys(t: str) -> tuple[str, str]:
    """比对用的两把钥匙：(公式只剥 LaTeX 记号, 公式整段去掉)。都去空白、忽略大小写、ff 记作 f。
    模型抄引文时常删行内公式或补回转换丢掉的 ff 连字；除此之外仍要求逐字一致。"""
    def k(x: str) -> str:
        return re.sub(r"[\s${}^_]", "", x).casefold().replace("ff", "f")
    return k(_TEX_CMD.sub("", t)), k(_MATH.sub(" ", t))


def _lines(path: Path, span: str) -> str:
    a, b = (int(x) for x in span.split("-"))
    keep = [l for l in path.read_text(encoding="utf-8").splitlines()[a - 1:b] if not l.startswith("![](")]
    return "\n".join(keep)


def _pages(book: Path) -> list[tuple[tuple[str, str], int]]:
    """所有段的 (比对钥匙, 书上页码)。"""
    src = json.loads((book / "source.json").read_text(encoding="utf-8"))
    off = src.get("printed_offset", 0)
    out = []
    for part, info in src["parts"].items():
        cl = json.loads(Path(glob.glob(str(book / part / "*_content_list.json"))[0]).read_text(encoding="utf-8"))
        out += [(_keys(x.get("text", "")), info["first_page"] + x["page_idx"] + off) for x in cl if x.get("text")]
    return out


def locate(quote: str, pages: list[tuple[tuple[str, str], int]]) -> int | None:
    qa, qb = _keys(quote)
    return next((p for (ta, tb), p in pages if qa in ta or qb in tb), None)


def anchor(raw: str, pages: list[tuple[tuple[str, str], int]]) -> tuple[str, int, int]:
    """给每条引文补页码；返回 (改写后的文本, 匹配数, 总数)。"""
    hit = total = 0

    def sub(m: re.Match) -> str:
        nonlocal hit, total
        q = m.group(1) or m.group(2)
        if not re.search(r"[A-Za-z]{3}", q):  # 中文引号里的说明，不是原文引文
            return m.group(0)
        total += 1
        p = locate(q, pages)
        if p is None:
            return f"{m.group(0)}〔未匹配〕"
        hit += 1
        return f"{m.group(0)}〔p.{p}〕"

    return _QUOTE.sub(sub, raw), hit, total


_HEAD = ("| 编号 |", "| 从 |", "| --- |")


def _rows(text: str) -> tuple[list[str], list[str]]:
    """模型输出 → (知识点行, 关系行)，去掉表头。"""
    kn, rel, cur = [], [], None
    for line in text.splitlines():
        if line.startswith("## 1"):
            cur = kn
        elif line.startswith("## 2"):
            cur = rel
        elif cur is not None and line.startswith("| ") and not line.startswith(_HEAD):
            cur.append(line)
    return kn, rel


def _ids(rows: list[str], prefix: str) -> list[int]:
    return [int(m.group(1)) for r in rows if (m := re.match(rf"\|\s*{prefix}(\d+)\s*\|", r))]


def _known(kn: list[str]) -> str:
    """前文知识点表给模型看：编号 / 名称 / 类型 / 一句话，不带引文。"""
    rows = ["| " + " | ".join(c.strip() for c in r.strip().strip("|").split("|")[:4]) + " |" for r in kn]
    return "| 编号 | 名称 | 类型 | 一句话 |\n| --- | --- | --- | --- |\n" + "\n".join(rows)


def chain(a, root: Path, s: Session, spans: list[str], toc: str) -> str:
    kn, rel, notes = [], [], []
    for i, span in enumerate(spans, 1):
        raw = root / f"raw-{i:02d}.md"
        k, p = max(_ids(kn, "K"), default=0), max(_ids(kn, "P"), default=0)
        if not raw.exists():
            prior = f"## 前文已抽取的知识点\n\n{_known(kn)}\n\n" if kn else ""
            user = (f"## 全书目录\n\n{toc}\n\n{prior}"
                    f"## 本节原文（新知识点从 K{k + 1} 编起，新前置从 P{p + 1} 编起）\n\n"
                    f"{_lines(a.book / a.part / 'full.md', span)}\n")
            res = llm.call(a.model, assemble.prompt("m08_extract"), user, timeout=1800)
            s.log_call(i, f"m08_extract lines={span}", res)
            raw.write_text(res.text + "\n", encoding="utf-8")
            print(f"第 {i}/{len(spans)} 节 {span}：{res.output_tokens} out，{res.seconds:.0f}s", flush=True)
        nk, nr = _rows(raw.read_text(encoding="utf-8"))
        clash = sorted(set(_ids(nk, "K")) & set(_ids(kn, "K")))
        if clash:
            notes.append(f"第 {i} 节重用了已有编号 K{clash}")
        kn += nk
        rel += nr
    (root / "notes.md").write_text("\n".join(notes) + "\n", encoding="utf-8")
    return ("## 1. 知识点\n| 编号 | 名称 | 类型 | 一句话 | 引文 | 来源 |\n| --- | --- | --- | --- | --- | --- |\n"
            + "\n".join(kn) + "\n\n## 2. 关系\n| 从 | 到 | 类型 | 依据 | 来源 |\n| --- | --- | --- | --- | --- |\n"
            + "\n".join(rel))


def reanchor(run: Path, book: Path) -> None:
    """对已有 raw.md 重做定页（匹配规则改了之后用）。"""
    text, hit, total = anchor((run / "raw.md").read_text(encoding="utf-8"), _pages(book))
    (run / "m08.md").write_text(text, encoding="utf-8")
    (run / "anchors.md").write_text(f"引文匹配：{hit} / {total}\n", encoding="utf-8")


def main(argv=None):
    ap = argparse.ArgumentParser(description="M08 抽取：一章原文 → 知识点 + 关系")
    ap.add_argument("--book", type=Path, required=True, help="MinerU 输出目录（含 source.json）")
    ap.add_argument("--part", required=True, help="章节所在分段，如 p1-200")
    ap.add_argument("--lines", required=True, help="章节在该段 full.md 中的行号范围（不含习题）")
    ap.add_argument("--toc", required=True, help="全书目录在 p1 段 full.md 中的行号范围")
    ap.add_argument("--run", required=True)
    ap.add_argument("--model", default="opus")
    a = ap.parse_args(argv)

    root = RUNS / a.run
    if (root / "raw.md").exists():
        sys.exit(f"已有抽取结果：{root}")
    s = Session(root)
    first = sorted(a.book.glob("p1-*"))[0]
    spans = a.lines.split(",")
    if len(spans) > 1:
        (root / "source.txt").write_text(f"book={a.book}\npart={a.part}\nlines={a.lines}\ntoc={a.toc}\n", encoding="utf-8")
        text = chain(a, root, s, spans, _lines(first / "full.md", a.toc))
        (root / "raw.md").write_text(text + "\n", encoding="utf-8")
        reanchor(root, a.book)
        print((root / "anchors.md").read_text(encoding="utf-8").strip(), f"\n目录：{root}")
        return
    user = (f"## 全书目录\n\n{_lines(first / 'full.md', a.toc)}\n\n"
            f"## 本章原文\n\n{_lines(a.book / a.part / 'full.md', a.lines)}\n")
    # 只记来源与行号，不存书的原文（runs/ 进 git）
    (root / "source.txt").write_text(f"book={a.book}\npart={a.part}\nlines={a.lines}\ntoc={a.toc}\n", encoding="utf-8")
    res = llm.call(a.model, assemble.prompt("m08_extract"), user, timeout=1800)
    s.log_call(0, "m08_extract", res)
    (root / "raw.md").write_text(res.text + "\n", encoding="utf-8")
    text, hit, total = anchor(res.text, _pages(a.book))
    (root / "m08.md").write_text(text + "\n", encoding="utf-8")
    (root / "anchors.md").write_text(f"引文匹配：{hit} / {total}\n", encoding="utf-8")
    print(f"引文匹配 {hit}/{total}；{res.input_tokens} in / {res.output_tokens} out；{res.seconds:.0f}s\n目录：{root}")


if __name__ == "__main__":
    main()
