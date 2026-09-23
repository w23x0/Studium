"""单闭环最小原型（CLI）：确定性状态机 + 固定判断点上的隔离模型调用。

    python3 -m studium.loop --scene scenes/kernel.md

每轮：学习者输入 → 教学调用（诊断记录 + 给学习者的话）
      →（诊断记录写出改线依据则）M05 路线调用（独立）→ 改了范围就按新范围重做一次教学调用
      →（提议结束则）闭环守卫（独立调用）
教学主链 M04 / M10 / M02 / M03 在同一次调用内完成（M02 审查单「运行方式」）。
改线不来回踢：每轮至多调用一次 M05；M05 读自己的路线偏差记录，不做与已做调整相反的改动。
会中不加深：学习者已超出范围 → 转确认、尽快结束，更深内容记为“下一闭环建议”（M05 审查单）。
"""

import argparse
import datetime as _dt
import readline  # noqa: F401  input() 获得行编辑（方向键、中文退格）
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
BASIS = "[改线依据]"
ROUTE_ACTION, ROUTE_REASON, ROUTE_NOTE, ROUTE_NEXT, ROUTE_SCENE = (
    "【路线动作】", "【理由】", "【调整说明】", "【下一闭环建议】", "【新场景】")


class BadFormat(Exception):
    pass


def parse_teach(text: str) -> tuple[str, str, str | None, bool]:
    """拆成：诊断记录、给学习者的话、练习条件、是否提议结束。"""
    diagnosis, _, rest = text.partition(TO_LEARNER)
    diagnosis = diagnosis.replace(DIAG, "").strip()
    if not rest or not diagnosis:
        # 未按格式输出（如调用中途断开、CLI 自动续写后模型只回一句元话语）：不把它当回复发给学习者
        raise BadFormat(text[:200])
    proposed = END in rest
    rest = rest.replace(END, "").strip()
    visible, _, hidden = rest.partition(PRACTICE)
    return diagnosis, visible.strip(), (hidden.strip() or None), proposed


def parse_basis(diagnosis: str) -> str | None:
    """取诊断记录里的 [改线依据] 段；写“无”或缺失则返回 None。"""
    _, found, rest = diagnosis.partition(BASIS)
    if not found:
        return None
    body = []
    for line in rest.splitlines():
        if body and line.lstrip().startswith("[") and not line.lstrip().startswith("[改线"):
            break  # 下一个 [段名]
        body.append(line)
    text = "\n".join(body).strip()
    return None if not text or text.lstrip("-*•： ").startswith("无") else text


def _field(text: str, name: str, following: list[str]) -> str:
    _, _, rest = text.partition(name)
    for nxt in following:
        rest = rest.partition(nxt)[0]
    return rest.strip()


