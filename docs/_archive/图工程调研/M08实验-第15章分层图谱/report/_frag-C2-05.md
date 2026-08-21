# _frag-C2-05（G3d + G3e）

原文已回查。G3d 与 G3e 冲突处按 G3e 裁决取值。

## 主体

1. `G3d` §5.2 — 6 条跨教材边整行原地换引文、origin 仍 `model`：`edges-X.jsonl:109` 新 quote 取 15.14.md:18（实测 113 字符）、`:110` 取 15.14.md:66（53）、`:111` 取 15.13.md:93（38）、`:112` 取 15.15.md:3（73）、`:117` 取 15.08.md:23（55）、`:120` 取 15.14.md:58（93）。**采纳**：原引文只截假设句或引出半句（死因 6），新引文提案方已 grep 逐字连续、不跨行、全在 30–200 内。
2. `G3d` §5.2 — `:112` 同时改 dst 为 `strang:projection-onto-a-subspace`，带 `rel_note: "对齐的是最优性/最近点那一面"`。**采纳**，前置第 9 条：15.16 是最优性定理，推广不了公式 $p=A(A^{\mathsf T}A)^{-1}A^{\mathsf T}b$。
3. `G3d` §5.2 — `:117` 带 `rel_note: "只推广 Strang 那条 iff 的独立+计数那一半，不含矩阵可逆刻画"`。**采纳**，前置第 9 条。
4. `G3d` §5.4 — `:115` rel `generalizes → contrasts`，quote 不变。**采纳**：Strang 侧原文即 "both bases for the same vector space"，两侧一般性相当，差别在证明手段。
5. `G3d` §5.4 — `:116` rel `generalizes → equivalent`，quote 不变。**采纳**：两侧都是「基的元素个数」，同一定义两种表述。附带：改完须重跑对称边去重（G3d 实测当前无反向边）。
6. `G3d` §5.1 — 删除 `data/edges-X.jsonl:107` 整行，原行 `{"src": "apostol:euclidean-space", "rel": "generalizes", "dst": "strang:orthogonal-vectors", "origin": "model", "evidence": {"file": "15.10.md", "quote": "A real linear space with an inner product is called a real Euclidean space."}}`。**采纳**（死因 6+5）：空间 vs 两向量间关系不同类，quote 未提正交，`:121` 已承担正确配对。G3e 步 13 要求本删除排在同文件步 9–12 后、按行号倒序；G3e §一 结论 3 已核不产生悬空（`apostol:euclidean-space` 余 21 条边，`strang:orthogonal-vectors` 仍有 `:54`、`:121` 与 `inherited/edges-S1.jsonl:60/61/62`）。
7. `G3d` §5.3 — `:108` src 改指 `apostol:orthogonal-complement`。**不采纳**（L-1），依 G3e C2 改为给 `:108` 加 `rel_note`「Apostol 侧的 ⊥ 对任意子集有定义，Strang 侧只对子空间定义」，前置第 9 条；`rel_note` 若不合法则原样不动。
8. `G3d` §5.6 — 撤回 `:124` 的 contrasts。**不采纳**（L-2），依 G3e C3 改为给 `:124` 补 `rel_note` 记「地位相反」。
9. `G3e` 步 1 — 先裁决 `rel_note` 能否出现在非 `other` 关系上并写进 SPEC。**采纳为前置项**：G3d §5.2 标「未在 SPEC 找到明文允许或禁止，未核」，本片第 2、3、7、8 条全挂其下。
10. `G3d` §二 — 15 条 `origin=model` 带 quote 的 origin 一律不改，「应改 source 的 0 条」。**采纳**：origin 记的是边的关系断言来源，Apostol 第 15 章通篇不提 Strang。逐字核验 15/15 通过，字符数与 `tmp_index/unverified-model-quotes.tsv` 的 charlen 列逐条一致，0 条跨行。
11. `G3e` §一 结论 2 — G3c 撤 `edges-H2.jsonl:18`、`:19` 后保留节点、接受孤点：`apostol:ext-uncited-dimension-of-a-second-order-de-solution-space`、`apostol:ext-uncited-unit-coordinate-basis-of-vn` 度归零，仍留 `nodes-H2.jsonl:10,11` 并各排 FIX。**采纳**：二者承载「15.08 例1/例3 静默借用无出处」且图里无别的载体。SPEC 若加「节点须至少一条边」则回改为撤节点。
12. `G3e` 〇 — 记账更正：H-cross 是 **25** 条不是 24，`edges-A2-x2.jsonl:21`（`apostol:cx-metric-criteria-for-orthogonality --contrasts--> strang:pythagorean-law-orthogonality`）住在 X 文件外，G3d 与 横向-跨教材差异.md 均漏计；H 层合计 15+19+25=59。**采纳**。
13. `G3e` C1 — `15.07.md:17` 合并后有 4 个持有者（G3b 行 7 锚 0、G3c line 13/14 各 173 字符整行、G3d `:113` 的 65 字符后半句），口径统一为「新引入源行数 = 0」。**采纳为记账口径**。
14. `check_graph` 分母**冲突未决**：G3d §5.7 称 916 → 930，G3e 步 17 称 916 → 914（E1/E13 转 model）。基准不同，须主控统一后再报数。
15. `G3e` §四 — 待核计数差：横向-跨教材差异.md:7 写 edges-X「162 条对齐边」，实际行号连续 1–161 共 161 行，缺号唯一为 162；归因未核（末尾空行 / 确有一条未写入）。**采纳为待核项**。
16. `G3e` 步 17 预期账面（自报合并、未实跑，不作已核数字用）：全图边 1433 → 1424、H1 15 → 11、H2 19 → 15、H-cross 25 → 24、带 evidence 边 931 → 928；generalizes 16 → 14、contrasts 6 → 7、equivalent 0 → 1、alias-of 3 不变。

