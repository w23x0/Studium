# 任务卡 B1 — RDF/语义网系
角色：深度调研树分支调研员（B1）。
分支名：RDF 数据模型、序列化与 SPARQL 对个人知识图谱的适配性。

## 问题清单
1. RDF 数据模型（三元组/四元组、命名图）能否无损表达：不变量层与表示层节点、跨层对齐边、节点身份=锚点集合（锚点为逐字字符串）、封闭边词表 9 类+other、边挂候选池状态字段？逐项给出对应建模方式或"不可直接表达"。
2. SPARQL 1.1/1.2 对以下查询类的表达能力：沿锚点做逐字匹配、机械信号定向类统计查询（度分布、孤立节点、词表外用法计数）、跨时间快照查询（M09 多版本）？哪些需要扩展或落到应用层？
3. RDF-star / RDF 1.2 的 quoted triple 能否给单条边附加证据/出处/置信元数据？标准化状态（日期、阶段）？
4. 锚点硬校验=逐字 grep -F：Turtle/N-Triples 序列化上，锚点字符串的转义/规范化（Unicode、字面量转义）会不会破坏逐字判等？N-Triples 的确定性是否比 Turtle 更强？
5. N-Quads 与 append-only 追加写入的兼容性：追加行是否天然合法？与 JSONL 现状相比增益在哪？

## 候选空间与线索
Turtle、N-Triples、N-Quads、RDF/XML（对照）、JSON-LD（序列化视角）、TriG、RDF-star/SPARQL-star、RDF 1.2 工作组草案。线索：W3C RDF 1.1 推荐标准（2014）；RDF 1.2 / SPARQL 1.2 由 RDF-star 工作组推进；JSON-LD 1.1 是 W3C 推荐标准。

## 搜索关键词
中文：RDF 序列化 比较 Turtle N-Triples、RDF-star 边属性 标准、SPARQL 版本化 查询、命名图 出处
英文：RDF-star quoted triples edge metadata、N-Quads append-only log、SPARQL bitemporal query patterns、RDF 1.2 working group status、N-Triples canonical form literal escaping

## 工作量红线
可核来源>=15 且原文到手>=10；来源类型>=3 类（W3C 标准原文/学术论文/工程文档或先例项目）；候选逐一查证>=5（Turtle、N-Triples/N-Quads、RDF-star、JSON-LD、SPARQL 至少各一）；关键词>=4 组。

## 产出格式（发现.md）
0 一句话结论 / 1 逐条回答（对应问题 1-5）/ 2 关键发现（每条：论断+来源URL+标题+机构+日期+原文摘录+证据等级 A 原文到手/B 二手/C 推断）/ 3 冲突与张力 / 4 未决问题 / 5 来源清单 / 6 判死自查（逐条确认：无无来源论断/无二手当原文/无越界漏答/无推断当结论）

## 禁止项
不越界（本体语言归 B5、时间版本归 B4、先例归 B6）；不捏造来源，抓不到原文写"未核"；不做厂商/引擎对比；不得预设 RDF 优于/劣于 JSONL 的结论。
