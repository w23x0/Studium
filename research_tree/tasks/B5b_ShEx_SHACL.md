# 任务卡 B5b — ShEx vs SHACL 工具生态与封闭世界校验落地
角色：深度调研树分支调研员（B5b，属 B5 知识表示系的第二轮子任务）。
分支名：SHACL 与 ShEx 的工程生态现状，封闭词表（9+other）与引用完整校验的实际工具链。

## 问题清单
1. SHACL 的实现清单（W3C 官方列出的实现、活跃维护的库：如 pyshacl、TopBraid、rdf4j shacl）与各实现支持的 SHACL 特性（官方仓库文档原文）。
2. ShEx 的实现与工具（shex.js、shexjava、PyShEx）及与 SHACL 的互操作（SHACL 与 ShEx 互相转换的研究/工具）。
3. 封闭词表校验：SHACL sh:in / sh:closed 与 ShEx valueSet / CLOSED 的语义原文，能否表达"边词表=9 个固定值+other"？
4. 引用完整校验：SHACL/ShEx 表达"锚点引用的源文档必须存在""边两端节点必须存在"的能力与限制（是否需要 SPARQL/JS 扩展，SHACL-SPARQL 约束组件）。
5. 对 522 节点/1433 边规模，pyshacl/ShEx 等工具的实际可用性：命令行、退出码、性能与安装维护成本（工程文档为据，不做评测）。

## 候选空间与线索
W3C SHACL REC（2017）、ShEx 规范（社区）、pyshacl GitHub、shex.js GitHub、SHACL 实现列表（W3C wiki）、SHACL-SPARQL 扩展。

## 搜索关键词
中文：SHACL 实现 列表 工具、ShEx 校验 工具 生态、SHACL sh:closed 封闭 词表、SHACL-SPARQL 约束组件
英文：SHACL implementations list W3C、ShEx validator tools shex.js、SHACL sh:closed closed shape closed vocabulary、SHACL-SPARQL constraint component

## 工作量红线
可核来源>=15 且原文到手>=10；来源类型>=3 类（W3C 规范、工程仓库、学术论文）；候选逐一查证>=5；关键词>=4 组。

## 产出格式（发现.md，写入 research_tree/findings/B5b_ShEx_SHACL_发现.md）
0 一句话结论 / 1 逐条回答 / 2 关键发现（论断+URL+标题+机构+日期+原文摘录+等级 A/B/C）/ 3 冲突与张力 / 4 未决 / 5 来源清单 / 6 判死自查。

## 禁止项
不做性能评测（只核文档承诺与功能边界）；不越界（RDF 语法归 B1、校验迁移归 B8）；不捏造来源；抓不到写"未核"；推断标 C。
