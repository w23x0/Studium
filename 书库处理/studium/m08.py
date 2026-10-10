"""M07 → M08：点 + 子句，先生成、后回扫（M08 审查单「点与子句」「点与子句的生成」）。

    python3 -m studium.m08 run   --book <书目录> --chapter 3 --out <产出目录> [--model opus]
    python3 -m studium.m08 build --book <书目录> --chapter 3 --out <产出目录>     # 只重做程序部分（合并、核锚点、写 jsonl）
    python3 -m studium.m08 check --out <产出目录>                                # 只重出质量报告

流程（一章）：
1. 生成（模型，1 次）：只给学科、范围（章名 + 节名）与本书此前各章的标题，不给原文；模型凭自身知识写点与子句。
2. 审核 + 回扫（模型，每节 1 次，按书中顺序串行）：给当前清单（生成的 + 前面各节补进来的）与本节正文（不含习题），
   判点落位、子句书给的 / 零件，补书有清单没有的点与路线，记“别混淆”、书只提到的（mentions）与疑似转录错误。
   补漏（模型，有漏才调）：本节正文切成段落块，没有任何核过的摘录落进来的块（只记了“只提到”的也算）编号 S1、S2…，
   给整节原文 + 这些段号再问一次，逐段作答（responses，每段一条）：讲了点 / 路线就照审核格式补，只提到就记 mentions，
   例题演算、过渡、图表说明就写跳过理由；程序核对每段都有回应（答“补”的须有讲的内容的摘录核得到落在这段里），缺的段只给缺的再问 1 次；
   段多于 FILL_BATCH 就分批（--no-fill 关掉）。
   每节审核与补漏落盘后再审下一节。新点须有同一输出里的路线指向它，否则不并入（摘录记作书只提到）。
   输出结构不合格（生成没有 points、审核没有 book_points / book_routes、补漏没有 responses）当失败：删掉重调，至多再调 2 次。
3. 合并（程序）：摘录逐条回原文核对（规整写法后须在所标行附近找到，否则全文找，再找不到就丢弃并记下）；
   核过的摘录对到 MinerU content_list 的块（含要点框 code_body、图表标题；先用核对时定位到的原文行找，找不到再用摘录文本），
   得到原件 PDF 页与位置框；来源标签：
   点——有核过的摘录且判“一致”，或是回扫补入的书的点 = 书给的；范围内其余 = 模型补的；前置点本章没讲到 = 未审（不在本次处理的范围里，没对原文审过）。
   前置点被某节列为书讲的点（一致、摘录核得到）改判范围内，记进“并入时的问题”。
   子句——某节判书给的且书走出了关键一步（book_walks 不为 false）、有核过的摘录，= 书给的；其余 = 模型补的（零件、书没走出的摘录照样挂上）。
   book_walks 为 false 却没写缺哪一步（missing_step）的按书给的记并记进问题；已判模型补的子句被后来的“同一条”改判书给的，照改并记进问题，
   但依据只在本节小结 / 要点行的不改判、本节已有写了 missing_step 的“没走”判断的不改判（记“来源冲突”）；
   书没走出的新路线与已有书给的子句同出发点同新点（或出发点只多一个已有点）的不另立子句，摘录挂到那条上并记进问题。
   书只提到的：挂在对应点的 mentions 上（不改来源），不对应点的列进 report。
4. 检查（程序）：来源比例、锚点核对、孤立点、环、缺出发点、句子长短、段落覆盖（覆盖 / 跳过（例题、图表、其他）/ 只提到 / 真缺口）等，写 report.md。

可续跑：每步产出都落盘（work/），已有就跳过；--redo gen|audit 重做。每条点 / 子句记生成与审核所用的提示词版本与模型。
产出在 --out（含书的原文摘录，不进主仓库）：points.jsonl、clauses.jsonl、report.md、work/。
"""

import argparse
import datetime as dt
import difflib
import glob
import hashlib
import json
import os
import random
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

from . import llm

PROMPTS = Path(__file__).parent / "prompts"
GEN_PROMPT = PROMPTS / "m08_generate.md"
AUDIT_PROMPT = PROMPTS / "m08_audit.md"
FILL_NOTE = PROMPTS / "m08_fill.md"  # 补漏：接在用户消息末尾的说明
STOP_HEADINGS = re.compile(r"^#+\s*(?:[\d.]+\s+)?(Problem Set|Challenge Problems|Exercises|Problems)\b", re.I)  # 习题不进审核：只审书的讲解路线（Exercises / Problems：Stewart 等，10-09 段落覆盖时发现）


def _sha(p: Path) -> str:
    return hashlib.sha1(p.read_bytes()).hexdigest()[:8]


def _prompt_tag(p: Path) -> str:
    return f"{p.stem}@{_sha(p)}"


# ---------- 书：M07 索引 + 小节文件 ----------

def _index_rows(book: Path) -> list[dict]:
    rows = []
    for l in (book / "m07" / "index.md").read_text(encoding="utf-8").splitlines():
        if not l.startswith("| ") or l.startswith("| 编号") or l.startswith("| ---"):
            continue
        c = [x.strip() for x in l.strip().strip("|").split(" | ")]
        if len(c) < 7:
            continue
        rows.append({"number": c[0], "kind": c[1], "title": c[2].strip("　 "), "pages": c[3],
                     "file": c[4].strip("`") if c[4] != "—" else "", "level": c[5], "pdf": c[6]})
    return rows


def chapter_scope(book: Path, chapter: str) -> tuple[str, list[dict], list[str]]:
    rows = _index_rows(book)
    ch = next(r for r in rows if r["kind"] == "ch" and r["number"] == chapter)
    secs = [r for r in rows if r["kind"] == "sec" and r["number"].split(".")[0] == chapter and r["file"]
            and (book / "m07" / r["file"]).is_file()]  # M07 目录偶有坏行（10-09 Oppenheim：文件名“= +∞”）
    before = []
    for r in rows:
        if r is ch:
            break
        if r["kind"] in ("ch", "sec"):
            before.append(f"{r['number']} {r['title']}")
    return f"第 {chapter} 章 {ch['title']}", secs, before


def section_text(book: Path, file: str) -> tuple[list[str], int]:
    """小节文件的行（1 起编号用）；习题区之前为止。返回 (全部行, 审核用的行数)。"""
    lines = (book / "m07" / file).read_text(encoding="utf-8").splitlines()
    end = next((i for i, l in enumerate(lines) if i and STOP_HEADINGS.match(l)), len(lines))  # 第 1 行是文件标题，不算
    return lines, end


# 小结 / 要点行：书只在这里给结论，不算“书走出了这条路线”（来源改判时用；10-10 v4：C19 依据 3.4:344 小结被翻成书给的）
_SUMMARY = re.compile(r"(?:[\d.]+\s*)?(?:review of the ke\w ideas|(?:本节|本章)?(?:小结|要点|总结)|summary)", re.I)


def _summary_title(text: str) -> bool:
    core = " ".join(re.sub(r"<[^>]+>|[#•·*]", " ", text).split())
    return bool(_SUMMARY.fullmatch(core))


def summary_lines(lines: list[str], title: str, codes: list[str]) -> set[int]:
    """本节的小结 / 要点行（1 起）。判据（只看结构，稳定可复算）：
    1. 节名本身是小结（“Summary”“小结”等）：整节都算；
    2. 节首要点框：紧跟节标题、在第一段正文之前，且原文落在 content_list type=code 块里的行（Strang 每节开头的 1–7 条要点）；
       不在节首的 code 块（Stewart 的定理框、电路的练习答案）不算；
    3. 小结标题（“REVIEW OF THE KEY IDEAS”“小结”“Summary”等，整行就是这几个字）之后、下一个标题之前的行。"""
    if _summary_title(title):
        return set(range(1, len(lines) + 1))
    out = set()
    for i in range(2, len(lines) + 1):
        l = lines[i - 1]
        if not l.strip():
            continue
        n = norm(l)
        if l.startswith("#") or len(n) < 4 or not any(n in c for c in codes):
            break
        out.add(i)
    zone = False
    for i, l in enumerate(lines, 1):
        if l.startswith("#"):
            zone = i > 1 and _summary_title(l)
        if zone:
            out.add(i)
    return out


# ---------- 段落覆盖：本节正文切块，看每块有没有摘录落进来 ----------
# 切块规则（只为统计覆盖，稳定、可复算）：
# 1. 习题区之前的正文按空行分块；`#` 标题行另起一块。
# 2. 块的“字量”= 去掉 $$…$$、$…$、HTML 标签、[图] / 图片链接、版权页脚与标记符号后的字符数，中日韩字按 2 计。
# 3. 标题块并入下一块；字量不足 MIN_BLOCK 的块（单独的公式、图、短句）并入上一块；紧跟标题或在节首的短块并入下一块。
# 4. 并完仍不足 MIN_BLOCK 的块不计。块的行范围 = 首行到末行（1 起）。
MIN_BLOCK = 60
_NOISE = re.compile(r"^(Copyright|版权所有).*$", re.I | re.M)  # 出版社页脚（Stewart 每页一行）


