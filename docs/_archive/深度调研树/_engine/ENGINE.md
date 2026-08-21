# 深度调研引擎 v3（Engine）— 自动化调研工厂

> 状态：2026-08-13 从 v2（手工多会话）重构为 v3（自动化工厂）。
> v2 的教训（为什么重做）：任务队列/树状注册表/冲突台账四份运行时状态从未被真正维护（上一轮跑完仍是 T000 QUEUED、注册表空）；框架强依赖人当"执行器"手动开会话搬任务卡（上一轮 10 个 codex 进程是手动起的）；没有断点续跑，调度全凭会话上下文记忆，会话一关就丢。v3 目标：**只在一个对话窗口内持续自动运行，不断、不问、可恢复**。

## 0. 一句话机制

**主对话是总控与持久化层，Workflow 是每批任务的执行引擎，`state.json` 是唯一事实源。**
每轮：主对话读 state → 取 QUEUED 任务组批 → 调 Workflow 并行跑「调研 → 审计」→ 落盘 findings/_sources + 更新 state → 展开判定 → 写调度日志 → 决定续跑或收口。任何一步中断，重跑时读 state 跳过已完成，只处理未完成的。

## 1. 角色体系（9 个角色，分四段）

### 生产段（每批任务循环）
| 角色 | 谁执行 | 职责 | 输入 → 输出 |
|---|---|---|---|
| **总控 Orchestrator** | 主对话（我） | 读 state、组批、派发、回收、更新 state、判断续跑/收口、落盘一切 | state.json → 新 state.json + 调度日志追加 |
| **调研员 Researcher** | Workflow agent | 按任务卡上网调研，抓原文快照到 `_sources/`，产出发现 | 任务定义（from state）→ `findings/{id}_发现.md` + 快照文件 + 返回 JSON(路径/要点/自评) |
| **审计员 Auditor** | Workflow agent | 判死四条件 + URL 抽检 + 快照逐字比对 + 工作量红线 → PASS/FAIL+整改意见 | 调研产出 → 审计结论（写 `audit/{id}_审计.md`） |

### 收口段（跨分支时）
| 角色 | 谁执行 | 职责 |
|---|---|---|
| **整理员 Normalizer** | Workflow agent | 归一化 URL/论断/证据等级，登记产物索引，SimHash/Jaccard 去重 → 标 DUPLICATE |
| **对比员 Comparator** | Workflow agent | 跨分支横向对照，相同现象不同结论 → 登记冲突台账（追加不删旧） |
| **仲裁员 Arbiter** | 主对话 + 收口 agent | 冲突裁决；对"推断 C"与"未核"显式分类，绝不当 PROVEN |

### 扩展段（每批任务后）
| 角色 | 谁执行 | 职责 |
|---|---|---|
| **展开员 Expander** | 主对话 | 终止条件检查：答完父问题且候选已查证 → ARCHIVED；否则拆 ≥2 张子任务卡入队 |

### 支撑段
| 角色 | 谁执行 | 职责 |
|---|---|---|
| **爬虫 Fetcher** | 调研员内置步骤 + 本地脚本 | 抓 URL 存快照、pdftotext/HTML 转文字；反爬抓不到 → 如实记"未核" |
| **汇总员 Synthesizer** | 收口 agent | 合成报告：候选/证据/兼容性/方向/待实测（推断与实测分开）、缺口清单 |

## 2. 状态机（每张任务卡）

```
queued → running → submitted → accepted → archived   (到叶，正常终止)
                          ↘ rejected → queued (回炉，附整改意见)
running --(超时/失联)--> queued (重新入队，retries+1)
同一任务 rejected ≥2 次 → 缩小范围再入队，禁止无限回炉
```

- `archived`：父问题全部回答、候选已查证、无可展开子方向。由展开员判定。
- 收口条件：队列空 且 无 running 且 无 rejected。

## 3. 持久化布局

