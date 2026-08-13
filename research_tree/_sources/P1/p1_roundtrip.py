# -*- coding: utf-8 -*-
"""
P1 原型：N-Quads 转义还原 grep 等价性 —— 往返测试
=================================================
任务: 用 rdflib 7.6.0 把 921 个真实锚点 quote 构造为 RDF 字面量并序列化成
N-Quads, 写 ECHAR/UCHAR 转义还原解析器, 验证"还原后逐字 == 原始 quote"。

数据: docs/图工程调研/M08实验-第15章分层图谱/data/nodes-*.jsonl
      + inherited/nodes-*.jsonl (合计 921 个 anchor)
解释器: tmp/venv_b7a/Scripts/python.exe (rdflib 7.6.0)
运行:  python p1_roundtrip.py   (stdout 重定向到 run_output.txt)

输出: 通过率 / 耗时 / 失败清单 / 文件大小, 全部打印到 stdout。
"""

import json
import glob
import os
import re
import sys
import time

DATA_DIR = "C:/Users/Wang/Desktop/Studium/docs/图工程调研/M08实验-第15章分层图谱/data"
OUT_DIR = "C:/Users/Wang/Desktop/Studium/research_tree/_sources/P1"

from rdflib import Dataset, URIRef, Literal


# ---------- 1. 读真实数据: 921 个 anchor ----------
def load_anchors():
    anchors = []
    files = (sorted(glob.glob(os.path.join(DATA_DIR, "nodes-*.jsonl")))
             + sorted(glob.glob(os.path.join(DATA_DIR, "inherited", "nodes-*.jsonl"))))
    for f in files:
        with open(f, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                n = json.loads(line)
                for a in n.get("anchors", []):
                    anchors.append({
                        "src_file": os.path.relpath(f, DATA_DIR),
                        "node_id": n["id"],
                        "md_file": a["file"],
                        "quote": a["quote"],
                    })
    return anchors


# ---------- 2. ECHAR/UCHAR 转义还原解析器 (N-Triples 字符串字面量) ----------
# 依据 W3C RDF 1.1 N-Triples / N-Quads 语法:
#   ECHAR ::= '\' [tbnrf"'\]
#   UCHAR ::= '\u' HEX{4} | '\U' HEX{8}
ECHAR_MAP = {
    "t": "\t", "b": "\b", "n": "\n", "r": "\r", "f": "\f",
    '"': '"', "'": "'", "\\": "\\",
}

def reduce_nt_string(s, report=None):
    """把 N-Triples 字符串字面量内容(不带外层引号)还原为原始字符串。
    返回 (还原后字符串, 出错标记) ; 出错标记=True 表示遇到非法转义。
    注意: '\\\\' 必须优先于其他 ECHAR 处理, 否则 '\\\\n' 会被误还原为换行。
    """
    out = []
    i = 0
    n = len(s)
    bad = False
    while i < n:
        c = s[i]
        if c == "\\":
            if i + 1 >= n:
                bad = True
                out.append(c)
                i += 1
                continue
            nxt = s[i + 1]
            if nxt == "\\":
                out.append("\\"); i += 2; continue
            if nxt in ECHAR_MAP:
                out.append(ECHAR_MAP[nxt]); i += 2; continue
            if nxt == "u":
                hex4 = s[i + 2:i + 6]
                if len(hex4) == 4 and re.fullmatch(r"[0-9A-Fa-f]{4}", hex4):
                    out.append(chr(int(hex4, 16))); i += 6; continue
                bad = True; out.append("\\u"); i += 2; continue
            if nxt == "U":
                hex8 = s[i + 2:i + 10]
                if len(hex8) == 8 and re.fullmatch(r"[0-9A-Fa-f]{8}", hex8):
                    cp = int(hex8, 16)
                    try:
                        out.append(chr(cp)); i += 10; continue
                    except ValueError:
                        bad = True; out.append("\\U"); i += 2; continue
                bad = True; out.append("\\U"); i += 2; continue
            # 非法转义
            bad = True
            out.append("\\" + nxt)
            i += 2
            continue
        out.append(c)
        i += 1
    return "".join(out), bad


def split_literal_token(token):
    """token 形如 '"..."' 或 '"..."@lang' 或 '"..."^^<iri>'; 返回 (内容, 后缀)。"""
    assert token[0] == '"', "literal token must start with quote: %r" % token[:40]
    i = 1
    n = len(token)
    while i < n:
        c = token[i]
        if c == "\\":
            i += 2
            continue
        if c == '"':
            break
        i += 1
    return token[1:i], token[i + 1:]


def extract_literal_from_line(line, subj, pred):
    """从一行 N-Quads 中取出对象字面量 token。
    行格式: <subj> <pred> "literal" <context> .
    """
    prefix = "<%s> <%s> " % (subj, pred)
    if not line.startswith(prefix):
        return None
    rest = line[len(prefix):]
    # rest 以 ' .' 结尾(上下文+点); 也可能没有上下文(context graph 默认也输出 _:ctx)。
    rest = rest.rstrip()
    assert rest.endswith("."), "line must end with '.': %r" % line[:80]
    rest = rest[:-1].rstrip()
    # rest 现在是 '"..."' 或 '"..."@en' 或 '"..."^^<iri>' 或 '"..." _:ctx' 之类
    # 从第一个双引号开始取字面量 token
    q = rest.find('"')
    if q < 0:
        return None
    return split_literal_token(rest[q:])[0]


def main():
    anchors = load_anchors()
    n = len(anchors)
    print("== P1 roundtrip: N-Quads escape-reduction == ")
    print("interpreter:", sys.executable)
    import rdflib
    print("rdflib version:", rdflib.__version__)
    print("total_anchors:", n)

    # 构建 Dataset: 每锚点一个三元组 (urn:anchor:<i>, urn:quote, Literal(quote))
    ds = Dataset()
    subj_of = {}
    for i, a in enumerate(anchors):
        subj = "urn:anchor:%d" % i
        ds.add((URIRef(subj), URIRef("urn:quote"), Literal(a["quote"])))
        subj_of[i] = subj
    print("dataset quads (should be %d):" % n, len(ds))

    # ---- 常规 N-Quads 序列化 ----
    t0 = time.perf_counter()
    nq = ds.serialize(format="nquads")
    t_serial = time.perf_counter() - t0
    nq_path = os.path.join(OUT_DIR, "anchors_921.nq")
    with open(nq_path, "w", encoding="utf-8") as fh:
        fh.write(nq)
    lines = [l for l in nq.splitlines() if l.strip()]
    print("nquads_file:", nq_path)
    print("nquads_bytes:", len(nq.encode("utf-8")), "lines:", len(lines))
    print("serialize_time_s: %.4f" % t_serial)

    # ---- 逐锚点还原 ----
    t0 = time.perf_counter()
    n_ok = 0
    failures = []
    seen = set()
    for line in lines:
        m = re.search(r"<urn:anchor:(\d+)>", line)
        if not m:
            continue
        idx = int(m.group(1))
        if idx in seen:
            continue
        seen.add(idx)
        tok = extract_literal_from_line(line, subj_of[idx], "urn:quote")
        reduced, bad = reduce_nt_string(tok)
        orig = anchors[idx]["quote"]
        if not bad and reduced == orig:
            n_ok += 1
        else:
            failures.append((idx, anchors[idx]["node_id"], anchors[idx]["md_file"],
                             orig, tok, reduced, bad))
    t_reduce = time.perf_counter() - t0
    print("roundtrip_ok:", n_ok, "/", n)
    print("roundtrip_pass_rate: %.4f%%" % (100.0 * n_ok / n))
    print("roundtrip_time_s: %.4f" % t_reduce)
    print("lines_not_mapped_to_anchor:", len(lines) - len(seen))

    # 非法转义统计
    print("reduce_illegal_escape_count:", sum(1 for f in failures if f[6]))

    if failures:
        print("--- FAILURES (first 20) ---")
        for (idx, nid, md, orig, tok, reduced, bad) in failures[:20]:
            print("idx=%d node=%s md=%s bad=%s" % (idx, nid, md, bad))
            print("  orig   = %r" % orig[:120])
            print("  token  = %r" % tok[:120])
            print("  reduced= %r" % reduced[:120])

    # ---- 规范 N-Quads (RDFC-1.0) 序列化 ----
    try:
        t0 = time.perf_counter()
        nq_c14n = ds.serialize(format="nquads", canonicalize=True)
        t_c14n = time.perf_counter() - t0
        c14n_path = os.path.join(OUT_DIR, "anchors_921_c14n.nq")
        with open(c14n_path, "w", encoding="utf-8") as fh:
            fh.write(nq_c14n)
        print("canonical_bytes:", len(nq_c14n.encode("utf-8")))
        print("canonical_serialize_time_s: %.4f" % t_c14n)
        print("canonical_identical_to_regular:", nq_c14n == nq)

        lines_c = [l for l in nq_c14n.splitlines() if l.strip()]
        n_cok = 0
        c_fail = []
        seen_c = set()
        for line in lines_c:
            m = re.search(r"<urn:anchor:(\d+)>", line)
            if not m:
                continue
            idx = int(m.group(1))
            if idx in seen_c:
                continue
            seen_c.add(idx)
            tok = extract_literal_from_line(line, subj_of[idx], "urn:quote")
            reduced, bad = reduce_nt_string(tok)
            if not bad and reduced == anchors[idx]["quote"]:
                n_cok += 1
            else:
                c_fail.append((idx, anchors[idx]["node_id"], bad))
        print("canonical_roundtrip_ok:", n_cok, "/", n)
        print("canonical_roundtrip_pass_rate: %.4f%%" % (100.0 * n_cok / n))
        if c_fail:
            print("canonical_failures:", c_fail[:10])
    except Exception as e:
        print("CANONICAL_SERIALIZE_FAIL:", type(e).__name__, e)

    # ---- 字符覆盖: 本轮数据实际覆盖的转义类型 ----
    bs = sum(1 for a in anchors if "\\" in a["quote"])
    dq = sum(1 for a in anchors if '"' in a["quote"])
    sq = sum(1 for a in anchors if "'" in a["quote"])
    na = sum(1 for a in anchors if any(ord(c) > 127 for c in a["quote"]))
    ctrl = sum(1 for a in anchors if any(ord(c) < 32 or ord(c) == 127 for c in a["quote"]))
    print("anchors_with_backslash:", bs)
    print("anchors_with_doublequote:", dq)
    print("anchors_with_singlequote:", sq)
    print("anchors_with_nonascii:", na)
    print("anchors_with_control_chars:", ctrl)
    print("DONE")


if __name__ == "__main__":
    main()