def _weight(text: str) -> int:
    t = _NOISE.sub("", text)
    t = re.sub(r"\$\$.*?\$\$", "", t, flags=re.S)
    t = re.sub(r"\$[^$]*\$", "", t)
    t = re.sub(r"<[^>]+>|\[图\]|!\[[^\]]*\]\([^)]*\)|[#*|>\s]", "", t)
    return sum(2 if "　" <= ch <= "鿿" or "＀" <= ch <= "￯" else 1 for ch in t)


def section_blocks(lines: list[str], end: int) -> list[dict]:
    """本节正文 → 计数的段落块 [{"lines": [a, b], "head": 开头 60 字}]。"""
    raw, cur = [], []
    for i, l in enumerate(lines[:end], 1):
        if not l.strip() or l.startswith("#"):
            if cur:
                raw.append(cur)
            cur = [i] if l.strip() else []
            if l.startswith("#"):
                raw.append(cur); cur = []
        else:
            cur.append(i)
    if cur:
        raw.append(cur)
    merged, pending = [], []
    for r in raw:
        if lines[r[0] - 1].startswith("#"):
            pending += r
            continue
        if _weight("\n".join(lines[i - 1] for i in r)) >= MIN_BLOCK:
            merged.append(pending + r); pending = []
        elif pending or not merged:
            pending += r
        else:
            merged[-1] += r
    if pending and merged:
        merged[-1] += pending
    elif pending:
        merged.append(pending)
    out = []
    for m in merged:
        text = "\n".join(lines[i - 1] for i in range(m[0], m[-1] + 1))
        if _weight(text) >= MIN_BLOCK:
            head = " ".join(_NOISE.sub("", text).split())
            out.append({"lines": [m[0], m[-1]], "head": head[:60]})
    return out


def _quote_lines(st: "State", file: str, lines: list[str]) -> set[int]:
    """本章已并入的摘录（点、子句、零件、别混淆，任何判法）中能核到行号的，在 file 里落在哪些行。"""
    qs = [q for x in list(st.points.values()) + list(st.clauses.values()) for a in x["audits"] if a["file"] == file
          for q in a.get("quotes", [])]
    qs += [q for p in st.points.values() for k in p["cautions"] if k["file"] == file for q in k.get("quotes", [])]
    return {ln for q in qs if (ln := locate_quote(lines, q)[0])}


# 跳过理由粗分（只为统计，按关键词、先到先得）：例题演算与真缺口分开计（10-10 v4：例题按规则判跳过、不挂锚点，覆盖率口径变低）
_SKIP_KINDS = (("例题", re.compile(r"例|Example|Solution|演算|计算|求解|代入|算出|数值|习题|练习|Practice|答案|Answer|具体", re.I)),
               ("图表", re.compile(r"图|表|Figure|Fig\.|Table|TEC|动画|示意", re.I)))
COV_CLASSES = ("覆盖", "跳过·例题", "跳过·图表", "跳过·其他", "只提到", "真缺口")


def _skip_kind(reason: str) -> str:
    return "跳过·" + next((k for k, rx in _SKIP_KINDS if rx.search(reason or "")), "其他")


def _cov_class(b: dict) -> str:
    """段落块的分类：覆盖（有核过的摘录）/ 跳过（补漏逐段判跳过，或 v3 的跳过理由；按理由粗分）/ 只提到 / 真缺口（其余：补漏未回应、没问过）。
    补漏答“补”而块仍没覆盖：摘录不在本段的是真缺口；摘录在本段、却变成了只提到（新点没有路线）的算只提到，其余是真缺口。"""
    if b.get("covered"):
        return "覆盖"
    m = re.match(r"S\d+\s+(\S+?)：(.*)", b.get("reply") or "", re.S)
    act, why = (m.group(1), m.group(2)) if m else ("", "")
    if "跳过" in act:
        return _skip_kind(why)
    if "只提到" in act:
        return "只提到"
    if "补" in act and b.get("reply_bad"):  # 答补而摘录不在本段：审核在这里记过只提到也算真缺口（模型说讲了，却拿不出本段的原文）
        return "真缺口"
    if not act and b.get("skip"):
        return _skip_kind(b["skip"])
    return "只提到" if b.get("mention") else "真缺口"


def coverage(book: Path, st: "State", file: str) -> list[dict]:
    """本节每块是否被摘录覆盖；没覆盖的附上模型的回应：补漏的逐段回应（reply）、跳过理由（skip，v3 及以前）、书只提到的点（mention）；
    每块记分类（class，见 _cov_class）；补漏问过、仍是真缺口的记“补漏未回应”（no_reply：没有回应 / 答补但摘录不在本段 / 答补但未并入）。
    只提到的摘录不算覆盖。"""
    lines, end = section_text(book, file)
    hit = _quote_lines(st, file, lines)
    ment = [(ln, m["name"]) for m in st.mentions if m["file"] == file for q in m["quotes"]
            if (ln := locate_quote(lines, q)[0])]
    skips = []
    for s in st.skipped.get(file, []):
        m = re.match(r"\s*(\d+)\s*(?:[-–~]\s*(\d+))?", str(s.get("lines", "")))
        if m:
            skips.append((int(m.group(1)), int(m.group(2) or m.group(1)), s.get("reason", "")))
    res = []
    for b in section_blocks(lines, end):
        a, z = b["lines"]
        b["covered"] = any(a <= ln <= z for ln in hit)
        if not b["covered"]:
            why = [r for x, y, r in skips if x <= z and y >= a]
            if why:
                b["skip"] = "；".join(why)
            names = list(dict.fromkeys(n for ln, n in ment if a <= ln <= z))
            if names:
                b["mention"] = "、".join(names)
            rep = st.responses.get(file, {}).get((a, z))
            if rep:
                b["reply"] = f"{rep['seg']} {rep['action'] or '（空）'}：{rep['reason']}"
                if rep.get("bad"):
                    b["reply_bad"] = rep["bad"]
            asked = (a, z) in st.asked.get(file, set()) or file in st.filled
            if asked and _cov_class(b) == "真缺口":
                b["no_reply"] = ("没有回应" if not rep else (rep.get("bad") or "答补但未并入") if "补" in rep["action"]
                                 else f"回应认不出（action：{rep['action'] or '空'}）")
        b["class"] = _cov_class(b)
        res.append(b)
    return res


def _pdf_range(header: str) -> tuple[int, int] | None:
    m = re.search(r"PDF (\d+)(?:–(\d+))?", header)
    return (int(m.group(1)), int(m.group(2) or m.group(1))) if m else None


# ---------- 摘录核对 ----------

_TEX_CMD = re.compile(r"\\[A-Za-z]+")


def norm(t: str) -> str:
    """比对用：去 LaTeX 命令名、$ {} ^ _ \\ 引号与空白，忽略大小写，ff→f（转换常丢连字）。只容写法差，不容改字。"""
    t = re.sub(r"<[^>]+>", "", t)  # MinerU 夹的 <sub> <sup> 等标签
    t = re.sub(r"\\(begin|end)\{[^}]*\}", "", t)
    t = _TEX_CMD.sub("", t)
    t = re.sub(r"&lt;", "<", t)
    t = re.sub(r"&gt;", ">", t)
    t = re.sub(r"[\s${}^_\\“”\"‘’'`*·~]", "", t).casefold()
    return t.replace("ff", "f").replace("ll", "l").rstrip(".,;:")  # 转换常丢 ff / ll 连字


def _pieces(q: str) -> list[str]:
    return [norm(x) for x in re.split(r"\.\.\.|…|\\ldots|\\cdots", q) if len(norm(x)) >= 6]


def locate_quote(lines: list[str], q: dict) -> tuple[int | None, str]:
    """摘录 → (所在行, 方式)。方式：逐字 / 规整（只差写法）/ 别处（不在所标行附近）/ 找不到。"""
    text = q.get("text") or ""
    pcs = _pieces(text)
    if not pcs:
        return None, "找不到"
    want = q.get("line") if isinstance(q.get("line"), int) else 0

    def hit(a: int, b: int) -> bool:
        seg = norm("\n".join(lines[max(a, 0):b]))
        return all(p in seg for p in pcs)

    if 0 < want <= len(lines):
        if text.strip() and text.strip() in lines[want - 1]:
            return want, "逐字"
        if hit(want - 1, want) or hit(want - 3, want + 2):
            return want, "规整"
    for i in range(len(lines)):
        if pcs[0] in norm(lines[i]) and hit(i, i + 3):
            return i + 1, "别处"
    if 0 < want <= len(lines):  # 转录夹了杂字（如“step 2~~~I”）：所标行附近按字符序列近似比对，九成以上对上才算
        q, seg = norm(text), norm("\n".join(lines[max(want - 2, 0):want + 1]))
        sm = difflib.SequenceMatcher(None, q, seg, autojunk=False)
        if q and sum(b.size for b in sm.get_matching_blocks()) >= 0.9 * len(q):
            return want, "近似"
    return None, "找不到"


# ---------- 原件位置：content_list 块 → PDF 页 + 位置框 ----------

_BLOCK_FIELDS = ("text", "list_items", "code_body", "table_body", "image_caption", "table_caption", "code_caption",
                 "chart_caption", "image_footnote", "table_footnote", "chart_footnote")


def _block_text(x: dict) -> list[str]:
    """content_list 块里所有带原文的字段。每节开头的要点框是 `type: code`、字在 `code_body`（10-09 v2：原件位置没对上 51 条里 31 条）；
    图表的标题 / 脚注也是原文。equation 的字在 `text`。"""
    out = []
    for k in _BLOCK_FIELDS:
        v = x.get(k)
        out += [str(i) for i in v if i] if isinstance(v, list) else [v] if isinstance(v, str) and v else []
    return out


