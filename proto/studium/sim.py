"""模拟学习者：用另一个隔离调用扮演学生，自动跑完一个闭环，用于快速筛查明显问题。

    python3 -m studium.sim --scene scenes/kernel.md --learner learners/typical.md --turns 12
"""

import argparse
import datetime as _dt
import shutil
from pathlib import Path

from . import llm
from .loop import Loop, prepare_scene
from .store import Session

OPENING = "我想学线性变换的核。"  # 手写场景的默认开场；其他场景用 --opening


def learner_reply(persona: str, visible_dialogue: str, model: str) -> str:
    user = f"## 到目前为止的对话（你能看到的部分）\n\n{visible_dialogue}\n\n请写出你这一轮的回复。"
    return llm.call(model, persona, user).text


def run(scene_path: Path | None, persona_path: Path, turns: int, name: str, learner_model: str, models: dict,
        opening: str | None = None) -> Path:
    root = Path(__file__).resolve().parent.parent / "runs" / name
    scene = prepare_scene(root, scene_path)
    session = Session(root)
    shutil.copy(persona_path, root / "learner.md")
    loop = Loop(session, scene, models)
    goal = root / "goal.md"  # M05 设计的闭环：开场就是学习者说出的目标
    opening = opening or (goal.read_text(encoding="utf-8").strip() if goal.exists() else OPENING)
    persona = persona_path.read_text(encoding="utf-8")

    msg = opening
    for _ in range(turns):
        loop.step(msg)
        if loop.closed:
            break
        msg = learner_reply(persona, session.learner_view(), learner_model)
    status = "已结束（守卫通过）" if loop.closed else f"未结束（达到 {turns} 轮上限）"
    (root / "result.txt").write_text(f"turns={loop.turn}\nstatus={status}\n", encoding="utf-8")
    return root


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--scene", type=Path, help="手写场景；省略时用 --run 目录里 M05 设计好的 scene.md")
    ap.add_argument("--learner", required=True, type=Path)
    ap.add_argument("--turns", type=int, default=12)
    ap.add_argument("--run")
    ap.add_argument("--learner-model", default="oc:deepseek-v4.1-flash")
    ap.add_argument("--opening", help="开场白（默认：goal.md 或核的开场）")
    a = ap.parse_args(argv)
    name = a.run or f"{_dt.datetime.now():%Y%m%d-%H%M%S}-sim"
    models = {"teach": "opus", "guard": "opus", "route": "opus"}
    root = run(a.scene, a.learner, a.turns, name, a.learner_model, models, a.opening)
    print((root / "result.txt").read_text(encoding="utf-8"), f"目录：{root}", sep="")


if __name__ == "__main__":
    main()
