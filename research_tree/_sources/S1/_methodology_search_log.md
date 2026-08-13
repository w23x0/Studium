# 快照：S1 调研方法记录与检索日志（非内容源）

## 检索工具状况（如实记录）
- 环境内置 WebSearch 工具在本会话中**连续返回空结果**（每次仅返回"REMINDER"占位，无任何结果条目），无法产出标题+URL 列表。共尝试 6 次：
  1. NebulaGraph 架构 RocksDB 分片 nGQL 存储
  2. NebulaGraph 单机部署 资源要求 个人使用
  3. NebulaGraph architecture RocksDB storage sharding nGQL
  4. nGQL vs openCypher GQL ISO standard comparison NebulaGraph
  5. NebulaGraph nGQL 私有 方言 openCypher 兼容 区别
  6. NebulaGraph 删除 顶点 边 语义 图数据库
- 替代方案：改用 WebFetch 抓取 DuckDuckGo HTML 端点（html.duckduckgo.com/html/?q=...）定位 URL，全部成功；随后对高价值来源逐一 WebFetch 抓原文。
- 所有"原文"均为 WebFetch 正文提取（非原始 HTML 字节）；快照即该提取内容 + URL + 抓取日期。这是本工具集下可达的"原文到手"上限，快照与发现文档均已如实标注。

## 关键词组清单（≥4，中英各半）
中文（7 组）：
1. NebulaGraph 架构 RocksDB 分片 nGQL 存储（WebSearch，空）
2. NebulaGraph 单机部署 资源要求 个人使用（WebSearch，空）
3. nGQL openCypher GQL 标准 对比（WebSearch，空）
4. NebulaGraph delete 删除 语义 图数据库 删除节点（WebSearch，空）
5. NebulaGraph nGQL openCypher GQL 标准 对比（DDG HTML，命中 10 条）
6. 分布式图数据库 个人 知识图谱 过度设计 选型（DDG HTML，命中 10 条）
7. NebulaGraph 单机部署 资源 个人使用 知识图谱（DDG HTML，命中 10 条）
8. NebulaGraph 备份 导出 数据 nebulabackup export（DDG HTML，命中 10 条）
9. NebulaGraph 导出 CSV JSON nebula-exporter spark 文本（DDG HTML，命中 10 条）
10. NebulaGraph 全文索引 elasticsearch 文本检索（DDG HTML，命中 10 条）
英文（3 组）：
11. NebulaGraph architecture RocksDB storage sharding nGQL（WebSearch，空）
12. nGQL vs openCypher GQL ISO standard comparison NebulaGraph（WebSearch，空）
13. NebulaGraph single machine deployment resource requirements（DDG HTML，命中 0 条直接结果，改用中文组 7 + 资源文档直抓）

## 判定
- 不满足证据等级的来源一律未计入 A 级。raybyte.cn 文章（全文索引排查）返回 Access Denied → 未核，不计入。
- 官网论坛 discuss.nebula-graph.io 连接失败（Socket closed）→ 未核；改用 discuss.nebula-graph.com.cn 中文论坛，成功。
