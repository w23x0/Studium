"""单闭环原型（CLI）：一个闭环 = 知识链上的一段（M05 设计，见 prompts/design.md）。

    python3 -m studium.loop --run NAME

每轮：学习者输入 → 教学调用（带学习环境，可按需读 M08 / 教材路线 / 教材原文 / M09）
      →（提议结束则）闭环守卫（独立调用，同样可读环境）：走通 → 闭环结束、提交 M09；
        未走通 → 带着核对结果重做本轮教学。
教学主链 M04 / M10 / M02 / M03 在同一次调用内完成（M02 审查单「运行方式」）；调用经 agent.run，与模型厂商无关。
"""

import argparse
import datetime as _dt
import readline  # noqa: F401  input() 获得行编辑（方向键、中文退格）
import re
import shutil
import sys
from pathlib import Path

from . import agent, assemble, commit, env
from .store import Session

RECORD = "【记录】"
TO_LEARNER = "【给学习者】"
END = "【提议结束】"
PASS = "【守卫结论】通过"
AWAY_SECONDS = 30 * 60  # 超过这么久没回复算“离开”（实现期阈值）


class BadFormat(Exception):
    pass


def parse_teach(text: str) -> tuple[str, str, bool]:
    """拆成：记录、给学习者的话、是否提议结束。"""
    record, _, rest = text.partition(TO_LEARNER)
    record = record.replace(RECORD, "").strip()
    if not rest.strip() or not record:
        raise BadFormat(text[:200])
    return record, rest.replace(END, "").strip(), END in rest


def chain_view(scene: str, record: str | None) -> str:
    """位置图：这段链 + 教学侧当前看法（不是守卫结论）。"""
    chain = re.findall(r"^\d+\.\s*.+$", scene, flags=re.M)
    where = re.search(r"\[位置\](.*)", record or "")
    return "\n".join(["【这段链】", *[f"  {l}" for l in chain], "",
                      f"  现在：{where.group(1).strip() if where else '（还没开始）'}"])


class Loop:
    def __init__(self, session: Session, scene: str, models: dict):
        self.s, self.scene, self.models = session, scene, models
        self.turn = 0
        self.guard_note: str | None = None
        self.closed = False
        self.replied_at: _dt.datetime | None = None
        self.learner = commit.learner_of(session.root)
        recs = commit.m09_records(self.learner) if self.learner else []
        self.history = "\n\n---\n\n".join(p.read_text(encoding="utf-8") for p in recs) or None
        self.env = env.build(session.root)

    def resume(self) -> None:
        turns = sorted(int(d.name) for d in (self.s.root / "turns").iterdir() if d.name.isdigit())
        self.turn = turns[-1] if turns else 0
        self.closed = (self.s.root / "closure.md").exists()
        for n in turns:
            guard = self.s.read_asset(n, "guard")
            if guard and PASS not in guard:
                self.guard_note = guard
        last = self.s.root / "turns" / f"{self.turn:03d}" / "reply.md"
        if last.exists():
            self.replied_at = _dt.datetime.fromtimestamp(last.stat().st_mtime)

    def _call(self, point: str, user: str) -> str:
        trace: list = []
        res = agent.run(self.models[point], assemble.prompt(point), user, env=self.env, trace=trace)
        self.s.log_call(self.turn, point, res)
        if trace:
            self.s.write_asset(self.turn, f"{point}-tools", "\n".join(f"{n} {a} → {k} 字" for n, a, k in trace))
        return res.text

    def _teach(self) -> tuple[str, str, bool]:
        user = assemble.for_teach(self.s, self.scene, self.guard_note, self.history)
        try:
            return parse_teach(self._call("teach", user))
        except BadFormat as e:
            print(f"[教学调用未按格式输出，重试一次：{e}]", file=sys.stderr)
            return parse_teach(self._call("teach", user))

    def _guard(self) -> bool:
        out = self._call("guard", assemble.for_guard(self.s, self.scene))
        self.s.write_asset(self.turn, "guard", out)
        if PASS in out:
            (self.s.root / "closure.md").write_text(out + "\n", encoding="utf-8")
            self.closed = True
            if self.learner:  # 守卫通过是进 M09 的唯一过渡点
                commit.commit_m09(self.s.root, self.learner)
            return True
        self.guard_note = out
        return False

    def step(self, learner_text: str) -> str:
        self.turn += 1
        now = _dt.datetime.now()
        idle = (now - self.replied_at).total_seconds() if self.replied_at else None
        mark = self.s.size()
        if idle is not None and idle >= AWAY_SECONDS:
            self.s.append("路径", f"学习者离开约 {idle / 60:.0f} 分钟后回来（上一条系统回复之后）")
        self.s.append("学习者", learner_text)
        try:
            record, visible, proposed = self._teach()
        except Exception:
            self.s.truncate(mark)
            self.turn -= 1
            raise
        if proposed:
            self.s.write_asset(self.turn, "record-superseded", record)
            self.s.write_asset(self.turn, "reply-superseded", visible)
            if self._guard():
                self.s.write_asset(self.turn, "record", record)
                self.s.write_asset(self.turn, "reply", visible)
                msg = visible + "\n\n（闭环守卫核对：这段链你已经能自己走通，本闭环结束。）"
                self.s.append("系统", msg)
                self.s.log_turn(self.turn, now, idle, len(learner_text))
                return msg
            try:  # 未走通：带着核对结果重做本轮，不把收尾话发给学习者
                record, visible, _ = self._teach()
            except Exception as e:
                print(f"[守卫未通过后重做失败，沿用本轮原回复：{e}]", file=sys.stderr)
        self.s.write_asset(self.turn, "record", record)
        self.s.write_asset(self.turn, "reply", visible)
        self.s.append("系统", visible)
        self.s.log_turn(self.turn, now, idle, len(learner_text))
        self.replied_at = _dt.datetime.now()
        return visible


