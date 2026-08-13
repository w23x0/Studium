# 任务卡 B1c — SPARQL 上的版本化约定（命名图快照 + 应用层时态查询）
角色：深度调研树分支调研员（B1c，B1 RDF 系 R3 子任务）。
分支名：RDF/SPARQL 无原生时态算子的前提下，用命名图/应用层约定做 M09 版本查询的可行模式。

## 问题清单
1. SPARQL 1.2 是否新增任何版本/时态特性（GRU 语义、命名图变更）？官方草案原文。
2. 用"每个版本一个命名图 + 图名含时间戳/版本号"的查询模式是否有规范讨论或工程先例（如 dataset versioning 模式、PROV 结合）？
3. RDF 图 atemporal（B1 一轮结论）下，"旧版本不覆盖"如何表达：快照全量复制 vs 增量补丁图，各自的查询复杂度与先例。
4. SPARQL 服务端（Fuseki/Virtuoso/GraphDB 等）对多版本命名图的批量管理与保留是否有公开实践（官方文档为据，不做性能比较）。
5. 版本查询（"某节点在某时间点的边集合"）在 SPARQL 里如何写，是否有标准词汇（如 provenance ontology、time ontology）支撑。

## 候选空间与线索
SPARQL 1.2 草案、RDF 数据集版本化文献（Dataset Versioning 综述）、PROV-O、OWL-Time、Jena Fuseki 数据集配置文档。

## 搜索关键词
中文：SPARQL 版本化 命名图 快照、RDF 数据集 版本 查询、PROV-O 出处 命名图、OWL-Time 时间 查询
英文：SPARQL dataset versioning named graphs snapshot、RDF dataset version query patterns、PROV-O provenance named graph、temporal query RDF version

## 工作量红线
可核来源>=15 且原文到手>=10；来源类型>=3 类；候选逐一查证>=5；关键词>=4 组。

## 产出格式（发现.md，写入 research_tree/findings/B1c_SPARQL版本化_发现.md）
0 一句话结论 / 1 逐条回答 / 2 关键发现（论断+URL+标题+机构+日期+原文摘录+等级 A/B/C）/ 3 冲突与张力 / 4 未决 / 5 来源清单 / 6 判死自查。

## 禁止项
不比较厂商；不越界（时间版本理论归 B4、位点归 B4b）；不捏造来源；抓不到写"未核"；推断标 C。
