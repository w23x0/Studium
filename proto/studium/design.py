"""M05 设计闭环：按学习目标写出场景（替代手写 scenes/），存进新的运行目录。

    python3 -m studium.design --goal "我想学线性变换的核" --about "大一，学过……" --run NAME

产出 runs/NAME/{goal.md, scene.md, design.md, route.md, calls.log}；之后用
    python3 -m studium.loop --run NAME        或  python3 -m studium.sim --run NAME --learner ...
在同一目录里接着跑。给了 --learner 时读该学习者的 M09 记录与停车场（records/<学习者>/，见 commit.py）；
都没有则按冷启动设计（M05 审查单「冷启动的首个闭环」）。
"""

import argparse
import re
import datetime as _dt
import sys
from pathlib import Path

from . import assemble, commit, llm
from .loop import _field
from .store import Session

SCENE, NOTE, NEXT, PLAN = "【场景】", "【设计说明】", "【下一闭环候选】", "【拆分计划】"
RUNS = Path(__file__).resolve().parent.parent / "runs"


def parse_design(text: str) -> tuple[str | None, str, str]:
    """拆成：场景（缺验收范围则为 None）、设计说明、下一闭环候选。"""
    scene = _field(text, SCENE, [NOTE, NEXT])
    return (scene if "验收范围" in scene else None), _field(text, NOTE, [NEXT]), _field(text, NEXT, [])


def draft_skeleton(scene: str) -> str | None:
    """讲解稿骨架：每条【教学】主张一节（确认类主张不进稿子）。"""
    title = next((l[len("# 闭环："):].strip() for l in scene.splitlines() if l.startswith("# 闭环：")), "")
    claims = re.findall(r"^(\d+)\.\s*(?:【[^】]*】)*?【教学】\s*(.+)$", scene, flags=re.M)
    if not claims:
        return None
    body = "\n\n".join(f"## {n}. {text.strip()}\n\n（在这里用自己的话讲）" for n, text in claims)
    return f"# 讲解稿：{title}\n\n{body}\n"


def _history(learner: str | None) -> tuple[list[str], str | None, list[str], list[str]]:
    """学习者的 M09 记录、停车场、这些闭环的路线偏差记录（M05 自有）、拆分计划。"""
    if not learner:
        return [], None, [], []
    recs = commit.m09_records(learner)
    parked = commit.parking(learner)
    runs = [p.stem.split("-", 1)[1] for p in recs]
    runs += re.findall(r"^## (\S+)（\d{4}-\d{2}-\d{2}", parked or "", flags=re.M)  # 停车场条目标题
    logs = []
    for r in dict.fromkeys(runs):
        route = commit.RUNS / r / "route.md"
        if route.exists():
            logs.append(f"### {r}\n\n{route.read_text(encoding='utf-8').strip()}")
    plans_dir = commit.home(learner) / "plans"
    plans = [f"### 拆分 {p.stem}\n\n{p.read_text(encoding='utf-8').strip()}" for p in sorted(plans_dir.glob("*.md"))] \
        if plans_dir.exists() else []
    return [p.read_text(encoding="utf-8") for p in recs], parked, logs, plans


def design(goal: str, about: str | None, name: str, model: str = "opus", learner: str | None = None,
           split: str | None = None) -> Path:
    root = RUNS / name
    if (root / "scene.md").exists():
        sys.exit(f"运行目录已有场景，换一个 --run：{root}")
    s = Session(root)
    (root / "goal.md").write_text(goal.strip() + "\n", encoding="utf-8")
    if about:
        (root / "about.md").write_text(about.strip() + "\n", encoding="utf-8")
    if learner:
        (root / "learner.txt").write_text(learner + "\n", encoding="utf-8")
    m09, parked, logs, plans = _history(learner)
    cold = not m09 and not parked
    res = llm.call(model, assemble.prompt("design"), assemble.for_design(goal, about, m09, parked, logs, plans, split))
    s.log_call(0, "design", res)
    (root / "design.md").write_text(res.text + "\n", encoding="utf-8")
    scene, note, nxt = parse_design(res.text)
    plan = _field(res.text, PLAN, [SCENE]) if split else ""
    if split and plan:  # 拆分计划：M05 自有，后续小闭环按它设计；停车场追加一条承接记录
        d = commit.home(learner) / "plans"
        d.mkdir(parents=True, exist_ok=True)
        (d / f"{split}.md").write_text(plan + f"\n\n- 第一个小闭环：`runs/{name}/`\n", encoding="utf-8")
        with (commit.home(learner) / "parking.md").open("a", encoding="utf-8") as f:
            f.write(f"### {split} 已拆分（{_dt.datetime.now():%Y-%m-%d %H:%M}）\n\n计划见 `records/{learner}/plans/{split}.md`；"
                    f"第一个小闭环 `runs/{name}/`。\n\n")
    if not scene:
        sys.exit(f"M05 未按格式给出场景，原文见 {root / 'design.md'}")
    (root / "scene.md").write_text(scene + "\n", encoding="utf-8")
    skeleton = draft_skeleton(scene)
    if skeleton:  # 讲解稿：每条教学主张一节，只有标题（M02「讲解稿」）
        for f in ("draft.md", "draft.initial.md"):
            (root / f).write_text(skeleton, encoding="utf-8")
    # 路线偏差记录从闭环设计开始：记计划范围，供会中改线与下一闭环设计对照
    s.append_route(f"## 闭环设计（{'冷启动' if cold else f'读 M09 {len(m09)} 条、停车场' + ('有' if parked else '无')}）\n- 学习目标：{goal.strip()}\n- 验收范围：scene.md\n"
                   f"- 设计说明：{note or '无'}\n- 下一闭环候选：\n{nxt or '无'}")
    return root


def main(argv=None):
    ap = argparse.ArgumentParser(description="M05 设计闭环")
    ap.add_argument("--goal", required=True, help="学习者说出的学习目标")
    ap.add_argument("--about", help="学习者自述（学段、学过什么）；可省略")
    ap.add_argument("--run", help="运行名（默认按时间生成）")
    ap.add_argument("--model", default="opus")
    ap.add_argument("--learner", help="学习者（读其 M09 记录与停车场；省略 = 冷启动）")
    ap.add_argument("--dry", action="store_true", help="只打印装配好的输入，不调模型")
    ap.add_argument("--split", metavar="RUN", help="把停车场里的 RUN 拆成若干最小闭环，并设计第一个（须配 --learner）")
    a = ap.parse_args(argv)
    if a.dry:
        print(assemble.for_design(a.goal, a.about, *_history(a.learner), a.split))
        return
    if a.split and not a.learner:
        sys.exit("--split 须配 --learner")
    root = design(a.goal, a.about, a.run or f"{_dt.datetime.now():%Y%m%d-%H%M%S}-design", a.model, a.learner, a.split)
    print((root / "scene.md").read_text(encoding="utf-8"), f"\n目录：{root}", sep="")


if __name__ == "__main__":
    main()
