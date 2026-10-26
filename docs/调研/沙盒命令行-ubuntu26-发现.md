# 沙盒里 Bash 跑不起来（Ubuntu 26.04）· 发现

> 状态：待定（10-26 本机诊断，Opus 子代理只读完成；**不作产品结论**；产品负责人决定先不修）。
> 起因：10-26 产品负责人本机试跑，学习对话与检索子代理的 Bash 一跑就报错，模型改用 Read / Glob / Grep 绕过，未造成损失。

## 症状

`apply-seccomp: write /proc/self/setgroups (nested userns is capability-restricted; caller must provide CAP_SYS_ADMIN): Permission denied`。Read / Glob / Grep 不走命令行，不受影响。`bwrap`、`socat` 已装。

## 原因（本机复现；抽查了配置文件存在与开关值）

| 项 | 内容 |
| --- | --- |
| 挡住的 | Ubuntu 26.04 自带并默认启用的 AppArmor 配置 `/etc/apparmor.d/bwrap-userns-restrict`：给 `/usr/bin/bwrap` 挂 `bwrap`，把它的子进程叠进 `unpriv_bwrap`（不给任何特权能力） |
| 为什么失败 | SDK 内嵌的 `apply-seccomp` 跑在 bwrap 里，要再开一层 userns，拿不到 CAP_SYS_ADMIN |
| 不是 | 普通 userns 被拒（`unprivileged_userns_clone=1`、第一层 bwrap 能起来） |
| 对照实验 | 单独跑 helper 成功；套 `/usr/bin/bwrap` 报同一错；套复制到别处的 bwrap 成功——唯一变量是这份配置 |
| 上游 | anthropics/claude-code #43454、#81799、#101946 等；维护者 08 月复现，到 2.1.304 未修。官方沙盒文档只讲 24.04 的配置，没提 26.04 |

## 候选方案（均未执行）

| 方案 | 做法 | sudo | 备注 |
| --- | --- | --- | --- |
| A | `claude-agent-sdk.ts` 沙盒网络选项加 `allowAllUnixSockets: true`（联网 / 不联网两个分支） | 否 | 维护者认可、26.04 有人实测有效；代价是沙盒命令能连本机路径型 Unix 套接字（本机在 docker 组，`/run/docker.sock` 等于 root），需同时禁读相关套接字，**禁读能否挡住连接未测** |
| B | `sandbox.ts` 的 `forLoop` / `forRetrieve` 设 `commands: false` | 否 | 最安全；模型只剩读写搜文件。产品取舍 |
| C | 停用系统那份配置、换文档里的宽松版 | 是 | 影响本机所有 bwrap 用户（Flatpak 等），可撤销 |
| D、E、F | 改系统开关 / 加允许规则 / 专用 bwrap | 是 | 多半无效或不确定，不推荐 |
| G | 命令不进沙盒 | 否 | 不能用：`canUseTool` 对 Bash 一律放行，等于命令能读写整台机器 |

## 以后看

- 上游修好后 A 可撤。
- 学习对话真需要跑命令时（跑代码、画图）再回来选方案；目前没出现。
- 原型沙盒配置位置：`原型/src/core/model/claude-agent-sdk.ts` 124–152 行、`原型/src/core/sandbox.ts` 89、134 行起。

## 来源

一手：Claude Code 官方沙盒文档（10-26 读）；claude-code 仓库 issue #43454、#81799、#101946、#105194（子代理读，我未逐条核对）。本机日志：`journalctl -k` 中 `apparmor="DENIED" ... profile="unpriv_bwrap" capname="sys_admin"`。
