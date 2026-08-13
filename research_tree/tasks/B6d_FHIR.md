# 任务卡 B6d — FHIR 健康档案资源版本化（纯文件模式）先例
角色：深度调研树分支调研员（B6d，B6 先例系 R3 子任务）。
分支名：FHIR 资源版本机制（_history / versionId / 纯文件模式）对 M09 的借鉴。

## 问题清单
1. FHIR 资源版本化规范原文：versionId、meta.versionId、资源不可变 vs 更新语义（Resource versioning 章节）。
2. FHIR 的 _history 交互：如何取某资源全部历史版本、旧版本是否保留（规范原文）。
3. FHIR "纯文件"存储模式（B6 一轮已提）：把版本放资源自身的公开说明/教程（fhir-server 文档、HL7 讨论）。
4. FHIR 对"推翻旧结论/纠正"的建模（如 Condition 状态机、撤回）与 M09"复检新版本"对照。
5. 可借鉴的最小集合：资源级版本 id、历史端点、审计（Provenance 资源）——哪些直接可移植到个人知识图谱。

## 候选空间与线索
HL7 FHIR R4/R5 规范（Resource、_history、Provenance）、FHIR 纯文件实现（如 FHIR 无服务器/文件仓库）、HAPI FHIR 文档。

## 搜索关键词
中文：FHIR 资源 版本 versionId 历史、FHIR _history 交互、FHIR 纯文件 存储、FHIR Provenance 审计
英文：FHIR resource versioning versionId _history spec、FHIR file-based storage mode、HL7 FHIR provenance audit resource、FHIR condition status retraction

## 工作量红线
可核来源>=15 且原文到手>=10；来源类型>=3 类；候选逐一查证>=5；关键词>=4 组。

## 产出格式（发现.md，写入 research_tree/findings/B6d_FHIR_发现.md）
0 一句话结论 / 1 逐条回答 / 2 关键发现（论断+URL+标题+机构+日期+原文摘录+等级 A/B/C）/ 3 冲突与张力 / 4 未决 / 5 来源清单 / 6 判死自查。

## 禁止项
不做医疗软件选型；不越界（健康领域仅作先例）；不捏造来源；抓不到写"未核"；推断标 C。
