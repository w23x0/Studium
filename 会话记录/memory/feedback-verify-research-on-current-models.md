---
name: feedback-verify-research-on-current-models
description: 外部论文的模型行为结论几个月就过时，先用当下模型实测再作设计依据
metadata:
  node_type: memory
  type: feedback
  originSessionId: 8c979555-7efc-4ad4-bc1f-158b1a4f4c58
  modified: 2026-09-29T03:51:43.486Z
---

外部研究里关于模型行为的结论，不能直接当设计依据；要先判断它测的是什么模型、是不是已经过时，再用当下的模型（Opus 5.5 / Sonnet 5.5）实测。

**Why:** 2026-09-29，“模拟学生一被纠正就学会”（arXiv 2605.12748，测的是开源 4B–120B 模型）被我拿来论证学习者模型要分两次调用；实测（`proto/runs/simcheck-sfs/`）发现 Opus 5.5 / Sonnet 5.5 并不这样，论文结论不适用。产品负责人：这种结论几个月就会过时，测试就知道了。

**How to apply:** 引用模型行为类研究时，写明它测的模型与时间，标“待实测”；依据它做的设计先降为待定，实测后再定。实验注意额度：先设计、按需跑、规模从小开始，子代理不许自行追加实验。参见 [[feedback-test-model-choice]]、[[project-model-lineup]]。
