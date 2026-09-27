---
name: feedback-own-judgment-and-validation
description: 做原型实验时保持自己的判断、先找根因再改，改动先自己检验，不把产品负责人的真人试用当唯一测试
metadata:
  node_type: memory
  type: feedback
  originSessionId: e6b36b9b-fd87-47cb-b08a-bcd2ec395a02
  modified: 2026-09-27T13:08:08.022Z
---

产品负责人 2026-09-27 指出 agent “有一点失去自己的判断”：一整天按每条反馈打补丁，提示词越加越长又整段精简，改动互相混在一起；产品负责人成了唯一的测试者。要求：检验由 agent 来做，按自己的分析判断教学系统哪里有问题，不必过分依赖会话上下文。

**Why:** 逐条补丁掩盖了根因（如 me-7 的根因是闭环没有锚定知识点，而不是提示词措辞），也浪费产品负责人的时间和额度。

**How to apply:** 收到反馈先问“根因在哪一层”（审查单 / 组合层 / 原型 / 提示词），再改；设计好的闭环交给真人前先自审（是不是完整知识点、主张讲知识还是讲题）；提示词改动先用已有运行回放或模拟检验。每次改动记入 `docs/Harness设计/_research/原型变更记录.md`（含依据与原因）。与 [[feedback-experiments-only-when-needed]] 配合：自检优先用离线 / 回放，少跑昂贵实验。
