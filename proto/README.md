# proto：单闭环最小原型（CLI）

> 状态：v0（2026-09-23）。对应 `../docs/Harness设计/00-技术方向确认.md` §实施顺序 第 1 步。
> 目的：检验设计假设。实验 1 结论（拆分串行不如同信息单一调用）已据此改定运行方式，见 `../docs/Harness设计/_research/原型实验-1-发现.md`。

## 运行

需要已登录的 Claude Code CLI（`claude`）。每个判断点是一次 `claude -p` 隔离调用：无工具、无会话持久化、在空目录中运行（不带项目上下文）。只用 Python 标准库。

```bash
cd proto
python3 -m studium.loop --scene scenes/kernel.md                                   # 你当学习者
python3 -m studium.sim --scene scenes/kernel.md --learner learners/typical.md      # 模拟学习者自动跑
python3 -m studium.compare runs/<甲> runs/<乙>                                     # 两次运行盲评
```

每轮：学习者输入 → **教学调用**（先写不放进回复、学习者可查阅的诊断记录，再写给学习者的话）→ 诊断记录写出**改线依据**（缺前置 / 已超出范围）时触发 **M05 路线调用**（独立调用，改写当前闭环的验收范围：补前置 / 转确认 / 加深 / 维持）→ 范围改了则按新范围重做一次教学调用 → 提议结束时触发**闭环守卫**（独立调用）。改线不来回踢：每轮至多一次 M05，M05 读自己的路线偏差记录。输入一段话后按空行提交；`/quit` 退出。模型用 `--teach / --guard / --route` 指定（默认都是 opus）。

## 文件

| 路径 | 内容 |
| --- | --- |
| `studium/llm.py` | 隔离调用封装；记录实际执行的模型名（横切原则 3） |
| `studium/store.py` | 纯文本、只追加的资产存储；读侧“取最新有效” |
| `studium/assemble.py` | 按读清单装配上下文；缺必需项不发、缺条件项降级标注；诊断记录不回灌 |
| `studium/loop.py` | 确定性状态机与 CLI |
| `studium/prompts/` | `teach.md` 教学调用、`guard.md` 闭环守卫、`route.md` M05 路线调用（最小约定，无角色设定）；`strategy_knowledge.md` = 通用策略知识（提炼自学习理论取舍表的“采纳”项） |
| `studium/sim.py` · `compare.py` | 模拟学习者（`learners/`）与盲评 |
| `scenes/` | 场景：`kernel.md` 线性变换的核（大学）、`newton2.md` 牛顿第二定律（高中）；验收范围按“主张 + 证据”写，每条标【教学】/【确认】 |
| `learners/` | 模拟学习者：`typical.md` 典型大一（核）、`knows-newton2.md` 已会牛二（测改线） |
| `runs/` | 运行数据（不进 git）：`transcript.md`（含系统侧 `[练习条件]` `[路径]` 行）、`turns/NNN/{diagnosis,reply,guard,route,scene}.md`（改线轮另存 `*-superseded.md`）、`route.md` 路线偏差记录、`calls.log`、`closure.md` |

## v0 与设计的已知差距

| 差距 | 设计口径 | v0 做法 |
| --- | --- | --- |
| M02 历史层 | 按相关性取对话片段 | 取全部对话（单闭环很短） |
| M05 闭环设计 | M05 按目标与 M09 设计闭环 | 初版场景手写；M05 只接入**会话中改线**（改写当前闭环范围，不开分叉会话） |
| M09 / M15 / M07 / M08 | 各自模块 | `closure.md` 代替 M09 提交；其余未接入 |
