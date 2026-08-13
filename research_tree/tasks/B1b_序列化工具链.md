# 任务卡 B1b — RDF 序列化工具链与逐字判等（canonicalization / 转义还原）
角色：深度调研树分支调研员（B1b，B1 RDF 系 R3 子任务）。
分支名：N-Triples/N-Quads/Turtle 的规范形态、canonicalization 与"锚点逐字字符串"判等的工程路径。

## 问题清单
1. RDF 1.2 N-Triples/N-Quads 语法中字符串转义规则（\u、\U、引号、反斜杠）官方原文：解析后还原出的字符串是否与源 markdown 逐字串完全一致？
2. RDF Dataset Canonicalization（rdf-canonize / RDFC-1.0）的规范状态与对 blank node 的处理：能否得到确定性的图指纹用于"审计晋升"？
3. 逐行追加 N-Quads 是否为合法流式写入（append-only 崩溃安全），是否有权威说明（语法层面每行独立可解析）？
4. 用 rdflib / riot / rdf-toolkit 等做"文本→RDF→文本"往返时，字符串字面量与源文本的保真度（换行、制表符、中文、全角空格）。
5. 对"锚点判等=逐字 grep -F"红线：RDF 载体上实现等价判等的推荐路径（先解析成字面量再比对 vs 直接对源文本 grep）。

## 候选空间与线索
W3C RDF 1.2 N-Triples/N-Quads 规范、RDFC-1.0 规范、rdf-canonize (GitHub)、Apache Jena riot、rdflib 文档。

## 搜索关键词
中文：N-Triples 转义 字符串 字面量 规范、RDF 规范化 规范形态、N-Quads 逐行 追加、rdflib 往返 保真
英文：RDF 1.2 N-Triples escaping rules literal、RDF Dataset Canonicalization RDFC-1.0、N-Quads append line grammar、rdflib round-trip literal fidelity

## 工作量红线
可核来源>=15 且原文到手>=10；来源类型>=3 类；候选逐一查证>=5；关键词>=4 组。

## 产出格式（发现.md，写入 research_tree/findings/B1b_序列化工具链_发现.md）
0 一句话结论 / 1 逐条回答 / 2 关键发现（论断+URL+标题+机构+日期+原文摘录+等级 A/B/C）/ 3 冲突与张力 / 4 未决 / 5 来源清单 / 6 判死自查。

## 禁止项
不比较厂商；不越界（建模模式归 B1a、校验语言归 B5/B8）；不捏造来源；抓不到写"未核"；推断标 C。
