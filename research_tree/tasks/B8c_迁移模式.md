# 任务卡 B8c — 双写/影子读迁移模式与原子性
角色：深度调研树分支调研员（B8c，B8 校验迁移系 R3 子任务）。
分支名：存储迁移的工程模式（双写/影子读/回放）细节与"不丢失 JSONL 崩溃安全"的迁移设计。

## 问题清单
1. 双写（dual-write）与影子读（shadow read）的工程定义、风险（一致性问题）与缓解（outbox、SAGA）——以工程文献/博客/书为据（标注等级）。
2. 数据库迁移的经典模式：expand-migrate-contract（并行运行期）、蓝绿、回滚策略（如 refactoring databases 模式）。
3. 事件回放/重建（event replay）作为迁移验证：把旧 JSONL 重放到新格式并对比审计结果（推断标 C）。
4. 对"磁盘上任何时刻都是合法文件"红线：目标格式的增量写入是否同样满足（逐行合法 vs 事务提交点）。
5. 迁移验收标准设计：哈希/计数/锚点校验全量重跑 + 抽样人审，先例来源（工程实践为据，未核则标未核）。

## 候选空间与线索
microservices.io patterns（outbox）、Refactoring Databases 模式（expand/contract）、蓝绿部署文献、事件溯源重放文献（Fowler）、工程博客（标注等级）。

## 搜索关键词
中文：双写 影子读 迁移 模式、expand migrate contract 数据库 迁移、事件 重放 重建 验证、蓝绿 部署 回滚
英文：dual write shadow read migration pattern、expand contract database migration pattern、event replay rebuild verification、blue-green deployment rollback strategy

## 工作量红线
可核来源>=15 且原文到手>=10；来源类型>=3 类；候选逐一查证>=5；关键词>=4 组。

## 产出格式（发现.md，写入 research_tree/findings/B8c_迁移模式_发现.md）
0 一句话结论 / 1 逐条回答 / 2 关键发现（论断+URL+标题+机构+日期+原文摘录+等级 A/B/C）/ 3 冲突与张力 / 4 未决 / 5 来源清单 / 6 判死自查。

## 禁止项
不做工具选型；不越界（映射机制归 B8b、校验语言归 B5）；不捏造来源；抓不到写"未核"；推断标 C。
