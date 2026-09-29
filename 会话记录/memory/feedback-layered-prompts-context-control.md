---
name: feedback-layered-prompts-context-control
description: 操控模型靠上下文编排（选什么、何时给、放哪、给谁、什么形式），不靠提示词；提示词按层组合；不担忧模型能力
metadata:
  node_type: memory
  type: feedback
  originSessionId: a4de8015-6269-4c91-b655-02785bb5459a
  modified: 2026-09-29T08:24:37.301Z
---

产品负责人 2026-09-29（学 agent 框架 3.1）：操控模型的重点是**输入的上下文及其编排组合**，不是提示词，也不是工具 / 权限这类动作范围。提示词按层次组合写：底层定义与边界、与模型无关；上层按模型、按任务叠加，以应对换模型和时间推移。不要担忧模型能力（连 pi 这种基础设施都会随模型能力变化）。

**Why:** agent 把 3.1 讲成"提示词 vs 结构（动作范围）"，偏离了项目原立场（`docs/Harness设计/02-上下文资产格式.md` §3.3）。
**How to apply:** 讨论行为约束时先问"该给它看什么事实、在什么时机"；设计提示词时分层，不写过程。详见 `docs/agent框架学习/02-pi与omp笔记.md` 3.1 条。与 [[feedback-foundation-before-experiments]] 一致。
