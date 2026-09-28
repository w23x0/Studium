"""单闭环原型（CLI）：一个闭环 = 知识链上的一段（M05 设计，见 prompts/design.md）。

    python3 -m studium.loop --run NAME

每轮：学习者输入 → 教学调用（带学习环境，可按需读 M08 / 教材路线 / 教材原文 / M09 / 教学工具）
      →（提议结束则）闭环守卫（独立调用，同样可读环境）：闭合 → 建议结束，等学习者确认；
        未闭合 → 带着核对结果重做本轮教学。
结束由学习者决定（/结束，随时可用）：守卫判闭合 → 闭环结束、提交 M09；未闭合 → 先说明还差什么，
再次 /结束 才停下，记入停车场。学习者决定停不停，守卫决定算不算闭合。
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
        self.parked = False
        self.ready_turn: int | None = None  # 守卫判闭合、已建议结束的那一轮；学习者之后又说话就作废
        self.park_pending = False  # 未闭合时学习者要结束：已说明还差什么，再次 /结束 才停
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
            elif guard and n == self.turn:
                self.ready_turn = n
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
            self.ready_turn = self.turn
            return True
        self.guard_note = out
        return False

    def _close(self) -> None:
        """学习者确认结束且守卫判闭合：闭环结束，提交 M09（唯一过渡点）。"""
        (self.s.root / "closure.md").write_text(self.s.read_asset(self.ready_turn, "guard") + "\n", encoding="utf-8")
        self.closed = True
        if self.learner:
            commit.commit_m09(self.s.root, self.learner)

    def finish(self) -> str:
        """学习者要结束（/结束）。返回给学习者看的话；closed / parked 标出结果。"""
        if self.turn == 0:
            return "（还没开始，直接 /quit 退出即可。）"
        if self.ready_turn != self.turn and not self.park_pending:
            self._guard()
        if self.ready_turn == self.turn:
            self._close()
            msg = "（本闭环结束，已记入你的学习记录。）"
        elif self.park_pending:
            if self.learner:
                commit.park(self.s.root, self.learner, "学习者结束；守卫核对未闭合")
            self.parked = True
            msg = "（这一段先停在这里，记进了停车场，写明了还差什么；下次可以从这里接着。）"
        else:
            self.park_pending = True
            gaps = [l.strip() for l in self.guard_note.splitlines()
                    if (l.lstrip("- ").startswith("还差") and not l.rstrip().endswith("无")) or l.startswith("【新情境】没用上")]
            msg = ("（从核对看，这一段还没闭合：\n" + "\n".join(gaps or [self.guard_note.strip().splitlines()[-1]])
                   + "\n可以接着说，把这些补上；仍要结束就再输入一次 /结束，这一段会记进停车场，下次从这里接着。）")
        self.s.append("路径", f"学习者要求结束 → {msg}")
        return msg

    def step(self, learner_text: str) -> str:
        self.park_pending = False
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
                msg = visible + ("\n\n（核对：这段链你已经能自己走通，也在新情境里用上了，可以结束。"
                                 "要结束就输入 /结束；想继续就接着说。）")
                self.s.append("系统", msg)
                self.s.log_turn(self.turn, now, idle, len(learner_text))
                self.replied_at = _dt.datetime.now()
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
    print(f"运行目录：{root}\n输入你的话，空行结束一次输入；/图 看这段链和当前位置，"
          "/结束 结束这一段，/quit 暂时退出（下次接着）。\n")
    while not (loop.closed or loop.parked):
        lines = []
        try:
            while True:
                line = input("你> " if not lines else "  > ")
                if line.strip() == "/quit":
                    return
                if not lines and line.strip() == "/结束":
                    print("\n" + loop.finish() + "\n")
                    break
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
