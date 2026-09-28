# proto：单闭环原型（CLI）

> 状态：v1（2026-09-28 重建）。闭环 = 知识链上的一段（产品总览「闭环定义」）；教学与守卫是带只读工具的 agent，在“学习环境”里按需翻 M08 / 教材路线 / 教材原文 / M09。v0（主张 + 证据、讲解稿、板书、会中改线）已删，理由见 `../docs/Harness设计/_research/原型实验-9-发现.md`。每次改动的依据见 `../docs/Harness设计/_research/原型变更记录.md`。

## 运行

只用 Python 标准库。模型经 `studium/agent.py` 调用，模型名决定后端：`opus` / `sonnet` 走 `claude -p`（需已登录的 Claude Code，用订阅）；`oc:<模型>` 走 OpenAI 兼容接口（地址与密钥在 `.env`，见 `.env.example`）；`anthropic:<模型>` 走 Anthropic API（`ANTHROPIC_API_KEY`，未实测）。

```bash
cd proto
# 资料 → 结构（每本书做一次）
python3 -m studium.mineru <书.pdf> --ranges 1-200,201-400                                  # 书 → md（M06 最小一段；MINERU_TOKEN）
python3 -m studium.m07 split --book <MinerU 目录> --toc A-B                                # 按目录切成小节 + 索引（M07；放在书库，不进 git）
python3 -m studium.extract --book <MinerU 目录> --part p1-200 --lines A-B --toc C-D --run NAME   # 一章 → M08 知识点 + 关系（引文逐字定页）
# 学
python3 -m studium.design --learner owner --m08 m08/力学-动量.md --goal "…" --about "…" --run NAME   # M05：在 M08 上选下一段知识链
python3 -m studium.loop --run NAME                                                          # 在这段链上学（你当学习者；中断后同命令续跑）
python3 -m studium.sim --run NAME --learner learners/owner-like.md                          # 或用模拟学习者跑
python3 -m studium.commit --run NAME --park "理由" [--check]                                # 没走通就停：记入停车场（守卫通过的自动进 M09）
python3 -m studium.compare runs/<甲> runs/<乙>                                              # 两次运行盲评
```

每轮：学习者输入 → **教学调用**（agent，可读学习环境；先写【记录】：位置 / 已会 / 前置缺口，再写给学习者的话）→ 提议结束时 **闭环守卫**（独立 agent 调用）逐步核对学习者能否自己走通这段链：通过 → 闭环结束、提交 M09；未通过 → 带核对结果重做本轮。`/图` 看这段链与当前位置，`/quit` 退出。

## 学习环境

每次调用前在临时目录搭好（`studium/env.py`），全是软链接：`README.md`（索引说明）、`m08.md`、`路线-*.md`、`m07/`（链到书库里切好的原文）、`m09/`（学习者已结束闭环，有才放）。工具三个、只读、限在环境以内：`read_file` / `grep` / `list_dir`（`claude -p` 后端对应 Read / Grep / Glob）。

## 文件

| 路径 | 内容 |
| --- | --- |
| `studium/agent.py` | 统一调用接口（借鉴 pi：统一模型接口 + 工具循环）；三个只读工具；后端 claude -p / OpenAI 兼容 / Anthropic |
| `studium/env.py` | 搭学习环境 |
| `studium/llm.py` | 无工具的单次调用（M05 设计、M08 抽取、模拟学习者、盲评用） |
| `studium/loop.py` | 闭环主循环与 CLI |
| `studium/design.py` | M05 设计闭环：读 M08 + 教材路线 + M09 + 停车场，选一段知识链 |
| `studium/commit.py` | 闭环结束后的提交：守卫通过 → M09；没走通 → 停车场；两者都带按知识点的派生索引 |
| `studium/assemble.py` | 按读清单装配各调用的输入；缺必需项不发 |
| `studium/store.py` | 纯文本、只追加的运行记录 |
| `studium/mineru.py` · `m07.py` · `extract.py` · `m08.py` | 资料线：PDF → md → 小节 + 索引 → M08 抽取；M08 读取、切片、教材路线生成 |
| `studium/prompts/` | `teach.md` 教学、`guard.md` 守卫、`design.md` M05 设计、`m08_extract.md` M08 抽取（只写闭环定义、底线与输出格式） |
| `studium/sim.py` · `compare.py` | 模拟学习者（`learners/`）与盲评 |
| `m08/` | 每个学习项目的 M08 与教材路线，见 `m08/README.md` |
| `records/<学习者>/` | 真实学习者的跨闭环记录（进 git）：`m09/` 已走通的闭环、`parking.md` 停车场 |
| `learners/` | 模拟学习者人设；`owner-like.md` 接近产品负责人背景 |
| `runs/` | 运行记录（**进 git**，实验证据；索引见 `runs/README.md`） |

## 与设计的已知差距

| 差距 | 设计口径 | 现在做法 |
| --- | --- | --- |
| 会中改线（M05） | 学习者掉队 / 跑到前面时调整路线 | 闭环内只由教学侧跳过已会的步骤、记下前置缺口；路线调整放到闭环之间（下一次 design） |
| M03 训练 | 闭环内理解 ↔ 训练（产品总览「闭环定义」①） | **没有**：重建时随取证规则一起删了，待从系统角度重新设计 |
| 收口 | 学习者确认结束；判定从头走通 + 新情境能用；记下连上了哪些点 | 守卫从分散表现判“走通”即关闭，不问学习者 |
| M15 | 状态与条件 | 只记时间事实（`timing.log`）与离开时长 |
| 审查单 | 按新闭环定义清理 M02 / M04 / M05 / M10 与组合层文档 | 待清理（`任务线路.md` §3） |

## 提示词补丁登记

> 口径见 `../docs/Harness设计/00-技术方向确认.md` 核心原则 5：假设模型完美仍需要的是产品规则，不需要的是补丁。补丁只放提示词，登记于此。

（2026-09-28 重写后暂无补丁。）