def parse_route(text: str) -> tuple[str, str, str, str, str | None]:
    """拆成：路线动作、理由、调整说明、下一闭环建议、新场景（维持时为 None）。"""
    action = _field(text, ROUTE_ACTION, [ROUTE_REASON, ROUTE_NOTE, ROUTE_NEXT, ROUTE_SCENE])
    reason = _field(text, ROUTE_REASON, [ROUTE_NOTE, ROUTE_NEXT, ROUTE_SCENE])
    note = _field(text, ROUTE_NOTE, [ROUTE_NEXT, ROUTE_SCENE])
    nxt = _field(text, ROUTE_NEXT, [ROUTE_SCENE])
    scene = _field(text, ROUTE_SCENE, []) if ROUTE_SCENE in text else ""
    if action.startswith("维持") or "验收范围" not in scene:
        scene = None  # 维持，或新场景缺失 / 不完整 → 不改范围
    return action or "（未按格式给出）", reason, note, nxt, scene


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

    def _teach(self) -> tuple[str, str, str | None, bool]:
        user = assemble.for_teach(self.s, self.scene, self.guard_note)
        try:
            return parse_teach(self._call("teach", "teach", user))
        except BadFormat as e:  # 重新调一次；仍不对则抛出，由 step 撤回本轮输入
            print(f"[教学调用未按格式输出，重试一次：{e}]", file=sys.stderr)
            return parse_teach(self._call("teach", "teach", user))

    def _route(self, basis: str) -> bool:
        """M05：按改线依据调整当前闭环的验收范围，记为路径事实。返回范围是否改了。"""
        try:
            out = self._call("route", "route", assemble.for_route(self.scene, basis, self.s.read_route_log()))
        except Exception as e:  # 路线调用失败：维持原范围继续，不影响本轮教学
            print(f"[M05 调用失败，维持原范围：{e}]", file=sys.stderr)
            return False
        self.s.write_asset(self.turn, "route", out)
        action, reason, note, nxt, scene = parse_route(out)
        self.s.append_route(
            f"## 第 {self.turn} 轮\n- 改线依据：{basis}\n- 路线动作：{action}\n- 理由：{reason}\n"
            f"- 调整说明：{note or '无'}\n- 下一闭环建议：{nxt or '无'}\n- 范围版本：{f'turns/{self.turn:03d}/scene.md' if scene else '未改'}"
        )
        self.s.append("路径", f"第 {self.turn} 轮改线依据交 M05：{action}。理由：{reason}"
                      + (f" 调整：{note}" if scene else ""))
        if not scene:
            return False
        self.s.write_asset(self.turn, "scene", scene)
        self.scene = scene
        self.guard_note = None  # 旧核对结果按旧编号写，范围改了就作废
        return True

    def step(self, learner_text: str) -> str:
        self.turn += 1
        mark = self.s.size()
        self.s.append("学习者", learner_text)
        try:
            diagnosis, visible, hidden, proposed = self._teach()
        except Exception:
            self.s.truncate(mark)
            self.turn -= 1
            raise
        basis = parse_basis(diagnosis)
        if basis and self._route(basis):
            # 本轮回复是按旧范围写的：按新范围重做一次；重做中再报的依据留到下一轮（每轮至多一次 M05）
            self.s.write_asset(self.turn, "diagnosis-superseded", diagnosis)
            self.s.write_asset(self.turn, "reply-superseded", visible)
            try:
                diagnosis, visible, hidden, proposed = self._teach()
            except Exception as e:
                print(f"[按新范围重做失败，沿用本轮原回复：{e}]", file=sys.stderr)
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


def prepare_scene(root: Path, scene_path: Path | None) -> str:
    """手写场景复制进运行目录；省略时读该目录里 M05 设计好的 scene.md。"""
    if scene_path:
        root.mkdir(parents=True, exist_ok=True)
        shutil.copy(scene_path, root / "scene.md")
    elif not (root / "scene.md").exists():
        sys.exit(f"缺场景：给 --scene，或先用 studium.design 在 {root} 里设计闭环")
    elif (root / "transcript.md").exists() and (root / "transcript.md").stat().st_size:
        sys.exit(f"该运行已有对话，换一个 --run：{root}")
    return (root / "scene.md").read_text(encoding="utf-8")


def main(argv=None):
    ap = argparse.ArgumentParser(description="Studium 单闭环最小原型")
    ap.add_argument("--scene", type=Path, help="手写场景；省略时用 --run 目录里 M05 设计好的 scene.md")
    ap.add_argument("--run", help="运行名（默认按时间生成）")
    ap.add_argument("--teach", default="opus")
    ap.add_argument("--guard", default="opus")
    ap.add_argument("--route", default="opus")
    a = ap.parse_args(argv)

    name = a.run or f"{_dt.datetime.now():%Y%m%d-%H%M%S}"
    root = Path(__file__).resolve().parent.parent / "runs" / name
    scene = prepare_scene(root, a.scene)
    session = Session(root)
    loop = Loop(session, scene, {"teach": a.teach, "guard": a.guard, "route": a.route})

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
        except BadFormat:
            print("[本轮调用两次都未按格式输出，你的输入已撤回，请重新发送]", file=sys.stderr)


if __name__ == "__main__":
    main()
