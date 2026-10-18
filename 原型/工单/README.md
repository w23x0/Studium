# 原型改造工单（10-18 起）

> 状态：现行（Claude 写，给 DeepSeek 照做）。产品与设计结论只认 `../../docs/设计/`；本目录是“把原型改到符合设计”的施工单，不新增产品结论。
> 取代 `../工作单.md`、`../里程碑.md`（旧模块时期的施工记录，W7 删）。

## 0 为什么改、改成什么

原型按旧的模块设计做的：单子里存知识点编号（原 M08），学完另开会话写分析记录（原 M09），学习对话挂 20 多个专用工具。10-16、10-18 设计改了（`../../方向记录.md` 最上面两行）：

| 旧 | 新（设计页） |
| --- | --- |
| 单子里是知识点 / 子句编号，开学习前查编号 | 单子是文字：新点、预期理解、出发点（各注来源）、对资料核的结果（`记录/单子与路线.md`） |
| 学完另开会话写“形成记录”，另有当前视图、降档、时间版本 | 不另写；守卫判定顺带写学习者实际表现出的理解与证据强度（`会话/守卫.md` §4）；学过的记录 = 单子 / 判定 / 事件记录按密度分层（`记录/学过的记录.md`） |
| 学习对话关掉内置工具、挂专用工具 | 学习对话在沙盒里跑：只读资料与记录、可写自己的工作区，只有“申请收口”“结束这次学习（没合上）”两个命令（`会话/学习对话.md` §2，`记录/读写权限.md`「执行方式」） |
| 学习里出小卡、开分叉、停车记录 | 学习中途想先学别的 = 结束这次（没合上），导航读完整对话出卡；没合上那次的上层 = 单子 + 结束原话 + 导航当时的路线决定和理由 |
| 导航从知识点里挑 | 导航现场说出候选、当场对资料核；需要细节时派检索子代理（`会话/导航.md`） |

**底层不动**：正本日志、会话管理、模型接口、本地服务骨架、录带回放、派生索引、资料（书库、原件、出处、报错、笔记）、输入、状态整理、界面外壳、质量设施。

## 1 工单与顺序

一张工单 = 一次新开的会话做完 = 一个分支 `deepseek/Wn`。按顺序做，前一单审查通过、合进 `main` 后再开下一单。

| 单 | 做什么 | 依赖 |
| --- | --- | --- |
| [W1](./W1-去知识点编号.md) | 删 M08 全部（读侧、候选区、样例、阈值标记、跨资料线索、产出物里的知识点引用与通用候选、原件页上的锚点）；单子与选择卡改文字；出卡时写路线决定 | — |
| [W2](./W2-去分析层与守卫判定.md) | 删写 M09 的会话、当前视图、降档 / 时间版本；守卫判定加实际理解与证据强度；学习结束后的清单；学过的记录按层查询；外部导入存放处与程序写入（畅谈、笔记两个渠道）；复习 / 复检改指以前那次学习 | W1 |
| [W3](./W3-导航.md) | 导航开场按设计；检索子代理；没合上时读完整对话；接着学、补前置返回都经导航；删小卡、分叉、停车记录；路线偏差改成从已有记录读出；阶段复盘读按层 | W2 |
| [W4](./W4-学习对话沙盒.md) | 模型接口加沙盒；假模型能在沙盒里读写；Agent SDK 适配器打开内置工具并套沙盒；学习对话只留两个命令；删专用工具（诊断、练习、分叉、强度、教学工具、资料查询等）；守卫按“谁做的”过滤；教法记录整理读沙盒事件 | W3 |
| [W5](./W5-畅谈与主对话.md) | 方向目标结构（目标能力、每块理由、学习者确认的理由、顺序参考、期限）；畅谈与导航可外部搜索；主对话开场读学过的记录与方向目标 | W4 |
| [W6](./W6-界面.md) | 界面跟上：依据面板、“我学会的”按学习列、项目页停车场、删知识点 / 分析层 / 练习 / 分叉 / 强度的界面 | W4、W5 |
| [W7](./W7-改名与收尾.md) | 会话种类去掉 M 编号（`m05`→`nav` 等）；`原型/CLAUDE.md`、功能清单、链路评测、e2e 跟上；删旧施工记录 | W6 |

