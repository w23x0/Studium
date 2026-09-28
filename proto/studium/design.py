"""M05 设计闭环：在 M08 上选下一段知识链（从已站稳的知识点走到一个新知识点），存进新的运行目录。

    python3 -m studium.design --goal "我想深入学习牛顿第二定律。" --about "……" --m08 m08/力学-动量.md --learner owner --run NAME

产出 runs/NAME/{goal.md, about.md, m08.txt, learner.txt, scene.md, design.md, route.md, calls.log}；
之后用 `python3 -m studium.loop --run NAME` 在同一目录里接着走。
读：M08 与同目录的教材路线（路线-*.md）；给了 --learner 时读其 M09 记录与停车场（records/<学习者>/）。
"""

import argparse
import datetime as _dt
import re
import sys
from pathlib import Path

from . import assemble, commit, llm
from . import m08 as m08mod
from .store import Session

SCENE, NOTE, NEXT = "【场景】", "【设计说明】", "【下一闭环候选】"
RUNS = Path(__file__).resolve().parent.parent / "runs"


def _field(text: str, name: str, following: list[str]) -> str:
    _, _, rest = text.partition(name)
    for nxt in following:
        rest = rest.partition(nxt)[0]
    return rest.strip()


def _history(learner: str | None) -> tuple[list[str], str | None, list[str]]:
    """学习者的 M09 记录、停车场、这些闭环的路线偏差记录（M05 自有）。"""
    if not learner:
        return [], None, []
    recs = commit.m09_records(learner)
    parked = commit.parking(learner)
    runs = [p.stem.split("-", 1)[1] for p in recs]
    runs += re.findall(r"^## (\S+)（\d{4}-\d{2}-\d{2}", parked or "", flags=re.M)
    logs = []
    for r in dict.fromkeys(runs):
        route = RUNS / r / "route.md"
        if route.exists():
            logs.append(f"### {r}\n\n{route.read_text(encoding='utf-8').strip()}")
    return [p.read_text(encoding="utf-8") for p in recs], parked, logs


def _inputs(goal: str, about: str | None, learner: str | None, m08_path: Path) -> str:
    routes = "\n\n".join(p.read_text(encoding="utf-8") for p in sorted(m08_path.parent.glob("路线-*.md"))) or None
    m09, parked, logs = _history(learner)
    return assemble.for_design(goal, about, m09, parked, logs, m08_path.read_text(encoding="utf-8"), routes)


def design(goal: str, about: str | None, name: str, m08_path: Path, model: str = "opus",
           learner: str | None = None) -> Path:
    root = RUNS / name
    if (root / "scene.md").exists():
        sys.exit(f"运行目录已有场景，换一个 --run：{root}")
    s = Session(root)
    (root / "goal.md").write_text(goal.strip() + "\n", encoding="utf-8")
    if about:
        (root / "about.md").write_text(about.strip() + "\n", encoding="utf-8")
    if learner:
        (root / "learner.txt").write_text(learner + "\n", encoding="utf-8")
    (root / "m08.txt").write_text(f"{m08_path.resolve().relative_to(m08mod.PROTO)}\n", encoding="utf-8")
    res = llm.call(model, assemble.prompt("design"), _inputs(goal, about, learner, m08_path))
    s.log_call(0, "design", res)
    (root / "design.md").write_text(res.text + "\n", encoding="utf-8")
    scene = _field(res.text, SCENE, [NOTE, NEXT])
    if "链：" not in scene:
        sys.exit(f"M05 未按格式给出场景，原文见 {root / 'design.md'}")
    (root / "scene.md").write_text(scene + "\n", encoding="utf-8")
    s.append_route(f"## 闭环设计\n- 学习目标：{goal.strip()}\n- 场景：scene.md\n"
                   f"- 设计说明：{_field(res.text, NOTE, [NEXT]) or '无'}\n- 下一闭环候选：\n{_field(res.text, NEXT, []) or '无'}")
    return root


def main(argv=None):
    ap = argparse.ArgumentParser(description="M05 设计闭环：在 M08 上选下一段知识链")
    ap.add_argument("--goal", required=True, help="学习者说出的学习目标")
    ap.add_argument("--about", help="学习者自述（学段、学过什么）；可省略")
    ap.add_argument("--m08", type=Path, required=True, help="本学习项目的 M08（如 m08/力学-动量.md；同目录的 路线-*.md 一并读）")
    ap.add_argument("--run", help="运行名（默认按时间生成）")
    ap.add_argument("--model", default="opus")
    ap.add_argument("--learner", help="学习者（读其 M09 记录与停车场；省略 = 冷启动）")
    ap.add_argument("--dry", action="store_true", help="只打印装配好的输入，不调模型")
    a = ap.parse_args(argv)
    if a.dry:
        print(_inputs(a.goal, a.about, a.learner, a.m08))
        return
    root = design(a.goal, a.about, a.run or f"{_dt.datetime.now():%Y%m%d-%H%M%S}-design", a.m08, a.model, a.learner)
    print((root / "scene.md").read_text(encoding="utf-8"), f"\n目录：{root}", sep="")


if __name__ == "__main__":
    main()
