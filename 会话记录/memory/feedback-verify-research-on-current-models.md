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

2026-09-30 补充：外部调研（社交媒体、Grok / Gemini 转述、摘要工具）结论常被说重或说偏——StudentSim 被转述成“模拟学生太容易被纠正”，原文没有；Apple 记忆论文官网写“有害”，正文收回为“不值那个价”。产品负责人：最关键的是把边界和条件确定好，不然会迷惑。

**How to apply:** 外部结论先读正文（不只摘要、不信转述），逐条标边界：测的模型与版本、任务、样本量、作者自认局限、与我们条件哪里不同；只取原理层面的内容与反例。引用模型行为类研究时，写明它测的模型与时间，标“待实测”；依据它做的设计先降为待定，实测后再定。实验注意额度：先设计、按需跑、规模从小开始，子代理不许自行追加实验。参见 [[feedback-test-model-choice]]、[[project-model-lineup]]。
