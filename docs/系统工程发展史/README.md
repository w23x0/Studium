# 系统工程发展史

```yaml
doc_id: SYSENG_HISTORY_INDEX
status: 现行
folder_role: LEARNING_NOTES_ONLY
authority: 不作设计依据
scope: [AGENT_HARNESS_LINEAGE, CONTEXT_ENGINEERING, TOOL_USE_HISTORY]
created: 2026-09-19
```

> **定位**：本目录是**学习资料**，记录 agent harness 这条系统工程路线的发展史与具体机制。
>
> **红线**：`FOLDER_ROLE: LEARNING_NOTES_ONLY`。本目录**不作 Studium 设计依据**——不得据此新增产品结论、不得据此改 Harness 设计、不得据此替换 `research_tree/synthesis/` 的任何决策点。它只解释「这些技术从哪来、为什么长这样」。

## 收录范围

| 收录 | 不收录 |
| --- | --- |
| agent runtime / harness 层的系统工程脉络 | 模型训练、微调、评测 |
| 文件系统 / 沙箱 / 类型 / 工具调用 / 上下文工程 | Studium 模块设计与产品决策 |
| 各概念的原始出处、时间线、机制细节 | 各厂商的商业路线与定价 |

## 文件清单

| 文件 | 内容 | 关键标签 |
| --- | --- | --- |
| [`01-史线总表.md`](./01-史线总表.md) | 1969→2026 主干时间线，分三个时代 | `[TIMELINE]` `[ERA]` |
| [`02-三个底座.md`](./02-三个底座.md) | 文件系统 / 沙箱 / 类型系统：各是什么、在 agent 里指什么、时间线 | `[FILESYSTEM]` `[SANDBOX]` `[TYPE]` |
| [`03-PTC机制.md`](./03-PTC机制.md) | Programmatic tool calling 的工作原理、push→pull、渐进式披露、实测数据、代价 | `[PTC]` `[MECHANISM]` |
| [`04-方向定位.md`](./04-方向定位.md) | 属于什么方向（ACI / context engineering / code-as-action）、谱系、相邻方向对比、中心问题 | `[ACI]` `[TAXONOMY]` |
| [`05-推演与信号.md`](./05-推演与信号.md) | 未来走向推演（**推测**）+ 观察信号 + 唯一没有旧答案的地方 | `[SPECULATION]` `[SIGNAL]` |

## 阅读顺序

```
想快速建立全貌  → 01-史线总表.md → 04-方向定位.md §1
想搞懂机制      → 02-三个底座.md → 03-PTC机制.md
想判断后续走向  → 05-推演与信号.md（先读 01）
```

## 证据等级

本目录沿用 `docs/自学方法调研/` 的证据分级约定，逐条标注：

```
LEVEL_A: 本次核对官方原文（附链接 + 日期）
LEVEL_B: 公认时间线/常识，未逐条核对原文
LEVEL_C: 推演与判断，非事实
```

**引用规范**：`[文件名:§章节:证据等级]`，例：`[03-PTC机制.md:§2:LEVEL_A]`

## 与其他文档的关系

| 文档 | 关系 |
| --- | --- |
| [`docs/Harness设计/`](../Harness设计/README.md) | 本目录提供其技术名词的历史背景；**不构成其依据** |
| [`docs/图工程调研/`](../图工程调研/README.md) | 同为学习/调研性质，但该目录是项目调研归档，本目录是通用背景 |
| [`docs/自学方法调研/`](../自学方法调研/INDEX.md) | 同级学习资料，本目录沿用其证据分级约定 |
| [`docs/文档状态总表.md`](../文档状态总表.md) | 本目录登记在「其他」区 |

## 更新日志

- 2026-09-19: 初始版本。来源为本机 pi 会话中关于 PTC / context engineering 的讨论，事实部分重新核对 Anthropic 与 Cloudflare 官方原文。
