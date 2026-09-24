# 会话记录（归档）

> 状态：**已归档，不作依据**。结论以权威文件为准（`../CLAUDE.md` 权威层级）；这里只保留过程与换设备所需的本机状态。

| 文件 | 内容 |
| --- | --- |
| `2026-09-23-M05设计闭环至讲解式主线.md` | 2026-09-23 ~ 09-24 会话：完成条件与检查时机 → M05 设计闭环（实验 3）→ 教学目标“激发主动钻研” → 缓存 / 隔离修复 → 讲解式（费曼）主线 → 真人试用 me-3 / me-4 → 先讲后追问等改定。对话正文，工具只留摘要，密钥已隐去 |
| `memory/` | Claude Code 本机记忆（`~/.claude/projects/<项目路径>/memory/`）的副本 |

## 换设备后

| 步 | 做法 |
| --- | --- |
| 1 | `git clone` 后在仓库根目录启动 Claude Code，先读 `任务线路.md` |
| 2 | 恢复记忆：把 `会话记录/memory/*.md` 复制到新机器的 `~/.claude/projects/<项目路径转成的目录名>/memory/`（目录名 = 仓库绝对路径把 `/` 换成 `-`，如 `/home/w23x/Studium` → `-home-w23x-Studium`） |
| 3 | 原型模拟学习者的密钥**不在 git 里**：复制 `proto/.env.example` 为 `proto/.env`，填入 `STUDIUM_OC_API_KEY` |
| 4 | 原型判断调用需要已登录的 `claude` CLI（`echo hi \| claude -p` 能返回即可） |
| 5 | 继续中断的真人试用：`cd proto && python3 -m studium.loop --run me-5` |
