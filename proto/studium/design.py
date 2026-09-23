"""M05 设计闭环：按学习目标写出场景（替代手写 scenes/），存进新的运行目录。

    python3 -m studium.design --goal "我想学线性变换的核" --about "大一，学过……" --run NAME

产出 runs/NAME/{goal.md, scene.md, design.md, route.md, calls.log}；之后用
    python3 -m studium.loop --run NAME        或  python3 -m studium.sim --run NAME --learner ...
在同一目录里接着跑。v0 没有 M09，一律按冷启动设计（M05 审查单「冷启动的首个闭环」）。
"""

import argparse
import datetime as _dt
import sys
from pathlib import Path

from . import assemble, llm
from .loop import _field
from .store import Session

SCENE, NOTE, NEXT = "【场景】", "【设计说明】", "【下一闭环候选】"
RUNS = Path(__file__).resolve().parent.parent / "runs"


def parse_design(text: str) -> tuple[str | None, str, str]:
    """拆成：场景（缺验收范围则为 None）、设计说明、下一闭环候选。"""
    scene = _field(text, SCENE, [NOTE, NEXT])
    return (scene if "验收范围" in scene else None), _field(text, NOTE, [NEXT]), _field(text, NEXT, [])


def design(goal: str, about: str | None, name: str, model: str = "opus") -> Path:
    root = RUNS / name
    if (root / "scene.md").exists():
        sys.exit(f"运行目录已有场景，换一个 --run：{root}")
    s = Session(root)
    (root / "goal.md").write_text(goal.strip() + "\n", encoding="utf-8")
    if about:
        (root / "about.md").write_text(about.strip() + "\n", encoding="utf-8")
    res = llm.call(model, assemble.prompt("design"), assemble.for_design(goal, about, cold_start=True))
    s.log_call(0, "design", res)
    (root / "design.md").write_text(res.text + "\n", encoding="utf-8")
    scene, note, nxt = parse_design(res.text)
    if not scene:
        sys.exit(f"M05 未按格式给出场景，原文见 {root / 'design.md'}")
    (root / "scene.md").write_text(scene + "\n", encoding="utf-8")
    # 路线偏差记录从闭环设计开始：记计划范围，供会中改线与下一闭环设计对照
    s.append_route(f"## 闭环设计（冷启动）\n- 学习目标：{goal.strip()}\n- 验收范围：scene.md\n"
                   f"- 设计说明：{note or '无'}\n- 下一闭环候选：\n{nxt or '无'}")
    return root


def main(argv=None):
    ap = argparse.ArgumentParser(description="M05 设计闭环")
    ap.add_argument("--goal", required=True, help="学习者说出的学习目标")
    ap.add_argument("--about", help="学习者自述（学段、学过什么）；可省略")
    ap.add_argument("--run", help="运行名（默认按时间生成）")
    ap.add_argument("--model", default="opus")
    a = ap.parse_args(argv)
    root = design(a.goal, a.about, a.run or f"{_dt.datetime.now():%Y%m%d-%H%M%S}-design", a.model)
    print((root / "scene.md").read_text(encoding="utf-8"), f"\n目录：{root}", sep="")


if __name__ == "__main__":
    main()
