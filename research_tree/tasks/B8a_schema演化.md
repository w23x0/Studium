# 任务卡 B8a — schema 演化机制细节（Avro / Protobuf Editions / JSON Schema）
角色：深度调研树分支调研员（B8a，B8 校验迁移系 R3 子任务）。
分支名：格式内嵌的 schema 演化机制（兼容性规则细节）对 JSONL 现状的强化路径。

## 问题清单
1. Avro schema resolution 的兼容性规则原文（reader/writer schema 匹配、promotion、default 值）——哪些字段变更安全。
2. Protobuf Editions（edition 2023）的字段演化规则原文（reserved、features、最小破坏原则、每年一版）。
3. JSON Schema 2020-12 的 $dynamicRef/$recursiveRef、unevaluatedProperties 等用于"开放字段+封闭词表"并存的能力。
4. 这些机制的共同点：字段重命名/类型放宽/枚举增补/弃用标记的推荐做法（各规范原文）。
5. 对 M08"边词表封闭 9+other、开放字段可稳定查询审查"：哪种演化机制能保证"枚举增补不破坏旧数据校验"（推断标 C，以规范为据）。

## 候选空间与线索
Avro 规范（avro.apache.org）、Protobuf Editions 说明（protobuf.dev）、JSON Schema 2020-12 核心与验证、IETF draft 文档。

## 搜索关键词
中文：Avro schema 解析 兼容 规则、Protobuf Editions 演化 规则、JSON Schema 动态引用 开放字段、schema 演化 枚举 增补
英文：Avro schema resolution compatibility rules、Protobuf Editions feature evolution rules、JSON Schema 2020-12 unevaluatedProperties dynamicRef、schema evolution enum addition backward compatibility

## 工作量红线
可核来源>=15 且原文到手>=10；来源类型>=3 类；候选逐一查证>=5；关键词>=4 组。

## 产出格式（发现.md，写入 research_tree/findings/B8a_schema演化_发现.md）
0 一句话结论 / 1 逐条回答 / 2 关键发现（论断+URL+标题+机构+日期+原文摘录+等级 A/B/C）/ 3 冲突与张力 / 4 未决 / 5 来源清单 / 6 判死自查。

## 禁止项
不做格式选型结论；不越界（校验语言归 B5）；不捏造来源；抓不到写"未核"；推断标 C。
