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
python3 -m studium.m08 run   --book <书目录> --chapter 3 --out <产出目录> [--model sonnet] [--effort high] [--no-fill]   # M08：生成 → 逐节审核回扫 + 补漏 → 合并 → 检查（可续跑）
python3 -m studium.m08 build --book <书目录> --chapter 3 --out <产出目录>   # 只重做程序部分（核锚点、定来源、写 jsonl、检查）
python3 -m studium.m08 check --out <产出目录>                               # 只重出 report.md
python3 -m studium.m08_batch <书库根> --out-root <目录> --model <模型> [--jobs 16] [--only 子串] [--retries 2] [--dry-run]   # 整个书库并发批量跑 M08（状态表 status.tsv，可重跑续上）
```

- 书目录 = 含 `p<页段>/full.md` 的目录（或 `source.json` 列出页段）；M07 产出在书目录的 `m07/`（书的原文不进 git）。
- M08 产出放私有仓库工作区 `~/studium-m08-data/m08/<书>-<范围>/`：`points.jsonl`、`clauses.jsonl`（原型 `STUDIUM_M08` 直接读）、`report.md`（程序检查）、`work/`（每次模型调用的原样输出与 `calls.log`）。已有的步骤跳过；`--redo gen` 重生成（连带重审、重补漏），`--redo audit` 只重审与重补漏。
- 原型用真书：`STUDIUM_LIBRARY=<含书目录的上一级> STUDIUM_M08=<产出目录> npm start`。

## M08 流程（`studium/m08.py`）

| 步 | 谁做 | 做什么 |
| --- | --- | --- |
| 生成 | 模型（1 次；第 3 章用的 opus） | 只给学科、范围（章名 + 节名）与本书此前的章节标题，不给原文；凭自身知识写点（按定义拆）与子句（出发点 → 新点 + 一两句话），范围外的出发点标“前置” |
| 审核 + 回扫 | 模型（每节 1 次，按书序串行；第 3 章用的 sonnet `--effort high`） | 给当前清单（来历标出“前置”）+ 本节正文（不含习题），从书出发：按原文顺序列书讲的点（一致 / 书的定义不同 / 清单没有；本节讲了的前置点照样列）、书走的路线（对上清单哪条，对不上就是回扫补入；每条标 `book_walks`：书在本节任何一段走出关键一步才 true，false 须写 `missing_step` 缺哪一步）、零件、书里明写的“别混淆”、书只提到没讲的（`mentions`，挂锚点不立点；本节后面接着讲了的不算只提到）、疑似转录错误 |
| 补漏 | 模型（每节审核后，有漏才调；每批 ≤ 15 段；`--no-fill` 关掉） | 程序把本节正文切成段落块，没有任何核过的摘录落进来的块（只记了“只提到”的也算，注明审核的判法）编号 S1、S2…（段表 `work/fill-<节>.plan.json`）；给整节原文、标出这些段，逐段作答 `responses`（补 / 只提到 / 跳过 + 理由 + refs）：补的照审核格式写、只提到记 `mentions`；程序核对每段都有回应，答“补”的须有讲的内容（点、路线、零件、别混淆；只提到不算）的摘录核得到落在这段里，否则也算没回应；缺的段只给缺的再问 1 次（`<批>-re`，摘录不在本段的注明“摘录须取自这一段”），仍缺记“补漏未回应”（没有回应 / 答补但摘录不在本段）；多于 15 段分批（`fill-<节>-1`、`-2`…，按序并入、可续跑）；系统提示同审核，说明在 `m08_fill.md` |
| 合并 | 程序 | 新点须有同一输出里的路线指向它，否则不并入（摘录记作书只提到）；摘录回原文核对（只容写法差）；核过的摘录对到 MinerU `content_list` 块（含要点框 `code_body`、图表标题；先用核对时定位到的原文行找，摘录开头在所标行附近哪行就从那里起，找不到再用摘录文本），得原件 PDF 页 + 位置框；来源：点有核过的支撑 = 书给的，范围内其余 = 模型补的，前置点本次没讲到 = 未审；前置点被某节列为书讲的点（摘录核得到）改判范围内并记进问题；子句 `book_walks` 为 false 的记模型补的、锚点照挂（false 却没写 `missing_step` 的按书给的记并记进问题）；已判模型补的子句被后来的“同一条”改判书给的，照改并记进问题（来源改判），两种不改：依据只落在本节小结 / 要点行（节首要点框 = 紧跟节标题、原文在 `content_list` type=code 块里的行；“REVIEW OF THE KEY IDEAS”“小结”“Summary”等标题到下一个标题；节名本身是小结的整节），本节已有写了 `missing_step` 的“没走”判断（记“来源冲突”），两种都照挂锚点、来源保持模型补的；书没走出的新路线与已有书给的子句同出发点同新点（或出发点只多一个已有点）不另立子句，摘录挂到那条上并记进问题（重复路线未并入）；书只提到的挂在对应点的 `mentions` 上、不改来源 |
| 检查 | 程序 | 来源比例（含回扫补入里书没走出的）、锚点核对、孤立点、环、学不到的点、重复子句、句子长短、多定义拆分清单、随机抽样锚点、书只提到的（不对应点的列出）、段落覆盖（每块分类：覆盖 / 跳过（按理由关键词粗分例题、图表、其他）/ 只提到 / 真缺口（补漏未回应、没问过）；头部与每节都列这几个数，未覆盖块清单真缺口在前；块、分类与计数存 `work/build.json`）→ `report.md` |

每条点 / 子句记生成与审核的提示词版本（文件名@哈希）与模型（含思考强度），提示词改了可整批重写。默认强度下 Sonnet 几乎不思考、回扫漏得多，审核须带 `--effort high`（`docs/Harness设计/_research/设计变更记录.md` 10-08）。调用量：一章 = 生成 1 次 + 每节审核 1 次 + 每节补漏 ⌈未覆盖段 / 15⌉ 批、每批至多追问 1 次。模型输出结构不合格（生成没有 `points`、审核没有 `book_points` / `book_routes`、补漏没有 `responses`）当失败：删掉原样输出重调，至多再调 2 次，仍不合格报错交批跑重试（`calls.log` 记 `<label>-bad`）；`build` 遇到已有的不合格输出只记进问题、不并入。习题区（`Problem Set`、`Challenge Problems`、`Exercises`、`Problems` 标题起）不进审核与覆盖统计。

## 文件

| 路径 | 内容 |
| --- | --- |
| `studium/llm.py` | 模型调用（`claude -p` / OpenAI 兼容接口） |
| `studium/mineru.py`、`mineru_batch.py` | PDF → md |
| `studium/m07.py`、`m07toc.py` | M07 切书（K&K 专用 / 通用） |
| `studium/m08.py` | M08 点与子句：生成、审核回扫、合并、检查 |
| `studium/m08_batch.py` | 整个书库并发批量跑 M08：每本书每个有节的章一个子进程，按书交错、失败重试、状态表 |
| `studium/prompts/m07_toc.md` | M07 目录整理提示词 |
| `studium/prompts/m08_generate.md`、`m08_audit.md`、`m08_fill.md` | M08 生成、审核回扫提示词；补漏时接在用户消息末尾的说明（逐段作答格式） |
