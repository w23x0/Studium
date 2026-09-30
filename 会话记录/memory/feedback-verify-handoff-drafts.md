---
name: feedback-verify-handoff-drafts
description: 交接文件里的草稿与理由不当结论；拿给产品负责人前先查原文来历和反方理由
metadata:
  node_type: memory
  type: feedback
  originSessionId: 0d3808bc-1763-4795-94a2-fb6c16af7b2b
  modified: 2026-09-29T15:31:26.575Z
---

交接文件里 agent 写的草稿、依据，转述给产品负责人前，先回原文件查来历（git log -S）和同文件里的反方理由，自己先分析一遍，再呈现。

**Why:** 2026-09-29 重审原则 2 时，我原样转述交接草稿的依据“原文写了一个闭环 = 一个对话、原型没照做”，没查就呈现；实际是后来的模块组合设计有意推翻的，且 `00` §1.4 有产品负责人“只出不回”的原始理由。产品负责人自己看出来，问“为什么你自己判断分析不到”。交接只记了支持草稿的一面。

**How to apply:** 交接草稿 = 上一个 agent 的推断，和 Harness 层一样不能当结论（见 [[feedback-own-judgment-and-validation]]）。写交接时也要把反方理由一起记下。