def has_dialogue(root: Path) -> bool:
    return (root / "transcript.md").exists() and (root / "transcript.md").stat().st_size > 0


def prepare_scene(root: Path, scene_path: Path | None, resume: bool = False) -> str:
    """手写场景复制进运行目录；省略时读该目录里 M05 设计好的 scene.md。"""
    if scene_path:
        if has_dialogue(root):
            sys.exit(f"该运行已有对话，换一个 --run：{root}")
        root.mkdir(parents=True, exist_ok=True)
        shutil.copy(scene_path, root / "scene.md")
    elif not (root / "scene.md").exists():
        sys.exit(f"缺场景：先用 studium.design 在 {root} 里设计闭环")
    elif has_dialogue(root) and not resume:
        sys.exit(f"该运行已有对话，换一个 --run：{root}")
    return (root / "scene.md").read_text(encoding="utf-8")


def main(argv=None):
    ap = argparse.ArgumentParser(description="Studium 单闭环原型")
    ap.add_argument("--scene", type=Path, help="手写场景；省略时用 --run 目录里 M05 设计好的 scene.md")
    ap.add_argument("--run", help="运行名（默认按时间生成）")
    ap.add_argument("--teach", default="opus", help="模型：opus / sonnet（claude -p）、oc:<模型>、anthropic:<模型>")
    ap.add_argument("--guard", default="opus")
    a = ap.parse_args(argv)

    name = a.run or f"{_dt.datetime.now():%Y%m%d-%H%M%S}"
    root = Path(__file__).resolve().parent.parent / "runs" / name
    resuming = not a.scene and has_dialogue(root)
    scene = prepare_scene(root, a.scene, resume=True)
    session = Session(root)
    loop = Loop(session, scene, {"teach": a.teach, "guard": a.guard})
    if resuming:
        loop.resume()
        if loop.closed:
            print(f"该闭环已结束（见 {root / 'closure.md'}）。")
            return
        print(f"继续上次的运行：已进行 {loop.turn} 轮，接着输入即可。\n")
        last = session.read_asset(loop.turn, "reply")
        if last:
            print(f"——上一轮系统的回复——\n{last}\n")
    print(chain_view(scene, session.latest_asset("record")) + "\n")
    print(f"运行目录：{root}\n输入你的话，空行结束一次输入；/图 看这段链和当前位置，/quit 退出。\n")
    while not loop.closed:
        lines = []
        try:
            while True:
                line = input("你> " if not lines else "  > ")
                if line.strip() == "/quit":
                    return
                if not lines and line.strip() == "/图":
                    print(chain_view(loop.scene, session.latest_asset("record")))
                    continue
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
        except BadFormat:
            print("[本轮调用两次都未按格式输出，你的输入已撤回，请重新发送]", file=sys.stderr)


if __name__ == "__main__":
    main()