每张工单的格式：目标 · 设计依据（页 + 节）· 删什么 · 加 / 改什么（接口与记录形状写死）· 旧验收测试怎么处理 · 本单验收测试 · 完成标准 · 不许做的。

## 2 共用约定（各单都按这里，冲突以这里为准）

### 2.1 单子（`Ticket`，`src/shared/records.ts`）

字段名不变、值改成文字；旧数据目录不兼容（`var/` 删掉重来，见 W1）。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `newPoint` | string | 新点，一句话（按定义拆） |
| `clause` | string | 预期理解：出发点怎么接到新点，一两句 |
| `startPoints` | `{ point: string; source: '学过的记录' \| '自述' \| '假定'; ref?: string }[]` | 出发点各一句；`ref` = 依据，`会话 id:行号` |
| `routeAction` | string | 继续主线 / 补前置 / 复习 / 复检 / 接着学 …… |
| `sourceCheck` | `{ claim: string; at?: string; modelAdded?: boolean }[]` | 对资料核的结果：`at` = 教材出处 `书/文件:行号`；资料里没有的 `modelAdded: true` |
| `revisit?` | `{ kind: '复习' \| '复检'; ofLoop: string; verdictLine?: number }` | 回看以前那次学习（会话 id + 判定所在行）（W2） |
| `returnTo?` | string | 补前置：合上后回到哪次学习（W3） |
| `resumeOf?` | string | 接着学哪次没合上的（W3） |
| `stageCheck?` | boolean | 阶段验收 |

### 2.2 选择卡工具 `submit_choice_card`（导航）

| 参数 | 说明 |
| --- | --- |
| `options[]` | 2–4 项；每项 `new_point` `clause` `start_points[{point, source, ref?}]` `route_action` `title` `reason` `sources[]`（从哪来，≥1）`source_check[{claim, at?, model_added?}]`（可空）`revisit?` `return_to?` `resume_of?` `stage_check?` |
| `recommended` | 推荐第几项（从 0 数） |
| `route_decision` | `{ decision, reason, basis[] }`：这次的路线决定（含“维持”）；`basis` 每条是 `会话 id:行号` 或 `书/文件:行号` |

程序核对：必填项非空；`ref`、`basis`、`at` 能定位（会话行存在 / 书里那一行存在），定位不了退回让模型改；`sources` 里定位不了的照存、界面标“查不到”（旧行为）。

### 2.3 路线决定（新记录，写在项目主对话的正本里）

```ts
interface RouteDecision {
  type: 'route_decision';
  at: string;
  navSessionId: string;
  trigger: string;        // 为什么出卡：合上 / 没合上 / 学习者要求 / 补前置合上 ……
  decision: string;
  reason: string;
  basis: string[];        // 会话 id:行号 或 书/文件:行号
  supersedes?: number;    // 主对话里上一条路线决定的行号；新取代旧，旧行不改
}
```

每次出卡先写一条 `route_decision`，紧接着写 `choice_card`（同一个导航会话）。

### 2.4 守卫判定 v2（`submit_verdict`，W2）

| 参数 | 说明 |
| --- | --- |
| `closed` `basis` `evidence_lines` | 同旧 |
| `understanding[]` | `{ text, lines[], independence: '独立' \| '提示后' \| '答案暴露后', durability: '仅当场' \| '含变式' \| '含延迟' }`；判合上时至少一条；`lines` 只能是学习者的行（程序核对，同 `evidence_lines`） |

`GuardVerdict` 记录加 `understanding?` 与 `model?`（守卫这一轮实际执行的模型）。

### 2.5 学过的记录（按层查，W2）

`GET /api/learned?project=<主对话 id>` → `{ learnings: Learning[]; imports: Import[] }`；`GET /api/learned/<学习会话 id>` → `{ learning: Learning }`。

```ts
interface Learning {
  loopId: string;
  title: string;
  openedAt: string;
  endedAt?: string;
  status: '进行中' | '合上' | '没合上';
  ticket: Ticket;                                         // 上层
  endNote?: string;                                       // 没合上：结束原话（上层）
  routeDecision?: { line: number; decision: string; reason: string }; // 没合上：导航当时的路线决定（上层）
  verdict?: { line: number; closed: boolean; basis: string; understanding: Understanding[]; model?: string }; // 中层：通过的那份
}
interface Import { id: string; at: string; channel: '畅谈' | '笔记'; ref: { session: string; lines: number[] } | { note: string }; unverified: true }
```

