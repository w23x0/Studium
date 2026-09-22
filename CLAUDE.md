# Studium · Claude Code 入口

> 工作约定的唯一来源在 `.omp/`，这里只做引用，不复制。改约定请改 `.omp/` 下的文件。

@.omp/AGENTS.md

@.omp/RULES.md

## Claude Code 补充

- 开新会话的参考开场词：`.omp/会话开场提示词.md`（每次收尾时重写）。
- 前代外部档案 `/home/w23x/Deep`：**只读、已冻结**，不是本仓库的设计依据；进去前先读它的 `CLAUDE.md`。
- 联网操作走 `web-access` 技能（`.claude/skills/web-access` 是指向 `.agents/skills/web-access` 的链接）。
- `.claude/settings.json` 进 git（跨机共享）；机器特有的设置放 `.claude/settings.local.json`（不进 git）。
