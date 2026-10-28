---
name: research-sources
description:
  深挖调研的取料工具：论文检索与全文（arXiv / OpenAlex / Semantic Scholar 引用）、GitHub 代码、Hacker News / Reddit / X 讨论。
  触发场景：要读论文原文、找谁引用了某篇、到开源代码里看机制、看社区怎么讨论某个做法。
  一般网页浏览、登录后操作仍用 web-access。
---

# research-sources

取料用；**读和判断交给你自己**：读正文，不信摘要与转述；没读到的不写。

## 取什么用什么

| 要什么 | 怎么取 | 本机实测（2026-10-25） |
| --- | --- | --- |
| 找论文 | `research.py search "<查询>" ["<查询2>" …] [--n 8] [--source arxiv,openalex]` | arXiv：词之间取“且”，短语加双引号；OpenAlex 带期刊 / 会议与被引数 |
| 论文全文 | `research.py get <arXiv 号 / arXiv 链接 / DOI> […]` → 打印 md 路径，再用 Read 读 | arXiv 走 HTML 版（公式留 LaTeX、表格成行），没有 HTML 退到 PDF；DOI 会先找有没有 arXiv 版，再试开放获取全文 |
| 谁引用了它（往后找新工作） | `research.py cites <arXiv 号 / DOI> [--n 25]` | Semantic Scholar 匿名常 429，脚本自动退避；失败退 OpenAlex（新论文覆盖差） |
| 博客 / 文档 / 网页正文 | `research.py page <url> […]`；排版乱时加 `--jina` | Jina 对 arxiv.org 匿名封锁，论文别走 Jina |
| HN 讨论 | `research.py hn "<查询>" […] [--since YYYY-MM-DD]`；一帖全部评论 `research.py thread <帖 id>` | 直连可用 |
| GitHub 找仓库 / 找代码 | `gh search repos "<词>" --sort stars --limit 10`；`gh search code "<符号或字符串>" --limit 20`（代码检索约 10 次 / 分钟） | `gh` 已登录 |
| GitHub 读源码 | `git clone --depth 1 <repo> "$CACHE/repos/<名>"`，再 Grep / Read；只看一个文件用 `gh api repos/<o>/<r>/contents/<路径> --jq .content \| base64 -d` | — |
| GitHub 议题 / 讨论 | `gh search issues "<词>" --repo <o>/<r>`；`gh issue view <n> -R <o>/<r> --comments` | — |
| X 讨论 | 先搜帖：omp 用内置 `web_search`（`site:x.com`、`recency`），Claude Code 用 `mcp__searxng__web_search`；读正文：omp 的 `read` 会直说需要 xAI 凭据（`xai-oauth` / `XAI_API_KEY`），没有就走浏览器 CDP；Claude Code 的 MCP 有 `fetch_page` / `x_user_posts` | 本机实测 X 搜索只有 Yahoo 一个引擎回结果，覆盖有限（2026-10-25） |
| 泛搜索（线索发现） | `research.py web "<查询>" [--n 10] [--time-range day\|month\|year] [--engines "google cse,yahoo"]`；默认 `$SEARXNG_ENDPOINT`（`http://127.0.0.1:8080`），本机 omp 经 gateway 用 `8081`。输出已去重、丢掉引擎的 related suggestions；`--json` 给程序读 | 只用来定位；要引用必须回原文。学术类改 `categories` 或直接用 arXiv / OpenAlex |
| Reddit、ACM DL 等出版商页 | 加载 web-access，走浏览器 CDP（带用户登录态） | curl 与 SearXNG 读 Reddit 都拿不到正文；需要用户 Chrome 打开远程调试 |

脚本路径：`${CLAUDE_SKILL_DIR}/scripts/research.py`，用 `python3 -I` 跑（只用标准库，PDF 要本机 `pdftotext`）。

## 规矩

- **全文缓存不进仓库**：`$STUDIUM_RESEARCH_CACHE`，默认 `~/.cache/studium-research/`（`papers/` `pages/` `threads/`，克隆放 `repos/`）。主仓库将来公开，论文与他人文章不放进去。
- **并发**：一条命令给多个查询 / 多个 id 就会并发；脚本已按站点限速（arXiv API 3 秒一次、Semantic Scholar 3 秒一次）、遇 429 / 5xx 退避重试。不要自己开循环狂刷同一站点。
- **可选密钥**（只经环境变量，不写进文件）：`OPENALEX_KEY`（OpenAlex 匿名与同 IP 共用每日额度）。
- **不把用户的邮箱、姓名等个人信息发给任何外部服务**（如 Unpaywall 的 `email` 参数）；接口非要不可时停下来报告，不自己填。
- 搜索结果只用来**定位**；要引用的说法必须回到原文（论文正文、源码行号、帖子原话）。

## 交回格式（每条来源一行或一小节）

| 来源 | 日期 | 是什么 | 质量依据 | 机制（怎么实现） | 对我们底层的启发，或明说“没有可借” | 证据边界 |
| --- | --- | --- | --- | --- | --- | --- |
| 链接 / arXiv 号 / 仓库 + 文件:行号 | 发表或发布日期 | 一句话 | 谁在真用、维护多久、作者做过什么；凭什么不是水货 | 读原文得到的做法，不是摘要复述 | 落到我们结构上的一点；没有就写“没有” | 模型与版本、人群、样本量、国家 / 年级 / 年代；没读到正文的标“只读了摘要” |

水货不取（标准见仓库 `CLAUDE.md`「调研先定问题和料的标准」）：看过判为水货的，末尾列一行名字 + 理由即可，不展开。