class Blocks:
    def __init__(self, book: Path):
        src = json.loads((book / "source.json").read_text(encoding="utf-8"))
        self.blocks = []  # (pdf_page, bbox, norm_text, type)
        for part, info in src["parts"].items():
            cls = [f for f in glob.glob(str(book / part / "*_content_list.json")) if not f.endswith("_v2.json")]
            for x in json.loads(Path(cls[0]).read_text(encoding="utf-8")):
                t = "\n".join(_block_text(x))
                if t:
                    self.blocks.append((info["first_page"] + x.get("page_idx", 0), x.get("bbox"), norm(t), x.get("type")))

    def _cand(self, pages: tuple[int, int] | None) -> list[tuple]:
        lo, hi = pages or (0, 10 ** 6)
        return [b for b in self.blocks if lo - 1 <= b[0] <= hi + 1]

    def codes(self, pages: tuple[int, int] | None) -> list[str]:
        """本节页段里 type=code 的块（规整后的字）：每节开头的要点框（Strang）；Stewart 的定理框也是 code，靠位置区分（见 summary_lines）。"""
        return [b[2] for b in self._cand(pages) if b[3] == "code"]

    def _find_head(self, h: str, pages: tuple[int, int] | None) -> tuple[int, list] | None:
        cand = self._cand(pages)
        heads = [h[:40]] + ([h[:20]] if len(h) > 20 else [])  # 40 字对不上再用 20 字：前半句之后有标点差或省略（如“0.-that”抄成“0—that”）
        for head in heads:
            for k, (pg, box, t, _) in enumerate(cand):
                if head in t:
                    return pg, box
                nxt = cand[k + 1][2] if k + 1 < len(cand) else ""
                if head in t + nxt and head[:12] in t:  # 摘录跨两块：取起始块
                    return pg, box
        return None

    def find(self, quote: str, pages: tuple[int, int] | None) -> tuple[int, list] | None:
        pcs = _pieces(quote)
        return self._find_head(pcs[0], pages) if pcs else None

    def find_line(self, lines: list[str], line: int, quote: str, pages: tuple[int, int] | None) -> tuple[int, list] | None:
        """用核对时定位到的原文行找块：模型改了字 / 公式的摘录（“近似”）按摘录文本找不到，按原文行找得到（10-10 v4：郑君里三遍 25–41 条没对上）。
        摘录开头在所标行附近（核对用的窗口，前 3 行到后 2 行，所标行优先）哪一行里找得到，就从那一行的那个位置起
        （同一行跨两页时取摘录所在的块）；都找不到就从所标行行首起。不足 12 字的不用（太短会撞上别的块），交回摘录文本搜索。"""
        pcs = _pieces(quote)
        near = [line] + [i for i in range(line - 3, line + 3) if i != line and 1 <= i <= len(lines)]
        h = norm(lines[line - 1])
        for i in near if pcs else []:
            t = norm(lines[i - 1])
            if (k := t.find(pcs[0][:12])) >= 0:
                h = t[k:]
                break
        return self._find_head(h, pages) if len(h) >= 12 else None


# ---------- 模型调用 ----------

def _json(text: str) -> dict:
    t = text.strip()
    if t.startswith("```"):
        t = t.split("\n", 1)[1].rsplit("```", 1)[0]
    a, z = t.find("{"), t.rfind("}")
    # 有的模型 LaTeX 反斜杠不转义（10-09 step-5：`\mathbf`）；`\nabla` `\frac` `\theta` 还会被静默读成换行 / 换页 / 制表。
    # 所以先修补再读：已转义的 `\\` 不动，`\字母串`（\u 码位除外）与非法转义补成 `\\`；修补后读不了才用原文
    raw = t[a:z + 1]
    fixed = re.sub(r'\\\\|\\(?=[A-Za-z]{2,})(?!u[0-9a-fA-F]{4})|\\(?![\\"/bfnrtu])',
                   lambda m: m.group(0) if m.group(0) == "\\\\" else "\\\\", raw)
    dec = json.JSONDecoder(strict=False)  # strict=False：容字符串里的原样换行；raw_decode：后面多出的文字不管（10-09 step-5）
    try:
        return dec.raw_decode(fixed)[0]
    except json.JSONDecodeError:
        return dec.raw_decode(raw)[0]


EFFORT = "high"  # 审核与回扫要逐段对照、判同一条路线：默认强度下 Sonnet 几乎不思考，回扫漏得多（10-08 第 3 章试跑）


_REPAIR = ("下面是一段本应是 JSON 的文字，但语法有错。只修语法（引号、逗号、括号、键名、转义），"
           "不增删、不改写任何内容。只输出修好的 JSON，不要别的文字。")


def _parse(work: Path, label: str, model: str, text: str) -> dict:
    """解析模型输出；语法坏了让同一模型只修语法（记 calls.log 为 <label>-repair）；还不行就删掉原样输出再抛错，下次重跑会重新生成。"""
    try:
        return _json(text)
    except json.JSONDecodeError as e:
        print(f"  {label}: JSON 语法错（{e}），请模型修语法", file=sys.stderr, flush=True)
    res = llm.call(model, _REPAIR, text, timeout=3600, effort=EFFORT)
    _log(work, f"{label}-repair", res)
    (work / f"{label}.fixed.txt").write_text(res.text, encoding="utf-8")
    try:
        return _json(res.text)
    except json.JSONDecodeError:
        (work / f"{label}.raw.txt").unlink(missing_ok=True)
        raise


def _log(work: Path, label: str, res) -> str:
    stamp = dt.datetime.now().isoformat(timespec="seconds")
    with (work / "calls.log").open("a", encoding="utf-8") as f:
        f.write(f"{stamp}\t{label}\tmodel={res.model}\tin={res.input_tokens}\tcache_read={res.cache_read}\t"
                f"out={res.output_tokens}\treq={res.requests}\t{res.seconds:.0f}s\teffort={EFFORT}\n")
    print(f"  {label}: {res.model} in={res.input_tokens} out={res.output_tokens} {res.seconds:.0f}s", file=sys.stderr, flush=True)
    return stamp


# 输出结构校验：返回不合格的原因，合格返回 None（10-09 v3：3.5 审核输出了一道算术题 {"question": "7+8-2", …}，被当成空审核收下）
def _need_gen(d: dict) -> str | None:
    return None if isinstance(d.get("points"), list) and d["points"] else "没有 points 列表"


def _need_audit(d: dict) -> str | None:
    ks = [k for k in ("book_points", "book_routes") if k in d]
    if not ks:
        return "没有 book_points / book_routes 键"
    bad = [k for k in ks if not isinstance(d[k], list)]
    return f"{'、'.join(bad)} 不是列表" if bad else None


def _need_fill(d: dict) -> str | None:
    return None if isinstance(d.get("responses"), list) else "没有 responses 列表"


RETRY_BAD = 2  # 结构不合格时重调的次数


def _call(work: Path, label: str, model: str, system: str, user: str, need=None) -> dict:
    """need(data) → 不合格的原因或 None。不合格当失败：删掉原样输出重调，至多再调 RETRY_BAD 次，仍不合格抛错（批跑会重试整章）。"""
    raw = work / f"{label}.raw.txt"
    bad = None
    for _ in range(1 + RETRY_BAD):
        logged = [l.split("\t") for l in (work / "calls.log").read_text(encoding="utf-8").splitlines()
                  if l.split("\t")[1:2] == [label]] if (work / "calls.log").exists() else []
        if raw.exists() and logged:  # 上次已拿到输出、只是没解析成功（或进程中断）：补读，不再调用模型
            stamp, used = logged[-1][0], logged[-1][2].removeprefix("model=")
            print(f"  {label}: 补读上次输出（{used}）", file=sys.stderr, flush=True)
            data = _parse(work, label, model, raw.read_text(encoding="utf-8"))
            data["_meta"] = {"model": f"{used}（effort {EFFORT}）", "at": stamp, "reread": True}
        else:
            os.environ.setdefault("CLAUDE_CODE_MAX_OUTPUT_TOKENS", "64000")  # 一章的清单输出可能超过默认上限
            res = llm.call(model, system, user, timeout=3600, effort=EFFORT)
            stamp = _log(work, label, res)
            raw.write_text(res.text, encoding="utf-8")
            data = _parse(work, label, model, res.text)
            data["_meta"] = {"model": f"{res.model}（effort {EFFORT}）", "at": stamp}
        bad = need(data) if need else None
        if not bad:
            return data
        print(f"  {label}: 输出结构不合格（{bad}），删掉原样输出重调", file=sys.stderr, flush=True)
        with (work / "calls.log").open("a", encoding="utf-8") as f:
            f.write(f"{dt.datetime.now().isoformat(timespec='seconds')}\t{label}-bad\t{bad}\n")
        raw.unlink(missing_ok=True)
        (work / f"{label}.fixed.txt").unlink(missing_ok=True)
    raise RuntimeError(f"{label}：输出结构连续 {1 + RETRY_BAD} 次不合格（{bad}）")


