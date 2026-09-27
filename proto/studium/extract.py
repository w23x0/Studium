"""M07 → M08：一次模型调用把一章原文抽成知识点 + 关系，再用确定性匹配给引文定页。

    python3 -m studium.extract --book <MinerU 输出目录> --part p1-200 --lines 4330-5804 --toc 59-243 --run NAME

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


def _norm(t: str) -> str:
    return re.sub(r"\s+", " ", t).strip()


def _lines(path: Path, span: str) -> str:
    a, b = (int(x) for x in span.split("-"))
    keep = [l for l in path.read_text(encoding="utf-8").splitlines()[a - 1:b] if not l.startswith("![](")]
    return "\n".join(keep)


def _pages(book: Path) -> list[tuple[str, int]]:
    """所有段的 (规范化文本, 书上页码)。"""
    src = json.loads((book / "source.json").read_text(encoding="utf-8"))
    off = src.get("printed_offset", 0)
    out = []
    for part, info in src["parts"].items():
        cl = json.loads(Path(glob.glob(str(book / part / "*_content_list.json"))[0]).read_text(encoding="utf-8"))
        out += [(_norm(x.get("text", "")), info["first_page"] + x["page_idx"] + off) for x in cl if x.get("text")]
    return out


def locate(quote: str, pages: list[tuple[str, int]]) -> int | None:
    q = _norm(quote)
    return next((p for t, p in pages if q in t), None)


def anchor(raw: str, pages: list[tuple[str, int]]) -> tuple[str, int, int]:
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