**本片未覆盖**：G3e §五与§顺带发现原文仍是空占位 `<!--BLOCK-5-->`/`<!--BLOCK-6-->`，只有〇 一句「可疑新增 4 条（3 alias-of + 1 条 X 文件外跨教材 contrasts）」，无明细可装配。G3e C4（`edges-H1.jsonl:7`）及其前置自核作用于 G3a/edges-H1，不属本片范围。

## 落选项

- L-1 `G3d` §5.3 `:108` 改指：evidence 明说 "whether or not S itself is one"，新 src 只覆盖 is one，改后引文不支撑断言（死因 6），并消掉 横向-跨教材差异.md §3.3 的差异。
- L-2 `G3d` §5.6 撤 `:124`：它是 §3.4「同一公式在两书地位相反」唯一载体，词表无「一般化+地位相反」单一词，择一必丢一半信息；G3d 自标待裁。
- L-3 `G3d` §三 evidence 扩数组或新增 `evidence_dst`：schema 改动非 data/ 条目，移出本轮。
- L-4 `G3d` §二末 SPEC 加「evidence 存在即须逐字校验」并改 check_graph：SPEC+工具改动，移出本轮；15/15 已过，追溯成本为零。
- L-5 `G3e` X-1 新增 `apostol:orthogonal-to-a-set --contrasts--> strang:orthogonal-complement`：会与 `:108` 抢同一引文构成 B 型借用，已并入第 7 条。
- L-6 `G3e` X-2 新增 `apostol:finite-basis --contrasts--> strang:basis`：须先裁 evidence 是否扩数组，否则单侧落地重犯 G3d 批评的问题。
- L-7 `G3e` X-3 Gram-Schmidt（§4.3）补边：需 Strang 4.3/4.4 anchor，超出 manifest 的 3.3–3.5/4.1–4.2，属越界取证，只登记缺口。
- L-8 `G3e` H-back 缺口 1 新建 ext 节点：G3e 自倾向补 origin_note 并入 §1.3「刻意不建」名单，且判据未回读 15.03.md 例4。
- L-9 `G3d` 顺带发现（`nodes-A1.jsonl:47`/`:48` 疑缺 is-a/alias-of；Strang 侧 node_type 用词表外 `notation`/`method`）：新问题，不属 H 层总装。
