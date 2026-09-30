---
name: feedback-llm-book-processing-serial
description: 用免费大模型（opencode zen space-bunny-free）处理书籍时先不并发，一点一点优化
metadata:
  node_type: memory
  type: feedback
  originSessionId: 0ba6f3d2-bd76-4874-a0f1-617502fd4154
  modified: 2026-09-30T06:10:47.016Z
---

2026-09-30：产品负责人给了 opencode zen 免费模型的 token 用于处理书籍（M06 质检 / M07 / M08 抽取）。要求**先别并发，一点一点优化**：一次跑一个，看结果、改一处、再跑。MinerU 格式转换不在此限（可以并发批量）。

同日追加：这条线**不需要逐步询问**；拿不准的先自检或交给子代理检验；可以直接跑长任务。

**Why:** 该模型质量未知（K&K 第 4 章抽取比 Opus 粗、漏细要点、引文不照抄）；先把单次调用调好，再谈吞吐。
**How to apply:** 大模型处理书时串行、小步迭代，每次改动记 `原型变更记录.md`；密钥只经环境变量 `STUDIUM_OC_BASE_URL` / `STUDIUM_OC_API_KEY` 传，不写入仓库。相关 [[feedback-foundation-before-experiments]]、[[feedback-test-model-choice]]
