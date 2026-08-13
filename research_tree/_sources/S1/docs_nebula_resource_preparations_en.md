# 快照：Resource Preparations（资源要求，英文）
- URL: https://docs.nebula-graph.io/3.8.0/4.deployment-and-installation/1.resource-preparations/
- 机构：NebulaGraph 官方文档
- 抓取日期：2026-08-13
- 工具：WebFetch 正文提取
- 证据等级：A（原文到手）

## 提取正文（关键句逐字）
- 编译环境最低：x86_64 / 内存 4GB / 磁盘 10GB SSD
- 测试环境：x86_64 / 4 核 / 内存 8GB / 磁盘 100GB SSD
- 生产环境：x86_64 / 48 核 / 内存 256GB / 磁盘 2×1.6TB NVMe SSD
- "NebulaGraph is designed and implemented for NVMe SSD."；"Due to the poor IOPS capability and long random seek latency, HDD is not recommended."
- "Do not use remote storage devices, such as NAS or SAN."；"NebulaGraph provides a multi-replica mechanism. Configuring RAID would result in a waste of resources."
- 单机部署：测试环境 "you can deploy 1 metad, 1 storaged, and 1 graphd processes in the machine."
- 容量估算：磁盘 ≈ (点数+边数) × 平均属性字节 × 7.5 × 120%
- 分区数 ≈ 磁盘数 × multiplier（SSD=20，HDD=2）

## 备注
单机最小可部署（3 进程），但官方生产定位为 48 核/256GB/NVMe；"测试环境"描述的单机形态即"分布式引擎按最小配跑"。
