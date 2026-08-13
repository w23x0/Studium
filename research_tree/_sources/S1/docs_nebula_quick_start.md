# 快照：Quick Start Workflow（部署方式）
- URL: https://docs.nebula-graph.io/3.8.0/2.quick-start/1.quick-start-workflow/
- 机构：NebulaGraph 官方文档
- 抓取日期：2026-08-13
- 工具：WebFetch 正文提取
- 证据等级：A（原文到手）

## 提取正文（关键句逐字）
- Docker Desktop 扩展 与 Docker Compose 两种部署。
- "It is only recommended to use this method when testing the functions of NebulaGraph."（Docker Compose）
- docker-compose up -d 会启动 **3 Meta（metad0/1/2）+ 3 Graph（graphd/1/2）+ 3 Storage（storaged0/1/2）= 9 个容器进程**，外加 Console 容器。
- 前置依赖：Docker、Docker Compose、Git。
- "We do not recommend you deploy NebulaGraph on Docker Desktop for Windows due to its subpar performance."
- 默认端口 9669；"By default, the authentication is off, you can only log in with an existing username (the default is `root`) and any password."
- 本页未给 CPU/内存/磁盘下限，链接到独立资源准备页。
- "The `master` branch contains the untested code for the latest NebulaGraph development release. **DO NOT** use this release in a production environment."

## 备注
最小规模（官方快速开始）即 9 进程集群形态；单机最小部署见资源准备页（1 metad+1 storaged+1 graphd）。