下层（事件记录）不进这个接口，按 `GET /api/sessions/<id>/records` 读。

### 2.6 沙盒（W4）

模型接口（`src/core/model/port.ts`）：

```ts
interface SandboxSpec {
  workdir: string;                               // 模型可写的工作区（绝对路径）
  readOnly: { name: string; path: string }[];    // 只读目录，模型看到的是 只读/<name>/...
  network: boolean;                              // 默认 false
}
// ConversationSpec 加 sandbox?: SandboxSpec
// ModelEvent 加：
| { kind: 'sandbox_action'; action: { op: 'read' | 'write' | 'run' | 'search' | 'other'; path?: string; command?: string; summary: string; ok: boolean } }
```

正本加记录 `sandbox_action`：`{ type, at, actor: 'model', op, path?, command?, summary, ok, tag? }`；`tag` 由程序按路径打：写工作区里的 `诊断.md` → `诊断`；读 `只读/教学工具/<文件>` → `教学工具:<文件名>`。

学习对话的沙盒（程序在开学习时准备，每轮前刷新只读的渲染文件）：

| 位置 | 内容 | 读写 |
| --- | --- | --- |
| `工作区/` | 模型自己的笔记；诊断写在 `工作区/诊断.md`（追加） | 可写 |
| `只读/资料/` | 书库（项目选了资料时只放选中的书） | 只读 |
| `只读/教学工具/` | 官方教学工具 + 学习者自己的 | 只读 |
| `只读/学过的记录/` | 程序渲染：每次以往的学习一个文件（单子、结束原话、路线决定、判定，带会话 id 与行号）+ `外部导入.md` | 只读 |
| `只读/状态记录/` `只读/教法记录/` | 程序渲染 | 只读 |
| `只读/本次对话.md` | 本次学习的对话原文，带行号（压缩后按行号读回） | 只读 |

学习对话只有两个命令，仍以同名工具落地（假模型与测试照旧调）：`request_close`（申请收口）、`end_loop_unclosed`（结束这次学习，没合上）。其余学习对话专用工具全删。

假模型（`src/core/model/fake.ts`）：`FakeStep` 加 `sandbox?: ({ op: 'write' | 'append'; path: string; content: string } | { op: 'read'; path: string } | { op: 'run'; command: string })[]`，在真实文件系统上执行：相对路径按 `workdir` 解析，`只读/<name>/…` 映射到对应目录；写到工作区外 → `ok: false`、不写；读的结果进 `ctx.results`；每个动作发一条 `sandbox_action` 事件；`run` 不真执行，只记一条 `ok: true` 的动作。

### 2.7 检索子代理（W3）

导航的工具 `retrieve`：`{ question: string; loops?: string[] }` → 程序另开一个 `retrieve` 种类的会话（父 = 导航会话），给只读沙盒（学过的记录渲染、资料、相关学习的对话原文渲染），只挂一个工具 `submit_findings`：`{ findings: { text: string; ref: string }[] }`（≤ 5 条，`ref` = `会话 id:行号` 或 `书/文件:行号`，程序核对能定位，定位不了退回）。导航收到的工具结果 = 核过的几条。

### 2.8 改名（W7 才做）

会话种类：`m05`→`nav`、`m15`→`state`、`m10`→`pedagogy`；`loop` 保留（界面叫“学习对话”）。W1–W6 里新写的代码、提示词、界面文字不再出现 “M05 / M08 / M09 / M10 / M15 / 闭环”这类旧叫法（用 导航 / 知识点（不再有）/ 学过的记录 / 教法记录 / 状态记录 / 一次学习）；已有标识符留到 W7。

## 3 分工与编排

| 角色 | 谁 | 做什么 |
| --- | --- | --- |
| 施工 | DeepSeek，跑在产品负责人本机的 Claude Code 里（见 §4） | 一单一会话：读工单 → 列计划 → 分步改、每步跑检查 → 自查 → 推分支 |
| 自查 | 同一会话里派的子代理 `work-order-check`（`.claude/agents/work-order-check.md`，只读） | 对照工单逐条看 diff，列没做到的；施工方修完再交 |
| 审查 | Claude（云端会话），产品负责人说“Wn 推了”后 | 核验收测试没被改、跑检查、对照工单和设计读 diff；意见写进 `进度/Wn-审查.md`，不过就开新会话按意见修 |
| 合并 | 本机 Claude 或产品负责人 | 审查通过后合进 `main` |

