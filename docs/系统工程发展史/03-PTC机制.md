# PTC 机制

```yaml
doc_id: SYSENG_HISTORY_03
status: 现行
evidence_base: LEVEL_A
primary_source: Anthropic "Programmatic tool calling" 官方文档
purpose: Programmatic tool calling 的工作原理与实测数据
```

## § 1 从最基础讲起

### 1.1 模型只能输出文本

LLM 唯一的输出是**文本**。它不能读文件、查数据库、发请求。所以「查一下谁超了预算」它自己答不了——它看不见那些数据。

### 1.2 tool calling = 一个循环

模型输出一段**特殊格式的文本**表示「我想调用某工具，参数是这些」；harness 解析它、真的执行、把结果**当成新消息**塞回去。

```python
messages = [用户: "谁的差旅费超了预算？"]

while True:
    reply = 模型(messages)          # ★ 调用一次模型（推理）
    messages.append(reply)

    if reply 里有工具调用:
        result = 真的执行那个工具()
        messages.append(结果)         # ★ 结果也进历史
    else:
        break
```

把两个 `★` 连起来看：**每次工具调用都要「结果进历史 → 整个历史重新喂给模型 → 模型再说话」。**

### 1.3 代价

任务：20 个员工，每人查 Q3 报销明细（每人 50–100 条），跟预算比。

```
第 1 轮   模型 → get_team_members("eng")  → 返回 20 人
第 2 轮   模型 → get_expenses(张三)       → 返回 80 条
第 3 轮   模型 → get_expenses(李四)       → 返回 65 条
 ...      重复到第 21 轮 ...
第 22 轮  模型手里已有 2000+ 条明细，开始「用眼睛」加总、比对
```

| 问题 | 后果 |
| --- | --- |
| 往返 22 次 | 每次 `模型(messages)` 是一次完整推理，且历史越来越长 |
| 上下文被塞爆 | 2000+ 条明细（200KB）全堆在模型上下文里 |
| 让模型做算术 | 求和/过滤/比对本该代码做，却让模型读文本推 |

三个问题同一根源：**「下一步做什么」的决定权在模型手里。**

---

## § 2 PTC 改了什么

**只改一件事：把决定权从模型手里，交给一段代码。**

做法：额外给模型一个 `code_execution` 工具（装 Python 的沙箱），并用 `allowed_callers` 标记哪些工具允许被沙箱调用。`LEVEL_A`

```json
{
  "type": "code_execution_20260120",
  "name": "code_execution"
},
{
  "name": "query_database",
  "input_schema": { "...": "..." },
  "allowed_callers": ["code_execution_20260120"]
}
```

模型于是不再「一次要一个工具」，而是**写一段程序**：

```python
team = await get_team_members("eng")
budgets = {lv: await get_budget_by_level(lv) for lv in set(m["level"] for m in team)}
expenses = await asyncio.gather(*[get_expenses(m["id"], "Q3") for m in team])

exceeded = []
for m, exp in zip(team, expenses):
    total = sum(e["amount"] for e in exp)      # ← 求和由代码做
    if total > budgets[m["level"]]["travel_limit"]:
        exceeded.append({"name": m["name"], "spent": total})

print(exceeded)                                 # ← 只有这个 print 回模型
```

### 2.1 执行流程（四步）

| 步 | 发生什么 |
| --- | --- |
| 1 | Claude 写 Python，把工具当函数调用，可含多次调用与前后处理 |
| 2 | 代码在沙箱容器里跑；**跑到工具调用时暂停**，API 返回 `tool_use` |
| 3 | 你回传 `tool_result`，**代码继续跑**；中间结果不进 Claude 上下文 |
| 4 | 代码跑完，Claude 只收到最终输出，继续任务 |

来源：官方文档 "How programmatic tool calling works" `LEVEL_A`

### 2.2 关键接口约定

| 项 | 约定 |
| --- | --- |
| 工具在沙箱里的形态 | `async` Python 函数 |
| 入参 | 单个 `dict` |
| 返回值 | 字符串——就是你回传的 `tool_result` 的文本 |
| 调用方式 | 顶层 `await`；可 `asyncio.gather` 并发 |
| 结构化解析 | 模型自己 `json.loads(await query_database({...}))` |

### 2.3 `caller` 字段：怎么认出「是谁调的」

每个 `tool_use` block 都带 `caller`：`LEVEL_A`

```json
// 直接调用（传统）
"caller": { "type": "direct" }

// 代码内调用
"caller": {
  "type": "code_execution_20260120",
  "tool_id": "srvtoolu_abc123"
}
```

`tool_id` 指向发起它的那个 `server_tool_use`（code execution block），用于把每个 programmatic 调用**对回**是哪次沙箱执行产生的。

