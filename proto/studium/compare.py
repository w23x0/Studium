"""盲评：两份运行的对话随机标为 A / B，由独立调用按同一标准比较。

    python3 -m studium.compare runs/sim1-split runs/sim1-single
"""

import random
import sys
from pathlib import Path

from . import llm

SYSTEM = """输入是同一学习场景下两份教学对话（A、B），以及该闭环的验收范围和学习者已学 / 未学范围。逐项比较两份对话中“系统”一方的表现，只依据对话原文，引用具体轮次说明理由。

比较项：
1. 有限视角：是否只用学习者已学内容，是否用了未学内容解释。
2. 不泄答案：学习者作答前是否给出答案或关键步骤。
3. 一次一步：每轮是否只推进一小步并给出明确的下一动作。
4. 诊断准确：系统的回应是否抓准了学习者真实的错误（对照学习者实际说的话）。
5. 推进验收：对话推进到了验收范围的哪几条主张，学习者在这些主张上留下了多扎实的独立证据。
6. 学习者体验：是否让学习者重复做同一件事、是否拖沓、是否评判人。

输出：一张表（比较项 × A / B，每格一句话 + 引用），然后给出总体判断：A 更好 / B 更好 / 相当，附三条最主要的理由。"""


def main(argv=None):
    a, b = [Path(p) for p in (argv or sys.argv[1:])]
    pair = [a, b]
    random.shuffle(pair)
    scene = pair[0].joinpath("scene.md").read_text(encoding="utf-8")
    body = [f"## 验收范围与学习者范围\n\n{scene}"]
    for label, run in zip("AB", pair):
        body.append(f"## 对话 {label}\n\n{run.joinpath('transcript.md').read_text(encoding='utf-8')}")
    res = llm.call("opus", SYSTEM, "\n\n".join(body))
    key = f"A = {pair[0].name}\nB = {pair[1].name}\n"
    out = pair[0].parent / f"compare-{a.name}-vs-{b.name}.md"
    out.write_text(res.text + "\n\n---\n揭盲：\n" + key, encoding="utf-8")
    print(res.text, "\n---\n揭盲：\n" + key, sep="")


if __name__ == "__main__":
    main()
