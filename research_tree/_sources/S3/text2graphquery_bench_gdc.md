# Text2GraphQuery-Bench（arXiv 2602.11745）— GDC Text2GraphQuery 工作组的首个 benchmark

> 来源：https://arxiv.org/abs/2602.11745 ；GDC Text2GraphQuery 工作组页 https://ldbcouncil.org/gql-community/text2gq/
> 抓取：2026-08-13（WebFetch）｜等级 A（arXiv 摘要到手）/ A（GDC 页到手）

## arXiv 2602.11745

- 标题：Text2GraphQuery-Bench: A Text to Graph Query Benchmark
- 作者：Songlin Lyu, Lujie Ban, Zihang Wu, Tianqi Luo, Jirong Liu, Ayoub Moussaid, Oskar van Rest, Heng Lin, Chenhao Ma, Nan Tang, Shipeng Qi, Yongchao Liu, Zhan Qiu, Juelu Zhang, Jiajun Zheng
- **v1 提交 2026-02-12；v2 修订 2026-08-05**（非常新）
- 首个覆盖全部主流声明式属性图查询语言（Cypher、GQL、SQL/PGQ）的 benchmark：267,276 条 (Question, Graph Query) 对，34 个数据库、13 个领域。
- 关键结果：GQL 与 SQL/PGQ 的零样本语法准确率远低于 Cypher，但 few-shot 大幅缩小差距；8B 微调模型可匹敌零样本大模型——"unfamiliarity – rather than model capacity – is the primary barrier"。

## GDC Text2GraphQuery 工作组页

- 联席组长：Shipeng Qi (Ant Group)、Alastair Green (JCC)。
- 章程 PDF：text2gq-work-charter-v0.1.2.pdf。
- 近期产出：Text2GQL-Bench preprint（即上述 arXiv 2602.11745）；数据生成器与 driver 托管于 ldbc GitHub 组织。
- 页面将 LEX 列为 "Schema WG (LEX)"，与 Text2GraphQuery 并列于 "Query Languages & Data Models" 板块。

## 调研员判断

- GDC 把 LEX 与 GQL 实现活动并入 Text2GraphQuery 项目（Alastair TUC20 deck），Text2GQL-Bench（2026-02/08）是该方向的新产出——**新进展**（生态/社区侧）。
- 对"9+other 词表封闭/属性图校验"缺口：该 benchmark 聚焦"文本→查询"，间接推动 GQL 可用性，但与 PG-Schema 校验缺口无直接关系。
