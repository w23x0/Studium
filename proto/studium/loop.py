"""单闭环最小原型（CLI）：确定性状态机 + 固定判断点上的隔离模型调用。

    python -m studium.loop --scene scenes/kernel.md --mode split
    python -m studium.loop --scene scenes/kernel.md --mode single

split：学习者输入 → M04 诊断 →（提议结束则）守卫 → M10 策略 → M02 回复
single：学习者输入 → 单一模型回复（同样信息）→（提议结束则）守卫        （对照组）
"""

import argparse
import datetime as _dt
import shutil
import sys
from pathlib import Path

from . import assemble, llm
from .store import Session

END = "【提议结束】"
PRACTICE = "【练习条件】"
PASS = "【守卫结论】通过"


def _split_hidden(text: str) -> tuple[str, str | None, bool]:
    """拆出学习者看不到的【练习条件】与【提议结束】。"""
    proposed = END in text
    text = text.replace(END, "").strip()
    if PRACTICE in text:
        visible, hidden = text.split(PRACTICE, 1)
        return visible.strip(), hidden.strip(), proposed
    return text, None, proposed


class Loop:
    def __init__(self, session: Session, scene: str, mode: str, models: dict):
        self.s, self.scene, self.mode, self.models = session, scene, mode, models
        self.turn = 0
        self.guard_note: str | None = None
        self.closed = False

    def _call(self, point: str, system: str, user: str) -> str:
        res = llm.call(self.models[point], assemble.prompt(system), user)
        self.s.log_call(self.turn, point, res)
        return res.text

    def _guard(self) -> bool:
        out = self._call("guard", "guard", assemble.for_guard(self.s, self.scene))
        self.s.write_asset(self.turn, "guard", out)
        if PASS in out:
            (self.s.root / "closure.md").write_text(out + "\n", encoding="utf-8")
            self.closed = True
            return True
        self.guard_note = out  # 供下一轮 M10 / M04 作为核对事实读取，不是 M04 自身结论
        return False

    def step(self, learner_text: str) -> str:
        self.turn += 1
        self.s.append("学习者", learner_text)

        if self.mode == "split":
            m04 = self._call("m04", "m04", assemble.for_m04(self.s, self.scene, self.turn, self.guard_note))
            self.s.write_asset(self.turn, "m04", m04)
            if END in m04 and self._guard():
                return self._close()
            m10 = self._call("m10", "m10", assemble.for_m10(self.s, self.scene, self.turn, self.guard_note))
            self.s.write_asset(self.turn, "m10", m10)
            reply = self._call("m02", "m02", assemble.for_m02(self.s, self.scene, self.turn))
            self.s.write_asset(self.turn, "m02", reply)
            visible, hidden, _ = _split_hidden(reply)
        else:
            reply = self._call("single", "single", assemble.for_single(self.s, self.scene, self.guard_note))
            self.s.write_asset(self.turn, "single", reply)
            visible, hidden, proposed = _split_hidden(reply)
            if proposed and self._guard():
                return self._close()

        self.s.append("系统", visible)
        if hidden:
            self.s.append("练习条件", hidden.replace("\n", " ； "))
        return visible

    def _close(self) -> str:
        msg = "闭环守卫已确认验收范围内的各条主张都有证据，本闭环结束。闭环总结见 closure.md。"
        self.s.append("系统", msg)
        return msg


def main(argv=None):
    ap = argparse.ArgumentParser(description="Studium 单闭环最小原型")
    ap.add_argument("--scene", required=True, type=Path)
    ap.add_argument("--mode", choices=["split", "single"], default="split")
    ap.add_argument("--run", help="运行名（默认按时间生成）")
    ap.add_argument("--m04", default="opus")
    ap.add_argument("--guard", default="opus")
    ap.add_argument("--m10", default="sonnet")
    ap.add_argument("--m02", default="sonnet")
    ap.add_argument("--single", default="opus")
    a = ap.parse_args(argv)

    name = a.run or f"{_dt.datetime.now():%Y%m%d-%H%M%S}-{a.mode}"
    root = Path(__file__).resolve().parent.parent / "runs" / name
    session = Session(root)
    shutil.copy(a.scene, root / "scene.md")
    scene = a.scene.read_text(encoding="utf-8")
    models = {"m04": a.m04, "guard": a.guard, "m10": a.m10, "m02": a.m02, "single": a.single}
    loop = Loop(session, scene, a.mode, models)

    print(f"运行目录：{root}\n模式：{a.mode}。输入你的话，空行结束一次输入；/quit 退出。\n")
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
