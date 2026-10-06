# Claude 的 skill 与 memory 机制

> 状态：参考材料，**不作产品结论**（2026-10-06 调研，#26 讨论 1.3）。一手来源抓取于 2026-10-06；标“未核实”的未读到正文或未逐项核对。落点：`../Harness设计/03-运行设计.md`「教学调用」教学工具表。

## 1 Skill 怎么加载

| 层 | 内容 | 何时进上下文 | 体量 |
| --- | --- | --- | --- |
| L1 | name + description | 启动时进 system prompt | 约 100 token / 个 |
| L2 | SKILL.md 正文 | 触发后 | 建议 < 5k token、< 500 行 |
| L3 | 附属文件、脚本 | 按需读；脚本只把输出放进上下文 | 不限 |

来源：platform.claude.com/docs/en/agents-and-tools/agent-skills/overview；anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills（2025-10-16，2025-12-18 更新为开放标准）；agentskills.io/specification

## 2 “用了哪个 skill”看得见吗

| 环境 | 机制 | 宿主能否看到 | 来源 |
| --- | --- | --- | --- |
| Claude Code | 显式 `Skill` 工具调用 | 能：可写权限规则、PreToolUse hook 匹配；`claude plugin eval` 有 `tool_used: Skill` 评分项 | code.claude.com/docs/en/skills |
| API | 模型用 bash 读 SKILL.md | 响应不标 skill 名（**未完全核实**） | platform.claude.com/docs/en/build-with-claude/skills-guide |

## 3 Claude Code 里的细节

| 项 | 内容 |
| --- | --- |
| 每轮常驻 | 只有描述列表，预算为上下文的 1% |
| 正文 | 调用后留在对话里，不重读 |
| 压缩后 | 每个 skill 只留前 5,000 token，合计 25,000 |
| 官方承认的失效 | “Claude stops following a skill”一节：首轮照做、后来不照做；必须成立的规则改用 hook（程序强制） |

## 4 有效性证据（官方给了什么）

| 说法 | 类型 | 边界 | 来源 |
| --- | --- | --- | --- |
| 描述优化使 6 个公开文档类 skill 中 5 个触发改善 | **唯一数字** | 未说模型、无样本量 | claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills（2026-03-03） |
| 客户案例（Rakuten、Notion） | 案例 | 无评测方法 | 调研摘要未记具体出处 |
| 任务范围 | — | 办公文档、编程、数据分析；**无教学类** | — |
| Claude 倾向 undertrigger，描述要写得 pushy；简单任务即使匹配也可能不触发 | 经验陈述 | 无数据 | github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md |
| 嵌套引用可能只读一部分，引用只放一层 | 经验陈述 | 无数据 | 出处未逐条核对（skill-creator SKILL.md 或 best-practices） |

## 5 官方推荐的评估做法

| 项 | 内容 |
| --- | --- |
| 先建 eval | ≥ 3 个场景；先测无 skill 的基线；多模型测 |
| skill-creator | 有 skill vs 基线并行跑，grader 按断言打分，盲比 |
| 描述优化 | 20 条查询，60 / 40 划分，每条跑 3 次 |

来源：platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices

## 6 Memory

| 对象 | 机制 | 数据 | 来源 |
| --- | --- | --- | --- |
| API memory tool（`memory_20250818`） | Claude 发文件操作，应用在客户端执行，存储自备；路径 `/memories`，任务开始先查目录 | 见下行 | claude.com/blog/context-management（2025-09-29） |
| context editing（beta） | 服务端清理旧工具结果 / 思考；官方现推荐服务端 compaction（beta 头 `compact-2026-09-04`） | 内部 agentic search 评测：memory + context editing 比基线 +39%，仅 context editing +29%，100 轮搜索 token −84%；**未点名模型、无样本量与指标定义** | 同上 |
| Claude Code CLAUDE.md | 用户写、启动加载；“是上下文不是强制配置”；建议 < 200 行 | 无数字 | code.claude.com/docs/en/memory |
| Claude Code auto memory | Claude 自己写，分 user / feedback / project / reference 四类；MEMORY.md 索引启动读前 200 行 / 25KB，主题文件按需读 | 无数字 | 同上 |

## 7 边界小结

| 项 | 内容 |
| --- | --- |
| 有数据的 | 只有两条：memory +39% / +29% / −84%；描述优化 5/6。其余都是经验说法 |
| 不能直接迁移 | 证据来自编程 / 办公任务，不能当成教学工具有效的依据；本项目的教学工具要靠本项目实验确认 |
| 未核实 | claude.ai 消费者 memory；“Effective harnesses for long-running agents”正文；API 侧 skill 使用是否可见 |
