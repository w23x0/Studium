"""M07 通用版：按全书目录把 MinerU 转出的书切成小节文件 + 索引（任意格式的目录）。

    python3 -m studium.m07toc run   --book <MinerU 目录> [--toc A-B] [--model oc:…] [--depth N] [--out 目录]
    python3 -m studium.m07toc toc   --book …    # 只做第 1–2 步：找目录、模型整理成条目表 → m07/toc.tsv
    python3 -m studium.m07toc split --book …    # 只做第 3–4 步：按 toc.tsv 定位、切分（改过 toc.tsv 后重跑用）

分工：程序能做的都由程序做，模型只做程序做不好的一步。
1. 找目录（程序）：在第一段开头找目录样式的行最密的一片；找不到就用 --toc 给行号；正文里有 ≥ 8 个一级标题时，
   改为按一级标题生成章（没有目录的网页式读本）。
2. 目录 → 条目表（模型）：层级 | 类型 | 编号 | 标题 | 页码。程序校验：每条标题在目录原文里找得到、
   目录原文每行都被某条覆盖、页码不倒退；能从原文确定的由程序改（按同编号那行更正标题、补上漏掉的
   带编号行），写进“校验”栏；模型输出存档（toc.llm.json），重跑不重调。
   并排两栏的目录（HTML 表格）先由程序展开成逐行、按栏排序再交模型；编号末尾的星号是编号的一部分（6.2* ≠ 6.2）。
3. 定位（程序）：按目录顺序在正文标题行里逐条找（编号 + 标题；标题行缺编号时只比标题；
   标题拆成两行时接起来比；K&K 式“正文行以编号开头”兜底）。页码校验：content_list 的页码块
   给出 PDF 页 ↔ 印刷页，定位只在目录页码对应的 PDF 页附近找，防止撞到习题编号或页眉。
4. 切分（程序）：层级 ≤ 切分层的条目与习题各一个文件，更深的条目在索引里记所在文件与行号。
找不到的条目在索引与 report.md 里逐条标出，内容并入前一个文件时也在那一行注明（失败不伪装成功）。
产出在书库（书的原文不进 git）：m07/index.md、m07/chNN/*.md、m07/report.md、m07/toc.tsv。
"""

import argparse
import difflib
import glob
import hashlib
import json
import re
import shutil
import sys
import unicodedata
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

from . import llm
from .m07 import _clean

PROMPT = Path(__file__).parent / "prompts" / "m07_toc.md"
MODEL = "oc:space-bunny-free"
KINDS = {"part": "part", "chapter": "ch", "section": "sec", "exercises": "prob", "appendix": "app",
         "front": "front", "back": "back", "other": "x"}
OWN_FILE = {"exercises", "front", "back", "appendix", "part"}  # 不论层级都单独成文件
BIG = 60000  # 切出的文件超过这么多字符，就再往下切一层
CHUNK = 150  # 每次给模型的目录行数（非空行）


# ---------- 书：正文行 + 每行的 PDF 页 + 印刷页码 ----------

def key(s: str) -> str:
    s = unicodedata.normalize("NFKC", s)
    s = re.sub(r"<[^>]+>", "", s)
    s = re.sub(r"\\[a-zA-Z]+", "", s)  # LaTeX 命令名
    return re.sub(r"[\W_]+", "", s.lower())


def _roman(s: str) -> int | None:
    s = s.lower()
    if not s or not re.fullmatch(r"[ivxlc]+", s):
        return None
    v = {"i": 1, "v": 5, "x": 10, "l": 50, "c": 100}
    n = sum(-v[a] if v[a] < v[b] else v[a] for a, b in zip(s, s[1:])) + v[s[-1]]
    return n if 0 < n < 200 else None


def _pageno(s: str) -> tuple[str, int] | None:
    t = unicodedata.normalize("NFKC", re.sub(r"<[^>]+>", "", s or "")).strip(" -—–·第页")
    if re.fullmatch(r"\d{1,4}", t):
        return "a", int(t)
    r = _roman(t)
    return ("r", r) if r else None


@dataclass
class Book:
    text: list[str]
    page: list[int]  # 每行的 PDF 页（1 起）
    printed: list[tuple[int, str, int]]  # (PDF 页, 'a'/'r', 印刷页)
    parts: list[tuple[str, int]]  # (页段目录名, 该段在合并正文中的起始行，0 起)

    def src(self, a: int, z: int) -> str:
        """合并正文的 [a, z) → 页段内行号（1 起、含两端），如 p1-200:L120–345；跨段用 + 连接。"""
        out = []
        for k, (name, s0) in enumerate(self.parts):
            s1 = self.parts[k + 1][1] if k + 1 < len(self.parts) else len(self.text)
            lo, hi = max(a, s0), min(z, s1)
            if lo < hi:
                out.append(f"{name}:L{lo - s0 + 1}–{hi - s0}")
        return " + ".join(out)


def _parts(book: Path) -> list[tuple[Path, int]]:
    src = book / "source.json"
    if src.exists():
        parts = json.loads(src.read_text(encoding="utf-8"))["parts"]
        return sorted(((book / k, v["first_page"]) for k, v in parts.items()), key=lambda x: x[1])
    return sorted(((p, int(p.name[1:].split("-")[0])) for p in book.glob("p*-*")), key=lambda x: x[1])