def generate(work: Path, scope: str, secs: list[dict], before: list[str], subject: str, model: str, call: bool = True) -> dict:
    f = work / "gen.json"
    if f.exists():
        data = json.loads(f.read_text(encoding="utf-8"))
        if not (bad := _need_gen(data)):
            return data
        if not call:
            raise SystemExit(f"gen.json 结构不合格（{bad}）：run 会删掉重生成")
        print(f"gen.json 结构不合格（{bad}）：删掉重生成，各节审核与补漏一并重做", file=sys.stderr, flush=True)
        for g in [f, work / "gen.raw.txt", *work.glob("audit-*"), *work.glob("fill-*")]:
            g.unlink(missing_ok=True)
    user = (f"学科：{subject}\n\n范围：{scope}\n" + "\n".join(f"- {s['number']} {s['title']}" for s in secs)
            + "\n\n（这是某本教材的章节标题，只用来划定范围；本书在此之前讲过：" + "；".join(before) + "。）\n")
    print("生成 ……", file=sys.stderr, flush=True)
    data = _call(work, "gen", model, GEN_PROMPT.read_text(encoding="utf-8"), user, _need_gen)
    data["_meta"]["prompt"] = _prompt_tag(GEN_PROMPT)
    f.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    return data


# ---------- 清单状态：生成结果 + 各节审核依次并入 ----------

class State:
    def __init__(self, gen: dict):
        meta = gen["_meta"]
        self.points, self.clauses = {}, {}
        self.problems: list[str] = []
        # 有的模型把子句混进点表（10-09 step-5 第 7 章 30 条）：按字段归位，不丢内容
        gen = {**gen, "points": gen.get("points") or [], "clauses": gen.get("clauses") or []}
        stray = [p for p in gen["points"] if "name" not in p and "to" in p]
        if stray:
            gen = {**gen, "points": [p for p in gen["points"] if p not in stray], "clauses": gen["clauses"] + stray}
            self.problems.append(f"生成：{len(stray)} 条子句混在点表里，已归入子句（{', '.join(c['id'] for c in stray[:5])}…）")
        bad_p = [p for p in gen["points"] if not (p.get("id") and p.get("name"))]
        bad_c = [c for c in gen["clauses"] if not (c.get("id") and c.get("to") and isinstance(c.get("from"), list))]
        if bad_p or bad_c:  # 缺关键字段的条目丢弃并记下（10-09 step-5 偶发）
            self.problems.append(f"生成：缺字段丢弃 点 {len(bad_p)}、子句 {len(bad_c)}：{json.dumps((bad_p + bad_c)[:3], ensure_ascii=False)[:300]}")
            gen = {**gen, "points": [p for p in gen["points"] if p not in bad_p],
                   "clauses": [c for c in gen["clauses"] if c not in bad_c]}
        for p in gen["points"]:
            self.points[p["id"]] = {"id": p["id"], "name": p["name"], "sentence": p.get("sentence", ""), "keys": p.get("keys", []),
                                    "scope": "前置" if p.get("scope") == "前置" else "范围内", "origin": "生成",
                                    "split_of": p.get("same_object") or None, "audits": [], "cautions": [],
                                    "gen": {"prompt": meta["prompt"], "model": meta["model"]}}
        for c in gen["clauses"]:
            self.clauses[c["id"]] = {"id": c["id"], "from": c["from"], "to": c["to"], "text": c.get("text", ""), "origin": "生成",
                                     "replaces": None, "audits": [],
                                     "gen": {"prompt": meta["prompt"], "model": meta["model"]}}
        self.np = 1 + max((int(k[1:]) for k in self.points if k[1:].isdigit()), default=0)
        self.nc = 1 + max((int(k[1:]) for k in self.clauses if k[1:].isdigit()), default=0)
        self.transcription: list[dict] = []
        self.skipped: dict[str, list[dict]] = {}  # 补漏时模型判为不讲点 / 路线的段落：{file: [{"lines", "reason"}]}
        self.mentions: list[dict] = []  # 书只提到、没讲的：{file, point（已有点 id 或 None）, name, quotes}——挂锚点，不立点、不写路线
        self.filled: set[str] = set()  # 做过补漏的节（v3 及以前的一次性补漏，没有逐段回应）
        self.asked: dict[str, set[tuple[int, int]]] = {}  # 补漏问过的段：{file: {(首行, 末行)}}
        self.responses: dict[str, dict[tuple[int, int], dict]] = {}  # 补漏的逐段回应：{file: {(首行, 末行): {seg, action, reason, refs[, bad]}}}
        self.summary: dict[str, set[int]] = {}  # 各节的小结 / 要点行（summary_lines）：来源改判的依据只在这些行里不算
        self.fill_stats: Counter = Counter()  # 补漏对账：答补但摘录不在本段（首答打回 / 追问后仍是）

    def listing(self) -> str:
        pts = [f"{p['id']} | {p['name']} | {p['sentence']} | {self._src(p)}" for p in self.points.values()]
        cls = [f"{c['id']} | {' + '.join(c['from'])} → {c['to']} | {c['text']} | {self._src(c)}" for c in self.clauses.values()]
        return ("点（id | 名字 | 一句话 | 来历）：\n" + "\n".join(pts) +
                "\n\n子句（id | 出发点 → 新点 | 话 | 来历）：\n" + "\n".join(cls))

    @staticmethod
    def _src(x: dict) -> str:
        got = [a["file"] for a in x["audits"] if a["kind"] in ("一致", "书给的")]
        if x["origin"] == "生成":
            return ("模型生成" + ("；前置" if x.get("scope") == "前置" else "")
                    + (f"；已在 {', '.join(got)} 判书给的" if got else ""))
        return f"回扫自 {x['origin']}" + ("" if got else "；书没走出关键一步（模型补的）")

    def merge(self, file: str, audit: dict, meta: dict, lines: list[str] | None = None) -> None:
        """lines：本节 M07 文件的行，用来核前置点改判的摘录（不给就不改判）。"""
        if "book_points" in audit or "book_routes" in audit:
            audit = _from_book_view(audit, meta.get("asks_missing_step", False))
        tag = {"prompt": meta["prompt"], "model": meta["model"], "file": file}
        self.problems += [f"{file}：{x}" for x in audit.get("problems", [])]
        for k in audit.get("skipped", []):
            if isinstance(k, dict):
                self.skipped.setdefault(file, []).append(k)
        tmp = {}
        # 学不到的点不并入：新点须有本输出里的路线指向它；只当出发点用的（书当作已知）照旧并入，有摘录的仍会在检查里报“学不到”
        targets = {b.get("to") for b in audit.get("book_clauses", [])}
        sources = {x for b in audit.get("book_clauses", []) for x in b.get("from", [])}
        rejected = set()
        for n in audit.get("new_points", []):
            if n["tmp"] not in targets and n["tmp"] not in sources:
                rejected.add(n["tmp"])
                self.problems.append(f"{file}：只提到未讲，未并入（摘录记作书只提到）：{n.get('name')}")
                self.mentions.append({"file": file, "point": None, "name": n.get("name", ""), "quotes": n.get("quotes", [])})
                continue
            pid = f"P{self.np}"; self.np += 1
            tmp[n["tmp"]] = pid
            split = n.get("split_of") if n.get("split_of") in self.points else None
            self.points[pid] = {"id": pid, "name": n["name"], "sentence": n["sentence"], "keys": n.get("keys", []),
                                "scope": "范围内" if n.get("quotes") else "前置", "origin": file, "split_of": split, "audits": [], "cautions": [],
                                "gen": tag}
            self.points[pid]["audits"].append({"file": file, "kind": "一致", "quotes": n.get("quotes", []),
                                               "note": n.get("note", ""), **tag})
        ref = lambda x: tmp.get(x, x)
        for p in audit.get("points", []):
            if p.get("_split_tmp") in rejected:  # 书的另一种定义只提到未讲：原点也不记“书的定义不同”
                continue
            if p.get("id") not in self.points:
                self.problems.append(f"{file}：审核提到清单里没有的点 {p.get('id')}")
                continue
            kind = "一致" if p.get("match") == "一致" else "书的定义不同"
            pt = self.points[p["id"]]
            pt["audits"].append({"file": file, "kind": kind, "quotes": p.get("quotes", []),
                                 "note": p.get("note", ""), **tag})
            # 前置点被本节当作书讲的点列出（一致、摘录核得到）：书在本章讲了它，改判范围内（10-09 v2：P4 吞了 3.2 讲的 RREF、从不审核）
            if pt["scope"] == "前置" and kind == "一致" and lines is not None:
                got = [ln for q in p.get("quotes", []) if (ln := locate_quote(lines, q)[0])]
                if got:
                    pt["scope"] = "范围内"
                    self.problems.append(f"{file}：前置点 {pt['id']}「{pt['name']}」本节书讲了（摘录核到第 {got[0]} 行），改判范围内")
        for c in audit.get("clauses", []):
            if c.get("id") not in self.clauses:
                self.problems.append(f"{file}：审核提到清单里没有的子句 {c.get('id')}")
                continue
            kind = c.get("verdict") if c.get("verdict") in ("书给的", "书没走出") else "零件"
            cl = self.clauses[c["id"]]
            note = c.get("note", "")
            # 已判模型补的（书没走出 / 零件）被这条“同一条”改判书给的：照改，但留痕（10-09 v3：C52 被 3.2:180 另一条路线静默翻成书给的）
            # 不改判的两种（10-10 v4：Strang 改判 5/7/11 条，C19 依据 3.4:344 小结，C10 在 3.2 先判没走、写了缺哪一步，补漏又判走了）：
            # 依据只落在本节小结 / 要点行；本节已有写了 missing_step 的“没走”判断（来源冲突）。这两种照挂锚点、记作书没走出
            prev = [a for a in cl["audits"] if a["kind"] in ("书没走出", "零件")]
            if kind == "书给的" and prev and not any(a["kind"] == "书给的" for a in cl["audits"]):
                got = [ln for q in c.get("quotes", []) if (ln := locate_quote(lines, q)[0])] if lines is not None else \
                    [q.get("line") for q in c.get("quotes", []) if isinstance(q.get("line"), int)]
                real = [ln for ln in got if ln not in self.summary.get(file, set())]
                nogo = [a for a in prev if a["file"] == file and a["kind"] == "书没走出" and a.get("missing_step")]
                route = f"路线「{(c.get('text') or '')[:50]}」"
                if got and not real:
                    kind = "书没走出"
                    note = (f"{note}；" if note else "") + f"依据只在本节小结 / 要点（第 {'、'.join(map(str, got))} 行），不算走出"
                    self.problems.append(f"{file}：来源未改判：{cl['id']} 判书给的的依据只在本节小结 / 要点"
                                         f"（第 {'、'.join(map(str, got))} 行），来源保持模型补的；{route}")
                elif real and nogo:
                    kind = "书没走出"
                    note = (f"{note}；" if note else "") + f"来源冲突：本节另判没走（缺{nogo[0]['missing_step'][:60]}）"
                    self.problems.append(f"{file}：来源冲突：{cl['id']} 走了（依据第 {'、'.join(map(str, real))} 行）"
                                         f" / 没走（缺{nogo[0]['missing_step'][:80]}），来源保持模型补的；{route}")
                elif real:
                    was = "、".join(a["file"] + " 判" + a["kind"] for a in prev)
                    self.problems.append(f"{file}：来源改判：{cl['id']} 由 模型补的（{was}）"
                                         f" → 书给的，依据第 {'、'.join(map(str, real))} 行；{route}")
            cl["audits"].append({"file": file, "kind": kind, "quotes": c.get("quotes", []), "note": note, **tag,
                                 **({"missing_step": c["missing_step"]} if c.get("missing_step") else {})})
        for b in audit.get("book_clauses", []):
            frm, to = [ref(x) for x in b.get("from", [])], ref(b.get("to", ""))
            bad = [x for x in frm + [to] if x not in self.points]
            if bad:
                self.problems.append(f"{file}：回扫子句 {b.get('tmp')} 用到不存在的点 {bad}，未并入")
                continue
            if to in frm:
                self.problems.append(f"{file}：回扫子句 {b.get('tmp')} 的出发点含新点自己（{to}），未并入")
                continue
            kind = "书没走出" if b.get("book_walks") is False else "书给的"
            if kind == "书没走出":  # 与已有书给的子句同出发点同新点（或出发点只多一个已有点）：不另立模型补的子句（10-09 v3：C53 与 C66 同到 P68）
                extra = lambda x: set(frm) - set(x["from"])
                dup = next((x for x in self.clauses.values() if x["to"] == to and set(x["from"]) <= set(frm)
                            and len(extra(x)) <= 1 and not extra(x) & set(tmp.values())
                            and any(a["kind"] == "书给的" for a in x["audits"])), None)
                if dup:
                    dup["audits"].append({"file": file, "kind": "书没走出", "quotes": b.get("quotes", []),
                                          "note": f"重复路线未并入：{b.get('text', '')}", **tag})
                    self.problems.append(f"{file}：重复路线未并入：{' + '.join(frm)} → {to}「{b.get('text', '')[:40]}」"
                                         f"与书给的 {dup['id']}（{' + '.join(dup['from'])} → {dup['to']}）重复，摘录挂到 {dup['id']}")
                    continue
            cid = f"C{self.nc}"; self.nc += 1
            rep = b.get("replaces") if b.get("replaces") in self.clauses else None
            self.clauses[cid] = {"id": cid, "from": frm, "to": to, "text": b["text"], "origin": file, "replaces": rep,
                                 "audits": [{"file": file, "kind": kind, "quotes": b.get("quotes", []), "note": b.get("note", ""), **tag,
                                             **({"missing_step": b["missing_step"]} if b.get("missing_step") else {})}],
                                 "gen": tag}
        for k in audit.get("cautions", []):
            pid = ref(k.get("point", ""))
            if pid in self.points:
                self.points[pid]["cautions"].append({"file": file, "text": k["text"], "quotes": k.get("quotes", [])})
        for t in audit.get("transcription_issues", []):
            self.transcription.append({"file": file, **t})
        for m in audit.get("mentions", []):
            if not isinstance(m, dict):
                continue
            pid = ref(m.get("point") or "")
            if pid and pid not in self.points:
                self.problems.append(f"{file}：书只提到的条目指向清单里没有的点 {m.get('point')}，按无点记")
            self.mentions.append({"file": file, "point": pid if pid in self.points else None,
                                  "name": m.get("name") or (self.points[pid]["name"] if pid in self.points else ""),
                                  "quotes": m.get("quotes", [])})


