"""单闭环最小原型（CLI）：确定性状态机 + 固定判断点上的隔离模型调用。

    python3 -m studium.loop --scene scenes/kernel.md

每轮：学习者输入 → 教学调用（诊断记录 + 给学习者的话）→（提议结束则）闭环守卫（独立调用）
教学主链 M04 / M10 / M02 / M03 在同一次调用内完成（M02 审查单「运行方式」）。
"""

import argparse
import datetime as _dt
import shutil
import sys
from pathlib import Path

from . import assemble, llm
from .store import Session

DIAG = "【诊断记录】"
TO_LEARNER = "【给学习者】"
END = "【提议结束】"
PRACTICE = "【练习条件】"
PASS = "【守卫结论】通过"


def parse_teach(text: str) -> tuple[str, str, str | None, bool]:
    """拆成：诊断记录、给学习者的话、练习条件、是否提议结束。"""
    diagnosis, _, rest = text.partition(TO_LEARNER)
    diagnosis = diagnosis.replace(DIAG, "").strip()
    if not rest:  # 未按格式输出：整段当回复，诊断记录记为缺失
        rest, diagnosis = text, "（本轮未按格式输出诊断记录）"
    proposed = END in rest
    rest = rest.replace(END, "").strip()
    visible, _, hidden = rest.partition(PRACTICE)
    return diagnosis, visible.strip(), (hidden.strip() or None), proposed


class Loop:
    def __init__(self, session: Session, scene: str, models: dict):
        self.s, self.scene, self.models = session, scene, models
        self.turn = 0
        self.guard_note: str | None = None
        self.closed = False

    def _call(self, point: str, prompt_name: str, user: str) -> str:
        res = llm.call(self.models[point], assemble.prompt(prompt_name), user)
        self.s.log_call(self.turn, point, res)
        return res.text

    def _guard(self) -> bool:
        out = self._call("guard", "guard", assemble.for_guard(self.s, self.scene))
        self.s.write_asset(self.turn, "guard", out)
        if PASS in out:
            (self.s.root / "closure.md").write_text(out + "\n", encoding="utf-8")
            self.closed = True
            return True
        self.guard_note = out  # 核对事实，供下一轮教学调用读取；不是诊断记录的回灌
        return False

    def step(self, learner_text: str) -> str:
        self.turn += 1
        self.s.append("学习者", learner_text)
        raw = self._call("teach", "teach", assemble.for_teach(self.s, self.scene, self.guard_note))
        diagnosis, visible, hidden, proposed = parse_teach(raw)
        self.s.write_asset(self.turn, "diagnosis", diagnosis)
        self.s.write_asset(self.turn, "reply", visible)
        if proposed and self._guard():
            msg = "闭环守卫已确认验收范围内的各条主张都有证据，本闭环结束。闭环总结见 closure.md。"
            self.s.append("系统", msg)
            return msg
        self.s.append("系统", visible)
        if hidden:
            self.s.append("练习条件", hidden.replace("\n", " ； "))
        return visible


def main(argv=None):
    ap = argparse.ArgumentParser(description="Studium 单闭环最小原型")
    ap.add_argument("--scene", required=True, type=Path)
    ap.add_argument("--run", help="运行名（默认按时间生成）")
    ap.add_argument("--teach", default="opus")
    ap.add_argument("--guard", default="opus")
    a = ap.parse_args(argv)

    name = a.run or f"{_dt.datetime.now():%Y%m%d-%H%M%S}"
    root = Path(__file__).resolve().parent.parent / "runs" / name
    session = Session(root)
    shutil.copy(a.scene, root / "scene.md")
    loop = Loop(session, a.scene.read_text(encoding="utf-8"), {"teach": a.teach, "guard": a.guard})

    print(f"运行目录：{root}\n输入你的话，空行结束一次输入；/quit 退出。\n")
    while not loop.closed:
        lines = []
        try:
            while True:
                line = input("你> " if not lines else "  > ")
                if line.strip() == "/quit":
                    return
                if not line.strip():
                    break
                lines.append(line)
        except EOFError:
            return
        if not lines:
            continue
        try:
            print("\n" + loop.step("\n".join(lines)) + "\n")
        except assemble.MissingInput as e:
            print(f"[缺必需输入，本次不发：{e}]", file=sys.stderr)


if __name__ == "__main__":
    main()
