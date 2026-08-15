# -*- coding: utf-8 -*-
"""
P10 共轭判别器实测 — K4 §5 风险1 在 Apostol M08 自有语料上的验证
================================================================
目标（K4 结论 + K 线终稿 §9.3 风险1）：
  「共轭判别器」替代「训练外」是 C 级推断；「哪些 Studium 查询实际涉险
  （时间/版本/数值/规则/跨源身份）」未在自有语料实测；需以
  「简单检索（L0 JSONL+grep）能否给出满意答案」作代理验证。

方法（机械可复现 + 有判断，判断锚定审计过的节点/边=ground truth）：
  1. 从 Apostol M08 语料构造真实查询集（覆盖 simple/numeric/rule/identity/
     version/multi-hop 六维），每题给出决定性事实与 ground-truth 锚点。
  2. 对每题做机械简单检索：用该题的「决定性关键词」对
     (a) L1 节点/边 JSONL（name/aliases/definitions/evidence quote）
     (b) L0 原文 source/ch10/*.md
     做子串检索，报告命中集合与「混淆候选」（同关键词命中的他节点）。
  3. 判断每题：简单检索命中是否含正确事实？是否同时命中可误导的
     共轭结构（=混淆候选）？→ satisfied / conjugate-at-risk / multi-hop。
  4. 汇总：六维各自的涉险率；验证「简单检索满意 ⇔ 不涉险」代理是否成立。

证据等级：脚本输出=A（机械命中）；维度判定/涉险结论=C（依据审计节点）。
边界：语料单书单版本；时间/版本维在此语料退化（用 10.23-10.25 的
  级数↔瑕积分「对应版本」近似）；query 集为人工构造的代表性样本，非穷尽。
"""
import json, os, re, glob

BASE = os.path.join(os.path.dirname(__file__), "..", "..", "..",
                    "docs", "图工程调研", "M08实验-Apostol微积分卷1")
DATA = os.path.join(BASE, "data")
SRC = os.path.join(BASE, "source", "ch10")

def load_nodes():
    out = {}
    for l in open(os.path.join(DATA, "nodes-audited.jsonl"), encoding="utf-8"):
        n = json.loads(l)
        out[n["id"]] = n
    return out

def load_edges():
    out = []
    for l in open(os.path.join(DATA, "edges-audited.jsonl"), encoding="utf-8"):
        out.append(json.loads(l))
    return out

def node_text(n):
    """节点的可检索文本：name + aliases + definitions text + scope + anchors quotes"""
    parts = [n.get("name", ""), n.get("name_zh", "")]
    parts += n.get("aliases", [])
    for d in n.get("definitions", []):
        parts.append(d.get("text", ""))
        parts.append(d.get("scope", ""))
        a = d.get("anchor", {})
        if a.get("quote"):
            parts.append(a["quote"])
    for a in n.get("anchors", []):
        if a.get("quote"):
            parts.append(a["quote"])
    return "\n".join(parts)

def edge_text(e):
    parts = [e.get("label", "")]
    for ev in e.get("evidence", []):
        a = ev.get("anchor", {})
        if a.get("quote"):
            parts.append(a["quote"])
        parts.append(ev.get("rationale", ""))
    return "\n".join(parts)

def src_text():
    """全部原文拼接（L0）"""
    buf = []
    for f in sorted(glob.glob(os.path.join(SRC, "*.md"))):
        buf.append(open(f, encoding="utf-8", errors="replace").read())
    return "\n".join(buf)

def retrieve(keywords, nodes, edges, source):
    """机械简单检索：对每个关键词做子串命中，返回命中节点/边/原文行"""
    kw = [k for k in keywords if k]
    node_hits = {}
    edge_hits = {}
    src_hits = {}
    for k in kw:
        if not k:
            continue
        lk = k.lower()
        # 节点
        for nid, n in nodes.items():
            if lk in node_text(n).lower():
                node_hits.setdefault(nid, []).append(k)
        # 边
        for e in edges:
            if lk in edge_text(e).lower():
                edge_hits.setdefault(e["id"], []).append(k)
        # 原文（记录文件+行数，简化为命中计数）
        for line_no, line in enumerate(source.split("\n")):
            if lk in line.lower():
                src_hits.setdefault(k, []).append(line_no)
    return {"kw": kw, "nodes": node_hits, "edges": edge_hits, "src_count": {k: len(v) for k, v in src_hits.items()}}

