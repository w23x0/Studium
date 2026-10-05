"""M07 → M08：一次模型调用把一章原文抽成知识点 + 关系，再用确定性匹配给引文定页。

    python3 -m studium.extract --book <MinerU 输出目录> --part p1-200 --lines 4330-5804 --toc 59-243 --run NAME
    --lines 给多段（逗号分隔，按书中顺序的各节）时按节接力：每节一次调用，带上前文已抽出的知识点表，
    编号接着往下编；各节原样输出存 raw-NN.md（已有则跳过，可断点续跑），合并成 raw.md。
    python3 -m studium.extract --book <MinerU 输出目录> --whole [--run lib-短名]
    整本书接力：节表取自 <book>/m07/index.md 的“原文”栏（页段 + 行号，跨段用 " + " 连接），只抽正文（章 / 节 / 其他），
    跳过前言 / 习题 / 附录 / 索引；前文知识点表随全书累积；每节完成即落盘，中断后同命令从下一节续跑；某节调用失败即停
    （后面各节的编号依赖它，不跳过）。

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
import time
from collections.abc import Callable
from pathlib import Path

from . import llm
from .store import Session

RUNS = Path(__file__).resolve().parent.parent / "runs"
_QUOTE = re.compile(r'"([^"\n]{8,}?)"|“([^”\n]{8,}?)”')  # 直引号与弯引号分开配对：原文里自带的弯引号不打乱直引号


_MATH = re.compile(r"\$\$?[^$]*\$\$?|\\\(.*?\\\)")
_TEX_CMD = re.compile(r"\\[A-Za-z]+")


def _keys(t: str) -> tuple[str, str]:
    """比对用的两把钥匙：(公式只剥 LaTeX 记号, 公式整段去掉)。都去空白、忽略大小写、ff 记作 f。
    模型抄引文时常删行内公式或补回转换丢掉的 ff 连字；转换会把 (*) 转义成 (\\*)、引号与句号的先后也常不同，都忽略反斜杠与引号；
    除此之外仍要求逐字一致。"""
    def k(x: str) -> str:
        return re.sub(r"[\s${}^_\\“”\"‘’']", "", x).casefold().replace("ff", "f")
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
        # 引文常跨相邻段落（“……如下：”后接列表项）：每页再加一条“整页拼接”的钥匙
        pg: dict[int, list[str]] = {}
        for x in cl:
            if x.get("text"):
                pg.setdefault(x["page_idx"], []).append(x["text"])
        out += [(_keys(" ".join(t)), info["first_page"] + i + off) for i, t in pg.items()]
    return out


def locate(quote: str, pages: list[tuple[tuple[str, str], int]]) -> int | None:
    qa, qb = _keys(quote)
    return next((p for (ta, tb), p in pages if qa in ta or qb in tb), None)


def _is_zh(pages: list[tuple[tuple[str, str], int]]) -> bool:
    """中文书：正文里汉字多于拉丁字母。"""
    t = "".join(a for (a, _), _ in pages)
    return len(re.findall(r"[\u4e00-\u9fff]", t)) > len(re.findall(r"[a-z]", t))


def anchor(raw: str, pages: list[tuple[tuple[str, str], int]]) -> tuple[str, int, int]:
    """给每条引文补页码；返回 (改写后的文本, 匹配数, 总数)。"""
    hit = total = 0
    zh = _is_zh(pages)

    def sub(m: re.Match) -> str:
        nonlocal hit, total
        q = m.group(1) or m.group(2)
        # 英文书：不含英文的引号内容是中文说明，不是原文引文；中文书：提示词要求引文用直引号，直引号一律算引文
        if not (zh and m.group(1)) and not re.search(r"[A-Za-z]{3}", q):
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


def chain(a, root: Path, s: Session, items: list[tuple[str, Callable[[], str]]], toc: str,
          on_step: Callable[[int, int, str, str, float, str], None] | None = None) -> str:
    """items = [(标签, 取本节原文的函数)]，按书中顺序。on_step(序, 总数, 标签, 状态, 秒, 错误) 供调度器记日志。"""
    kn, rel, notes = [], [], []
    for i, (label, text) in enumerate(items, 1):
        raw = root / f"raw-{i:02d}.md"
        k, p = max(_ids(kn, "K"), default=0), max(_ids(kn, "P"), default=0)
        if not raw.exists():
            prior = f"## 前文已抽取的知识点\n\n{_known(kn)}\n\n" if kn else ""
            user = (f"## 全书目录\n\n{toc}\n\n{prior}"
                    f"## 本节原文（新知识点从 K{k + 1} 编起，新前置从 P{p + 1} 编起）\n\n{text()}\n")
            try:
                for rnd in range(3):  # 免费模型高峰时 500 成片：llm.call 自己重试 4 次仍失败，这里再隔几分钟整体重来（共 3 轮）
                    try:
                        res = llm.call(a.model, (Path(__file__).parent / "prompts" / "m08_extract.md").read_text(encoding="utf-8"), user, timeout=1800)
                        if "## 1" not in res.text:
                            raise RuntimeError(f"输出不是两张表：{res.text[:100]!r}")
                        break
                    except Exception as e:
                        if rnd == 2:
                            raise
                        print(f"[extract] {label} 第 {rnd + 1} 轮失败（{e}），240s 后再来", file=sys.stderr, flush=True)
                        time.sleep(240)
            except Exception as e:
                if on_step:
                    on_step(i, len(items), label, "失败", 0.0, f"{type(e).__name__}: {e}"[:300])
                raise
            s.log_call(i, f"m08_extract {label}", res)
            raw.write_text(res.text + "\n", encoding="utf-8")
            print(f"第 {i}/{len(items)} 节 {label}：{res.output_tokens} out，{res.seconds:.0f}s", flush=True)
            if on_step:
                on_step(i, len(items), label, "完成", res.seconds, "")
        elif on_step:
            on_step(i, len(items), label, "已有", 0.0, "")
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


# ---------- 整本书：节表来自 m07/index.md ----------

WHOLE_KINDS = {"ch", "sec", "x"}  # 正文小节与附注；其余（part / prob / app / front / back）跳过
SKIP_UNDER = {"app"}  # 附录之下的小节也跳过（如 9.1、9.2 被标成 sec）；front / back / prob 不算：模型常把它们当父级、把后面的章挂成下一层
_ANSWERS = re.compile(r"^\W*(selected\s+)?(answers?|solutions?)(\s+(to|of)\s+(the\s+)?(odd|even|selected|problems?|exercises?|review|practice)\b.*)?\W*$|^\W*习题(解答|答案)", re.I)
_SRC = re.compile(r"(\S+?):L(\d+)[–-](\d+)")


def book_sections(book: Path) -> list[tuple[str, str]]:
    """m07/index.md → [(标签, 原文栏)]：每个文件取第一次出现的条目（其下更深的条目在同一文件内，不重复）。"""
    seen, out, kinds = set(), [], {}  # kinds[层级] = 最近一个该层条目的类型，用来查祖先
    answers = {}  # answers[层级] = 最近一个该层条目是不是“习题解答 / 答案”章（其下的小节也跳过）
    for line in (book / "m07" / "index.md").read_text(encoding="utf-8").splitlines():
        c = [x.strip() for x in line.strip().strip("|").split(" | ")]
        if len(c) < 10 or not c[5].isdigit():
            continue
        lv = int(c[5])
        kinds[lv] = c[1]
        answers[lv] = c[1] in ("ch", "app", "x") and bool(_ANSWERS.match(c[2].strip("\u3000")))
        if c[1] not in WHOLE_KINDS or any(kinds.get(x) in SKIP_UNDER for x in range(1, lv)) or any(answers.get(x) for x in range(1, lv + 1)):
            continue
        f, src = c[-6].strip("`"), c[-3]
        if f in ("", "—") or f in seen or not _SRC.search(src):
            continue
        seen.add(f)
        out.append((" ".join(x for x in (c[0], c[2].strip("\u3000")) if x), src))
    return out


def src_text(book: Path, src: str) -> str:
    """“p1-200:L6479–6533 + p201-400:L1–103” → 各段行号范围内的文字，按顺序拼接。"""
    return "\n".join(_lines(book / m.group(1) / "full.md", f"{m.group(2)}-{m.group(3)}") for m in _SRC.finditer(src))


def toc_text(book: Path, max_level: int = 2) -> str:
    """全书目录（取自 m07/toc.tsv，只留前 max_level 层）。"""
    from .m07toc import read_toc
    entries, _, _ = read_toc(book / "m07" / "toc.tsv")
    return "\n".join(f"{'  ' * (e.level - 1)}{e.number} {e.title}".rstrip() + (f"  p.{e.page}" if e.page else "")
                     for e in entries if e.level <= max_level)


def run_whole(book: Path, name: str, model: str, on_step=None) -> Path:
    """整本书按节接力抽取；返回 run 目录。可重跑续上：已有的 raw-NN.md 不再调用。"""
    root = RUNS / name
    secs = book_sections(book)
    s = Session(root)
    (root / "source.txt").write_text(f"book={book}\nwhole=1\n", encoding="utf-8")
    (root / "sections.tsv").write_text("\n".join(f"{i}\t{l}\t{r}" for i, (l, r) in enumerate(secs, 1)) + "\n", encoding="utf-8")
    a = argparse.Namespace(book=book, model=model)
    items = [(l, (lambda r=r: src_text(book, r))) for l, r in secs]
    text = chain(a, root, s, items, toc_text(book), on_step)
    (root / "raw.md").write_text(text + "\n", encoding="utf-8")
    reanchor(root, book)
    return root


def reanchor(run: Path, book: Path) -> None:
    """对已有 raw.md 重做定页（匹配规则改了之后用）。"""
    text, hit, total = anchor((run / "raw.md").read_text(encoding="utf-8"), _pages(book))
    (run / "m08.md").write_text(text, encoding="utf-8")
    (run / "anchors.md").write_text(f"引文匹配：{hit} / {total}\n", encoding="utf-8")


def main(argv=None):
    ap = argparse.ArgumentParser(description="M08 抽取：一章原文 → 知识点 + 关系")
    ap.add_argument("--book", type=Path, required=True, help="MinerU 输出目录（含 source.json）")
    ap.add_argument("--part", help="章节所在分段，如 p1-200")
    ap.add_argument("--lines", help="章节在该段 full.md 中的行号范围（不含习题）")
    ap.add_argument("--toc", help="全书目录在 p1 段 full.md 中的行号范围")
    ap.add_argument("--whole", action="store_true", help="整本书按 m07/index.md 逐节接力（此时不需要 --part / --lines / --toc）")
    ap.add_argument("--run", help="run 名；--whole 默认 lib-<书目录名前 24 字符>")
    ap.add_argument("--model", help="默认 opus；--whole 默认 oc:space-bunny-free")
    a = ap.parse_args(argv)
    a.model = a.model or ("oc:space-bunny-free" if a.whole else "opus")

    if a.whole:
        root = run_whole(a.book, a.run or "lib-" + re.sub(r"\W+", "-", a.book.name[:24]).strip("-"), a.model)
        print((root / "anchors.md").read_text(encoding="utf-8").strip(), f"\n目录：{root}")
        return
    if not (a.part and a.lines and a.toc and a.run):
        ap.error("单段用法需要 --part --lines --toc --run；整本书用 --whole")
    root = RUNS / a.run
    if (root / "raw.md").exists():
        sys.exit(f"已有抽取结果：{root}")
    s = Session(root)
    first = sorted(a.book.glob("p1-*"))[0]
    spans = a.lines.split(",")
    if len(spans) > 1:
        (root / "source.txt").write_text(f"book={a.book}\npart={a.part}\nlines={a.lines}\ntoc={a.toc}\n", encoding="utf-8")
        items = [(sp, (lambda sp=sp: _lines(a.book / a.part / "full.md", sp))) for sp in spans]
        text = chain(a, root, s, items, _lines(first / "full.md", a.toc))
        (root / "raw.md").write_text(text + "\n", encoding="utf-8")
        reanchor(root, a.book)
        print((root / "anchors.md").read_text(encoding="utf-8").strip(), f"\n目录：{root}")
        return
    user = (f"## 全书目录\n\n{_lines(first / 'full.md', a.toc)}\n\n"
            f"## 本章原文\n\n{_lines(a.book / a.part / 'full.md', a.lines)}\n")
    # 只记来源与行号，不存书的原文（runs/ 进 git）
    (root / "source.txt").write_text(f"book={a.book}\npart={a.part}\nlines={a.lines}\ntoc={a.toc}\n", encoding="utf-8")
    res = llm.call(a.model, (Path(__file__).parent / "prompts" / "m08_extract.md").read_text(encoding="utf-8"), user, timeout=1800)
    s.log_call(0, "m08_extract", res)
    (root / "raw.md").write_text(res.text + "\n", encoding="utf-8")
    text, hit, total = anchor(res.text, _pages(a.book))
    (root / "m08.md").write_text(text + "\n", encoding="utf-8")
    (root / "anchors.md").write_text(f"引文匹配：{hit} / {total}\n", encoding="utf-8")
    print(f"引文匹配 {hit}/{total}；{res.input_tokens} in / {res.output_tokens} out；{res.seconds:.0f}s\n目录：{root}")


if __name__ == "__main__":
    main()
