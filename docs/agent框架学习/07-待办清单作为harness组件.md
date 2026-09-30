# 待办清单作为 harness 组件：现状核对

> 状态：待定（2026-09-30 建）。产品负责人问“以待办清单为核心组件的 harness 是什么、过时了没有”，联网核对后记录。**参考材料，不作产品结论**。

## 1 是什么

给模型一个“写待办清单”的工具：长任务开始时拆步骤，做完一步标一步；外壳保存清单并反复放回模型眼前。工具对外界不做任何事，只改变模型下一步看到的内容，属于上下文编排手段（接 `02-pi与omp笔记.md` §3 的 3.1）。它的作用分两半：

| 作用 | 解决什么 |
| --- | --- |
| 提醒注意力 | 长上下文里开头的目标被“淹没在中间”；重写清单把目标放到上下文末尾 |
| 进度存在模型外面 | 任务长过一次上下文（压缩、换会话、派子 agent）时能接着做 |

## 2 核对结果（2026-09-30）

| 框架 | 现状 | 原因 / 证据 | 来源等级 |
| --- | --- | --- | --- |
| Claude Code | 2026-01-22（v2.1.16）TodoWrite 改为 Tasks：存文件系统，跨会话、跨子 agent 共享，带依赖（A 完成才能做 B） | 团队原话：Opus 4.5 能自主跑得更久、更会跟踪自己的状态，“小任务里 TodoWrite 已经没必要了”；长项目需要跨会话协调 | @trq212 帖子（X 原帖未能打开，读的是[转载](https://youmind.com/landing/x-viral-articles/claude-code-tasks-update)）；[claudelog](https://www.claudelog.com/faqs/what-are-tasks-in-claude-code/) |
| Manus | 早期执行 agent 自己维护 `todo.md`，每步重写到上下文末尾（“复述”）；后改为专门的规划 agent 管拆解与清单，执行 agent 只干活 | 约三分之一的动作花在更新清单上，浪费 token | [Manus 博客 2025-07](https://manus.im/zh-tw/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)（复述）；[Lance Martin 笔记 2025-10-15](https://rlancemartin.github.io/2025/10/15/manus/)（改法，二手） |
| deepagents（LangChain） | 早期把规划工具 `write_todos` 列为核心组件；现在 SDK 默认不带，README 能力清单里也没有规划 | 源码注释原文 “the SDK no longer provides it by default”；只在 OpenAI Codex 的模型配置里单独加回，Claude 模型的配置（Haiku 4.5 / Sonnet 4.6 / Opus 4.7）都不加 | 源码 `libs/deepagents/deepagents/profiles/harness/_openai_codex.py:70-78`（main 浅克隆，提交 1756bbe，2026-09-29） |
| pi | 从来不内建待办 | 作者理念：模型本来就会，外壳越薄越好 | `02-pi与omp笔记.md` §1 |

## 3 结论（对问题本身）

| 半 | 过时了吗 |
| --- | --- |
| 提醒注意力 | 在变旧：模型自己能跟踪进度了；三家都不再把“主 agent 自己写待办”当默认核心 |
| 进度存在模型外面 | 没过时，在加强：Claude Code 升级为跨会话共享状态，Manus 交给专门的规划方 |

## 4 对项目的线索（不是结论）

| 线索 | 依据 |
| --- | --- |
| 内建待办与否按具体模型实测定，不当框架固定部件 | deepagents 按模型配置取舍；记忆「论文结论先实测」 |
| 跨会话进度属于状态管理，与 `任务线路.md`、M15 状态层同类，不靠模型自记 | §3 |

## 5 不确定

| 项 | 状态 |
| --- | --- |
| Claude Code 帖子原文 | 只读到转载；官方更新日志现只保留近期版本，查不到 2.1.16 |
| Manus 改用规划 agent 的原话 | 只见 Lance Martin 的转述，未找到 Manus 官方原文 |
| deepagents 何时移除默认 `write_todos` | 浅克隆无历史，未查 |