# ---------------------------------------------------------------------------
# 查询集：每题 = {id, 维度, 涉险预测(C), 查询(自然语言), 决定性事实,
#                ground_truth(审计锚点), 决定性关键词, 混淆候选(共轭结构)}
# 关键词用「决定该题答案的最小词集」——太小会全命中、太大检索不到。
# ---------------------------------------------------------------------------
QUERIES = [
    {
        "id": "S1-simple",
        "dim": "simple",
        "risk": False,
        "q": "什么是无穷序列（infinite sequence）的定义？",
        "fact": "A function f whose domain is the set of all positive integers is an infinite sequence.",
        "gt": ["infinite-sequence"],
        "kw": ["infinite sequence"],
        "confound": [],
    },
    {
        "id": "N1-numeric-boundary",
        "dim": "numeric",
        "risk": True,
        "q": "几何级数 ∑xⁿ 当 |x| 取何值时收敛？边界 x=1 呢？",
        "fact": "Theorem 10.5: |x|<1 收敛；|x|≥1 发散（x=1 为边界）。",
        "gt": ["theorem-10-5-geometric-series", "geometric-series"],
        "kw": ["geometric series", "|x|"],
        "confound": ["harmonic-series（同为发散边界族，易混）"],
    },
    {
        "id": "N2-ratio-warning",
        "dim": "numeric",
        "risk": True,
        "q": "比值 a_{n+1}/a_n 恒小于 1 能否推出级数收敛？",
        "fact": "不能。Warning: 恒小于1不必然推出极限 L<1（调和级数反例，比值 n/(n+1)<1 但 L=1）。",
        "gt": ["ratio-test"],
        "kw": ["always less than 1", "Warning"],
        "confound": ["ratio-test 定理正面 L<1 收敛（只搜 'ratio test' 会先命中正面结论）"],
    },
    {
        "id": "N3-ratio-L1",
        "dim": "numeric",
        "risk": True,
        "q": "比值判别法当极限 L=1 时结论是什么？",
        "fact": "(c) If L = 1, the test is inconclusive（判别法失效）。",
        "gt": ["ratio-test"],
        "kw": ["L = 1", "inconclusive"],
        "confound": ["root-test 的 R=1 同样 inconclusive，两判别法边界条件易混"],
    },
    {
        "id": "R1-comparison-nonneg",
        "dim": "rule",
        "risk": True,
        "q": "比较判别法对项的正负有什么要求？",
        "fact": "要求 a_n≥0 且 b_n≥0（非负项）；极限比较法进一步要求 a_n>0, b_n>0（严格正）。",
        "gt": ["comparison-test", "limit-comparison-test"],
        "kw": ["a_n \\geq 0", "b_n \\geq 0"],
        "confound": ["limit-comparison-test 要求严格 >0（≥ vs > 是规则判别器）"],
    },
    {
        "id": "R2-limit-comparison-strict",
        "dim": "rule",
        "risk": True,
        "q": "极限比较判别法要求 a_n, b_n 严格大于 0 吗？",
        "fact": "是，定理 10.9 假设 a_n>0 且 b_n>0（strictly positive），与比较法 ≥0 不同。",
        "gt": ["limit-comparison-test"],
        "kw": ["a_n > 0", "b_n > 0"],
        "confound": ["comparison-test 的 ≥0 版本（≥ vs > 严格性差异）"],
    },
    {
        "id": "I1-series-vs-improper",
        "dim": "identity",
        "risk": True,
        "q": "瑕积分的比较判别法（定理10.24）与级数的比较判别法（定理10.8）是同一个吗？",
        "fact": "不是同一个定理，是「对应版本/类比」：10.23-10.25 证明与级数对应结果相似留作习题（10.23.md）。",
        "gt": ["comparison-test-for-improper-integrals"],
        "kw": ["comparison test", "Theorem 10.24", "Theorem 10.8"],
        "confound": ["comparison-test（级数版，同 'comparison test' 名字即命中）——跨源身份混淆"],
    },
    {
        "id": "I2-nth-term-alias",
        "dim": "identity",
        "risk": False,
        "q": "nth-term test 与「收敛的必要条件」是同一概念吗？",
        "fact": "是同一节点：nth-term-test 的 aliases 含 'necessary condition for convergence'。",
        "gt": ["nth-term-test"],
        "kw": ["nth term", "necessary condition"],
        "confound": [],
    },
    {
        "id": "V1-improper-analog-version",
        "dim": "version",
        "risk": True,
        "q": "瑕积分的收敛判别法在 10.23-10.25 与级数版在证明上是什么关系？",
        "fact": "对应结果，证明相似留作习题（同定理不同版本，非同一锚点）。",
        "gt": ["boundedness-criterion-for-improper-integrals", "comparison-test-for-improper-integrals", "limit-comparison-test-for-improper-integrals"],
        "kw": ["10.23", "similar to the corresponding results for series"],
        "confound": ["级数版三定理（同数字段不同版本）"],
    },
    {
        "id": "M1-ratio-derives",
        "dim": "multi-hop",
        "risk": True,
        "q": "比值判别法与根值判别法源自哪个更基础的定理？",
        "fact": "以几何级数为比较级数，是比较判别法（定理10.8）的特例（10.15 开篇）。",
        "gt": ["ratio-test", "root-test", "comparison-test"],
        "kw": ["geometric series", "comparison test", "Cauchy"],
        "confound": ["geometric-series（作为基础级数）vs comparison-test（作为母定理）——需要跨两跳"],
    },
    {
        "id": "C1-harmonic-nth-term",
        "dim": "rule",
        "risk": True,
        "q": "调和级数能说明 nth-term test 的条件非充分吗？",
        "fact": "能：调和级数通项→0 但发散，是条件 (10.37) 非充分的反例。",
        "gt": ["harmonic-series", "nth-term-test"],
        "kw": ["harmonic series", "not sufficient"],
        "confound": ["调和级数发散常被当作「比值法失效」反例，易与 nth-term 反例混淆"],
    },
    {
        "id": "N4-root-R1",
        "dim": "numeric",
        "risk": True,
        "q": "根值判别法当 R=1 时结论是什么？",
        "fact": "(c) If R = 1, the test is inconclusive。",
        "gt": ["root-test"],
        "kw": ["R = 1", "inconclusive"],
        "confound": ["ratio-test 的 L=1 inconclusive（两判别法边界条件同构易混）"],
    },
]

