# proto：单闭环最小原型（CLI）

> 状态：v0（2026-09-23）。对应 `../docs/Harness设计/00-技术方向确认.md` §实施顺序 第 1–2 步（通过标准与检查时机见该表）。
> 目的：检验设计假设。实验 1 结论（拆分串行不如同信息单一调用）已据此改定运行方式，见 `../docs/Harness设计/_research/原型实验-1-发现.md`。

## 运行

需要已登录的 Claude Code CLI（`claude`）。每个判断点是一次 `claude -p` 隔离调用：无工具、无会话持久化、在空目录中运行（不带项目上下文）。只用 Python 标准库。

```bash
cd proto
python3 -m studium.design --goal "我想学线性变换的核。" --about "大一，学过……" --run NAME   # M05 设计闭环（先看 runs/NAME/scene.md）
python3 -m studium.loop --run NAME                                                  # 在设计好的闭环里，你当学习者
python3 -m studium.sim --run NAME --learner learners/typical.md                     # 或用模拟学习者跑
python3 -m studium.loop --scene scenes/kernel.md                                   # 手写场景，你当学习者
python3 -m studium.sim --scene scenes/kernel.md --learner learners/typical.md      # 模拟学习者自动跑
python3 -m studium.compare runs/<甲> runs/<乙>                                     # 两次运行盲评
```

每轮：学习者输入 → **教学调用**（先写不放进回复、学习者可查阅的诊断记录，再写给学习者的话）→ 诊断记录写出**改线依据**（缺前置 / 已超出范围）时触发 **M05 路线调用**（独立调用，改写当前闭环的验收范围：补前置 / 转确认 / 维持；会中不加深，学习者已超出范围就转确认、尽快结束，更深内容记为下一闭环建议）→ 范围改了则按新范围重做一次教学调用 → 提议结束时触发**闭环守卫**（独立调用）。改线不来回踢：每轮至多一次 M05，M05 读自己的路线偏差记录。输入一段话后按空行提交；`/quit` 退出。模型用 `--teach / --guard / --route` 指定（默认都是 opus：判断点用最强模型）。模拟学习者默认 `oc:deepseek-v4.1-flash`（`oc:` 前缀走 OpenAI 兼容接口，地址与密钥在 `.env`，不进 git，见 `.env.example`）。判断调用不加载任何 MCP 服务（保证隔离、缓存可命中）。

## 文件

| 路径 | 内容 |
| --- | --- |
| `studium/llm.py` | 隔离调用封装（`claude -p` / `oc:` 接口）；记录实际执行的模型名（横切原则 3）与读缓存量 |
| `studium/store.py` | 纯文本、只追加的资产存储；读侧“取最新有效” |
| `studium/assemble.py` | 按读清单装配上下文；缺必需项不发、缺条件项降级标注；诊断记录不回灌 |
| `studium/loop.py` | 确定性状态机与 CLI |
| `studium/design.py` | M05 设计闭环：按学习目标 + 自述写场景，存进新运行目录（v0 一律冷启动） |
| `studium/prompts/` | `teach.md` 教学调用、`guard.md` 闭环守卫、`route.md` M05 路线调用、`design.md` M05 设计闭环（最小约定，无角色设定）；`strategy_knowledge.md` = 通用策略知识（提炼自学习理论取舍表的“采纳”项） |
| `studium/sim.py` · `compare.py` | 模拟学习者（`learners/`）与盲评 |
| `scenes/` | 场景：`kernel.md` 线性变换的核（大学）、`newton2.md` 牛顿第二定律（高中）；验收范围按“主张 + 证据”写，每条标【教学】/【确认】 |
| `learners/` | 模拟学习者：`typical.md` 典型大一（核）、`knows-newton2.md` 已会牛二（测改线）、`typical-newton.md` 典型高一（牛顿，带“力维持运动”前概念） |
| `runs/` | 运行记录（**进 git**，实验证据；索引见 `runs/README.md`）：`transcript.md`（含系统侧 `[练习条件]` `[路径]` 行）、`turns/NNN/{diagnosis,reply,guard,route,scene}.md`（改线轮另存 `*-superseded.md`）、`route.md` 路线偏差记录、`calls.log`、`closure.md` |

## v0 与设计的已知差距

| 差距 | 设计口径 | v0 做法 |
| --- | --- | --- |
| M02 历史层 | 按相关性取对话片段 | 取全部对话（单闭环很短） |
| M05 闭环设计 | M05 按目标与 M09 设计闭环，并索引本次要用的 M08 片 | 按目标 + 自述设计（无 M09，一律冷启动；不索引 M08）；会话中改线只改写当前闭环范围，不开分叉会话 |
| M09 / M15 / M07 / M08 | 各自模块 | `closure.md` 代替 M09 提交；其余未接入 |

## 提示词补丁登记

> 口径见 `../docs/Harness设计/00-技术方向确认.md` 核心原则 5：假设模型完美仍需要的是产品规则，不需要的是补丁。补丁只放提示词，登记于此（不写进提示词本身，免得模型读到），模型变强时逐条试删。

| 提示词 | 规则 | 来由 |
| --- | --- | --- |
| `teach.md` | [替代解释] 只追值得追的，权衡追问代价 | 实验 1：过度追问 |
| `teach.md` | 已有完整证据的主张不报改线依据 | 实验 2：多余的 M05 调用 |
| `route.md` | 整个范围偏浅时剩余教学主张一次全转确认，不逐条等 | 实验 2：逐条转确认拖慢结束 |
| `design.md` | 证据不写成依赖某个特定追问才出现的表现 | 实验 3：守卫无从核对“被追问时” |

产品规则（不是补丁，不登记）：有限视角、作答前不给答案、教学 / 确认两类主张、会中不加深、改线不来回踢、诊断记录不回灌。
