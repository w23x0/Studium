---
name: feedback-keep-owner-originals
description: 清理审查单时不直接删产品负责人确认过的内容——原文移到撤下原文 / 暂缓设计，验证过的进设计资产
metadata:
  node_type: memory
  type: feedback
  originSessionId: dee65156-0495-4b76-a77d-c2b9b8639b8c
  modified: 2026-09-28T14:29:55.237Z
---

清理审查单 / 组合层时，产品负责人确认过的内容**不直接删**：
- 实验验证过的 → `docs/设计资产/`（按主题，结论 + 验证条件 + 证据 + 在用否）
- 被新定义取代的 → `docs/模块需求设计/撤下原文/`（原文 + 撤下原因 + 去向）
- 未来范围 / 未验证但还想做的 → `docs/模块需求设计/暂缓设计/`
“内容偏了就删”只用于 agent 自己写、未经确认的内容。

**Why:** 产品负责人 2026-09-28：“我怕你删了之后方向偏了我都没发现，还找不到原想法”；git 历史对他不算“找得到”。
**How to apply:** 删审查单里任何一段之前，先判断属于哪一类并移走原文，再删；规则已写进 CLAUDE.md「文档规范」。相关：[[feedback-sheets-authority-declined]]
