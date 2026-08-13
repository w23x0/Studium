# 任务卡 B1a — RDF 1.2 三元组项/再述符建模模式（M08 语义建模深挖）
角色：深度调研树分支调研员（B1a，属 B1 RDF 系的第二轮子任务）。
分支名：RDF 1.2 的 triple term / reifier 能否无损承载 M08 的"候选池+审计晋升+对齐边+锚点集合身份"。

## 问题清单
1. RDF 1.2 的 triple term（三元组作主语/宾语）与 reifier（RDF-star 风格再述符）各自语法、语义、标准状态（WD/CR/是否已 REC），官方原文。
2. 用 triple term / reifier 给"候选边/审计状态/晋升事件"建模的标准示例或规范章节：边上的状态（candidate/audited/promoted）、时间、处置单如何挂到一条边上？
3. 对齐边（M08 四图之间的桥接边）在 RDF 里如何表达"两个不同命名图/图中节点对齐"？命名图+reifier 的组合是否有规范讨论或先例？
4. 锚点集合作为节点身份：RDF 里能否把"一组逐字字符串"作为资源身份（如 bnode 结构 vs IRI vs 带文字属性的资源），哪种方式可被机器判等（等价于逐字 grep -F 的语义）？
5. 同一 RDF 图文件保持"追加即合法"（append-only）需要什么序列化性质（N-Triples 行追加、canonicalization、解析转义对逐字字符串判等的影响）。

## 候选空间与线索
W3C RDF 1.2 概念/语义/序列化（N-Triples/N-Quads/Turtle）、RDF-star 工作组报告、rdfjs/RDF 工具链（rdf-canonize、N-Quads 逐行追加）、命名图与引用的先例文献。

## 搜索关键词
中文：RDF 1.2 三元组项 再述符 标准状态、RDF-star 命名图 边属性、N-Triples 逐行追加 合法性、RDF 节点身份 锚点
英文：RDF 1.2 triple terms reifiers candidate recommendation status、RDF-star statement annotation named graph、N-Triples append-only line grammar、RDF canonicalization round-trip string escaping

## 工作量红线
可核来源>=15 且原文到手>=10；来源类型>=3 类（W3C 规范/工作组报告、学术论文、工程实现）；候选逐一查证>=5（triple term、reifier、命名图、canonicalization、N-Triples 追加）；关键词>=4 组。

## 产出格式（发现.md，写入 research_tree/findings/B1a_RDF12建模_发现.md）
0 一句话结论 / 1 逐条回答（对应 5 个问题）/ 2 关键发现（论断+URL+标题+机构+日期+原文摘录+证据等级 A 原文到手/B 二手/C 推断；抓不到写"未核"）/ 3 冲突与张力 / 4 未决 / 5 来源清单 / 6 判死自查。

## 禁止项
不比较数据库厂商/引擎；不越界（属性图语言归 B2、SHACL/ShEx 归 B5）；不捏造来源；不把"RDF 必须选"当预设结论；推断一律标 C。
