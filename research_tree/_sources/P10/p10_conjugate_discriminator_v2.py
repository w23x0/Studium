# -*- coding: utf-8 -*-
"""
P10 共轭判别器实测 v2 — K4 §5 风险1 在 Apostol M08 自有语料上的验证
================================================================
目标（K4 结论 + K 线终稿 §9.3 风险1）：
  「共轭判别器」替代「训练外」是 C 级推断；「哪些 Studium 查询实际涉险
  （时间/版本/数值/规则/跨源身份）」未在自有语料实测；需以
  「简单检索（L0 JSONL+grep）能否给出满意答案」作代理验证。

v2 修正：初版把「命中他节点」一律当 CONJUGATE，语义错误。
  共轭判别器"涉险"的真义（K4：向量相似度无法区分的关系）：
  - 决定性事实若以**独特字符串**存在于 L0/L1（如 "Warning"、">0"、"定理10.24"），
    grep 可唯一命中 → **简单检索满意**（纵是数值/规则维度，也不涉险）；
  - 决定性事实需**跨实体关系**（边/多跳/身份判定）才能得到 → grep 单节点文本
    不足以满意 → **涉险（触发升级）**；
  - 决定性字符串**不独特**（同串命中多个概念，如 "inconclusive" 同时命中
    root/ratio 两判别法的边界）→ **混淆（共轭判别器涉险）**。

三态判定（每态给出理由，审计可复核）：
  satisfied  = decisive_kw 唯一命中 ground-truth 且不需要跨实体关系
  at-risk    = 需要跨实体关系（多跳/身份/版本对应）才能得到决定性事实
  confound   = decisive_kw 同时命中可误导的共轭结构（同串多义）

证据等级：命中=机械 A；needs_relation/混淆强度=人工判定 C（依据审计节点/边）。
"""
import json, os, glob

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
    return [json.loads(l) for l in open(os.path.join(DATA, "edges-audited.jsonl"), encoding="utf-8")]

def node_text(n):
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
    buf = []
    for f in sorted(glob.glob(os.path.join(SRC, "*.md"))):
        buf.append(open(f, encoding="utf-8", errors="replace").read())
    return "\n".join(buf)

def retrieve(kw, nodes, edges, source):
    """机械简单检索：decisive_kw 对 节点/边/原文 的子串命中"""
    node_hits, edge_hits, src_counts = {}, {}, {}
    for k in kw:
        lk = k.lower()
        for nid, n in nodes.items():
            if lk in node_text(n).lower():
                node_hits.setdefault(nid, []).append(k)
        for e in edges:
            if lk in edge_text(e).lower():
                edge_hits.setdefault(e["id"], []).append(k)
        src_counts[k] = source.lower().count(lk)
    return {"nodes": node_hits, "edges": edge_hits, "src": src_counts}

# ---------------------------------------------------------------------------
# 查询集 v2：每题带 decisive_kw（决定答案的独特字符串）+ gt + needs_relation
# ---------------------------------------------------------------------------
QUERIES = [
    dict(id="S1-simple", dim="simple", q="什么是无穷序列（infinite sequence）的定义？",
         fact="A function f whose domain is the set of all positive integers is an infinite sequence.",
         gt=["infinite-sequence"], decisive=["infinite sequence"], needs_relation=False),

    dict(id="N1-numeric-boundary", dim="numeric",
         q="几何级数 ∑xⁿ 当 |x| 取何值时收敛？边界 x=1 呢？",
         fact="Theorem 10.5: |x|<1 收敛；|x|≥1 发散。",
         gt=["theorem-10-5-geometric-series"], decisive=["|x| < 1"], needs_relation=False),

    dict(id="N2-ratio-warning", dim="numeric",
         q="比值 a_{n+1}/a_n 恒小于 1 能否推出级数收敛？",
         fact="不能。Warning: 恒小于1不必然推出极限 L<1（调和级数反例）。",
         gt=["ratio-test"], decisive=["Warning"], needs_relation=False),

    dict(id="N3-ratio-L1", dim="numeric",
         q="比值判别法当极限 L=1 时结论是什么？",
         fact="(c) If L = 1, the test is inconclusive。",
         gt=["ratio-test"], decisive=["the test is inconclusive"], needs_relation=False),

    dict(id="R1-comparison-nonneg", dim="rule",
         q="比较判别法对项的正负有什么要求？",
         fact="要求 a_n≥0 且 b_n≥0（非负项）。",
         gt=["comparison-test"], decisive=["b_n \\geq 0"], needs_relation=False),

    dict(id="R2-limit-comparison-strict", dim="rule",
         q="极限比较判别法要求 a_n, b_n 严格大于 0 吗？",
         fact="是，定理 10.9 假设 a_n>0 且 b_n>0（严格正）。",
         gt=["limit-comparison-test"], decisive=["b_n > 0"], needs_relation=False),

    dict(id="I1-series-vs-improper", dim="identity",
         q="瑕积分的比较判别法（定理10.24）与级数的比较判别法（定理10.8）是同一个吗？",
         fact="不是同一个定理，是「对应版本/类比」：10.23-10.25 证明与级数对应结果相似留作习题。",
         gt=["comparison-test-for-improper-integrals"], decisive=["Theorem 10.24"],
         needs_relation=True),  # 需连接 e-G4-019 类比边才能判身份

    dict(id="I2-nth-term-alias", dim="identity",
         q="nth-term test 与「收敛的必要条件」是同一概念吗？",
         fact="是同一节点：nth-term-test 的 aliases 含 'necessary condition for convergence'。",
         gt=["nth-term-test"], decisive=["necessary condition for convergence"], needs_relation=False),

    dict(id="V1-improper-analog-version", dim="version",
         q="瑕积分的收敛判别法在 10.23-10.25 与级数版在证明上是什么关系？",
         fact="对应结果，证明相似留作习题（同定理不同版本）。",
         gt=["boundedness-criterion-for-improper-integrals", "comparison-test-for-improper-integrals", "limit-comparison-test-for-improper-integrals"],
         decisive=["similar to the corresponding results for series"], needs_relation=True),

    dict(id="M1-ratio-derives", dim="multi-hop",
         q="比值判别法与根值判别法源自哪个更基础的定理？",
         fact="以几何级数为比较级数，是比较判别法（定理10.8）的特例（10.15 开篇）。",
         gt=["ratio-test", "root-test", "comparison-test"],
         decisive=["special case of the comparison test"], needs_relation=True),

    dict(id="C1-harmonic-nth-term", dim="rule",
         q="调和级数能说明 nth-term test 的条件非充分吗？",
         fact="能：调和级数通项→0 但发散，是条件 (10.37) 非充分的反例。",
         gt=["harmonic-series", "nth-term-test"],
         decisive=["not sufficient"], needs_relation=True),  # 反例关系在边 harmonic-series→nth-term-test

    dict(id="N4-root-R1", dim="numeric",
         q="根值判别法当 R=1 时结论是什么？",
         fact="(c) If R = 1, the test is inconclusive。",
         gt=["root-test"], decisive=["the test is inconclusive"], needs_relation=False),
]

