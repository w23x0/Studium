# proto：单闭环最小原型（CLI）

> 状态：v0（2026-09-23）。对应 `../docs/Harness设计/00-技术方向确认.md` §实施顺序 第 1 步。
> 目的：检验三个核心假设——文字推理链能否接续、拆分（M04 → M10 → M02 + 守卫）是否优于“同信息单模型”、守卫能否逐条核对验收范围。

## 运行

需要已登录的 Claude Code CLI（`claude`）。每个判断点是一次 `claude -p` 隔离调用：无工具、无会话持久化、在空目录中运行（不带项目上下文）。只用 Python 标准库。

```bash
cd proto
python3 -m studium.loop --scene scenes/kernel.md --mode split    # 拆分：M04 → 守卫（提议结束时）→ M10 → M02
python3 -m studium.loop --scene scenes/kernel.md --mode single   # 对照：一个强模型拿同样信息
```

输入一段话后按空行提交；`/quit` 退出。模型可用 `--m04 / --guard / --m10 / --m02 / --single` 指定（默认 opus / opus / sonnet / sonnet / opus）。

## 文件

| 路径 | 内容 |
| --- | --- |
| `studium/llm.py` | 隔离调用封装；记录实际执行的模型名（横切原则 3） |
| `studium/store.py` | 纯文本、只追加的资产存储；读侧“取最新有效” |
| `studium/assemble.py` | 按读清单装配上下文；缺必需项不发、缺条件项降级标注；M04 不读自身历史输出 |
| `studium/loop.py` | 确定性状态机与 CLI |
| `studium/prompts/` | 各判断点的最小约定（无角色设定）；`strategy_knowledge.md` = M10 通用策略知识（提炼自学习理论取舍表的“采纳”项） |
| `scenes/kernel.md` | 场景：线性变换的核（大学），验收范围按“主张 + 证据”写 |
| `runs/` | 运行数据（不进 git）：`transcript.md`、`turns/NNN/<判断点>.md`、`calls.log`、`closure.md` |

## v0 与设计的已知差距

| 差距 | 设计口径 | v0 做法 |
| --- | --- | --- |
| M03 未单独成调用 | M03 负责练习选择与验证意图 | M02 出题时附【练习条件】（含验证意图），写进对话本体，学习者看不到 |
| M02 历史层 | 按相关性取对话片段 | 取全部学习者可见对话（单闭环很短） |
| M05 / M09 / M15 / M07 / M08 | 各自模块 | 场景文件手写代替 M05；`closure.md` 代替 M09 提交；其余未接入 |
