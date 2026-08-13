# 任务卡 B5a — SHACL-SPARQL 约束组件与状态机校验
角色：深度调研树分支调研员（B5a，B5 知识表示系 R3 子任务）。
分支名：SHACL-SPARQL 扩展能否把"候选池+审计晋升+处置单"状态机写成可校验约束。

## 问题清单
1. SHACL-SPARQL 约束组件（SPARQL-based constraints）的规范原文：sparql target/constraint/function 如何注册与执行。
2. 用 SHACL-SPARQL 表达"边状态必须是 candidate/audited/promoted 之一且迁移只能按状态机"的可行性：规则是查询，违规即结果非空。
3. 状态机转换约束（如 promoted 边必须来自 audited 边、处置单单点）能否纯声明式表达，还是需要过程式检查？
4. 校验器对 SHACL-SPARQL 的支持度（pyshacl、TopBraid 等文档）与安全限制（是否默认禁用 SPARQL 扩展）。
5. SHACL-AF（Advanced Features：规则、SPARQL 规则）与约束的区别，对本项目"审计晋升"自动化的适用性。

## 候选空间与线索
W3C SHACL REC 第 5/6/7 节、SHACL-AF 规范、pyshacl 文档（SPARQL 扩展开关）、TopBraid SHACL 文档、ShEx 对照（归 B5b）。

## 搜索关键词
中文：SHACL-SPARQL 约束组件 规范、SHACL 状态机 校验、SHACL-AF 规则 自动化、pyshacl SPARQL 扩展
英文：SHACL-SPARQL constraint components specification、SHACL state machine validation workflow、SHACL Advanced Features rules、pyshacl SPARQL-based constraints security

## 工作量红线
可核来源>=15 且原文到手>=10；来源类型>=3 类；候选逐一查证>=5；关键词>=4 组。

## 产出格式（发现.md，写入 research_tree/findings/B5a_SHACL-SPARQL_发现.md）
0 一句话结论 / 1 逐条回答 / 2 关键发现（论断+URL+标题+机构+日期+原文摘录+等级 A/B/C）/ 3 冲突与张力 / 4 未决 / 5 来源清单 / 6 判死自查。

## 禁止项
不做性能评测；不越界（工具生态对照归 B5b、锚点方法归 B8）；不捏造来源；抓不到写"未核"；推断标 C。