def main():
    nodes = load_nodes()
    edges = load_edges()
    source = src_text()
    print(f"corpus: {len(nodes)} nodes / {len(edges)} edges / {len(source)} chars L0")
    print("=" * 100)
    rows = []
    for q in QUERIES:
        r = retrieve(q["kw"], nodes, edges, source)
        # 命中节点
        hit_nodes = sorted(r["nodes"].keys())
        gt_hit = [g for g in q["gt"] if g in hit_nodes]
        missing_gt = [g for g in q["gt"] if g not in hit_nodes]
        # 命中边
        hit_edges = sorted(r["edges"].keys())
        # 原文命中
        src_total = sum(r["src_count"].values())
        # 混淆候选（非 ground-truth 但命中的节点 = 可能误导的共轭结构）
        confound_hits = [n for n in hit_nodes if n not in q["gt"]]
        # 判断
        if not gt_hit:
            verdict = "UNSAT: ground-truth 未命中"
        elif confound_hits:
            verdict = "CONJUGATE-AT-RISK: 简单检索命中正确事实但同时命中混淆候选"
        else:
            verdict = "satisfied: 简单检索唯一命中正确事实"
        rows.append({
            "id": q["id"], "dim": q["dim"], "risk": q["risk"],
            "gt": q["gt"], "gt_hit": gt_hit, "missing_gt": missing_gt,
            "hit_nodes": hit_nodes, "hit_edges": hit_edges,
            "confound_hits": confound_hits, "src_count": src_total,
            "verdict": verdict,
        })
        print(f"[{q['id']}] dim={q['dim']:8s} risk={q['risk']}  {q['q'][:36]}")
        print(f"    kw={r['kw']}")
        print(f"    gt={q['gt']} → hit={gt_hit} missing={missing_gt}")
        print(f"    hit_nodes={hit_nodes[:6]}{'...' if len(hit_nodes)>6 else ''} hit_edges={len(hit_edges)} src_hits={src_total}")
        if confound_hits:
            print(f"    CONFOUND 命中: {confound_hits[:6]}{'...' if len(confound_hits)>6 else ''}")
        print(f"    → {verdict}")
        print()
    # 汇总
    print("=" * 100)
    from collections import Counter
    by_dim = Counter(r["dim"] for r in rows)
    by_verdict = Counter("CONJUGATE" if "CONJUGATE" in r["verdict"] else ("UNSAT" if "UNSAT" in r["verdict"] else "SAT")
                        for r in rows)
    print("维度分布:", dict(by_dim))
    print("判定分布:", dict(by_verdict))
    # 代理检验：risk=True 是否都落在 CONJUGATE/UNSAT；risk=False 是否都 satisfied
    ok = True
    for r in rows:
        is_risk = "CONJUGATE" in r["verdict"] or "UNSAT" in r["verdict"]
        if r["risk"] != is_risk:
            ok = False
            print(f"  ⚠ 代理偏差: {r['id']} risk_pred={r['risk']} actual={is_risk}")
    print("代理「risk ⇔ 简单检索不满意」一致:", ok)
    # 导出 JSON 供审计
    out = os.path.join(os.path.dirname(__file__), "p10_results.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"rows": rows}, f, ensure_ascii=False, indent=1)
    print("results →", out)

if __name__ == "__main__":
    main()
