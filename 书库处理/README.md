# 书库处理（M06 / M07 / M08 原料）

> 状态：现行（2026-10-05 从已删除的 `proto/` 移出；10-08 M08 部分改写为“先生成后回扫”）。只做书库 → M07 切分 → M08 点与子句，不含教学循环。M08 按 M08 审查单「点与子句」「点与子句的生成」做；现只在 Strang《Introduction to Linear Algebra》5e 第 3 章跑过一次，方案未定稿前不扩大范围（`任务线路.md` #22）。旧的“逐节接力抽点 + 两两关系表”代码 10-08 删除（`方向记录.md` 10-06 M08 抽取行）。

## 运行

只用 Python 标准库，在本目录下运行。密钥只经环境变量（或不进 git 的 `.env`，见 `.env.example`）：`STUDIUM_OC_BASE_URL` / `STUDIUM_OC_API_KEY`（`oc:<模型>`）与 `MINERU_TOKEN`。`opus` / `sonnet` 走已登录的 `claude -p`。

```bash
cd 书库处理
python3 -m studium.mineru <书.pdf> --ranges 1-200,201-400          # 书 → md（MinerU）
python3 -m studium.mineru_batch <书库目录> [并发数]                # 整个书库批量转换（可重跑续上）
python3 -m studium.m07toc run --book <书目录> [--model sonnet]     # 模型整理目录 + 程序定位切分（M07；手改 m07/toc.tsv 后用 split 重切）
python3 -m studium.m07 split --book <MinerU 目录> --toc A-B        # K&K 专用切分
python3 -m studium.m08 run   --book <书目录> --chapter 3 --out <产出目录> [--model sonnet] [--effort high]   # M08：生成 → 逐节审核回扫 → 合并 → 检查（可续跑）
python3 -m studium.m08 build --book <书目录> --chapter 3 --out <产出目录>   # 只重做程序部分（核锚点、定来源、写 jsonl、检查）
python3 -m studium.m08 check --out <产出目录>                               # 只重出 report.md
```

- 书目录 = 含 `p<页段>/full.md` 的目录（或 `source.json` 列出页段）；M07 产出在书目录的 `m07/`（书的原文不进 git）。
- M08 产出放私有仓库工作区 `~/studium-m08-data/m08/<书>-<范围>/`：`points.jsonl`、`clauses.jsonl`（原型 `STUDIUM_M08` 直接读）、`report.md`（程序检查）、`work/`（每次模型调用的原样输出与 `calls.log`）。已有的步骤跳过；`--redo gen` 重生成（连带重审），`--redo audit` 只重审。
- 原型用真书：`STUDIUM_LIBRARY=<含书目录的上一级> STUDIUM_M08=<产出目录> npm start`。

## M08 流程（`studium/m08.py`）

| 步 | 谁做 | 做什么 |
| --- | --- | --- |
| 生成 | 模型（1 次；第 3 章用的 opus） | 只给学科、范围（章名 + 节名）与本书此前的章节标题，不给原文；凭自身知识写点（按定义拆）与子句（出发点 → 新点 + 一两句话），范围外的出发点标“前置” |
| 审核 + 回扫 | 模型（每节 1 次，按书序串行；第 3 章用的 sonnet `--effort high`） | 给当前清单 + 本节正文（不含习题），从书出发：按原文顺序列书讲的点（一致 / 书的定义不同 / 清单没有）、书走的路线（对上清单哪条，对不上就是回扫补入）、零件、书里明写的“别混淆”、疑似转录错误 |
| 合并 | 程序 | 摘录回原文核对（只容写法差）；核过的摘录对到 MinerU `content_list` 块，得原件 PDF 页 + 位置框；来源：有核过的支撑 = 书给的，范围内其余 = 模型补的，前置点本次没讲到 = 未审 |
| 检查 | 程序 | 来源比例、锚点核对、孤立点、环、学不到的点、重复子句、句子长短、多定义拆分清单、随机抽样锚点 → `report.md` |

每条点 / 子句记生成与审核的提示词版本（文件名@哈希）与模型（含思考强度），提示词改了可整批重写。默认强度下 Sonnet 几乎不思考、回扫漏得多，审核须带 `--effort high`（`docs/Harness设计/_research/设计变更记录.md` 10-08）。调用量：一章 = 生成 1 次 + 每节 1 次（第 3 章 5 节共 6 次）。

## 文件

| 路径 | 内容 |
| --- | --- |
| `studium/llm.py` | 模型调用（`claude -p` / OpenAI 兼容接口） |
| `studium/mineru.py`、`mineru_batch.py` | PDF → md |
| `studium/m07.py`、`m07toc.py` | M07 切书（K&K 专用 / 通用） |
| `studium/m08.py` | M08 点与子句：生成、审核回扫、合并、检查 |
| `studium/prompts/m07_toc.md` | M07 目录整理提示词 |
| `studium/prompts/m08_generate.md`、`m08_audit.md` | M08 生成、审核回扫提示词 |
