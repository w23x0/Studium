"""模拟学习者：用另一个隔离调用扮演学生，自动跑完一个闭环，用于快速筛查明显问题。

    python3 -m studium.sim --scene scenes/kernel.md --learner learners/typical.md --turns 12
"""

import argparse
import datetime as _dt
import shutil
from pathlib import Path

from . import llm
from .loop import Loop
from .store import Session

OPENING = "我想学线性变换的核。"


def learner_reply(persona: str, visible_dialogue: str, model: str) -> str:
    user = f"## 到目前为止的对话（你能看到的部分）\n\n{visible_dialogue}\n\n请写出你这一轮的回复。"
    return llm.call(model, persona, user).text


def run(scene_path: Path, persona_path: Path, turns: int, name: str, learner_model: str, models: dict) -> Path:
    root = Path(__file__).resolve().parent.parent / "runs" / name
    session = Session(root)
    shutil.copy(scene_path, root / "scene.md")
    shutil.copy(persona_path, root / "learner.md")
    loop = Loop(session, scene_path.read_text(encoding="utf-8"), models)
    persona = persona_path.read_text(encoding="utf-8")

    msg = OPENING
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
    ap.add_argument("--scene", required=True, type=Path)
    ap.add_argument("--learner", required=True, type=Path)
    ap.add_argument("--turns", type=int, default=12)
    ap.add_argument("--run")
    ap.add_argument("--learner-model", default="sonnet")
    a = ap.parse_args(argv)
    name = a.run or f"{_dt.datetime.now():%Y%m%d-%H%M%S}-sim"
    models = {"teach": "opus", "guard": "opus"}
    root = run(a.scene, a.learner, a.turns, name, a.learner_model, models)
    print((root / "result.txt").read_text(encoding="utf-8"), f"目录：{root}", sep="")


if __name__ == "__main__":
    main()
