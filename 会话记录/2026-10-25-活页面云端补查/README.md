# 2026-10-25 活页面云端补查

- 会话 id：session_01TgWCRkWZq6NLudgGx5QKUU（云端 Claude 项目线程「再试活页面调研少量深挖」）
- 推的线：#58（仍 ⛔）；接 `../2026-10-25-活页面调研/README.md`（本机那次，对话原文 `studium-sessions/对话/2026-10-25-1f3a7359.md` 已全读）
- 状态：**没定稿**；下表全是外部线索
- 问题（取自本机会话最后产品负责人的纠正）：① 模型只说“换什么”，框架负责定位和替换；② 不加技能 / 提示词，让模型理解页面要干什么
- 料的标准：编程领域、2026-04 以后仍在用、有人真用的开源项目源码与仓库文档；不碰学习软件、相似系统、实验论文、老系统
- 云端可达：GitHub 可整仓克隆；arXiv、X、多数博客仍打不开
- 第一版（tldraw、marimo）删去：本机会话已读过，属重复

## 问题一：模型只说换什么，框架定位和替换

| 料 | 日期 | 机制（原文） | 可借 |
| --- | --- | --- | --- |
| oh-my-pi `crates/pi-edit/prompts/hashline.md`、`docs/tools/read.md`、`packages/coding-agent/CHANGELOG.md` | 2026-02 起，10 月几乎每天修 | 读时每行带号、文件带 4 位快照标签；模型写“替换 N–M 行 / 替换从 N 行开始的语法块 / 剪切到寄存器再粘贴”，不照抄原文；标签过期 → 拒绝并给当前标签和行；框架记模型看过哪些行，没看过的不许改；读默认给结构摘要，内部折成 `…`，页脚写明折了哪些行、怎么展开 | 定位、过期拒绝、“没看过不许改”、按结构块定位都由框架做 |
| rho `docs/tools-workspace/edit-format.md`、PR #1575 | 2026-10-19 | 把 hashline 标为过时，默认改回 str_replace：模型对 str_replace / apply_patch 更可靠；`auto` 给模型“它自家训练时用的编辑工具”（Anthropic → str_replace，OpenAI → apply_patch） | 我们只做 Claude：替换形态用 str_replace，不发明新语法；hashline 里不靠模型的那些检查仍可由框架做 |
| WICG `declarative-partial-updates`（patching 说明） | 规范草案，Chrome 部分实现 | `<?start name>…<?end>` / `<?marker>` 具名区域，`<template for>` 替换或插入，可交错、可边收边插 | 页面层替换可落在浏览器原生机制上 |

## 问题二：不加技能和提示词，让模型理解页面要干什么

| 料 | 日期 | 机制（原文） | 可借 |
| --- | --- | --- | --- |
| oh-my-pi `.omp/skills/tool-prompt-optimization/SKILL.md`、`system-prompts/SKILL.md`（仓库自己写工具说明的规矩） | 2026 | 工具说明只写何时用、为什么、输入形状、模型能自己修的错；内部做法一律不写，模型只看到“工具替你修好了”或“锚点过期，重读”；每句必须改变模型一个决定；用探针量：只给名字 + 参数结构让多家模型猜说明，猜得出的才是删除候选，删前 `git blame`（很多句子是事故留下的） | 页面目标靠工具名、参数、返回反馈表达；说明能删多少有方法量 |
| Cloudflare `agents/docs/codemode/`、`packages/codemode/CHANGELOG.md` | 0.5.x，2026 下半年 | 模型只有一个“写代码”工具；环境里有什么靠代码里 `search` / `describe` 现查，结果进运行中的代码、不进上下文；状态、日志、审批、回滚放运行时，执行器无状态可换；有浏览器 iframe 执行器；0.5.2 起调用日志不再进模型看到的结果，只留给界面和审计 | 环境自己说明自己；模型看到的和界面 / 记录看到的分开 |
| open-slide `packages/cli/template/AGENTS.md`、`packages/core/skills/{current-slide,apply-comments}/SKILL.md`、`slide-authoring/references/steps.md` | 2026-05 起，10-13 仍在改 | 模型写任意 React，框架管画布、缩放、翻页、热更新；`<Steps>/<Step>` 让观众按讲者节奏读、不提前读；开发服务器每次翻页 / 点选写 `current.json`（第几页、选了哪个元素、源码第几行）；人在页面上点选写评论，评论作为标记写进源码对应元素 | 框架给露出节奏的原语、模型定内容；学习者此刻在看哪里由框架记，模型不必追位置。它的引导走技能，这部分不借 |

## 没找到的

编程领域里没有项目按使用者此刻的状态控制露出多少；open-slide 的分步是讲者手动按的。

## 开着的问题

同 `../2026-10-25-活页面调研/README.md`：活页面到底要什么，先谈需求。

## 下次从哪接

谈需求时可拿上两表当“框架能替模型做什么”的实例。