def _align(md: list[str], cl: list[dict], first: int) -> tuple[list[int], list[tuple[int, str, int]]]:
    """md 行 ↔ content_list 块：顺序对齐，每行取所在块的 page_idx；对不上的行沿用上一行的页。"""
    items, printed = [], []
    for x in cl:
        t, p = x["type"], x.get("page_idx", 0) + first
        if t in ("page_number", "header"):
            if pn := _pageno(x.get("text", "")):
                printed.append((p, *pn))
            continue
        if t in ("footer", "page_footnote"):
            continue
        if t in ("image", "chart"):
            txt = [x.get("img_path", "")] + x.get("image_caption", []) + x.get("image_footnote", []) + x.get("chart_caption", [])
        elif t == "table":
            txt = x.get("table_caption", []) + [x.get("table_body", "")] + x.get("table_footnote", [])
        elif t == "list":
            txt = x.get("list_items", [])
        elif t == "code":
            txt = [x.get("code_body", "")]
        else:
            txt = [x.get("text", "")]
        for part in "\n".join(s for s in txt if s).split("\n"):
            if len(k := key(part)) >= 6:
                items.append((k[:40], p))
    pages, j, cur = [], 0, first
    for l in md:
        k = key(l[4:-1] if l.startswith("![](") else l)
        if len(k) >= 6:
            for jj in range(j, min(j + 30, len(items))):
                ik = items[jj][0]
                if ik.startswith(k[:25]) or k.startswith(ik[:25]):
                    j, cur = jj, items[jj][1]
                    break
        pages.append(cur)
    return pages, printed


def load(book: Path) -> Book:
    text, page, printed, parts = [], [], [], []
    for d, first in _parts(book):
        parts.append((d.name, len(text)))
        md = (d / "full.md").read_text(encoding="utf-8").splitlines()
        cls = [f for f in glob.glob(str(d / "*_content_list.json")) if not f.endswith("_v2.json")]
        if cls:
            pg, pr = _align(md, json.loads(Path(cls[0]).read_text(encoding="utf-8")), first)
        else:
            pg, pr = [first] * len(md), []
        text += md; page += pg; printed += pr
    return Book(text, page, printed, parts)


def expected_pdf(b: Book, printed: str) -> int | None:
    """目录上的印刷页 → 估计的 PDF 页：取印刷页码最接近的几页，偏移取中位数。"""
    p = printed.strip()
    kind, n = ("a", int(p)) if p.isdigit() else ("r", _roman(p) or 0)
    if not n:
        return None
    near = sorted((abs(v - n), pdf - v) for pdf, k, v in b.printed if k == kind and abs(v - n) <= 15)
    if not near:
        return None
    cnt = Counter(o for _, o in near)  # 偏移取众数（附近识别错的页码是少数）；并列取离得最近的
    top = max(cnt.values())
    return n + next(o for _, o in near if cnt[o] == top)