def _from_book_view(a: dict, step_rule: bool = False) -> dict:
    """审核提示词按“从书出发”输出（book_points / book_routes / parts）→ 并入用的形状（points / new_points / clauses / book_clauses）。
    step_rule：这份输出的提示词要求了 missing_step（v4 起；旧输出没被要求，不按它改判）。"""
    out = {"points": [], "new_points": [], "clauses": [], "book_clauses": [], "skipped": a.get("skipped", []),
           "cautions": a.get("cautions", []), "transcription_issues": a.get("transcription_issues", []),
           "mentions": a.get("mentions", []), "problems": []}
    n = 0
    for p in a.get("book_points", []):
        if p.get("id"):
            out["points"].append({"id": p["id"], "match": p.get("match", "一致"), "quotes": p.get("quotes", []),
                                  "note": p.get("note", "")})
            continue
        n += 1
        out["new_points"].append({"tmp": p.get("tmp") or f"_N{n}", "name": p.get("name", ""), "sentence": p.get("sentence", ""),
                                  "keys": p.get("keys", []), "quotes": p.get("quotes", []),
                                  "split_of": p.get("split_of") if p.get("match") == "书的定义不同" else None,
                                  "note": p.get("note", "")})
        if p.get("split_of") and p.get("match") == "书的定义不同":
            out["points"].append({"id": p["split_of"], "match": "书的定义不同", "quotes": [],
                                  "note": f"书按另一种定义讲：{p.get('name', '')}",
                                  "_split_tmp": out["new_points"][-1]["tmp"]})
    for k, r in enumerate(a.get("book_routes", []), 1):
        # 书没在本节走出关键一步（只给结论 / 只在小结要点里 / 关键一步是模型补的）：来源记模型补的，锚点照挂；
        # 须写出缺的是哪一步（missing_step），没写的按书给的记并留痕（10-09 v3：判“没走”的 14 条里 5 条书在本节别处走完了）
        walks = r.get("book_walks") not in (False, "false")
        step = str(r.get("missing_step") or "").strip()
        note = r.get("note", "")
        if not walks and not step and step_rule:
            walks = True
            out["problems"].append(f"路线「{r.get('text', '')[:40]}」book_walks=false 却没写缺哪一步（missing_step），按书给的记")
        elif not walks and step:
            note = (f"{note}；" if note else "") + f"书没走出：{step}"
        if r.get("same_as"):
            out["clauses"].append({"id": r["same_as"], "verdict": "书给的" if walks else "书没走出", "quotes": r.get("quotes", []),
                                   "note": note, "text": r.get("text", ""), "missing_step": "" if walks else step})
        else:
            out["book_clauses"].append({"tmp": f"B{k}", "from": r.get("from", []), "to": r.get("to", ""),
                                        "text": r.get("text", ""), "replaces": None, "quotes": r.get("quotes", []),
                                        "note": note, "book_walks": walks, "missing_step": "" if walks else step})
    for c in a.get("parts", []):
        out["clauses"].append({"id": c.get("id"), "verdict": "零件", "quotes": c.get("quotes", []), "note": c.get("note", "")})
    return out


