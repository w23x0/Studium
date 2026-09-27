---
name: reference-learning-materials
description: 产品负责人的书库与个人学习笔记位置——M07/M08 用书、M09 笔记导入实验用笔记
metadata:
  node_type: memory
  type: reference
  originSessionId: b876bac4-2ae2-4aeb-a39f-9e47cbabf43d
  modified: 2026-09-27T15:06:08.661Z
---

| 用途 | 路径 | 说明 |
| --- | --- | --- |
| 书库（M06/M07 原料） | `/home/w23x/w23x/学习资料/` | 按学科分目录的 PDF；高中物理六册已是 MinerU 产物（full.md + content_list.json） |
| 力学主教材 | `/home/w23x/w23x/学习资料/大学物理/力学/` | Kleppner & Kolenkow 2nd ed. (CUP 2014)，2026-09-27 经 `proto/studium/mineru.py` 转成 `Kleppner-Kolenkow-2014/p<页段>/` |
| 线代笔记（M09 笔记导入实验） | `/home/w23x/Note/线性代数/Gilbert Strang/笔记1.0` | 产品负责人自写，按 MIT 18.06 讲次编号的 md（Obsidian 库） |
| 微积分笔记（M09 笔记导入实验） | `/home/w23x/Note/微积分/同济八` | 上下册 + 期末复习 canvas |

MinerU token 不在 `.env` 可读范围内（项目禁止 agent 读写 `.env`），运行时经 `MINERU_TOKEN` 环境变量传入，由产品负责人自己写进 `proto/.env`。

相关：[[feedback-own-judgment-and-validation]]
