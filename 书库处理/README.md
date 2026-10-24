# 书库处理（PDF → md 转换）

> 状态：现行（2026-10-05 从已删除的 `proto/` 移出）。只做 PDF → MinerU 转换，不含教学循环。设计见 `../docs/设计/记录/资料.md`。10-18 M08 取消，原 M08 点与子句的生成代码已删（`../方向记录.md` 10-18）；10-24 原型去掉书库，按目录切分（原 M07）、整库批量转换、模型调用的代码已删（旧代码都在 git 历史里）。
> 原型的项目资料加 PDF 时调用 `studium.mineru`（`../原型/src/core/knowledge/materials.ts` 的 `convertPdf`），输出到资料目录的 `mineru/`，各段 `full.md` 再拷进 `正文/`。

## 运行

只用 Python 标准库，在本目录下运行。密钥只经环境变量（或不进 git 的 `.env`，见 `.env.example`）：`MINERU_TOKEN`。原型调用时只认环境变量。

```bash
cd 书库处理
python3 -m studium.mineru <书.pdf> --ranges 1-200,201-400 [--lang en] [--out 目录]   # 一本 PDF → md（MinerU）
```

- 每段页码一个子目录 `p<起>-<止>/`（`full.md` + `*_content_list.json` + `*_origin.pdf`），页段记在 `--out` 目录的 `source.json`。

## 文件

| 路径 | 内容 |
| --- | --- |
| `studium/mineru.py` | PDF → md（MinerU 精准解析 API，长书按 200 页分段）；密钥从环境变量或 `.env` 读 |
