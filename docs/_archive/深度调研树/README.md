# 深度调研树（Deep Research Tree）— 引擎 v3 说明

> **现行版本：引擎 v3（2026-08-13 起）。**
>
> 自动化调研工厂：主对话当总控，Workflow 当执行引擎，`state.json` 当唯一事实源。
> 每轮：「读 state → 取 QUEUED 任务批 → Workflow 并行跑 调研→审计 → 落 findings/_sources + 更新 state → 展开判定 → 写调度日志」。

## 引擎说明（docs 侧）

| 文件 | 作用 |
| --- | --- |
| [`_engine/ENGINE.md`](_engine/ENGINE.md) | **引擎机制总纲**：角色体系 / 状态机 / 持久化布局 / 扩展判定 |
| [`_engine/prompts/`](_engine/prompts/) | 生产段角色提示词：E-RES 调研员 · E-AUD 审计员 · E-SYN 汇总员 · E-COM 对比员 |
| [`_engine/workflows/`](_engine/workflows/) | 引擎脚本：`run_batch.js`（调研→审计流水线）、`run_proto.js`（原型实测） |

## 运行时产出（保留部分在 `../../../research_tree/`，不在本目录）

| 路径 | 内容 |
| --- | --- |
| `state/state.json` | 已于 2026-08-16 删除（Git 历史可恢复） |
| `tasks/` | 已于 2026-08-16 删除（Git 历史可恢复） |
| [`findings/`](../../../research_tree/findings/) | 调研发现（现行产出） |
| [`audit/`](../../../research_tree/audit/) | 审计结论（现行产出） |
| `_sources/` | 已于 2026-08-16 删除（Git 历史可恢复） |
| [`synthesis/`](../../../research_tree/synthesis/) | 合成稿 / 决策点终稿（**人最终读这一层**） |
| `logs/调度日志.md` | 已于 2026-08-16 删除（Git 历史可恢复） |
| [`总目录.md`](../../../research_tree/总目录.md) | 当前目录结构、保留/删除状态和收口说明 |

## 状态机（每张任务卡）

```
queued → running → submitted → accepted → archived    (到叶，正常终止)
                          ↘ rejected → queued            (回炉，附整改意见)
running --(超时/失联)--> queued                           (重新入队，retries+1)
```

- `archived`：父问题全部回答、候选已查证、无可展开子方向。
- 收口条件：队列空 且 无 running 且 无 rejected。

## 当前主线状态（2026-08-14）

- 知识载体主线 V1–V7 全部 accepted，**到叶归档**；队列无 queued/running/rejected。
- 人读结论以 `research_tree/synthesis/` 下**最新决策点**为准。
- 下一阶段是把结论带进「模块组合」设计，而非继续这条调研主线。

---

## v2 历史（已废弃）

v2「手工多会话」树状调研框架的模板与运行时表，已归档到 [`_archive_v2/`](_archive_v2/)，只作历史参考，**勿按 v2 操作**。废弃原因见 ENGINE.md 第 4 行：四份运行时状态从未真维护、强依赖人当执行器、无法断点续跑。
