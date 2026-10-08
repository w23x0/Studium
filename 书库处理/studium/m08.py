"""M07 → M08：点 + 子句，先生成、后回扫（M08 审查单「点与子句」「点与子句的生成」）。

    python3 -m studium.m08 run   --book <书目录> --chapter 3 --out <产出目录> [--model opus]
    python3 -m studium.m08 build --book <书目录> --chapter 3 --out <产出目录>     # 只重做程序部分（合并、核锚点、写 jsonl）
    python3 -m studium.m08 check --out <产出目录>                                # 只重出质量报告

流程（一章）：
1. 生成（模型，1 次）：只给学科、范围（章名 + 节名）与本书此前各章的标题，不给原文；模型凭自身知识写点与子句。
2. 审核 + 回扫（模型，每节 1 次，按书中顺序串行）：给当前清单（生成的 + 前面各节补进来的）与本节正文（不含习题），
   判点落位、子句书给的 / 零件，补书有清单没有的点与路线，记“别混淆”与疑似转录错误。每节结果落盘后再审下一节。
3. 合并（程序）：摘录逐条回原文核对（规整写法后须在所标行附近找到，否则全文找，再找不到就丢弃并记下）；
   核过的摘录对到 MinerU content_list 的块，得到原件 PDF 页与位置框；来源标签：
   点——有核过的摘录且判“一致”，或是回扫补入的书的点 = 书给的；范围内其余 = 模型补的；前置点本章没讲到 = 未审（不在本次处理的范围里，没对原文审过）。
   子句——某节判书给的且有核过的摘录，或回扫补入的书的路线 = 书给的；其余 = 模型补的（零件摘录照样挂上）。
4. 检查（程序）：来源比例、锚点核对、孤立点、环、缺出发点、句子长短等，写 report.md。

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
STOP_HEADINGS = re.compile(r"^#+\s*(Problem Set|Challenge Problems)\b", re.I)  # 习题不进审核：只审书的讲解路线


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
    secs = [r for r in rows if r["kind"] == "sec" and r["number"].split(".")[0] == chapter and r["file"]]
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
    end = next((i for i, l in enumerate(lines) if STOP_HEADINGS.match(l)), len(lines))
    return lines, end


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
    text = q.get("text", "")
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

class Blocks:
    def __init__(self, book: Path):
        src = json.loads((book / "source.json").read_text(encoding="utf-8"))
        self.blocks = []  # (pdf_page, bbox, norm_text)
        for part, info in src["parts"].items():
            cls = [f for f in glob.glob(str(book / part / "*_content_list.json")) if not f.endswith("_v2.json")]
            for x in json.loads(Path(cls[0]).read_text(encoding="utf-8")):
                t = x.get("text") or "\n".join(x.get("list_items", []) or []) or x.get("table_body", "") or ""
                if t:
                    self.blocks.append((info["first_page"] + x.get("page_idx", 0), x.get("bbox"), norm(t)))

    def find(self, quote: str, pages: tuple[int, int] | None) -> tuple[int, list] | None:
        pcs = _pieces(quote)
        if not pcs:
            return None
        lo, hi = pages or (0, 10 ** 6)
        cand = [b for b in self.blocks if lo - 1 <= b[0] <= hi + 1]
        head = pcs[0][:40]
        for k, (pg, box, t) in enumerate(cand):
            if head in t:
                return pg, box
            nxt = cand[k + 1][2] if k + 1 < len(cand) else ""
            if head in t + nxt and head[:12] in t:  # 摘录跨两块：取起始块
                return pg, box
        return None


# ---------- 模型调用 ----------

def _json(text: str) -> dict:
    t = text.strip()
    if t.startswith("```"):
        t = t.split("\n", 1)[1].rsplit("```", 1)[0]
    a, z = t.find("{"), t.rfind("}")
    return json.loads(t[a:z + 1])


EFFORT = "high"  # 审核与回扫要逐段对照、判同一条路线：默认强度下 Sonnet 几乎不思考，回扫漏得多（10-08 第 3 章试跑）


def _call(work: Path, label: str, model: str, system: str, user: str) -> dict:
    os.environ.setdefault("CLAUDE_CODE_MAX_OUTPUT_TOKENS", "64000")  # 一章的清单输出可能超过默认上限
    res = llm.call(model, system, user, timeout=3600, effort=EFFORT)
    stamp = dt.datetime.now().isoformat(timespec="seconds")
    with (work / "calls.log").open("a", encoding="utf-8") as f:
        f.write(f"{stamp}\t{label}\tmodel={res.model}\tin={res.input_tokens}\tcache_read={res.cache_read}\t"
                f"out={res.output_tokens}\treq={res.requests}\t{res.seconds:.0f}s\teffort={EFFORT}\n")
    (work / f"{label}.raw.txt").write_text(res.text, encoding="utf-8")
    print(f"  {label}: {res.model} in={res.input_tokens} out={res.output_tokens} {res.seconds:.0f}s", file=sys.stderr, flush=True)
    data = _json(res.text)
    data["_meta"] = {"model": f"{res.model}（effort {EFFORT}）", "at": stamp}
    return data


def generate(work: Path, scope: str, secs: list[dict], before: list[str], subject: str, model: str) -> dict:
    f = work / "gen.json"
    if f.exists():
        return json.loads(f.read_text(encoding="utf-8"))
    user = (f"学科：{subject}\n\n范围：{scope}\n" + "\n".join(f"- {s['number']} {s['title']}" for s in secs)
            + "\n\n（这是某本教材的章节标题，只用来划定范围；本书在此之前讲过：" + "；".join(before) + "。）\n")
    print("生成 ……", file=sys.stderr, flush=True)
    data = _call(work, "gen", model, GEN_PROMPT.read_text(encoding="utf-8"), user)
    data["_meta"]["prompt"] = _prompt_tag(GEN_PROMPT)
    f.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    return data


# ---------- 清单状态：生成结果 + 各节审核依次并入 ----------

class State:
    def __init__(self, gen: dict):
        meta = gen["_meta"]
        self.points, self.clauses = {}, {}
        for p in gen["points"]:
            self.points[p["id"]] = {"id": p["id"], "name": p["name"], "sentence": p["sentence"], "keys": p.get("keys", []),
                                    "scope": "前置" if p.get("scope") == "前置" else "范围内", "origin": "生成",
                                    "split_of": p.get("same_object") or None, "audits": [], "cautions": [],
                                    "gen": {"prompt": meta["prompt"], "model": meta["model"]}}
        for c in gen["clauses"]:
            self.clauses[c["id"]] = {"id": c["id"], "from": c["from"], "to": c["to"], "text": c["text"], "origin": "生成",
                                     "replaces": None, "audits": [],
                                     "gen": {"prompt": meta["prompt"], "model": meta["model"]}}
        self.np = 1 + max((int(k[1:]) for k in self.points if k[1:].isdigit()), default=0)
        self.nc = 1 + max((int(k[1:]) for k in self.clauses if k[1:].isdigit()), default=0)
        self.problems: list[str] = []
        self.transcription: list[dict] = []

    def listing(self) -> str:
        pts = [f"{p['id']} | {p['name']} | {p['sentence']} | {self._src(p)}" for p in self.points.values()]
        cls = [f"{c['id']} | {' + '.join(c['from'])} → {c['to']} | {c['text']} | {self._src(c)}" for c in self.clauses.values()]
        return ("点（id | 名字 | 一句话 | 来历）：\n" + "\n".join(pts) +
                "\n\n子句（id | 出发点 → 新点 | 话 | 来历）：\n" + "\n".join(cls))

    @staticmethod
    def _src(x: dict) -> str:
        if x["origin"] == "生成":
            got = [a["file"] for a in x["audits"] if a["kind"] in ("一致", "书给的")]
            return "模型生成" + (f"；已在 {', '.join(got)} 判书给的" if got else "")
        return f"回扫自 {x['origin']}"

    def merge(self, file: str, audit: dict, meta: dict) -> None:
        if "book_points" in audit or "book_routes" in audit:
            audit = _from_book_view(audit)
        tag = {"prompt": meta["prompt"], "model": meta["model"], "file": file}
        tmp = {}
        for n in audit.get("new_points", []):
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
            if p.get("id") not in self.points:
                self.problems.append(f"{file}：审核提到清单里没有的点 {p.get('id')}")
                continue
            kind = "一致" if p.get("match") == "一致" else "书的定义不同"
            self.points[p["id"]]["audits"].append({"file": file, "kind": kind, "quotes": p.get("quotes", []),
                                                   "note": p.get("note", ""), **tag})
        for c in audit.get("clauses", []):
            if c.get("id") not in self.clauses:
                self.problems.append(f"{file}：审核提到清单里没有的子句 {c.get('id')}")
                continue
            kind = "书给的" if c.get("verdict") == "书给的" else "零件"
            self.clauses[c["id"]]["audits"].append({"file": file, "kind": kind, "quotes": c.get("quotes", []),
                                                    "note": c.get("note", ""), **tag})
        for b in audit.get("book_clauses", []):
            frm, to = [ref(x) for x in b.get("from", [])], ref(b.get("to", ""))
            bad = [x for x in frm + [to] if x not in self.points]
            if bad:
                self.problems.append(f"{file}：回扫子句 {b.get('tmp')} 用到不存在的点 {bad}，未并入")
                continue
            if to in frm:
                self.problems.append(f"{file}：回扫子句 {b.get('tmp')} 的出发点含新点自己（{to}），未并入")
                continue
            cid = f"C{self.nc}"; self.nc += 1
            rep = b.get("replaces") if b.get("replaces") in self.clauses else None
            self.clauses[cid] = {"id": cid, "from": frm, "to": to, "text": b["text"], "origin": file, "replaces": rep,
                                 "audits": [{"file": file, "kind": "书给的", "quotes": b.get("quotes", []),
                                             "note": b.get("note", ""), **tag}], "gen": tag}
        for k in audit.get("cautions", []):
            pid = ref(k.get("point", ""))
            if pid in self.points:
                self.points[pid]["cautions"].append({"file": file, "text": k["text"], "quotes": k.get("quotes", [])})
        for t in audit.get("transcription_issues", []):
            self.transcription.append({"file": file, **t})


def _from_book_view(a: dict) -> dict:
    """审核提示词按“从书出发”输出（book_points / book_routes / parts）→ 并入用的形状（points / new_points / clauses / book_clauses）。"""
    out = {"points": [], "new_points": [], "clauses": [], "book_clauses": [],
           "cautions": a.get("cautions", []), "transcription_issues": a.get("transcription_issues", [])}
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
                                  "note": f"书按另一种定义讲：{p.get('name', '')}"})
    for k, r in enumerate(a.get("book_routes", []), 1):
        if r.get("same_as"):
            out["clauses"].append({"id": r["same_as"], "verdict": "书给的", "quotes": r.get("quotes", []),
                                   "note": r.get("note", "")})
        else:
            out["book_clauses"].append({"tmp": f"B{k}", "from": r.get("from", []), "to": r.get("to", ""),
                                        "text": r.get("text", ""), "replaces": None, "quotes": r.get("quotes", []),
                                        "note": r.get("note", "")})
    for c in a.get("parts", []):
        out["clauses"].append({"id": c.get("id"), "verdict": "零件", "quotes": c.get("quotes", []), "note": c.get("note", "")})
    return out


def audit_all(book: Path, work: Path, st: State, secs: list[dict], model: str, redo: bool) -> None:
    system = AUDIT_PROMPT.read_text(encoding="utf-8")
    for s in secs:
        stem = s["file"].replace("/", "_").removesuffix(".md")
        f = work / f"audit-{stem}.json"
        if f.exists() and not redo:
            data = json.loads(f.read_text(encoding="utf-8"))
        else:
            lines, end = section_text(book, s["file"])
            body = "\n".join(f"{i}\t{l}" for i, l in enumerate(lines[:end], 1))
            user = (f"## 清单\n\n{st.listing()}\n\n## 教材原文：{book.name}，{s['number']} {s['title']}"
                    f"（M07 文件 {s['file']}，习题未给出）\n\n{body}\n")
            print(f"审核 {s['file']} ……", file=sys.stderr, flush=True)
            data = _call(work, f"audit-{stem}", model, system, user)
            data["_meta"]["prompt"] = _prompt_tag(AUDIT_PROMPT)
            f.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
        st.merge(s["file"], data, data["_meta"])


# ---------- 合并：核锚点、定来源、写 jsonl ----------

def build(book: Path, out: Path, st: State) -> dict:
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
                if pos := blocks.find(q["text"], pages):
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
        rec = {"id": p["id"], "name": p["name"], "sentence": p["sentence"], "anchors": anc, "source": src,
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
        rec["gen"] = p["gen"]
        rec["audit"] = sorted({f"{a['prompt']} · {a['model']}" for a in p["audits"]}) or ["未经审核"]
        points.append(rec)
    for c in st.clauses.values():
        book_anc = anchors(c["audits"], {"书给的"})
        part_anc = anchors(c["audits"], {"零件"})
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
    extra = {"stats": dict(stats), "dropped": dropped, "problems": st.problems, "transcription": st.transcription}
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
    L += [f"- 点 {len(pts)}：" + "，".join(f"{k} {v}" for k, v in ps.most_common())
          + f"；范围内 {sum(p['scope'] == '范围内' for p in pts.values())}，前置 {sum(p['scope'] == '前置' for p in pts.values())}",
          f"- 子句 {len(cls)}：" + "，".join(f"{k} {v}" for k, v in cs.most_common())
          + "；来历：" + "，".join(f"{k} {v}" for k, v in origin_c.most_common()),
          f"- 生成的子句被判书给的：{sum(1 for c in cls if c['source'] == '书给的' and not c.get('gen', {}).get('file'))}"
          f" / {origin_c['生成']}",
          "- 摘录核对：" + "，".join(f"{k.split(':')[1]} {v}" for k, v in sorted(extra["stats"].items()) if k.startswith("摘录")),
          "- 原件位置：" + "，".join(f"{k.split(':')[1]} {v}" for k, v in sorted(extra["stats"].items()) if k.startswith("原件")),
          f"- 并入时的问题 {len(extra['problems'])}；丢弃的摘录 {len(extra['dropped'])}；疑似转录错误 {len(extra['transcription'])}", ""]
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
        L += ["", "书的定义与生成的不同（生成的那个点改判模型补的，书的点另列）："]
        L += [f"- {p['id']}「{p['name']}」：" + "；".join(d["note"][:80] for d in p["book_differs"]) for p in differ]
    L += ["", "## 抽样核对锚点（随机 12 条，程序已核在所标行，人工 / 审查代理再看意思对不对）", ""]
    allanc = [(x["id"], a) for x in list(pts.values()) + cls for a in x["anchors"]]
    for xid, a in random.Random(seed).sample(allanc, min(12, len(allanc))):
        L.append(f"- {xid} · {a['file']}:{a['line']} · PDF {a.get('page', '?')} · “{a['quote'][:100]}”")
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
    a = ap.parse_args(argv)
    globals()["EFFORT"] = a.effort
    work = a.out / "work"
    work.mkdir(parents=True, exist_ok=True)
    if a.cmd in ("run", "build"):
        if not a.book or not a.chapter:
            raise SystemExit("run / build 要 --book 与 --chapter")
        scope, secs, before = chapter_scope(a.book, a.chapter)
        if "gen" in a.redo:
            (work / "gen.json").unlink(missing_ok=True)
            for f in work.glob("audit-*.json"):  # 清单变了，各节审核都要重做
                f.unlink()
        if "audit" in a.redo:
            for f in work.glob("audit-*.json"):
                f.unlink()
        if a.cmd == "build" and not (work / "gen.json").exists():
            raise SystemExit("还没有生成结果：先 run")
        gen = generate(work, scope, secs, before, a.subject, a.model)
        st = State(gen)
        if a.cmd == "run":
            audit_all(a.book, work, st, secs, a.model, redo=False)
        else:
            for s in secs:
                f = work / f"audit-{s['file'].replace('/', '_').removesuffix('.md')}.json"
                if f.exists():
                    d = json.loads(f.read_text(encoding="utf-8"))
                    st.merge(s["file"], d, d["_meta"])
        build(a.book, a.out, st)
    print(check(a.out))


if __name__ == "__main__":
    main()
