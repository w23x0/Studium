---
name: feedback-sim-before-human-trials
description: 2026-09-28 起非必要不做真人试用，改用模型模拟实验；先把方向与结构（交互契约）理顺再实验
metadata:
  node_type: memory
  type: feedback
  originSessionId: 95b1b55b-9e52-4a77-89da-6d47fbc08495
  modified: 2026-09-28T15:57:46.583Z
---

2026-09-28 产品负责人：接下来非必要不做真人对话实验，改用模型模拟实验；在此之前先继续优化方向和结构（交互契约由结构保证，见技术方向原则 7）。

**Why:** me-8 / me-9 两次真人试用已找到根因（契约定错 / 编程契约漏进学习），再做真人试用前应先有新结构；真人时间贵。

**How to apply:** 设计改动先用模拟学习者（[[feedback-test-model-choice]]）自检；只有模拟判断不了的（如真实注意力、体验）才请产品负责人试用。与 [[feedback-experiments-only-when-needed]] 一致：实验只做需要确认的。
