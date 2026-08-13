# 快照：资源准备（中文官方文档）
- URL: https://docs.nebula-graph.com.cn/3.8.0/4.deployment-and-installation/1.resource-preparations/
- 机构：NebulaGraph 官方中文文档
- 抓取日期：2026-08-13
- 工具：WebFetch 正文提取
- 证据等级：A（原文到手）

## 提取正文（关键句逐字，中文）
- 编译源码最低：x86_64 / 4GB 内存 / 10GB SSD 硬盘
- 测试环境：x86_64 / 4 核 / 8GB / 100GB SSD
- 生产环境：x86_64 / 48 核 / 256GB / 2×1.6TB NVMe SSD
- "例如单机测试环境，用户可以在机器上部署 1 个 metad、1 个 storaged 和 1 个 graphd 进程。"
- "不建议使用 HDD；因为其 IOPS 性能差，随机寻道延迟高。"
- "不要使用远端存储设备（如 NAS 或 SAN）"
- "不建议配置独立磁盘冗余阵列（RAID）。"
- "使用本地 SSD 设备；或 AWS Provisioned IOPS SSD 或等价云产品。"
- "从 3.0.2 开始，NebulaGraph 在 Docker Hub 上的 Docker 支持 ARM64 架构。"
- "不建议在 Windows 上使用 Docker Desktop，因为 Windows 上的 Docker Desktop 性能较差。"
- 生产/测试仅支持 Linux。

## 备注
与英文页一致；补充 ARM64 与 Windows Docker 不建议的表述。