def printed_of(b: Book, pdf: int) -> int | None:
    near = sorted((abs(p - pdf), p - v) for p, k, v in b.printed if k == "a")[:5]
    if not near or near[0][0] > 15:
        return None
    offs = sorted(o for _, o in near)
    return pdf - offs[len(offs) // 2]


# ---------- 1. 找目录 ----------

_TOC_HEAD = re.compile(r"^(contents|tableofcontents|briefcontents|contentsinbrief|detailedcontents|目录|目次)$")
_NUM_START = re.compile(r"^(第\s*[一二三四五六七八九十百\dⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+\s*[章节篇部讲]|§\s*\d|\d+(\.\d+)*\s+\S|chapter\s+\d+|part\s+[ivx\d]+|appendix|附录|[A-Z]\.\d+\s)", re.I)


_MULTI = re.compile(r"\s\d{1,4}\s+(?:\d+(?:\.\d+)+|[A-Z]\.\d+)\s+\S")  # “… 356 8.1 Charge …”：一行挤进多条
_PAGE_END = re.compile(r"(\s|\.|…|·)(\d{1,4}|[ivxlc]{1,7})\s*$", re.I)


def _toc_like(l: str) -> bool:
    s = re.sub(r"^#+\s*", "", l).strip().strip("\\*■•")
    if not s or re.fullmatch(r"[\d\s—–-]+", s) or re.search(r"©|copyright|isbn|printed in", s, re.I):
        return False
    if re.search(r",\s*\d+\s*$", s):  # 索引样式“词条, 247”
        return False
    if len(_MULTI.findall(s)) >= 2 or s.count("<td>") >= 4:
        return True
    if len(s) > 160:
        return False
    if _PAGE_END.search(s):
        return True
    return len(s) <= 120 and bool(_NUM_START.match(s))


def _strong(l: str) -> bool:
    """以页码结尾、一行多条或表格：比“以编号开头”更确定是目录行。"""
    s = re.sub(r"^#+\s*", "", l).strip()
    return _toc_like(l) and (s.count("<td>") >= 4 or len(_MULTI.findall(s)) >= 2 or bool(_PAGE_END.search(s)))


def find_toc(text: list[str], limit: int) -> tuple[int, int] | None:
    """目录样式的行最密的一片（1 起、含两端）；空行不计，隔开超过 8 行非目录行就断开；
    两端修到“目录”标题或确定的目录行为止。要求 ≥ 15 行目录样式、占非空行一半以上。"""
    regions, cur, gap = [], None, 0
    for i, l in enumerate(text[:limit]):
        if not l.strip():
            continue
        if _toc_like(l) or _TOC_HEAD.match(key(l)):
            if cur is None:
                cur = [i, i]
            cur[1] = i; gap = 0
        elif cur is not None:
            gap += 1
            if gap > 8:
                regions.append(cur); cur, gap = None, 0
    if cur is not None:
        regions.append(cur)
    best, score = None, 0
    for a, z in regions:
        heads = [i for i in range(a, z + 1) if _TOC_HEAD.match(key(text[i]))]
        if any(key(text[i]) in ("briefcontents", "contentsinbrief") for i in heads[:-1]):
            a = heads[-1]  # 先有简目、后有详目：只取详目
        while a < z and not (_strong(text[a]) or _TOC_HEAD.match(key(text[a]))):
            a += 1
        if sum(_strong(text[i]) for i in range(a, z + 1)) >= 0.3 * sum(_toc_like(text[i]) for i in range(a, z + 1)):
            while z > a and not _strong(text[z]):  # 目录印了页码：末端修到最后一条带页码的行（其后多半是正文里的标题）
                z -= 1
        body = [l for l in text[a:z + 1] if l.strip()]
        n = sum(_toc_like(l) for l in body)
        if n >= 15 and n >= 0.5 * len(body) and n > score:
            best, score = (a + 1, z + 1), n
    return best


# ---------- 2. 目录 → 条目表（模型）+ 校验 ----------

@dataclass
class Entry:
    seq: int
    level: int
    kind: str
    number: str
    title: str
    page: str
    check: str = ""  # 条目表校验问题
    line: int = -1  # 定位到的正文行（0 起）
    skip: int = 1  # 标题占几行
    how: str = ""
    note: str = ""
    file: str = ""  # 所在文件（相对 m07/）
    pages: str = ""  # 印刷页
    pdf: str = ""  # PDF 页
    src: str = ""  # 原文位置：页段:行号范围


def _chunks(lines: list[str]) -> list[list[str]]:
    out, cur = [], []
    for l in lines:
        cur.append(l)
        n = sum(1 for x in cur if x.strip())
        if n >= CHUNK and not l.strip() or n >= CHUNK + 30:
            out.append(cur); cur = []
    if any(x.strip() for x in cur):
        out.append(cur)
    return out


def _parse_rows(txt: str) -> list[list[str]]:
    rows = []
    for l in txt.splitlines():
        l = l.strip().strip("`")
        if l.count("|") < 3 or set(l) <= set("|-: "):
            continue
        l = l.removeprefix("|").removesuffix("|")  # 只去一个：页码栏为空时行尾的 “ |” 是最后一栏的分隔
        c = [x.strip() for x in l.split("|")]
        if len(c) == 4 and c[0].isdigit():  # 没写页码栏
            c.append("")
        if len(c) < 5 or not c[0].isdigit():
            continue
        rows.append([c[0], c[1], c[2], " | ".join(c[3:-1]), c[-1]])
    return rows


_RAW_ENTRY = re.compile(r"^[\\*\s§]*(\d+(?:\.\d+)+\\?\*?|[A-Z]\.\d+)\s*(.+?)[\s.…·]*(\d{1,4})\s*$")

_CELL_NUM = re.compile(r"^\\?\*?\d+(?:\.\d+)*\\?\*?$")


def _flatten_tables(raw: list[str]) -> list[str]:
    """目录里的并排两栏常被转成 HTML 表格（一行一个 <table>，每行两对「编号 | 标题 页码」）。
    展开成逐行条目：按栏逐栏（先整个左栏、再整个右栏）才是书里的先后顺序（如 6.2–6.4 之后才是 6.2*–6.4*）；
    编号原样保留（含星号）。不是“编号 + 标题”成对的表格不动。"""
    out = []
    for l in raw:
        if "<table" not in l:
            out.append(l); continue
        rows = [[re.sub(r"<[^>]+>", "", c).strip() for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", r, flags=re.S)]
                for r in re.findall(r"<tr[^>]*>(.*?)</tr>", l, flags=re.S)]
        if rows and all(len(r) == len(rows[0]) and len(r) % 2 == 0 and all(_CELL_NUM.match(r[i]) for i in range(0, len(r), 2)) for r in rows):
            out += [f"{r[c]} {r[c + 1]}" for c in range(0, len(rows[0]), 2) for r in rows]
        else:
            out.append(l)
    return out


def _raw_title(l: str) -> str:
    return re.sub(r"[\s.…·]*(\d{1,4}|[ivxlc]{1,7})\s*$", "", l.strip(), flags=re.I)


def _repair(entries: list[Entry], raw: list[str]) -> tuple[list[Entry], list[str]]:
    """程序核对模型的条目表，只做能从目录原文确定的修正，并在“校验”栏写明：
    标题不在原文里 → 有编号就按原文同编号那行更正；原文里带编号和页码、却没有对应条目的行 → 补上。"""
    rawk = key("\n".join(raw))
    by_num = {}
    for l in raw:
        if m := _RAW_ENTRY.match(l.strip()):
            by_num.setdefault(m.group(1), m)
    for e in entries:
        if key(e.title) and key(e.title) in rawk:
            continue
        m = by_num.get(e.number)
        if m and key(m.group(2)) in rawk:
            e.check = f"标题按目录原文更正（模型写作「{e.title}」）"
            e.title = m.group(2).strip()
        else:
            e.check = "标题不在目录原文里"
    # 原文逐行对到条目（顺序向前找），对不上的行记下；带编号 + 页码的补成条目
    out, j, uncovered = [], 0, []
    for l in raw:
        lk = key(_raw_title(l))
        if len(lk) < 3 or _TOC_HEAD.match(lk) or re.fullmatch(r"(contents)?[ivxlc\d]*", lk):
            continue
        hit = next((k for k in range(j, min(j + 6, len(entries))) if key(entries[k].title) and key(entries[k].title) in lk), None)
        if hit is None and any(key(e.title) and (key(e.title) in lk or lk in key(e.title)) for e in entries):
            continue  # 断行标题的后半截、或已被前面的条目覆盖
        if hit is not None:
            out += entries[j:hit + 1]; j = hit + 1
            continue
        m = _RAW_ENTRY.match(l.strip())
        if m:
            depth = m.group(1).count(".")
            like = next((e for e in reversed(out) if e.number.count(".") == depth and e.kind == "section"), None)
            out.append(Entry(0, like.level if like else depth + 1, "section", m.group(1), m.group(2).strip(), m.group(3),
                             "模型漏掉，按目录原文补上"))
        else:
            uncovered.append(l.strip())
    out += entries[j:]
    return out, uncovered


def _drop_brief(entries: list[Entry]) -> list[Entry]:
    """目录里先有简目（只列章）、后有详目时，模型会把两份都列出来：同一章 / 篇 / 附录（类型 + 编号 + 标题都相同）
    出现两次，只留最后一次（详目），否则简目条目会按顺序抢走正文里的位置。"""
    seen, drop = {}, set()
    for i, e in enumerate(entries):
        if e.number or e.kind in ("part", "front", "back", "appendix"):
            k = (e.kind, e.number, key(e.title))
            if k in seen:
                drop.add(seen[k])
            seen[k] = i
    return [e for i, e in enumerate(entries) if i not in drop]


def outline(b: Book) -> list[Entry]:
    """没有目录的书（网页式读本）：每个正文里的一级标题（“# ”，代码块之外）当一章，不带编号和页码。"""
    fence, out = False, []
    for l in b.text:
        if l.startswith("```"):
            fence = not fence
        elif not fence and l.startswith("# ") and (t := _strip(l)) and len(t) <= 100:
            out.append(Entry(len(out), 1, "chapter", "", t, ""))
    return out


def make_toc(book: Path, out: Path, toc: str | None, model: str) -> list[Entry]:
    b = load(book)
    if toc:
        a, z = (int(x) for x in toc.split("-"))
    else:
        first = (_parts(book)[0][0] / "full.md").read_text(encoding="utf-8").count("\n")
        found = find_toc(b.text, min(first, 4000))
        if not found and len(entries := outline(b)) >= 8:
            out.mkdir(parents=True, exist_ok=True)
            save_toc(out / "toc.tsv", entries, (0, 0), [])
            print(f"没有目录：按正文一级标题（# ）生成条目表，共 {len(entries)} 条", file=sys.stderr)
            return entries
        if not found:
            raise SystemExit(f"未找到目录（前 {min(first, 4000)} 行没有目录样式的一片）：请用 --toc A-B 指定行号")
        a, z = found
    raw = _flatten_tables([re.sub(r"^#+\s*", "", l) for l in b.text[a - 1:z]])
    print(f"目录：第 {a}–{z} 行（{sum(1 for l in raw if l.strip())} 行非空）", file=sys.stderr)
    out.mkdir(parents=True, exist_ok=True)
    cache_f = out / "toc.llm.json"
    cache = json.loads(cache_f.read_text(encoding="utf-8")) if cache_f.exists() else {}
    system = PROMPT.read_text(encoding="utf-8")
    rows, chunks = [], _chunks(raw)
    for n, ch in enumerate(chunks, 1):
        user = ""
        if rows:
            user += "前文最后几条（只用来接续层级，不要重复输出）：\n" + "\n".join(" | ".join(r) for r in rows[-4:]) + "\n\n"
        user += "目录原文：\n" + "\n".join(ch)
        h = hashlib.sha1((model + system + "\n".join(ch)).encode()).hexdigest()[:16]
        if h not in cache:
            print(f"[{n}/{len(chunks)}] 调模型 {model}（{len(ch)} 行）……", file=sys.stderr, flush=True)
            res = llm.call(model, system, user, timeout=1800)
            cache[h] = {"model": res.model, "seconds": round(res.seconds), "in": res.input_tokens,
                        "out": res.output_tokens, "text": res.text}
            cache_f.write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding="utf-8")
            print(f"    {res.seconds:.0f}s，输出 {res.output_tokens} tokens", file=sys.stderr)
        rows += [r + [""] for r in _parse_rows(cache[h]["text"])]
    entries = []
    for lv, kind, num, title, page, chk in rows:
        kind = kind.strip().lower()
        num = re.sub(r"\\+\*", "*", num.strip()).lstrip("§*\\ ").rstrip(". ")  # 去前缀包装；末尾星号是编号的一部分（6.2* ≠ 6.2）
        if not num and (m := re.match(r"^(\d+(?:\.\d+)+)\s+(.+)$", title)):
            num, title = m.group(1), m.group(2)
        entries.append(Entry(0, int(lv), kind if kind in KINDS else "other", num, title.strip(), page.strip(), chk))
    entries, uncovered = _repair(entries, raw)
    entries = _drop_brief(entries)
    for i, e in enumerate(entries):
        e.seq = i
    # 页码不倒退（阿拉伯页码之间）；层级不跳级
    last, prev_lv = 0, 0
    for e in entries:
        if e.page.isdigit():
            if int(e.page) < last:
                e.check = (e.check + "；" if e.check else "") + f"页码倒退（前一条 {last}）"
            last = max(last, int(e.page))
        if e.level > prev_lv + 1:
            e.check = (e.check + "；" if e.check else "") + f"层级跳级（{prev_lv}→{e.level}）"
        prev_lv = e.level
    save_toc(out / "toc.tsv", entries, (a, z), uncovered)
    print(f"条目 {len(entries)}；校验问题 {sum(1 for e in entries if e.check)}；目录原文未覆盖 {len(uncovered)} 行", file=sys.stderr)
    return entries


def save_toc(f: Path, entries: list[Entry], span: tuple[int, int], uncovered: list[str]) -> None:
    head = [f"# toc {span[0]}-{span[1]}（目录在合并正文中的行号；本表可手改后重跑 split）",
            *[f"# 未覆盖：{l}" for l in uncovered], "序\t层级\t类型\t编号\t标题\t页码\t校验"]
    body = [f"{e.seq}\t{e.level}\t{e.kind}\t{e.number}\t{e.title}\t{e.page}\t{e.check}" for e in entries]
    f.write_text("\n".join(head + body) + "\n", encoding="utf-8")


def read_toc(f: Path) -> tuple[list[Entry], tuple[int, int], list[str]]:
    entries, span, unc = [], (0, 0), []
    for l in f.read_text(encoding="utf-8").splitlines():
        if m := re.match(r"^# toc (\d+)-(\d+)", l):
            span = (int(m.group(1)), int(m.group(2)))
        elif l.startswith("# 未覆盖："):
            unc.append(l[6:])
        elif l and not l.startswith(("#", "序\t")):
            c = (l.split("\t") + [""] * 7)[:7]
            entries.append(Entry(int(c[0]), int(c[1]), c[2], c[3], c[4], c[5], c[6]))
    return entries, span, unc


# ---------- 3. 定位 ----------

_CN = "零一二三四五六七八九"


def _cn(n: int) -> str:
    if n < 10:
        return _CN[n]
    if n < 20:
        return "十" + (_CN[n % 10] if n % 10 else "")
    return _CN[n // 10] + "十" + (_CN[n % 10] if n % 10 else "") if n < 100 else str(n)


_PRE = r"^(?:chapter|chap\.?|lecture|part|unit|appendix|section|sec\.?|§|附录|第)?\s*"
_ROMAN_UP = {1: "Ⅰ", 2: "Ⅱ", 3: "Ⅲ", 4: "Ⅳ", 5: "Ⅴ", 6: "Ⅵ", 7: "Ⅶ", 8: "Ⅷ", 9: "Ⅸ", 10: "Ⅹ"}


def num_rx(num: str) -> re.Pattern | None:
    n = num.strip()
    if not n:
        return None
    star = n.endswith("*")
    n = n.rstrip("*")
    if n.isdigit():
        v = int(n)
        alt = "|".join(re.escape(x) for x in {str(v), _cn(v), _ROMAN_UP.get(v, str(v))})
        body = rf"(?:{alt})(?:\s*[章讲篇部节])?"
    else:
        body = r"(?:\s*[.．]\s*|\s+)".join(re.escape(p) for p in re.split(r"[.．]", n))  # OCR 有时把点丢成空格
    tail = r"\s*\\?\*" if star else r"(?![\dA-Za-z])(?!\s*[.．]\s*\d)(?!\s*\\?\*)"
    return re.compile(_PRE + body + tail + (r"(?![\dA-Za-z])" if star else ""), re.I)


def _strip(l: str) -> str:
    return re.sub(r"^#+\s*", "", l).strip().lstrip("\\*■•· ").strip()


def _tmatch(tk: str, rk: str) -> bool:
    if not tk or not rk:
        return False
    if rk.startswith(tk):
        return True
    if len(rk) >= max(4, 0.6 * len(tk)) and tk.startswith(rk):
        return True
    return len(tk) >= 12 and difflib.SequenceMatcher(None, tk, rk[:len(tk)]).ratio() >= 0.8


def _subseq(rk: str, tk: str) -> bool:
    """OCR 丢字母（“M lti l E i f th V t P t ti l”）：残缺标题是完整标题的子序列、且留下三成以上（另有编号与页码把关）。"""
    it = iter(tk)
    return len(rk) >= max(6, 0.3 * len(tk)) and all(c in it for c in rk)


_LEAD = re.compile(r"^(?:appendix|chapter|附录)\b[\s.:：]*(?:(?:\d+|[A-Z])\b[\s.:：]*)?", re.I)  # 无编号条目：正文标题常带“APPENDIX.”前缀


def _is_head(l: str) -> bool:
    return bool(re.match(r"^#{1,6}\s", l))


def locate(b: Book, entries: list[Entry], start: int, barrier: tuple[int, int]) -> None:
    text = b.text
    fence, heads = False, []
    for i, l in enumerate(text):
        if l.startswith("```"):
            fence = not fence
        elif not fence and _is_head(l) and not (barrier[0] <= i < barrier[1]):
            heads.append(i)
    hset = set(heads)
    joined = {}  # 标题拆成两行：接上紧随的下一个标题行
    for a, c in zip(heads, heads[1:]):
        if c - a <= 3:
            joined[a] = (_strip(text[a]) + " " + _strip(text[c]), c - a + 1)
    repeat = Counter(_strip(text[i]) for i in heads)

    def cands(e: Entry, lo: int, hi: int):
        rx, tk = num_rx(e.number), key(e.title)
        for i in range(lo, hi):
            l = text[i]
            if i in hset:
                forms = [(_strip(l), 1)] + ([joined[i]] if i in joined else [])
                for k, (s, skip) in enumerate(forms):
                    m = rx.match(s) if rx else None
                    if m and _tmatch(tk, key(s[m.end():])):
                        yield i, (4 if k == 0 else 3), skip; break
                    if m and k == 0 and _subseq(key(s[m.end():]), tk):
                        yield i, 2.5, 1; break
                    if (not rx or not m) and (_tmatch(tk, key(s)) or (not rx and _tmatch(tk, key(_LEAD.sub("", s))))):
                        yield i, 2, skip; break
                    if m and k == 0 and len(key(s[m.end():])) < 3:
                        if i in joined and _tmatch(tk, key(joined[i][0][m.end():])):
                            yield i, 3, joined[i][1]; break
                        yield i, 0.5, 1; break
            elif rx and l[:1].isalnum() and (m := rx.match(l.strip())) and _tmatch(tk, key(l.strip()[m.end():])[:len(tk) + 2]):
                yield i, 1, 0  # K&K 式：标题没转成标题行，正文行以“编号 标题”开头

    def pick(cs, tk):
        if not cs:
            return None
        top = max(s for _, s, _ in cs)
        best = [c for c in cs if c[1] == top]
        # 标题与目录完全相等（允许末尾粘着节号）优先于“以它开头”：章名 Derivatives 不能被「Derivatives and Rates of Change2.1」抢走
        exact = [c for c in best if re.fullmatch(re.escape(tk) + r"\d*", key(_strip(text[c[0]])))]
        plain = [c for c in (exact or best) if repeat[_strip(text[c[0]])] < 3]  # 同一文字反复出现的多半是页眉
        return (plain or exact or best)[0]

    def search(e: Entry, pos: int, end: int) -> tuple | None:
        exp = expected_pdf(b, e.page) if e.page else None
        if exp is not None:
            hi = next((i for i in range(pos, end) if b.page[i] > exp + 10), end)
            cs = list(cands(e, pos, hi))
            win = [c for c in cs if exp - 1 <= b.page[c[0]] <= exp + 2]
            if (got := pick(win, key(e.title))):
                return got, ""
            near = [c for c in cs if c[1] >= 3]
            if (got := pick(near, key(e.title))):
                return got, f"页码偏差：目录 p.{e.page} ≈ PDF {exp}，正文在 PDF {b.page[got[0]]}"
            return None
        cs = [c for c in cands(e, pos, min(end, pos + 3000)) if c[1] >= 2]
        return (pick(cs, key(e.title)), "无页码校验") if cs else None

    HOW = {4: "编号+标题", 3: "编号+标题（两行）", 2.5: "编号+残缺标题", 2: "标题", 1: "正文行", 0.5: "仅编号"}

    def weak(e: Entry) -> bool:  # 既没编号、又没有可换算的页码：只剩标题，“Summary / Problems”之类每章都有，不能往后乱找
        return not e.number and not (e.page and expected_pdf(b, e.page) is not None)

    pos = start
    for e in entries:
        if not weak(e) and (r := search(e, pos, len(text))):
            (e.line, s, e.skip), e.note = r
            e.how = HOW[s]
            pos = e.line + max(e.skip, 1)
    for e in entries:  # 弱条目：只在前后两个已定位条目之间找
        if e.line >= 0 or not weak(e):
            continue
        lo = next((x.line + max(x.skip, 1) for x in reversed(entries[:e.seq]) if x.line >= 0), start)
        hi = next((x.line for x in entries[e.seq + 1:] if x.line >= 0), len(text))
        if (r := search(e, lo, hi)):
            (e.line, s, e.skip), e.note = r
            e.how = HOW[s]
    for e in entries:  # 标题与编号都找不到、但有页码：取该 PDF 页的第一行（整页近似；同页已被占用则不定位）
        if e.line >= 0 or not e.page or (exp := expected_pdf(b, e.page)) is None:
            continue
        lo = next((x.line + max(x.skip, 1) for x in reversed(entries[:e.seq]) if x.line >= 0), start)
        hi = next((x.line for x in entries[e.seq + 1:] if x.line >= 0), len(text))
        i = next((i for i in range(lo, hi) if b.page[i] >= exp), None)
        if i is not None and b.page[i] == exp and (i == 0 or b.page[i - 1] < exp) and not (barrier[0] <= i < barrier[1]):
            e.line, e.skip, e.how, e.note = i, 0, "页码（整页近似）", "标题未在正文找到，按目录页码取该页第一行"
    for e in entries:  # 只按标题定位的条目：标题前若有一行单独的本节编号（6.2\* 式开篇块：编号、说明、图在标题之前），起点前移到编号行
        if e.how != "标题" or not (rx := num_rx(e.number)):
            continue
        lo = max((x.line + max(x.skip, 1) for x in entries[:e.seq] if x.line >= 0), default=start)
        for i in range(e.line - 1, max(e.line - 25, lo) - 1, -1):
            t = _strip(text[i])
            if (m := rx.match(t)) and not key(t[m.end():]):
                e.line, e.skip, e.how = i, 1, "标题（编号行在前）"
                break
            if _is_head(text[i]):
                break
    for e in entries:  # 章 / 篇 / 附录的开篇页：照片、图注、章号图在标题之前（版式如此，MinerU 顺序与原页一致）；起点前移到该 PDF 页第一行
        if e.kind not in ("chapter", "part", "appendix") or e.line <= 0 or e.how in ("", "页码（整页近似）"):
            continue
        lo = max((x.line + max(x.skip, 1) for x in entries[:e.seq] if x.line >= 0), default=start)
        i0 = e.line
        while i0 - 1 > lo and b.page[i0 - 1] == b.page[e.line]:
            i0 -= 1
        if i0 < e.line and not any(_is_head(text[i]) for i in range(i0, e.line)) and any(text[i].strip() for i in range(i0, e.line)):
            e.line, e.skip = i0 - 1, 1  # 起点取页首前的空行（只略过它），开篇内容与标题行都留在正文里
            e.how += "（含开篇页）"
    for e in entries:  # 正文前的条目（前言等）可能排在目录之前
        if e.line < 0 and e.kind == "front" and barrier[0] > 0 and (r := search(e, 0, barrier[0])):
            (e.line, s, e.skip), e.note = r
            e.how = "标题（目录之前）"


# ---------- 4. 切分 ----------

def _slug(s: str) -> str:
    return re.sub(r"[\s/\\:*?\"<>|]+", "_", unicodedata.normalize("NFKC", s)).strip("_.")[:24] or "x"


_BACK = re.compile(r"^(index|subjectindex|answers.*|selectedanswers.*|solutionstoodd.*|bibliography|credits|photocredits|glossary|appendices|appendix.*|索引|参考文献|习题答案|答案|附录.*)$")


def _tail_end(b: Book, e: Entry) -> int:
    """最后一个切分文件的止行：目录只列到最后一章 / 节，其后的附录、答案、索引不能全吞进去。
    先看印刷页码：最后一个与本节页码连续的页之后，如果还有 ≥ 15 页，就在那里止；再看标题行，遇到附录 / 答案 / 索引之类的标题止。"""
    end, p0 = len(b.text), b.page[e.line]
    off = sorted(pdf - v for pdf, k, v in b.printed if k == "a" and abs(pdf - p0) <= 15)
    if off:
        o = off[len(off) // 2]
        last = max((pdf for pdf, k, v in b.printed if k == "a" and pdf >= p0 and pdf - v == o), default=0)
        if last and b.page[-1] - last >= 15:
            end = next((i for i in range(e.line, len(b.text)) if b.page[i] > last), end)
    for i in range(e.line + 1, end):
        if _is_head(b.text[i]) and _BACK.match(key(_strip(b.text[i]))):
            return i
    return end


def split(book: Path, out: Path, depth: int | None) -> dict:
    a_depth = depth is not None
    entries, span, uncovered = read_toc(out / "toc.tsv")
    b = load(book)
    barrier = (span[0] - 1, span[1])
    locate(b, entries, span[1], barrier)
    # 父子关系
    parent, stack = {}, []
    for e in entries:
        while stack and stack[-1].level >= e.level:
            stack.pop()
        parent[e.seq] = stack[-1] if stack else None
        stack.append(e)
    # 切分层：每章自己的最浅的 section 所在层（有篇的书里，篇外的章与篇内的章层级不同，不能全书取一个）；
    # 章下没有节就切到章；不在章里的条目（前言、篇名等）用全书最浅节层。--depth 给了就全书一律。
    secs = [e.level for e in entries if e.kind == "section"]
    base = depth or (min(secs) if secs else max(e.level for e in entries))
    depth = base
    cut = {}
    for e in entries:
        if e.kind in ("chapter", "appendix"):
            sub = []
            for x in entries[e.seq + 1:]:
                if x.level <= e.level:
                    break
                if x.kind == "section":
                    sub.append(x.level)
            cut[e.seq] = base if a_depth else (min(sub) if sub else e.level)

    def limit(e: Entry) -> int:
        x = e
        while x and x.kind not in ("chapter", "appendix"):
            x = parent[x.seq]
        return cut[x.seq] if x else base

    def chapter_dir(e: Entry) -> str:
        chain, x = [], e
        while x:
            chain.append(x); x = parent[x.seq]
        top = next((x for x in chain if x.kind in ("chapter", "appendix")), None)
        if top is None:
            return {"front": "front", "back": "back"}.get(chain[-1].kind, "misc")
        num = top.number
        if not num:  # 章号缺失（如 OCR 丢了）：取第一个带编号的子条目的首段
            kid = next((x for x in entries[top.seq + 1:] if x.level > top.level and x.number), None)
            if kid and entries.index(kid) < len(entries):
                num = re.split(r"[.．]", kid.number)[0]
        if top.kind == "appendix":
            return f"app-{_slug(num) if num else top.seq}"
        return f"ch{int(num):02d}" if num.isdigit() else f"ch-{_slug(num) if num else top.seq}"

    def ctx_num(e: Entry) -> str:
        x = parent[e.seq]
        while x and not x.number:
            x = parent[x.seq]
        return x.number if x else ""

    owners = [e for e in entries if e.line >= 0 and (e.level <= limit(e) or e.kind in OWN_FILE)]
    owners.sort(key=lambda e: e.line)

    def end_of(os: list[Entry], k: int) -> int:
        e = os[k]
        end = os[k + 1].line if k + 1 < len(os) else (_tail_end(b, e) if e.kind in ("chapter", "section", "other") else len(b.text))
        return barrier[0] if e.line < barrier[0] < end else end

    while True:  # 文件过大（> BIG 字符）且里面有已定位的下一层小节：再往下切一层（整节一次调用会把抽取拖差）
        os_ = sorted(owners, key=lambda e: e.line)
        have, add = {e.seq for e in owners}, []
        for k, e in enumerate(os_):
            end = end_of(os_, k)
            if sum(len(l) + 1 for l in b.text[e.line:end]) <= BIG:
                continue
            inner = [x for x in entries if e.line < x.line < end and x.kind == "section" and x.level > e.level and x.seq not in have]
            add += [x for x in inner if x.level == min(y.level for y in inner)]
        if not add:
            break
        owners = os_ + add
    owners.sort(key=lambda e: e.line)
    if (out / "index.md").exists():
        for d in out.iterdir():  # 重跑：清掉上次切出的文件
            if d.is_dir():
                shutil.rmtree(d)
    names, files, flines = set(), {}, {}
    rows = []
    stats = Counter()
    for k, e in enumerate(owners):
        end = end_of(owners, k)
        body = b.text[e.line + max(e.skip, 1):end]
        files[e.seq] = (e.line, end)
        e.src = b.src(e.line, end)
        if sum(1 for l in body if l.strip() and not _is_head(l)) < 2:
            continue  # 只有标题、没有正文（如章名后直接是第一节）
        pre = KINDS[e.kind]
        name = f"{pre}-{_slug(e.number.replace('*', 'star'))}" if e.number else f"{pre}-{(_slug(ctx_num(e)) + '-') if ctx_num(e) else ''}{_slug(e.title)}"
        path, n = f"{chapter_dir(e)}/{name}", 2
        while path in names:
            path = f"{chapter_dir(e)}/{name}-{n}"; n += 1
        names.add(path)
        e.file = path + ".md"
        p0, p1 = b.page[min(e.line + max(e.skip, 1), end - 1)], b.page[max(end - 1, e.line)]
        a0, a1 = e.page or (str(printed_of(b, p0)) if printed_of(b, p0) else ""), printed_of(b, p1)
        e.pages = (f"p.{a0}" + (f"–{a1}" if a1 and a0.isdigit() and a1 > int(a0) else "")) if a0 else ""
        e.pdf = f"{p0}" + (f"–{p1}" if p1 > p0 else "")
        label = " ".join(x for x in (e.number, e.title) if x)
        f = out / e.file
        f.parent.mkdir(parents=True, exist_ok=True)
        content = _clean(body)
        flines[e.file] = [0, content.splitlines()]
        f.write_text(f"# {label}（{e.pages + ' · ' if e.pages else ''}PDF {e.pdf} · 原文 {e.src}）\n\n" + content, encoding="utf-8")
    # 每个条目落在哪个文件
    owner_at = [(e.line, e) for e in owners]
    for e in entries:
        stats["条目"] += 1
        if e.line < 0:
            stats["未找到"] += 1
            prev = max((o for l, o in owner_at if l < _anchor(entries, e)), key=lambda o: o.line, default=None)
            nxt = next((x.seq for x in entries[e.seq + 1:] if x.level <= e.level), len(entries))
            kids = entries[e.seq + 1:nxt]
            if any(x.line >= 0 for x in kids[:3]):
                e.note = "正文无此标题，内容见下级条目"
            elif prev is not None and prev.file:
                e.note = f"未定位；内容在 `{prev.file}` 里（{'未定出行号' if e.level > limit(e) and e.kind not in OWN_FILE else '并在该文件末尾'}）"
                prev.note = (prev.note + "；" if prev.note else "") + f"可能含未定位的「{' '.join(x for x in (e.number, e.title) if x)}」"
            else:
                e.note = "未定位"
            continue
        stats["定位"] += 1
        if e.note.startswith("页码偏差"):
            stats["页码偏差"] += 1
        if not e.file:
            host = max((o for l, o in owner_at if l <= e.line and o.file), key=lambda o: o.line, default=None)
            if host is not None and host is not e and files.get(host.seq, (0, 0))[1] > e.line:
                e.file = host.file
                cur, fl = flines[host.file]
                at = next((i for i in range(cur, len(fl)) if fl[i] == b.text[e.line]), None)
                if at is not None:
                    flines[host.file][0] = at + 1
                    e.note = (e.note + "；" if e.note else "") + f"文件内第 {at + 3} 行起"  # 文件头占 2 行
                e.pdf = str(b.page[e.line])
                nxt = next((x.line for x in entries[e.seq + 1:] if x.line > e.line), files[host.seq][1])
                e.src = b.src(e.line, min(nxt, files[host.seq][1]))
                e.pages = f"p.{e.page}" if e.page else ""
            elif e.seq in files:
                e.note = (e.note + "；" if e.note else "") + "无独立正文（见下级条目）"
    for e in entries:
        kind = KINDS[e.kind]
        rows.append(f"| {e.number} | {kind} | {'　' * (e.level - 1)}{e.title} | {e.pages or (('p.' + e.page) if e.page else '')} | "
                    f"{('`' + e.file + '`') if e.file else '—'} | {e.level} | {e.pdf} | "
                    f"{e.src} | {e.how or '未找到'} | {'；'.join(x for x in (e.check, e.note) if x)} |")
    title = json.loads((book / "source.json").read_text(encoding="utf-8"))["file"] if (book / "source.json").exists() else book.name
    head = (f"# M07 索引：{title}\n\n"
            f"> 按全书目录切分（`studium.m07toc`，条目表见 `toc.tsv`）。切分层 = 各章最浅的节所在层（全书通常 {depth}）；更深的条目在所在文件内，“说明”栏给出行号。"
            "页 = 书上印的页码（起页取自目录，止页由页码块推算）；PDF 页 = 原 PDF 的页序；原文 = MinerU 页段 full.md 内的行号范围（含标题行，到下一条目之前）。"
            "类型：part 篇 / ch 章 / sec 节 / prob 习题 / app 附录 / front 正文前 / back 正文后 / x 其他。\n"
            f"> 定位 {stats['定位']} / {stats['条目']}；未找到 {stats['未找到']}（逐条见“说明”）。\n\n"
            "| 编号 | 类型 | 标题 | 页 | 文件 | 层级 | PDF 页 | 原文 | 定位 | 说明 |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n")
    (out / "index.md").write_text(head + "\n".join(rows) + "\n", encoding="utf-8")
    report(out, entries, stats, uncovered, depth, len({e.file for e in entries} - {''}))
    return stats


def _anchor(entries: list[Entry], e: Entry) -> int:
    """未定位条目的大致位置：下一个已定位条目的行。"""
    return next((x.line for x in entries[e.seq + 1:] if x.line >= 0), 10 ** 9)


def report(out: Path, entries: list[Entry], stats: Counter, uncovered: list[str], depth: int, nfiles: int) -> None:
    how = Counter(e.how or "未找到" for e in entries)
    lines = [f"# M07 切分报告\n", f"- 条目 {stats['条目']}，定位 {stats['定位']}（{stats['定位'] / max(stats['条目'], 1):.1%}），"
             f"未找到 {stats['未找到']}，页码偏差 {stats['页码偏差']}；文件 {nfiles}；切分层 {depth}",
             "- 定位方式：" + "，".join(f"{k} {v}" for k, v in how.most_common()),
             f"- 条目表校验问题 {sum(1 for e in entries if e.check)}；目录原文未被条目覆盖 {len(uncovered)} 行\n"]
    bad = [e for e in entries if e.line < 0 or e.check or e.note.startswith(("页码偏差", "未定位"))]
    if bad:
        lines += ["## 需要查看的条目\n", "| 序 | 编号 | 标题 | 页 | 问题 |", "| --- | --- | --- | --- | --- |"]
        lines += [f"| {e.seq} | {e.number} | {e.title} | {e.page} | {'；'.join(x for x in (e.check, e.note or ('未找到' if e.line < 0 else '')) if x)} |" for e in bad]
    if uncovered:
        lines += ["\n## 目录原文中没有对应条目的行\n"] + [f"- {l}" for l in uncovered]
    (out / "report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines[1:4]), file=sys.stderr)


def main(argv=None):
    ap = argparse.ArgumentParser(description="M07 通用版：按目录把书切成小节")
    ap.add_argument("cmd", choices=["toc", "split", "run"])
    ap.add_argument("--book", type=Path, required=True)
    ap.add_argument("--toc", help="目录在合并正文中的行号范围 A-B（默认自动找）")
    ap.add_argument("--model", default=MODEL)
    ap.add_argument("--depth", type=int, help="切分层（默认：最浅的节所在层）")
    ap.add_argument("--out", type=Path, help="默认 <book>/m07")
    a = ap.parse_args(argv)
    out = a.out or a.book / "m07"
    if (out / "index.md").exists() and not (out / "toc.tsv").exists():
        raise SystemExit(f"{out} 是别的切法产出的（没有 toc.tsv），不覆盖；用 --out 指定别处")
    if a.cmd in ("toc", "run"):
        make_toc(a.book, out, a.toc, a.model)
    if a.cmd in ("split", "run"):
        split(a.book, out, a.depth)


if __name__ == "__main__":
    main()
