# M08 关系(边)审计报告(edges-G1..G4 → edges-audited.jsonl)

- 日期:2026-07-26
- 输入:edges-G1.jsonl(50)、edges-G2.jsonl(54)、edges-G3.jsonl(47)、edges-G4.jsonl(35),合计 **186 条**
- 输出:edges-audited.jsonl(**186 条**,`status` 统一置为 `"audited"`)
- 结果概览:**checked 186 / passed 186 / fixed 0 / dropped 0**

## 一、端点存在性校验(步骤 1)

将全部 186 条边的 `from`/`to` 与 nodes-merged.jsonl(81 个节点 id)逐一比对:

- **全部 372 个端点引用均命中已合并节点,无悬空引用,0 条边被删除。**
- 附带确认:被合并节点 `harmonic-partial-sum-asymptotic`(已并入 `euler-constant`,见 merge-log.md)未被任何边引用,四组抽边阶段已正确使用保留 id。

## 二、去重合并(步骤 2)

按 `from + to + rel` 三元组分组:186 条边产生 186 个互不相同的键,**无重复,0 次合并**。

相近但按规则不合并的组合(rel 不同,予以保留):

- `comparison-test → root-test`:`derives`(e-G2-034)与 `generalizes`(e-G2-036)并存;`comparison-test → ratio-test` 同理(e-G2-035 / e-G2-037)。语义各自成立(根值/比值判别法既由比较判别法推出,又是其特例)。
- `infinite-sequence → infinite-series`:`contrast`(e-G1-018)与 `prerequisite`(e-G1-019)并存,分别对应"术语辨析"与"由序列生成级数"两层关系。
- `proper-integral ↔ improper-integral`:`generalizes`(e-G4-001,improper→proper)与 `contrast`(e-G4-002,proper→improper),方向与语义均自洽。

## 三、source 证据逐字校验(步骤 3)

对全部 **190 条 source 证据**(部分边含多条),用 `grep -F`(固定字符串逐字匹配)在 `source/ch10/<file>` 中校验 `quote`:

- **190/190 全部逐字命中,0 条修复,0 条删除。**
- 同时以 Python 子串匹配做了独立复核,结果一致。
- 因无边失去全部 source 证据,**0 条边 origin 降级**。全部 12 条 `origin: "model"` 的边(如 e-G1-014、e-G1-038、e-G2-031、e-G3-026、e-G4-017)保持原值,其 model rationale 均为解释性论述,不参与逐字校验。

## 四、方向语义抽查(步骤 4)

对方向敏感的三类边共 **102 条**(prerequisite 43、derives 52、generalizes 7)逐条复核方向约定:

- **prerequisite**:约定 `A → B` = 先学 A 才能理解 B。抽样验证:e-G1-004(infinite-sequence→limit-of-a-sequence)、e-G1-020(partial-sum→infinite-series)、e-G3-035(permutation→rearrangement-of-series)、e-G4-006(proper-integral→infinite-integral)等,方向一致正确。
- **derives**:约定 `A → B` = 由 A 推导出 B。抽样验证:e-G1-031(定理10.2→定理10.3,corollary)、e-G2-006(定理10.1→定理10.7)、e-G2-014(比较判别法→极限比较判别法)、e-G3-021(Abel 部分求和公式→Dirichlet 判别法)、e-G4-014(定理10.23→定理10.24)等,方向一致正确。
- **generalizes**:约定 `A → B` = A 是 B 的推广(general → special)。全部 7 条逐一核对:e-G2-030(ζ(s)→调和级数,"special case s=1")、e-G2-031(积分判别法→10.1节积分估计法)、e-G2-036/037(比较判别法→根值/比值判别法,"special cases of the comparison test")、e-G3-008(对数级数→交错调和级数,x=1 特例)、e-G3-027(Dirichlet→Leibniz,"merely the special case")、e-G4-001(瑕积分→常义积分)。方向全部符合约定,与原文引文一致。

**结论:未发现方向明显颠倒的边,0 条修正。**

边缘案例(复核后判定保留原样):

1. **e-G4-016**(comparison-test-for-improper-integrals → dominated-integral, prerequisite)与 **e-G2-012**(dominates → comparison-test, part_of)结构上互为镜像。但原书中"dominate"(积分版)恰在定理 10.24 的 Note 中借该定理的前提引入,先见定理后见术语,prerequisite 方向可辩护,不属"明显颠倒"。
2. **e-G1-038**(nth-term-test → theorem-10-5, derives, origin=model):第 n 项判别法在书中晚于定理 10.5 出现,但作为逻辑依赖(定理 10.5 发散部分的论证模式)方向成立,rationale 已如实说明。
3. **e-G2-024/025**(geometric-series / riemann-zeta-function → comparison-test, applies_to):方向与"判别法 applies_to 适用对象"的主流用法相反(此处是"已知敛散的标准级数被比较判别法使用")。applies_to 不在本次方向抽查范围(仅 prerequisite/derives/generalizes),记录备查,未改动。

## 五、输出文件

- **edges-audited.jsonl**:186 条,字段与输入保持一致(id/from/to/rel/[label]/evidence/origin/status),仅 `status` 由 `"candidate"` 统一改为 `"audited"`;内容(端点、rel、证据、origin)与输入逐字节等价。
- rel 分布:prerequisite 43、derives 52、applies_to 25、is_a 22、other 19、contrast 14、generalizes 7、part_of 3、equivalent 1。

## 六、统计汇总

| 指标 | 数量 |
| --- | --- |
| checked(审计边数) | 186 |
| passed(无修改通过) | 186 |
| fixed(修复:证据修复/去重合并/origin 降级/方向修正) | 0 |
| dropped(删除:端点缺失/重复并除) | 0 |
| source 证据逐字校验 | 190/190 通过 |