def audit_all(book: Path, work: Path, st: State, secs: list[dict], model: str, call: bool, fill: bool) -> None:
    """逐节：审核 → 并入 → （fill）算本节没覆盖的段落，有就补漏 → 并入。call=False 只读已有结果（build）。"""
    system = AUDIT_PROMPT.read_text(encoding="utf-8")
    blocks = Blocks(book)
    for s in secs:
        stem = s["file"].replace("/", "_").removesuffix(".md")
        sec_lines = (book / "m07" / s["file"]).read_text(encoding="utf-8").splitlines()
        st.summary[s["file"]] = summary_lines(sec_lines, s["title"], blocks.codes(_pdf_range(sec_lines[0])))
        f = work / f"audit-{stem}.json"
        data, bad = None, None
        if f.exists():
            data = json.loads(f.read_text(encoding="utf-8"))
            bad = _need_audit(data)
            if bad and call:  # 已有输出结构不合格（旧版本没校验时收下的）：删掉重审，本节补漏依赖审核结果，一并重做
                print(f"  audit-{stem}: 已有输出结构不合格（{bad}），删掉重审（连带本节补漏）", file=sys.stderr, flush=True)
                for g in [f, work / f"audit-{stem}.raw.txt", *_fill_files(work, stem)]:
                    g.unlink(missing_ok=True)
                data, bad = None, None
        if data is None and call:
            lines, end = section_text(book, s["file"])
            body = "\n".join(f"{i}\t{l}" for i, l in enumerate(lines[:end], 1))
            user = (f"## 清单\n\n{st.listing()}\n\n## 教材原文：{book.name}，{s['number']} {s['title']}"
                    f"（M07 文件 {s['file']}，习题未给出）\n\n{body}\n")
            print(f"审核 {s['file']} ……", file=sys.stderr, flush=True)
            data = _call(work, f"audit-{stem}", model, system, user, _need_audit)
            data["_meta"]["prompt"] = _prompt_tag(AUDIT_PROMPT)
            data["_meta"]["asks_missing_step"] = "missing_step" in system  # 合并时据此决定“false 没写缺哪一步”是否按书给的记
            f.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
        if data is None:
            continue
        if bad:
            st.problems.append(f"{s['file']}：审核输出结构不合格（{bad}；键 {sorted(k for k in data if k != '_meta')}），"
                               "未并入；run 时会删掉重审")
        else:
            st.merge(s["file"], data, data["_meta"], sec_lines)
        if fill:
            fill_section(book, work, st, s, stem, model, system, call)


FILL_BATCH = 15  # 补漏一次最多给的段数：一次给太多段时模型每点只引一行、相邻段没人回应（10-09 v3：补漏未回应 23 → 40）


def _fill_files(work: Path, stem: str) -> list[Path]:
    return [*work.glob(f"fill-{stem}.*"), *work.glob(f"fill-{stem}-*")]