### 2.4 `allowed_callers` 的取值

| 值 | 含义 |
| --- | --- |
| `["direct"]` | 只能直接调用（省略时的默认） |
| `["code_execution_20260120"]` | 只能在代码执行里调用 |
| `["direct", "code_execution_20260120"]` | 两者皆可 |

**官方建议**：二选一，别两个都开——这样给模型的指引更清晰。

**版本互换**：`code_execution_20260120` 与 `code_execution_20260521` 在 `allowed_callers` 里可互换；但**响应里始终标为 `code_execution_20260120`**。

**安全红线**：

> `allowed_callers` controls how the tool is presented to Claude ... it is **not a hard API-level block** on direct invocation. ... **Do not rely on `allowed_callers` as a security boundary.**

---

## § 3 传统 vs PTC

```
【传统】模型 →工具→ 模型 →工具→ 模型 →工具→ 模型 →工具→ 模型
        每段都过一次模型，结果全部堆进上下文

【PTC】 模型 →写代码→ ┌ 沙箱: 工具→工具→工具→工具→工具 ┐ → 模型
                      └ 结果只在沙箱内部流动         ┘
                    整个编排只过一次模型
```

| 维度 | 传统 tool calling | PTC |
| --- | --- | --- |
| 并发 | ✅ 支持（parallel tool use） | ✅ 支持 |
| 依赖结果的循环 | ❌ 每轮回模型 | ✅ 代码里 |
| 依赖结果的分支/提前退出 | ❌ 回模型 | ✅ 代码里 |
| 中间结果 | 全进上下文 | 只留沙箱 |
| 整个编排的推理次数 | N 次 | 1 次 |
| 数据的处理（求和/过滤/join） | 模型「用眼睛算」 | 代码精确算 |
| HTTP 往返 | N 次 | **不一定更少** |

### 3.1 一个容易搞错的点

**PTC 里客户端的 HTTP 往返不一定少**——工具还是你在执行，你还是得把每个结果送回 API。

省掉的是**中间那些模型推理**，以及**上下文膨胀**。

### 3.2 并发不是重点

「可以并发调工具」是 `asyncio.gather` 的副产品，**传统方式也能并发**。

真正的区别是**循环归谁管**。传统并行 tool use 必须在**看到任何结果之前**就把这一批调用全部定下来——静态批处理。它表达不了：

```python
users = await list_users("eng")
bad = []
for u in users:
    exp = await get_expenses(u["id"])       # 规模由结果决定
    if sum(exp) > limit(u["level"]):
        bad.append(u)
    if len(bad) >= 10:                      # 提前退出
        break
```

传统方式跑这段要：`list_users` → 推理 → 决定 → 拿结果再推理 → 再决定……**每一层嵌套都要回模型。**

---

## § 4 按需发现：从 push 变成 pull

### 4.1 不是「配置文件」，恰恰相反

| | 传统 | 新方式 |
| --- | --- | --- |
| 工具定义形态 | JSON Schema = **数据** | 源码 / 类型 = **可执行** |
| 模型能做的 | 只能「读」 | 能读、能 grep、能 `import`、能调用 |

分界线不是格式，而是：**这东西能不能被执行。**

### 4.2 push vs pull

| | 传统 = push | 新方式 = pull |
| --- | --- | --- |
| 时机 | 每次请求全量下发 | 模型自己决定去读 |
| 范围 | 58 个工具每次都在 | 读到哪个才有哪个 |
| 本质 | **预付** | **按需** |

**「按需」的字面含义**：模型自己决定拉什么，**不拉的东西永远不进上下文**。

### 4.3 token 阶梯（实测）

模型面对一个真实目录：

```
servers/
├── github/
├── slack/
├── sentry/
├── grafana/
└── splunk/
```

| 步 | 动作 | 进上下文的量 |
| --- | --- | --- |
| 1 | 看到目录 | ~30 token |
| 2 | 任务与 Sentry 相关 → `read servers/sentry/index.ts` | ~200 token（5 个工具名 + 一句话） |
| 3 | 决定查 issue → `read servers/sentry/getIssue.ts` | ~150 token（完整参数类型） |
| 4 | 写代码调用 | —— |

**全程只有 1 个工具的完整定义进上下文，不是 58 个。**

官方数字：某场景 **150,000 → 2,000 token（−98.7%）** `LEVEL_A`

### 4.4 类型版的同一阶梯

```
模块        import * as sf from './salesforce'       ~10 token
  ↓
导出符号    getDocument / updateRecord / query        ~50 token
  ↓
类型定义    GetDocumentInput { documentId: string }   ~150 token
```