施工方在会话里的做法（写进每次的开场提示，见 §4）：

1. 先读本页 §2、本单工单、工单列的设计页节；不通读大文件（`src/core/studium.ts` 2700 行），用 `rg -n` 找到再按行读。
2. 把工单拆成步骤写进 `进度/Wn.md`（步骤、状态、遇到的问题），每做完一步更新。
3. 第一步固定：把 `验收/Wn/` 里的测试按工单说的拷进 `tests/验收/`（`cp`，保留 `验收/Wn/` 原件），删工单列的旧测试；单独提交“test: Wn 验收测试就位”。
4. 每一步改完跑 `npm run check`；红了先修再往下。可以派子代理去读、找代码；改代码由主会话自己做。
5. 全部做完：派 `work-order-check`，修它列的问题；`npm run check` 全绿；`进度/Wn.md` 写清做了什么、和工单不同的地方及理由、拿不准的地方。
6. 推 `deepseek/Wn`，停。

## 4 产品负责人本机怎么开一单

```bash
cd ~/Studium && git checkout main && git pull
git checkout -b deepseek/W1
export ANTHROPIC_BASE_URL=<DeepSeek 兼容 Anthropic 的接口地址>   # 以 DeepSeek 文档为准
export ANTHROPIC_AUTH_TOKEN=<你的 key>                         # 只放环境变量，不进仓库
export ANTHROPIC_MODEL=<DeepSeek 模型名>                        # 以 DeepSeek 文档为准
export ANTHROPIC_SMALL_FAST_MODEL=$ANTHROPIC_MODEL
claude --settings 原型/工单/deepseek-settings.json
```

开场提示（整段贴进去，`W1` 换成本单）：

```text
你按 原型/工单/README.md 的 §3 做 原型/工单/W1-去知识点编号.md 这一单。先读 README §2 和这张工单，再读工单列的设计页。
不许改：tests/验收/ 里的任何文件（第一步按工单拷进去的除外）、原型/工单/ 下除 进度/ 以外的文件、docs/ 下的任何文件。
觉得某个验收测试写错了：不要改它，把理由写进 进度/W1.md 的“疑似测试错”，跳过与它相关的部分接着做别的。
做完推 deepseek/W1 分支。
```

`deepseek-settings.json` 在仓库现有 hooks（改 `tests/验收/` 被拦、结束前跑检查）之外，再拦改 `docs/` 和 `原型/工单/`（`进度/` 除外）。

## 5 验收怎么算

| 层 | 管什么 | 谁写 |
| --- | --- | --- |
| 验收测试（`验收/Wn/`） | 功能对不对：只经 HTTP 和正本记录看行为，用假模型 | Claude 事先写好，施工方不许改 |
| `npm run check` | 类型、lint、格式、全部测试 | 现有 |
| 工单的完成标准 | 删干净没有（如 `rg -n "m08" src` 无结果）、文件 / 接口 / 记录形状对不对 | 工单写死 |
| 审查 | 设计对不对、有没有半截旧逻辑、有没有越界 | Claude |

测试证明的是结构和流程，不证明教得好不好；教学质量不在这一轮。

## 6 文件

| 路径 | 内容 |
| --- | --- |
| `README.md` | 本页 |
| `W1-…md` … `W7-…md` | 七张工单 |
| `验收/Wn/` | 每单事先写好的验收测试（施工时拷进 `tests/验收/`）；`验收/Wn/共用/` 是这单要用的测试帮手，拷到 `tests/验收/共用/` |
| `进度/` | 施工方写的进度（`Wn.md`）与 Claude 的审查意见（`Wn-审查.md`） |
| `deepseek-settings.json`、`拦改.mjs` | 施工会话额外加载的设置与 hook（多拦 `docs/` 与工单本身） |
| `原型对照.md` | 改造前原型与新设计的逐块对照（参考，以工单为准） |
