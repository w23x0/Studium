# -*- coding: utf-8 -*-
"""
P10 共轭判别器实测 v3（定稿）— K4 §5 风险1 在 Apostol M08 自有语料上的验证
================================================================
v3 判定逻辑（数据驱动 + 显式答案关系标注，审计可复核）：
  answer_needs_relation = True 的题（I1/C1/V1：答案由跨实体关系承载——
    身份类比边 e-G4-019、反例连接边 e-G2-005、版本对应边 e-G4-018/019）
    → 直接 at-risk（决定性串命中位置不改变「答案需关系」这一事实）
  否则按命中模式：
    satisfied = 决定性串唯一命中 ground-truth 节点（纵是数值/规则维，也不涉险）
    confound  = 决定性串命中 gt 节点但被其他概念共享（同串多义 → 共轭判别器涉险）
    at-risk   = 决定性事实由边/关系承载（单节点文本 grep 不足以满意 → 需多跳/身份/版本）
    UNSAT     = 决定性串在 L0/L1 均未命中（语料缺该事实表达 → 升级检索）

结论方向（待 findings 写定）：
  「共轭判别器涉险」不能按维度一刀切（K4 触发清单 (b) 过粗）——在 L0/L1
  字符串层，数值/规则维多数查询因决定性串独特而 grep 满意（如 ≥0 vs >0、
  "Warning" 标记）；真正涉险的是 ①共享边界短语（inconclusive 同命中 root/ratio）
  ②关系承载事实（级数↔瑕积分身份、10.23-10.25 版本对应、反例连接）。
  可操作代理 = 决定性串 grep 是否唯一命中。
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
# 查询集 v3：decisive = 决定答案的独特字符串；gt_node / gt_edge = ground truth
# ---------------------------------------------------------------------------
QUERIES = [
    dict(id="S1-simple", dim="simple",
         q="什么是无穷序列（infinite sequence）的定义？",
         fact="A function f whose domain is the set of all positive integers is an infinite sequence.",
         gt_node=["infinite-sequence"], gt_edge=[], decisive=["infinite sequence"], ans_rel=False),

    dict(id="N1-numeric-boundary", dim="numeric",
         q="几何级数 ∑xⁿ 当 |x| 取何值时收敛？边界 x=1 呢？",
         fact="Theorem 10.5: |x|<1 收敛；|x|≥1 发散。",
         gt_node=["theorem-10-5-geometric-series"], gt_edge=[], decisive=["|x| < 1"], ans_rel=False),

    dict(id="N2-ratio-warning", dim="numeric",
         q="比值 a_{n+1}/a_n 恒小于 1 能否推出级数收敛？",
         fact="不能。Warning: 恒小于1不必然推出极限 L<1（调和级数反例）。",
         gt_node=["ratio-test"], gt_edge=[], decisive=["Warning"], ans_rel=False),

    dict(id="N3-ratio-L1", dim="numeric",
         q="比值判别法当极限 L=1 时结论是什么？",
         fact="(c) If L = 1, the test is inconclusive。",
         gt_node=["ratio-test"], gt_edge=[], decisive=["the test is inconclusive"], ans_rel=False),

    dict(id="R1-comparison-nonneg", dim="rule",
         q="比较判别法对项的正负有什么要求？",
         fact="要求 a_n≥0 且 b_n≥0（非负项）。",
         gt_node=["comparison-test"], gt_edge=[], decisive=["b_n \\geq 0"], ans_rel=False),

    dict(id="R2-limit-comparison-strict", dim="rule",
         q="极限比较判别法要求 a_n, b_n 严格大于 0 吗？",
         fact="是，定理 10.9 假设 a_n>0 且 b_n>0（严格正）。",
         gt_node=["limit-comparison-test"], gt_edge=[], decisive=["b_n > 0"], ans_rel=False),

    dict(id="I1-series-vs-improper", dim="identity",
         q="瑕积分的比较判别法（定理10.24）与级数的比较判别法（定理10.8）是同一个吗？",
         fact="不是同一个定理，是「对应版本/类比」：10.23-10.25 证明与级数对应结果相似留作习题。",
         gt_node=["comparison-test-for-improper-integrals"],
         gt_edge=["e-G4-019"], decisive=["Theorem 10.24"], ans_rel=True),

    dict(id="I2-nth-term-alias", dim="identity",
         q="nth-term test 与「收敛的必要条件」是同一概念吗？",
         fact="是同一节点：nth-term-test 的 aliases 含 'necessary condition for convergence'。",
         gt_node=["nth-term-test"], gt_edge=[], decisive=["necessary condition for convergence"], ans_rel=False),

    dict(id="V1-improper-analog-version", dim="version",
         q="瑕积分的收敛判别法在 10.23-10.25 与级数版在证明上是什么关系？",
         fact="对应结果，证明相似留作习题（同定理不同版本）。",
         gt_node=["boundedness-criterion-for-improper-integrals", "comparison-test-for-improper-integrals", "limit-comparison-test-for-improper-integrals"],
         gt_edge=["e-G4-019", "e-G4-016", "e-G4-018"], decisive=["similar to the corresponding results for series"], ans_rel=True),

    dict(id="M1-ratio-derives", dim="multi-hop",
         q="比值判别法与根值判别法源自哪个更基础的定理？",
         fact="以几何级数为比较级数，是比较判别法（定理10.8）的特例（10.15 开篇）。",
         gt_node=["ratio-test", "root-test", "comparison-test"],
         gt_edge=["e-G1-0"], decisive=["special case of the comparison test"], ans_rel=False),

    dict(id="C1-harmonic-nth-term", dim="rule",
         q="调和级数能说明 nth-term test 的条件非充分吗？",
         fact="能：调和级数通项→0 但发散，是条件 (10.37) 非充分的反例。",
         gt_node=["harmonic-series", "nth-term-test"],
         gt_edge=["e-G2-005"], decisive=["not sufficient"], ans_rel=True),

    dict(id="N4-root-R1", dim="numeric",
         q="根值判别法当 R=1 时结论是什么？",
         fact="(c) If R = 1, the test is inconclusive。",
         gt_node=["root-test"], gt_edge=[], decisive=["the test is inconclusive"], ans_rel=False),
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
        hit_edges = sorted(r["edges"].keys())
        gt_node_hit = [g for g in q["gt_node"] if g in hit_nodes]
        gt_edge_hit = [g for g in q["gt_edge"] if g in hit_edges]
        # 决定性串在原文命中
        src_excerpts = {}
        for k in q["decisive"]:
            lk = k.lower()
            lines = [ln for ln in source.split("\n") if lk in ln.lower()]
            src_excerpts[k] = [ln.strip()[:110] for ln in lines[:2]]
        # 共享者 = 非 gt 节点也命中
        shared_nodes = [n for n in hit_nodes if n not in q["gt_node"]]
        # 判定：答案本身由跨实体关系承载 → at-risk（不取决于决定性串命中位置）
        if q["ans_rel"]:
            verdict = "at-risk"
            reason = f"答案需跨实体关系(gt_edge={q['gt_edge']}，决定性串命中 {hit_nodes or '边/原文'})"
        elif gt_node_hit and not shared_nodes:
            verdict = "satisfied"
            reason = "决定性串唯一命中 ground-truth 节点"
        elif gt_node_hit and shared_nodes:
            verdict = "confound"
            reason = f"决定性串被共享: {shared_nodes[:4]}"
        elif gt_edge_hit:
            verdict = "at-risk"
            reason = f"决定性串仅在边命中(gt_node未命中但边 {gt_edge_hit} 承载关系)"
        else:
            verdict = "UNSAT"
            reason = f"决定性串 L0/L1 均未命中 gt (src 命中 {sum(r['src'].values())} 处，见原文摘录)"
        rows.append(dict(id=q["id"], dim=q["dim"], q=q["q"], fact=q["fact"],
                         gt_node=q["gt_node"], gt_edge=q["gt_edge"], decisive=q["decisive"],
                         hit_nodes=hit_nodes, hit_edges=hit_edges, gt_node_hit=gt_node_hit,
                         gt_edge_hit=gt_edge_hit, shared_nodes=shared_nodes,
                         verdict=verdict, reason=reason,
                         src_hits={k: r["src"][k] for k in q["decisive"]}, src_excerpts=src_excerpts))
        print(f"[{q['id']}] dim={q['dim']:8s} verdict={verdict:9s}  {q['q'][:38]}")
        print(f"    decisive={q['decisive']}")
        print(f"    gt_node={q['gt_node']} →hit={gt_node_hit}  gt_edge={q['gt_edge']} →hit={gt_edge_hit}")
        print(f"    nodes={hit_nodes[:4]}{'…' if len(hit_nodes)>4 else ''}  edges={hit_edges[:3]}{'…' if len(hit_edges)>3 else ''}")
        if src_excerpts:
            for k, ex in src_excerpts.items():
                if ex:
                    print(f"    src[{k}]×{r['src'][k]}: {ex[0]}")
        print(f"    → {reason}")
        print()
    # 汇总
    print("=" * 100)
    from collections import Counter
    by_dim = Counter(r["dim"] for r in rows)
    by_verdict = Counter(r["verdict"] for r in rows)
    print("维度分布:", dict(by_dim))
    print("判定分布:", dict(by_verdict))
    # 维度×判定矩阵
    matrix = {}
    for r in rows:
        matrix.setdefault(r["dim"], []).append(r["verdict"])
    print("\n维度×判定:")
    for d, v in matrix.items():
        print(f"  {d:8s}: {v}")
    out = os.path.join(os.path.dirname(__file__), "p10_results_v3.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"corpus": {"nodes": len(nodes), "edges": len(edges), "src_chars": len(source)},
                   "rows": rows}, f, ensure_ascii=False, indent=1)
    print("\nresults →", out)

if __name__ == "__main__":
    main()
