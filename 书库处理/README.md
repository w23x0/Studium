# 书库处理（资料入库：PDF 转换与切分）

> 状态：现行（2026-10-05 从已删除的 `proto/` 移出）。只做书库 → MinerU 转换 → 按目录切分（原 M07），不含教学循环。设计见 `../docs/设计/记录/资料.md`。10-18 M08 取消，原 M08 点与子句的生成代码已删（`../方向记录.md` 10-18；旧代码在 git 历史里）。

## 运行

只用 Python 标准库，在本目录下运行。密钥只经环境变量（或不进 git 的 `.env`，见 `.env.example`）：`STUDIUM_OC_BASE_URL` / `STUDIUM_OC_API_KEY`（`oc:<模型>`）与 `MINERU_TOKEN`。`opus` / `sonnet` 走已登录的 `claude -p`。

```bash
cd 书库处理
python3 -m studium.mineru <书.pdf> --ranges 1-200,201-400          # 书 → md（MinerU）
python3 -m studium.mineru_batch <书库目录> [并发数]                # 整个书库批量转换（可重跑续上）
python3 -m studium.m07toc run --book <书目录> [--model sonnet]     # 模型整理目录 + 程序定位切分（M07；手改 m07/toc.tsv 后用 split 重切）
python3 -m studium.m07 split --book <MinerU 目录> --toc A-B        # K&K 专用切分
```

- 书目录 = 含 `p<页段>/full.md` 的目录（或 `source.json` 列出页段）；M07 产出在书目录的 `m07/`（书的原文不进 git）。
- 原型用真书：`STUDIUM_LIBRARY=<含书目录的上一级> npm start`。

## 文件

| 路径 | 内容 |
| --- | --- |
| `studium/llm.py` | 模型调用（`claude -p` / OpenAI 兼容接口） |
| `studium/mineru.py`、`mineru_batch.py` | PDF → md |
| `studium/m07.py`、`m07toc.py` | M07 切书（K&K 专用 / 通用） |
| `studium/prompts/m07_toc.md` | M07 目录整理提示词 |