def main():
    nodes = load_nodes()
    edges = load_edges()
    source = src_text()
    print(f"corpus: {len(nodes)} nodes / {len(edges)} edges / {len(source)} chars L0")
    print("=" * 100)
    rows = []
    for q in QUERIES:
        r = retrieve(q["decisive"], nodes, edges, source)
        hit_nodes = sorted(r["nodes"].keys())
        gt_hit = [g for g in q["gt"] if g in hit_nodes]
        # 决定性串在原文的命中行（抽查前3条，供人工复核语义）
        src_excerpts = {}
        for k in q["decisive"]:
            lk = k.lower()
            lines = [ln for ln in source.split("\n") if lk in ln.lower()]
            src_excerpts[k] = [ln.strip()[:120] for ln in lines[:3]]
        # 三态判定
        if not gt_hit:
            verdict, reason = "UNSAT", f"决定性串未命中 ground-truth {q['gt']}"
        elif q["needs_relation"]:
            verdict, reason = "at-risk", "决定性事实需跨实体关系（多跳/身份/版本对应）"
        elif len(hit_nodes) > 1:
            verdict, reason = "confound", f"决定性串同命中混淆候选 {[n for n in hit_nodes if n not in q['gt']]}"
        else:
            verdict, reason = "satisfied", "决定性串唯一命中 ground-truth"
        rows.append(dict(id=q["id"], dim=q["dim"], q=q["q"], fact=q["fact"], gt=q["gt"],
                         decisive=q["decisive"], hit_nodes=hit_nodes, gt_hit=gt_hit,
                         needs_relation=q["needs_relation"], verdict=verdict, reason=reason,
                         src_hits={k: r["src"][k] for k in q["decisive"]}, src_excerpts=src_excerpts))
        print(f"[{q['id']}] dim={q['dim']:8s} verdict={verdict:9s}  {q['q'][:40]}")
        print(f"    decisive={q['decisive']}  gt_hit={gt_hit}  nodes={hit_nodes[:5]}{'…' if len(hit_nodes)>5 else ''}")
        if src_excerpts:
            for k, ex in src_excerpts.items():
                print(f"    src[{k}]×{r['src'][k]} 例: {ex[0] if ex else '(无原文命中)'}")
        print(f"    reason: {reason}")
        print()
    # 汇总
    print("=" * 100)
    from collections import Counter
    by_dim = Counter(r["dim"] for r in rows)
    by_verdict = Counter(r["verdict"] for r in rows)
    print("维度分布:", dict(by_dim))
    print("判定分布:", dict(by_verdict))
    print("\n【代理检验】「涉险 ⇔ 简单检索不满意」：")
    ok = True
    for r in rows:
        is_risk = r["verdict"] in ("at-risk", "confound", "UNSAT")
        print(f"  {r['id']}: verdict={r['verdict']:9s} risk={is_risk}")
    out = os.path.join(os.path.dirname(__file__), "p10_results_v2.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"corpus": {"nodes": len(nodes), "edges": len(edges), "src_chars": len(source)},
                   "rows": rows}, f, ensure_ascii=False, indent=1)
    print("\nresults →", out)

if __name__ == "__main__":
    main()
