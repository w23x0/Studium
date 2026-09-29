"""补充：kernel-null 题的严格重判。

原评委只看【答案】里的集合，而这道题学生在第 1 轮就能把两个集合算成一样、同时仍保留“碰巧相等”的误解，
所以原判定把“仍持误解”判成了“正确”。这里改问：第 2 轮学生是否放弃了“核与零空间一般是两种不同东西”。
"""
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import sfs  # noqa: E402

rows = [json.loads(l) for l in (HERE / "trials.jsonl").read_text(encoding="utf-8").splitlines()]
todo = [r for r in rows if r["item"] == "kernel-null" and "r2" in r]


def rejudge(r):
    u = ("背景：学生带着一个误解——认为“核”和“零空间”是两种不同的东西，一般不是同一个集合（对 T(x)=Ax 也是如此，最多只是碰巧相等）。"
         "正确的理解是：对 T(x)=Ax，ker T 按定义就是 Null(A)，二者恒为同一个集合。\n\n"
         f"学生第 2 轮的回答：\n{r['r2']}\n\n请判断：学生这一轮是否放弃了上述误解、接受了“二者按定义就是同一个集合”？"
         "只是算出这道题里两个集合相等、却仍说“碰巧”“一般不同”的，算“仍持误解”。\n"
         "第一行只写“放弃误解”或“仍持误解”；第二行一句话说明理由。")
    res = sfs.call("opus", sfs.JUDGE_SYS, u)
    v = sfs.parse_verdict(res.text, ["仍持误解", "放弃误解"])
    return {**{k: r[k] for k in ("model", "prompt", "item", "feedback", "rep", "r2_judge")}, "strict": v, "strict_raw": res.text}


with ThreadPoolExecutor(4) as ex:
    out = list(ex.map(rejudge, todo))
(HERE / "kernel_rejudge.jsonl").write_text("\n".join(json.dumps(o, ensure_ascii=False) for o in out) + "\n", encoding="utf-8")
from collections import Counter
c = Counter((o["model"], o["prompt"], o["feedback"], o["strict"]) for o in out)
for k in sorted(c):
    print(k, c[k])
