---
name: feedback-experiments-only-when-needed
description: 原型改动后不要每次都跑模拟实验；只对真正需要确认的设计假设做实验
metadata:
  node_type: memory
  type: feedback
  originSessionId: 1feaef08-28ac-4ce1-b71a-84b62117bb32
  modified: 2026-09-23T05:22:00.837Z
---

改完原型不必每次跑模拟验证；只在“我们很需要确认的东西”上做实验。边缘前提（如“学习者什么都会”）不是重点。

**Why:** 产品负责人 2026-09-23 指出：每次实验耗时，且测的前提不一定是重点。
**How to apply:** 小改动做离线解析检查即可；要跑 `studium.sim` 前先想清楚要确认的是不是主线上的关键假设，不是就不跑。
