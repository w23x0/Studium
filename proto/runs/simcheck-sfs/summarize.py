"""汇总 trials.jsonl：翻转率表、SFS、未进入角色计数、按题目分解。输出 markdown 到 stdout。"""

import json
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
ALL = [json.loads(l) for l in (HERE / "trials.jsonl").read_text(encoding="utf-8").splitlines()]
STRICT = {}
if (HERE / "kernel_rejudge.jsonl").exists():
    for l in (HERE / "kernel_rejudge.jsonl").read_text(encoding="utf-8").splitlines():
        o = json.loads(l)
        STRICT[(o["model"], o["prompt"], o["item"], o["feedback"], o["rep"])] = o["strict"]
for r in ALL:  # kernel-null 用严格重判覆盖（原评委只看答案里的集合，见 rejudge_kernel.py）
    k = (r["model"], r["prompt"], r["item"], r["feedback"], r["rep"])
    if k in STRICT:
        r["r2_judge_orig"] = r["r2_judge"]
        r["r2_judge"] = "正确" if STRICT[k] == "放弃误解" else "仍错误"
PROMPTS = [p for p in ("A0", "A", "B") if any(r["prompt"] == p for r in ALL)]
rows = [r for r in ALL if r["item"] != "kernel-null"]  # 主表：5 条有效误解（kernel-null 题设计有缺陷，单列）
FB = ["targeted", "misaligned", "vague"]
FB_ZH = {"targeted": "针对性", "misaligned": "错位", "vague": "泛泛"}


def rate(rs):
    ok = [r for r in rs if r["r1_judge"] == "表现出误解"]
    if not ok:
        return None, 0, 0
    flips = sum(r["r2_judge"] == "正确" for r in ok)
    return flips / len(ok), flips, len(ok)


def fmt(x):
    return "—" if x[0] is None else f"{x[0]:.0%} ({x[1]}/{x[2]})"


def main():
    print("## 未进入角色（第 1 轮未表现出误解；含 kernel-null 全部 6 题）\n")
    print("| 模型 | 提示词 | 未进入 / 试次 |\n|---|---|---|")
    for m in ("opus", "sonnet"):
        for p in PROMPTS:
            rs = [r for r in ALL if r["model"] == m and r["prompt"] == p]
            print(f"| {m} | {p} | {sum(r['r1_judge'] != '表现出误解' for r in rs)} / {len(rs)} |")
    print("\n## 主表：5 条有效误解（不含 kernel-null）翻转到正确率（分母 = 进入角色的试次）与 SFS\n")
    print("| 模型 | 提示词 | 针对性 | 错位 | 泛泛 | 对照均值 | SFS |\n|---|---|---|---|---|---|---|")
    for m in ("opus", "sonnet"):
        for p in PROMPTS:
            cells = {fb: rate([r for r in rows if r["model"] == m and r["prompt"] == p and r["feedback"] == fb]) for fb in FB}
            if all(cells[fb][0] is not None for fb in FB):
                ctrl = (cells["misaligned"][0] + cells["vague"][0]) / 2
                sfs = cells["targeted"][0] - ctrl
                tail = f"{ctrl:.0%} | {sfs:+.2f}"
            else:
                tail = "— | —"
            print(f"| {m} | {p} | " + " | ".join(fmt(cells[fb]) for fb in FB) + f" | {tail} |")
    print("\n## 按题目分解（翻转数/进入角色数）\n")
    print("| 题目 | 模型 | 提示词 | 针对性 | 错位 | 泛泛 |\n|---|---|---|---|---|---|")
    items = sorted({r["item"] for r in rows}, key=lambda x: [r["item"] for r in rows].index(x))
    for it in items:
        for m in ("opus", "sonnet"):
            for p in PROMPTS:
                cells = [rate([r for r in rows if r["item"] == it and r["model"] == m and r["prompt"] == p and r["feedback"] == fb]) for fb in FB]
                print(f"| {it} | {m} | {p} | " + " | ".join(f"{c[1]}/{c[2]}" for c in cells) + " |")
    print("\n## 含 kernel-null（严格重判）的 6 题合并表\n")
    print("| 模型 | 提示词 | 针对性 | 错位 | 泛泛 | 对照均值 | SFS |\n|---|---|---|---|---|---|---|")
    for m in ("opus", "sonnet"):
        for p in PROMPTS:
            cells = {fb: rate([r for r in ALL if r["model"] == m and r["prompt"] == p and r["feedback"] == fb]) for fb in FB}
            ctrl = (cells["misaligned"][0] + cells["vague"][0]) / 2
            print(f"| {m} | {p} | " + " | ".join(fmt(cells[fb]) for fb in FB) + f" | {ctrl:.0%} | {cells['targeted'][0] - ctrl:+.2f} |")
    kn = [r for r in ALL if r["item"] == "kernel-null"]
    print(f"\nkernel-null 原评委判“正确”的第 2 轮 {sum(r.get('r2_judge_orig') == '正确' for r in kn)} 个，严格重判后 {sum(r['r2_judge'] == '正确' for r in kn)} 个")
    other = [r for r in rows if r.get("r2_judge") in ("其他", "无法解析")]
    print(f"\n评委判“其他/无法解析”的第 2 轮：{len(other)} 个")


main()
