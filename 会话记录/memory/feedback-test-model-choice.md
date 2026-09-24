---
name: feedback-test-model-choice
description: 原型测试时判断调用用最强模型，只有模拟学习者用便宜模型（DeepSeek via oc:）
metadata:
  node_type: memory
  type: feedback
  originSessionId: 44a4e163-961e-4f35-aa8c-a2f7a195bf0e
  modified: 2026-09-23T09:32:38.378Z
---

原型测试中，判断点（M05 设计 / 教学调用 / 守卫 / M05 改线）保持当下最强模型（opus）；模拟学习者用便宜模型 `oc:deepseek-v4.1-flash`（OpenCode Go，OpenAI chat completions 接口，密钥在 proto/.env，agent 无权读写 .env）。

**Why:** 产品负责人担心弱模型效果差会被误读成架构问题，进而堆提示词 / 流程补丁造成过度设计，模型变强后减不掉负重；同时 opus 测试很耗额度。

**How to apply:** 不为省额度把判断点换成弱模型；省额度靠少跑（见 [[feedback-experiments-only-when-needed]]）、缓存、模拟学生换便宜模型。