同样的三级，用**模块 → 符号 → 类型**代替**目录 → 索引 → 文件**。

类型的额外好处：**签名比实现短**，压缩率更高。

### 4.5 这个模式的名字：渐进式披露

> **Progressive disclosure（渐进式披露）**

它不新——**人写代码就是这么干的**：不背下 React 源码，而是打开文件树 → 看到 `useState` → 跳过去看签名 → 用完就走。IDE 的补全、类型提示、`grep`、跳转定义，全是「按需拉取接口信息」。

现在只是**把这个习惯交给了模型**。它能 work 的原因：模型在训练语料里见过几百万个文件树和类型声明。

`search_tools` 是同一件事的另一实现，它用 `detail` 参数显式控制粒度：

```
detail: "name"                  ← 只给名字
detail: "name_and_description"  ← 名字 + 一句话
detail: "full"                  ← 完整 schema
```

### 4.6 代价（重要）

**按需发现要模型多花几步去「找」。**

| | 直接下发 | 按需发现 |
| --- | --- | --- |
| 上下文 | 全部占满 | 只占现在用的 |
| 往返次数 | 0 | +1 ~ +3（ls、read） |
| 适合 | **工具少**（< 20） | **工具多**（> 100） |

所以这不是「新方式取代旧方式」，而是**多了一个档位，按规模选**。

这也解释了为什么 Anthropic 把两个功能一起发：

| 功能 | 治什么 |
| --- | --- |
| **PTC** | 回传的**数据**太多 |
| **Tool Search Tool** | 下发的**定义**太多 |

---

## § 5 实测数据

### 5.1 PTC 收益（官方公布）`LEVEL_A`

| 指标 | 数字 |
| --- | --- |
| Token 消耗（复杂研究任务均值） | 43,588 → 27,297（**−37%**） |
| 该任务原始数据 → 模型所见 | 200KB → 1KB |
| 省掉的推理 pass | 20+ 次工具调用省 **19+ 次** |
| 内部知识检索准确率 | 25.6% → **28.5%** |
| GIA 基准 | 46.5% → **51.2%** |
| BrowseComp / DeepSearchQA | 性能 **+11%**，输入 token **−24%** |

### 5.2 收益拆解：三份，只有两份与上下文有关

| # | 收益 | 与上下文有关？ |
| --- | --- | --- |
| ① | 上下文不再随**中间数据**膨胀 | ✅ |
| ② | 省掉 N 次推理（计算与延迟） | ❌ |
| ③ | 计算交给代码（准确率） | ❌ |

**③ 单独就带来准确率提升**——上下文一点不变也会是同样结果，因为这不是省 token 的事，是**不该让模型做算术**。

### 5.3 精确化

> 上下文**不再随中间数据膨胀，只随最终结论膨胀**。

它还是会长的，只是长得慢，且长的是模型真正需要推理的东西。

**限制**：如果某个中间结果模型**真的需要看到**，还是得 `print` 出来。PTC 不是「上下文永远小」，是「**由你决定什么进上下文**」——脚本的 `print` 就是那道闸门。

### 5.4 官方对动机的原话 `LEVEL_A`

> When using natural language tool calling, **each invocation requires a full inference pass**, and intermediate results pile up in context whether they're useful or not.
> — Anthropic, *Introducing advanced tool use*, 2025-11-24

> Direct tool calls consume context for each definition and result. Agents scale better by **writing code to call tools** instead.
> — Anthropic, *Code execution with MCP*, 2025-11-04

---

## § 6 其他收益与代价

### 6.1 附带收益

| 收益 | 机制 |
| --- | --- |
| 隐私 | 中间结果默认留在沙箱；可对 PII 自动 tokenize 后再进出模型 |
| 状态保持 | 沙箱有文件系统，可写中间结果续跑 |
| 技能沉淀 | 跑通的代码存成可复用函数（衔接 Skills） |
| 确定性控制流 | 循环/条件/错误处理显式写在代码里，不靠模型推理 |

### 6.2 代价

| 代价 | 说明 |
| --- | --- |
| 需要沙箱基础设施 | 安全执行环境、资源限制、监控——运营开销 |
| 沙箱生命周期管理 | 空闲回收、超时、容器 id 回传 |
| 调试变难 | 模型写的代码 + 暂停恢复，出错时是黑盒 |
| 小任务不划算 | 单次琐碎调用要起沙箱，纯亏 |

### 6.3 什么时候不该用

| 场景 | 原因 |
| --- | --- |
| 单次琐碎工具调用 | 起沙箱的成本 > 收益 |
| 需要人逐步确认的高风险操作 | 人的介入点被代码「吃掉」了 |
| 结果必须模型亲自通读 | 结论无法预先压缩 |