def fill_section(book: Path, work: Path, st: State, s: dict, stem: str, model: str, system: str, call: bool) -> None:
    """补漏：审核后本节没有任何核过的摘录落进来的段落（只记了“只提到”的也算：可能书在后面接着讲了）编号 S1、S2…，
    给整节原文、标出这些段，逐段作答（系统提示同审核，说明在 m08_fill.md）。段表存 fill-<stem>.plan.json；
    段多于 FILL_BATCH 分批（fill-<stem>-1、-2…，按序并入，后一批看得到前一批补进来的条目）；每批核对每段都有回应，
    缺的段只给缺的再问 1 次（<批>-re），仍缺的在段落覆盖里记“补漏未回应”。答“补”而本输出没有一条核得到的摘录落在这段里的，
    同样算没回应、一起追问（注明摘录须取自这一段），追问后仍是这样记“补漏未回应：答补但摘录不在本段”。"""
    file = s["file"]
    all_lines = (book / "m07" / file).read_text(encoding="utf-8").splitlines()
    plan_f = work / f"fill-{stem}.plan.json"
    old = work / f"fill-{stem}.json"
    if old.exists() and not plan_f.exists():  # v3 及以前：一次补漏、没有逐段回应（跳过理由在 skipped）
        data = json.loads(old.read_text(encoding="utf-8"))
        if bad := _need_audit(data):
            st.problems.append(f"{file}：补漏输出结构不合格（{bad}），未并入")
            return
        st.filled.add(file)
        st.merge(file, data, data["_meta"], all_lines)
        return
    if plan_f.exists():
        segs = json.loads(plan_f.read_text(encoding="utf-8"))["segs"]
    else:
        if not call:
            return
        miss = [b for b in coverage(book, st, file) if not b["covered"]]
        if not miss:
            return
        segs = [{"seg": f"S{k}", "lines": b["lines"], "head": b["head"], "mention": b.get("mention", "")}
                for k, b in enumerate(miss, 1)]
        plan_f.write_text(json.dumps({"segs": segs}, ensure_ascii=False, indent=1), encoding="utf-8")
    nb = -(-len(segs) // FILL_BATCH)
    size = -(-len(segs) // nb)
    batches = [segs[i:i + size] for i in range(0, len(segs), size)]
    for k, batch in enumerate(batches, 1):
        label = f"fill-{stem}" if nb == 1 else f"fill-{stem}-{k}"
        data = _fill_call(book, work, st, s, label, model, system, batch, f"第 {k} / {nb} 批" if nb > 1 else "", call)
        if data is None:  # build：这一批还没跑
            return
        left = _merge_fill(st, file, data, batch, all_lines)
        if left:
            far = [b["seg"] for b in left if b.get("why")]
            if far:
                st.fill_stats["答补但摘录不在本段·打回追问"] += len(far)
                st.problems.append(f"{file}：{label} 答补但摘录不在本段 {len(far)} 段（{'、'.join(far)}），追问")
            print(f"  {label}: {len(left)} 段没有回应（{'、'.join(b['seg'] for b in left)}），只给这些段再问一次",
                  file=sys.stderr, flush=True)
            again = _fill_call(book, work, st, s, f"{label}-re", model, system, left, "追问：上次没回应的段", call)
            if again is not None:
                still = [b["seg"] for b in _merge_fill(st, file, again, left, all_lines) if b.get("why")]
                if still:
                    st.fill_stats["答补但摘录不在本段·追问后仍是"] += len(still)
                    st.problems.append(f"{file}：{label}-re 追问后仍答补但摘录不在本段 {len(still)} 段（{'、'.join(still)}）")


def _fill_call(book: Path, work: Path, st: State, s: dict, label: str, model: str, system: str,
               batch: list[dict], note: str, call: bool) -> dict | None:
    f = work / f"{label}.json"
    if f.exists():
        data = json.loads(f.read_text(encoding="utf-8"))
        if not (bad := _need_fill(data)):
            return data
        if not call:
            st.problems.append(f"{s['file']}：{label} 输出结构不合格（{bad}），未并入")
            return None
        f.unlink()
        (work / f"{label}.raw.txt").unlink(missing_ok=True)
    if not call:
        return None
    lines, end = section_text(book, s["file"])
    starts = {b["lines"][0]: b for b in batch}
    body = []
    for i, l in enumerate(lines[:end], 1):
        if i in starts:
            b = starts[i]
            body.append(f"【{b['seg']}：第 {b['lines'][0]}–{b['lines'][1]} 行】")
        body.append(f"{i}\t{l}")
    segs = "\n".join(f"- {b['seg']}：第 {b['lines'][0]}–{b['lines'][1]} 行 · “{b['head']}”"
                     + (f"（审核记为只提到：{b['mention']}）" if b.get("mention") else "")
                     + (f"（{b['why']}）" if b.get("why") else "") for b in batch)
    user = (f"## 清单\n\n{st.listing()}\n\n## 教材原文：{book.name}，{s['number']} {s['title']}"
            f"（M07 文件 {s['file']}，习题未给出；整节给出供查上下文）\n\n" + "\n".join(body)
            + f"\n\n## 要逐段作答的段落（{len(batch)} 段{'；' + note if note else ''}）\n\n{segs}\n\n"
            + FILL_NOTE.read_text(encoding="utf-8"))
    print(f"补漏 {s['file']} {label}（{len(batch)} 段）……", file=sys.stderr, flush=True)
    data = _call(work, label, model, system, user, _need_fill)
    data["_meta"]["prompt"] = f"{_prompt_tag(AUDIT_PROMPT)}+{_prompt_tag(FILL_NOTE)}"
    data["_meta"]["asks_missing_step"] = "missing_step" in system
    f.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    return data


_FAR = "上次答“补”，但摘录不在这一段：摘录须取自这一段"


def _out_quote_lines(data: dict, lines: list[str]) -> set[int]:
    """一份审核 / 补漏输出里讲的内容（点、路线、零件、别混淆；不含只提到 mentions）的摘录核得到的行。"""
    keys = ("book_points", "book_routes", "parts", "cautions", "points", "new_points", "clauses", "book_clauses")
    return {ln for k in keys for x in (data.get(k) or []) if isinstance(x, dict) for q in (x.get("quotes") or [])
            if isinstance(q, dict) and (ln := locate_quote(lines, q)[0])}


def _merge_fill(st: State, file: str, data: dict, batch: list[dict], lines: list[str]) -> list[dict]:
    """记逐段回应、并入补的内容；返回没有回应的段：没回应的，和答“补”却没有一条讲的内容的摘录（只提到的不算）核得到落在这段里的
    （10-10 v4：Stewart 三遍 15/35/18 段答补、摘录引到别的段；后者带 why，追问时注明）。"""
    ids = {b["seg"]: b for b in batch}
    got, far = set(), set()
    hit = _out_quote_lines(data, lines)
    for r in data.get("responses", []):
        sid = str(r.get("seg", "")).strip() if isinstance(r, dict) else ""
        if sid not in ids:
            st.problems.append(f"{file}：补漏回应了没给的段 {sid or r}")
            continue
        a, z = ids[sid]["lines"]
        rec = {"seg": sid, "action": str(r.get("action", "")).strip(), "reason": str(r.get("reason", "")).strip(),
               "refs": r.get("refs") or []}
        if "补" in rec["action"] and not any(a <= ln <= z for ln in hit):
            rec["bad"] = "答补但摘录不在本段"
            far.add(sid)
        else:
            got.add(sid)
            far.discard(sid)
        old = st.responses.setdefault(file, {}).get((a, z))
        if not rec.get("bad") or not old or old.get("bad"):  # 追问的回应还是答补而摘录不在本段时，不盖掉同一输出里先给的合格回应
            st.responses[file][(a, z)] = rec
    st.asked.setdefault(file, set()).update(tuple(b["lines"]) for b in batch)
    st.merge(file, data, data["_meta"], lines)
    return [{**b, "why": _FAR} if b["seg"] in far else b for b in batch if b["seg"] not in got]


# ---------- 合并：核锚点、定来源、写 jsonl ----------

def _cov_counts(blocks: list[dict]) -> dict:
    """段落块分类计数：覆盖 / 跳过·例题 / 跳过·图表 / 跳过·其他 / 只提到 / 真缺口，另计总块数与真缺口里的补漏未回应。"""
    n = Counter(b.get("class") or _cov_class(b) for b in blocks)
    return {"块": len(blocks), **{k: n[k] for k in COV_CLASSES}, "补漏未回应": sum(bool(b.get("no_reply")) for b in blocks)}


def _cov_line(c: dict) -> str:
    sk = c["跳过·例题"] + c["跳过·图表"] + c["跳过·其他"]
    return (f"覆盖 {c['覆盖']} / {c['块']}" + (f"（{c['覆盖'] / c['块']:.0%}）" if c["块"] else "")
            + f"；跳过 {sk}（例题 {c['跳过·例题']}、图表 {c['跳过·图表']}、其他 {c['跳过·其他']}）；只提到 {c['只提到']}"
            + f"；真缺口 {c['真缺口']}（其中补漏未回应 {c['补漏未回应']}）")


def build(book: Path, out: Path, st: State, secs: list[dict]) -> dict:
    blocks = Blocks(book)
    cache: dict[str, tuple[list[str], tuple[int, int] | None]] = {}
    stats = Counter()
    dropped = []

    def anchors(audits: list[dict], kinds: set[str]) -> list[dict]:
        res = []
        for a in audits:
            if a["kind"] not in kinds:
                continue
            if a["file"] not in cache:
                lines = (book / "m07" / a["file"]).read_text(encoding="utf-8").splitlines()
                cache[a["file"]] = (lines, _pdf_range(lines[0]))
            lines, pages = cache[a["file"]]
            for q in a.get("quotes", []):
                line, how = locate_quote(lines, q)
                stats["摘录:" + how] += 1
                if line is None:
                    dropped.append(f"{a['file']} 第 {q.get('line')} 行：“{q.get('text', '')[:80]}”")
                    continue
                anc = {"book": book.name, "file": a["file"], "quote": q["text"], "line": line}
                if pos := blocks.find_line(lines, line, q["text"], pages) or blocks.find(q["text"], pages):
                    anc["page"], anc["bbox"] = pos
                    stats["原件位置:找到"] += 1
                else:
                    stats["原件位置:没对上"] += 1
                res.append(anc)
        return res

    points, clauses = [], []
    for p in st.points.values():
        anc = anchors(p["audits"], {"一致"})
        diff = [a for a in p["audits"] if a["kind"] == "书的定义不同"]
        if anc:
            src = "书给的"
        elif p["scope"] == "前置" and not diff:
            src = "未审"
        else:
            src = "模型补的"
        rec = {"id": p["id"], "name": p["name"], "sentence": p.get("sentence", ""), "anchors": anc, "source": src,
               "keys": p["keys"], "scope": p["scope"]}
        if p["split_of"]:
            rec["split_of"] = p["split_of"]
        if diff:
            rec["book_differs"] = [{"file": a["file"], "note": a["note"]} for a in diff]
        cautions = []
        for k in p["cautions"]:
            ca = anchors([{"file": k["file"], "kind": "c", "quotes": k["quotes"]}], {"c"})
            cautions.append({"text": k["text"], "anchors": ca})
        if cautions:
            rec["cautions"] = cautions
        ment = anchors([{"file": m["file"], "kind": "m", "quotes": m["quotes"]} for m in st.mentions if m["point"] == p["id"]], {"m"})
        if ment:
            rec["mentions"] = ment  # 书在别处只提到它（没讲）：只作线索，不改来源
        rec["gen"] = p["gen"]
        rec["audit"] = sorted({f"{a['prompt']} · {a['model']}" for a in p["audits"]}) or ["未经审核"]
        points.append(rec)
    for c in st.clauses.values():
        book_anc = anchors(c["audits"], {"书给的"})
        part_anc = anchors(c["audits"], {"零件", "书没走出"})
        src = "书给的" if book_anc else "模型补的"
        rec = {"id": c["id"], "from": c["from"], "to": c["to"], "text": c["text"],
               "anchors": book_anc if book_anc else part_anc, "source": src}
        if c["replaces"]:
            rec["replaces"] = c["replaces"]
        notes = [f"{a['file']}：{a['note']}" for a in c["audits"] if a.get("note")]
        if notes:
            rec["notes"] = notes
        rec["gen"] = c["gen"]
        rec["audit"] = sorted({f"{a['prompt']} · {a['model']}" for a in c["audits"]}) or ["未经审核"]
        clauses.append(rec)
    with (out / "points.jsonl").open("w", encoding="utf-8") as f:
        f.writelines(json.dumps(p, ensure_ascii=False) + "\n" for p in points)
    with (out / "clauses.jsonl").open("w", encoding="utf-8") as f:
        f.writelines(json.dumps(c, ensure_ascii=False) + "\n" for c in clauses)
    cov = {s["file"]: {"number": s["number"], "title": s["title"], "blocks": coverage(book, st, s["file"])} for s in secs}
    for c in cov.values():
        c["classes"] = _cov_counts(c["blocks"])
    loose = [{"name": m["name"], "anchors": anchors([{"file": m["file"], "kind": "m", "quotes": m["quotes"]}], {"m"})}
             for m in st.mentions if not m["point"]]
    extra = {"stats": dict(stats), "dropped": dropped, "problems": st.problems, "transcription": st.transcription,
             "coverage": cov, "coverage_classes": _cov_counts([b for c in cov.values() for b in c["blocks"]]),
             "fill_stats": dict(st.fill_stats), "mentions": loose,
             "mentions_on_points": sum(1 for m in st.mentions if m["point"])}
    (out / "work" / "build.json").write_text(json.dumps(extra, ensure_ascii=False, indent=1), encoding="utf-8")
    return extra


# ---------- 检查 ----------

def _cycles(points: dict, clauses: list[dict]) -> list[list[str]]:
    """强连通分量（> 1 个点）：子句出发点 → 新点 构成的有向图。"""
    g = defaultdict(set)
    for c in clauses:
        for f in c["from"]:
            g[f].add(c["to"])
    idx, low, stack, on, out, n = {}, {}, [], set(), [], [0]

    def dfs(v):
        idx[v] = low[v] = n[0]; n[0] += 1; stack.append(v); on.add(v)
        for w in g[v]:
            if w not in idx:
                dfs(w); low[v] = min(low[v], low[w])
            elif w in on:
                low[v] = min(low[v], idx[w])
        if low[v] == idx[v]:
            comp = []
            while True:
                w = stack.pop(); on.discard(w); comp.append(w)
                if w == v:
                    break
            if len(comp) > 1:
                out.append(sorted(comp))
    sys.setrecursionlimit(10000)
    for v in list(points):
        if v not in idx:
            dfs(v)
    return out


def check(out: Path, seed: int = 7) -> str:
    pts = {p["id"]: p for p in map(json.loads, (out / "points.jsonl").read_text(encoding="utf-8").splitlines())}
    cls = [json.loads(l) for l in (out / "clauses.jsonl").read_text(encoding="utf-8").splitlines()]
    extra = json.loads((out / "work" / "build.json").read_text(encoding="utf-8"))
    L = ["# M08 产出检查（程序）", ""]
    ps, cs = Counter(p["source"] for p in pts.values()), Counter(c["source"] for c in cls)
    origin_c = Counter("回扫补入" if c.get("gen", {}).get("file") else "生成" for c in cls)
    walked_not = sum(1 for c in cls if c.get("gen", {}).get("file") and c["source"] == "模型补的")
    L += [f"- 点 {len(pts)}：" + "，".join(f"{k} {v}" for k, v in ps.most_common())
          + f"；范围内 {sum(p['scope'] == '范围内' for p in pts.values())}，前置 {sum(p['scope'] == '前置' for p in pts.values())}",
          f"- 子句 {len(cls)}：" + "，".join(f"{k} {v}" for k, v in cs.most_common())
          + "；来历：" + "，".join(f"{k} {v}" for k, v in origin_c.most_common())
          + f"（回扫补入里书没走出关键一步、记模型补的 {walked_not}）",
          f"- 生成的子句被判书给的：{sum(1 for c in cls if c['source'] == '书给的' and not c.get('gen', {}).get('file'))}"
          f" / {origin_c['生成']}",
          "- 摘录核对：" + "，".join(f"{k.split(':')[1]} {v}" for k, v in sorted(extra["stats"].items()) if k.startswith("摘录")),
          "- 原件位置：" + "，".join(f"{k.split(':')[1]} {v}" for k, v in sorted(extra["stats"].items()) if k.startswith("原件")),
          f"- 并入时的问题 {len(extra['problems'])}；丢弃的摘录 {len(extra['dropped'])}；疑似转录错误 {len(extra['transcription'])}",
          f"- 书只提到、没讲：挂在已有点上 {extra.get('mentions_on_points', 0)}，不对应点 {len(extra.get('mentions', []))}"]
    cov = extra.get("coverage") or {}
    fs = extra.get("fill_stats") or {}
    L += ["- 段落覆盖：" + _cov_line(_cov_counts([b for c in cov.values() for b in c["blocks"]]))
          + (f"；补漏答补但摘录不在本段：打回追问 {fs.get('答补但摘录不在本段·打回追问', 0)}，"
             f"追问后仍是 {fs.get('答补但摘录不在本段·追问后仍是', 0)}" if fs else ""), ""]
    missing = sorted({f for c in cls for f in c["from"] + [c["to"]] if f not in pts})
    self_loop = [c["id"] for c in cls if c["to"] in c["from"]]
    used = {f for c in cls for f in c["from"]} | {c["to"] for c in cls}
    orphan = [p for p in pts.values() if p["id"] not in used]
    into = Counter(c["to"] for c in cls)
    no_route = [p for p in pts.values() if p["scope"] == "范围内" and not into[p["id"]]]
    dup = [n for n, k in Counter(p["name"] for p in pts.values()).items() if k > 1]
    dup_clause = [k for k, v in Counter((tuple(sorted(c["from"])), c["to"]) for c in cls).items() if v > 1]
    long_p = [p for p in pts.values() if len(p["sentence"]) > 90]
    long_c = [c for c in cls if len(c["text"]) > 140]
    cyc = _cycles(pts, cls)
    book_no_anchor = [c["id"] for c in cls if c["source"] == "书给的" and not c["anchors"]]
    L += ["## 结构", "",
          f"- 子句引用了不存在的点：{missing or '无'}",
          f"- 出发点含新点自己：{self_loop or '无'}",
          f"- 孤立点（不在任何子句里）{len(orphan)}：" + ("、".join(f"{p['id']}「{p['name']}」" for p in orphan) or "无"),
          f"- 范围内却没有进入它的子句（学不到）{len(no_route)}：" + ("、".join(f"{p['id']}「{p['name']}」" for p in no_route) or "无"),
          f"- 重名的点：{dup or '无'}",
          f"- 出发点与新点完全相同的重复子句：{len(dup_clause)} 组" + (f"（{dup_clause[:10]}）" if dup_clause else ""),
          f"- 环（强连通分量，> 1 点）{len(cyc)}：" + ("；".join(" ".join(x) for x in cyc) or "无"),
          f"- 书给的子句没有锚点：{book_no_anchor or '无'}",
          f"- 句子偏长：点 > 90 字 {len(long_p)}，子句 > 140 字 {len(long_c)}；"
          f"子句字数中位数 {sorted(len(c['text']) for c in cls)[len(cls) // 2] if cls else 0}", ""]
    groups = defaultdict(set)  # 同一对象：split_of 链 + 名字括号前相同（生成时按定义拆的点没有显式标记，按名字归组，只作检查线索）
    for p in pts.values():
        if p.get("split_of") in pts:
            groups[p["split_of"]].update({p["split_of"], p["id"]})
    by_name = defaultdict(list)
    for p in pts.values():
        by_name[re.split(r"[（(]", p["name"])[0].strip()].append(p["id"])
    for ids in by_name.values():
        if len(ids) > 1:
            groups[ids[0]].update(ids)
    L += ["## 同一对象多定义（拆成的点 · 彼此之间的子句）", ""]
    for g in groups.values():
        g = sorted(g, key=lambda x: int(x[1:]) if x[1:].isdigit() else 0)
        links = [c["id"] for c in cls if c["to"] in g and set(c["from"]) & set(g)]
        L.append("- " + "、".join(f"{x}「{pts[x]['name']}」（{pts[x]['source']}）" for x in g)
                 + f"；互推子句 {links or '无'}")
    differ = [p for p in pts.values() if p.get("book_differs")]
    if differ:
        L += ["", "书按另一种定义讲（书的点另列；生成的那个点自己有核过的“一致”摘录仍是书给的，没有才是模型补的）："]
        L += [f"- {p['id']}「{p['name']}」（{p['source']}）：" + "；".join(d["note"][:80] for d in p["book_differs"]) for p in differ]
    L += ["", "## 抽样核对锚点（随机 12 条，程序已核在所标行，人工 / 审查代理再看意思对不对）", ""]
    allanc = [(x["id"], a) for x in list(pts.values()) + cls for a in x["anchors"]]
    for xid, a in random.Random(seed).sample(allanc, min(12, len(allanc))):
        L.append(f"- {xid} · {a['file']}:{a['line']} · PDF {a.get('page', '?')} · “{a['quote'][:100]}”")
    if cov:
        L += ["", "## 段落覆盖（本节正文切成段落块，块内落有任何核过的摘录算覆盖；切块规则见 m08.py section_blocks；"
              "跳过按理由关键词粗分，见 _SKIP_KINDS）", ""]
        for f, c in cov.items():
            L.append(f"- {c['number']} {f}：" + _cov_line(_cov_counts(c["blocks"])))
        miss = [(f, b) for f, c in cov.items() for b in c["blocks"] if not b["covered"]]
        if miss:
            L += ["", "未覆盖的块（行范围 · 分类 · 开头 · 模型的回应：补漏逐段回应 / 跳过理由 / 书只提到 / 补漏未回应），真缺口在前：", ""]
            miss.sort(key=lambda x: (x[1].get("class") or _cov_class(x[1])) != "真缺口")
            L += [f"- {f}:{b['lines'][0]}–{b['lines'][1]} · {b.get('class') or _cov_class(b)} · {b['head']}"
                  + (f" · 回应 {b['reply'][:90]}" if b.get("reply") else "")
                  + (f" · 跳过：{b['skip'][:80]}" if b.get("skip") else "")
                  + (f" · 只提到：{b['mention'][:80]}" if b.get("mention") else "")
                  + (f" · **补漏未回应：{b['no_reply'] if isinstance(b['no_reply'], str) else '没有回应'}**" if b.get("no_reply") else "")
                  for f, b in miss]
    if extra.get("mentions"):
        L += ["", "## 书只提到、没讲（不对应清单的点；只挂锚点，不立点）", ""]
        L += [f"- {m['name']}：" + ("；".join(f"{a['file']}:{a['line']} “{a['quote'][:60]}”" for a in m["anchors"]) or "摘录没核到")
              for m in extra["mentions"]]
    if extra["problems"]:
        L += ["", "## 并入时的问题", ""] + [f"- {x}" for x in extra["problems"]]
    if extra["dropped"]:
        L += ["", "## 丢弃的摘录（回原文找不到）", ""] + [f"- {x}" for x in extra["dropped"]]
    if extra["transcription"]:
        L += ["", "## 疑似转录错误（审核报的，未核实）", ""]
        L += [f"- {t['file']}:{t.get('line')} “{t.get('text', '')[:60]}” → “{t.get('should_be', '')[:60]}”（{t.get('reason', '')[:60]}）"
              for t in extra["transcription"]]
    text = "\n".join(L) + "\n"
    (out / "report.md").write_text(text, encoding="utf-8")
    return text


# ---------- 命令行 ----------

def main(argv=None):
    ap = argparse.ArgumentParser(description="M08：点 + 子句，先生成后回扫")
    ap.add_argument("cmd", choices=["run", "build", "check"])
    ap.add_argument("--book", type=Path)
    ap.add_argument("--chapter", help="章号（按 m07/index.md）")
    ap.add_argument("--subject", default="线性代数")
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--model", default="sonnet")
    ap.add_argument("--effort", default=EFFORT, help="claude -p 的思考强度（low / medium / high / xhigh / max）")
    ap.add_argument("--redo", choices=["gen", "audit"], action="append", default=[])
    ap.add_argument("--no-fill", action="store_true", help="不做补漏（对照用；build 时也不并入已有的补漏结果）")
    a = ap.parse_args(argv)
    globals()["EFFORT"] = a.effort
    work = a.out / "work"
    work.mkdir(parents=True, exist_ok=True)
    if a.cmd in ("run", "build"):
        if not a.book or not a.chapter:
            raise SystemExit("run / build 要 --book 与 --chapter")
        scope, secs, before = chapter_scope(a.book, a.chapter)
        olds = lambda *ks: [f for k in ks for f in [*work.glob(f"{k}-*.json"), *work.glob(f"{k}-*.raw.txt")]]
        if "gen" in a.redo:
            for f in [work / "gen.json", work / "gen.raw.txt"]:
                f.unlink(missing_ok=True)
            for f in olds("audit", "fill"):  # 清单变了，各节审核与补漏都要重做
                f.unlink()
        if "audit" in a.redo:
            for f in olds("audit", "fill"):
                f.unlink()
        if a.cmd == "build" and not (work / "gen.json").exists():
            raise SystemExit("还没有生成结果：先 run")
        gen = generate(work, scope, secs, before, a.subject, a.model, call=a.cmd == "run")
        st = State(gen)
        audit_all(a.book, work, st, secs, a.model, call=a.cmd == "run", fill=not a.no_fill)
        build(a.book, a.out, st, secs)
    print(check(a.out))


if __name__ == "__main__":
    main()
