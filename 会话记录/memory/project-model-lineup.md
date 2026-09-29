---
name: project-model-lineup
description: 项目支持的模型范围：现在只做 Opus 5.5 与 Sonnet 5.5，后续 OpenAI、DeepSeek，再后 Kimi、智谱
metadata:
  node_type: memory
  type: project
  originSessionId: a4de8015-6269-4c91-b655-02785bb5459a
  modified: 2026-09-29T02:51:39.388Z
---

产品负责人 2026-09-29 定：只做几个好模型。主流三家 Claude / OpenAI / DeepSeek，之后加 Kimi、智谱（Z）；**目前只做 Claude Opus 5.5 和 Sonnet 5.5**。模型适配这一块保持适中，不为弱模型大改外壳；要加的外壳功能逐个评估。

**Why:** 学 pi / omp 对比时得出：omp 的外壳改动主要拉高弱模型；我们不追全模型覆盖。
**How to apply:** 设计外壳（工具格式、提示词）时以这两个模型为准；不因兼容其他模型加复杂度。与 [[feedback-test-model-choice]] 的测试分工不冲突。
