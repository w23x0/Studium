# 书库处理（M06 / M07 / M08 原料）

> 状态：现行（2026-10-05 从已删除的 `proto/` 移出）。只做书库 → M07 切分 → M08 抽取，不含教学循环。全库抽取结果在私有仓库 `w23x0/studium-m08-data`（本机 `/home/wangziyan/studium-m08-data/`）。未做：整章收口、关系纠错、跨书合并。

## 运行

只用 Python 标准库，在本目录下运行。密钥：复制 `.env.example` 为 `.env`（不进 git），填 `STUDIUM_OC_BASE_URL` / `STUDIUM_OC_API_KEY`（`oc:<模型>`）与 `MINERU_TOKEN`；也可直接用同名环境变量。`opus` / `sonnet` 走已登录的 `claude -p`。

```bash
cd 书库处理
python3 -m studium.mineru <书.pdf> --ranges 1-200,201-400          # 书 → md（MinerU）
python3 -m studium.mineru_batch <书库目录> [并发数]                # 整个书库批量转换（可重跑续上）
python3 -m studium.m07toc run --book <MinerU 目录>                 # 模型整理目录 + 程序定位切分（M07；手改 m07/toc.tsv 后用 m07 split 重切）
python3 -m studium.m07 split --book <MinerU 目录> --toc A-B        # 按目录切成小节 + 索引
python3 -m studium.extract --book <MinerU 目录> --whole            # 整本书逐节接力抽 M08 知识点 + 关系（引文逐字定页；可续跑）
python3 -m studium.library <书库目录> [并发数]                     # 全书库：书间并发、书内顺序；进度 runs/lib-progress.log
python3 -m studium.consolidate --run NAME --book <MinerU 目录> --model opus   # 整章收口：合并过碎的知识点（强模型）
```

输出在 `runs/`（已在 `.gitignore` 忽略：含书的原文摘录）。

## 文件

| 路径 | 内容 |
| --- | --- |
| `studium/llm.py` | 模型调用（`claude -p` / OpenAI 兼容接口） |
| `studium/mineru.py`、`mineru_batch.py` | PDF → md |
| `studium/m07.py`、`m07toc.py` | M07 切书（K&K 专用 / 通用） |
| `studium/extract.py`、`library.py`、`consolidate.py` | M08 抽取、全库调度、整章收口 |
| `studium/store.py` | 调用记录（`calls.log`） |
| `studium/prompts/` | M07 目录整理、M08 抽取与收口的提示词 |
