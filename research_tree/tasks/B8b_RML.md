# 任务卡 B8b — RML/YARRRML 映射工程成熟度与迁移工具链
角色：深度调研树分支调研员（B8b，B8 校验迁移系 R3 子任务）。
分支名：RML/YARRRML 从 JSONL/表格/文本到图数据的机械转换能力与工具链细节。

## 问题清单
1. RML 规范（rml.io）与 RML-Core 的映射构件：triples map、logical source、term map 官方原文；自述标准地位。
2. YARRRML 语法对人可读性的承诺与参考实现（YARRRML Parser）支持的 profile（R2RML/RML/RMLT）官方文档原文。
3. RML 处理器生态：有哪些维护中的实现（如 RMLMapper、SDM-RDFizer、rocketrml），各自输入/输出（官方仓库为据，不做性能比较）。
4. 从"现有 JSONL 行"映射到 RDF 三元组/属性图：源为 JSON 的 logical source 是否成熟（先例/教程）。
5. 映射规则本身的版本化与校验：RML 规则文件可 grep/可审计吗（规则是 Turtle/YAML 文本）——与"校验规则可版本化"增益的关系。

## 候选空间与线索
rml.io 规范、YARRRML spec（github）、RMLMapper、SDM-RDFizer、rocketrml 仓库、R2RML W3C REC 对照。

## 搜索关键词
中文：RML 映射 规范 处理器、YARRRML 人可读 映射、JSONL RDF 映射 工具、R2RML RML 区别
英文：RML mapping specification triples map、YARRRML human readable mapping language、RMLMapper JSON source mapping、RML processor implementation comparison

## 工作量红线
可核来源>=15 且原文到手>=10；来源类型>=3 类；候选逐一查证>=5；关键词>=4 组。

## 产出格式（发现.md，写入 research_tree/findings/B8b_RML_发现.md）
0 一句话结论 / 1 逐条回答 / 2 关键发现（论断+URL+标题+机构+日期+原文摘录+等级 A/B/C）/ 3 冲突与张力 / 4 未决 / 5 来源清单 / 6 判死自查。

## 禁止项
不做处理器性能评测；不越界（schema 演化归 B8a）；不捏造来源；抓不到写"未核"；推断标 C。