```
research_tree/
  state/state.json        ← 唯一事实源：meta + tasks[] + conflicts[] + rounds[]
  state/state.json.lock   ← 写锁（占位，防并发写）
  tasks/{id}.md           ← 任务卡（引擎生成，人可读，与 state 同步）
  findings/{id}_发现.md   ← 调研产出（含 0 一句话结论 … 8 判死自查）
  audit/{id}_审计.md      ← 审计结论
  _sources/{id}/...       ← 原文快照（html/txt/md/pdf）
  logs/调度日志.md         ← 每轮追加：派发/回收/验收/去重/合并/新拆
  master_db/              ← 产物索引、冲突台账、合并登记（收口段写）
  synthesis/              ← 合成报告、缺口清单
```

> git：`state/`、`_sources/`、`findings/`、`audit/` 全部进版本库（结构化产出）；`logs/spawn/`、`tmp/` 不进（原始证据）。见 `.gitignore`。

## 4. 每轮工作流（主对话执行，顺序不可乱）

```
a. 读 state.json（若锁在，等/清）
b. 取 queued 任务，按 优先级高→低，同优先先深后浅 组批（每批 N=4~8，视可用并发）
c. 为每张任务卡生成 tasks/{id}.md（角色/问题/关键词/红线/禁止项）
d. 调 Workflow run_batch：并行 调研员 → 审计员（见 §5 脚本）
e. 回收：读 agent 返回 JSON + 检查落盘文件 → 更新 tasks[]（submitted/accepted/rejected）
f. 展开判定：对 accepted 任务跑 Expander → 到叶则 archived，否则拆子任务卡入队
g. 记账：state.rounds 追加本轮 + 调度日志追加
h. 落盘 state.json → 决定续跑或收口
```

## 5. Workflow 脚本 run_batch

- 用途：一批任务的「调研 → 审计」执行引擎。每个任务独立流水线（A 在审计时 B 仍在调研，不设屏障）。
- 入参 `args`：`{ round, tasks: [{id, topic, questions, keywords, candidates, bounds, findingsPath, sourcesDir}] , asOf }`。
- 调研员 prompt 模板（E-RES）：角色 + 任务卡全文 + 产出契约（写 findings/{id}_发现.md + 抓快照到 _sources/{id}/）+ 返回 JSON。
- 审计员 prompt 模板（E-AUD）：读 findings/{id}_发现.md → 判死四条件 + 来源抽检 + 工作量红线 → 写 audit/{id}_审计.md → 返回 JSON(verdict, reasons, items)。
- 返回：`[{taskId, findingsPath, verdict, auditPath}]`。主对话据此更新 state。
- schema：调研员返回 `{taskId, findingsPath, sources: string[], selfCheck: {pass: bool, notes: string}}`；审计员返回 `{taskId, verdict: "accepted"|"rejected", reasons: string[], urlSample: number, snapshotMatch: number}`。

## 6. 断点与恢复（"不能断"）

- **每步落盘**：workflow 结果一到就更新 state + 写日志，不攒批。
- **唯一事实源**：state.json 记录每张卡的 状态/产出路径/审计/重试次数。重跑只处理 queued/rejected。
- **agent 失联/超时**：任务置回 queued，retries+1；重试不重新抓取已完成快照（_sources 已有则跳过）。
- **子代理自己写文件**（findings/_sources/audit），主对话只做汇总与登记——agent 返回截断不丢产出。
- **本轮中断**：下次启动读 state 继续，绝不重开全部。

## 7. 质检标准（沿用 v2 判死，明确"完整性"边界）

1. 判死四条件：无来源 / 二手当原文 / 越界或漏答 / 推断写成结论。
2. 工作量红线：来源 ≥15（A ≥10）、类型 ≥3、候选查证 ≥5、关键词 ≥4 组。
3. 证据等级：A=原文到手 / B=二手转引 / C=推断，必须逐条标注。
4. **完整性诚实声明**：每份合成报告必须写明「覆盖了什么 / 没覆盖什么 / 哪些是推断 C」。**"到叶"= 文档查证到叶，不等于"验证到能定案"**——待实测项必须单列，与实测分开，不得把"判不了"当成 PROVEN。

## 8. 铁律

- 主对话只做调度/验收/登记/兜底，不替调研员做叶子调研（除非兜底）。
- 每轮必须落盘后再结束；调度日志不许跳轮。
- 推断必须标注；没有证据就说没有证据；抓不到写"未核"，绝不捏造来源。
- 禁止把"报告宣称的完整"当成"调研真齐全"——完整性靠 §7.4 的诚实声明 + 独立审计抽检。
