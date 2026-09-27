"""学习者侧跨闭环记录：M09 已结束闭环记录 + M05 停车场（未完成闭环）。

    records/<学习者>/
        m09/NNN-<运行名>.md   守卫通过后提交的闭环总体记录（M04 → M09，只写一次，不改）
        parking.md           M05 停车场：未通过就结束 / 搁置的闭环，带缺口与接续点（只追加）

口径（审查单）：闭环未结束不写 M09，守卫通过是唯一过渡点（M04-02、M09）；未完成闭环记入
M05 停车场与未完成负债，可靠搁置 = 带具体恢复计划（M05）。M09 记录按验收主张逐条标证据强度（M04）。
学习者身份记在运行目录的 learner.txt（设计闭环时写入）。

    python3 -m studium.commit --run NAME                  守卫已通过 → 提交 M09；否则须加 --park
    python3 -m studium.commit --run NAME --park "理由"     记入停车场（用最后一次守卫核对的缺口）
"""

import argparse
import datetime as _dt
import re
import sys
from pathlib import Path

from . import assemble, llm
from .store import Session

ROOT = Path(__file__).resolve().parent.parent
LEARNERS = ROOT / "records"  # learners/ 放模拟学习者人设；这里放真实学习者的跨闭环记录
RUNS = ROOT / "runs"
NEXT = "[下一闭环候选]"


def learner_of(run: Path) -> str | None:
    p = run / "learner.txt"
    return p.read_text(encoding="utf-8").strip() if p.exists() else None


def home(learner: str) -> Path:
    return LEARNERS / learner


def m09_records(learner: str) -> list[Path]:
    d = home(learner) / "m09"
    return sorted(d.glob("*.md")) if d.exists() else []


def parking(learner: str) -> str | None:
    p = home(learner) / "parking.md"
    return p.read_text(encoding="utf-8") if p.exists() else None


def _current_scene(s: Session) -> str:
    return s.latest_asset("scene") or (s.root / "scene.md").read_text(encoding="utf-8")


def _next_candidates(s: Session) -> list[str]:
    """诊断记录里的 [下一闭环候选]：学习者钻研到范围外的方向（去重，保留先后）。"""
    seen: list[str] = []
    for d in sorted((s.root / "turns").iterdir()):
        text = (d / "diagnosis.md").read_text(encoding="utf-8") if (d / "diagnosis.md").exists() else ""
        _, found, rest = text.partition(NEXT)
        if not found:
            continue
        body = re.split(r"\n\s*\[", rest, maxsplit=1)[0].strip().lstrip("-*• ").strip()
        if body and not body.startswith("无") and body not in seen:
            seen.append(body)
    return seen


def _last_guard(s: Session) -> tuple[int, str] | None:
    for d in sorted((s.root / "turns").iterdir(), reverse=True):
        if (d / "guard.md").exists():
            return int(d.name), (d / "guard.md").read_text(encoding="utf-8")
    return None


def _turns(s: Session) -> int:
    return max((int(d.name) for d in (s.root / "turns").iterdir() if d.name.isdigit()), default=0)


def by_node(scene: str, guard: str) -> str | None:
    """按知识点排的索引（由验收范围的节点标注与守卫逐条核对派生，可重建，不权威）。"""
    tags = {n: re.findall(r"【([KP]\d+)】", head) for n, head in re.findall(r"^(\d+)\.\s*((?:【[^】]*】)+)", scene, flags=re.M)}
    if not any(tags.values()):
        return None
    rows = []
    for n, verdict, body in re.findall(r"^主张\s*(\d+)[^：\n]*：\s*(有|无)(.*?)(?=^主张\s*\d+|^【守卫结论】|\Z)", guard, flags=re.M | re.S):
        field = lambda k: (re.search(rf"^- {k}：(.*)$", body, flags=re.M) or [None, "—"])[1].strip()
        rows.append(f"| {'、'.join(tags.get(n, [])) or '—'} | {n} | {verdict} | {field('条件')} | {field('证据强度')} "
                    f"| {field('缺口') if verdict == '无' else '—'} | {field('前置缺口')} |")
    anchor = next((l for l in scene.splitlines() if l.startswith("锚定")), "")
    return (f"{anchor}\n\n| 知识点 | 主张 | 守卫 | 条件 | 证据强度 | 缺口 | 前置缺口 |\n"
            f"| --- | --- | --- | --- | --- | --- | --- |\n" + "\n".join(rows))


def _m08_ref(run: Path) -> str:
    ref = run / "m08.txt"
    return f"- M08：`{ref.read_text(encoding='utf-8').strip()}`\n" if ref.exists() else ""


def commit_m09(run: Path, learner: str) -> Path:
    """守卫通过后提交 M09：验收范围 + 守卫逐条核对（含证据强度）+ 范围外的下一闭环候选。"""
    s = Session(run)
    closure = run / "closure.md"
    if not closure.exists():
        sys.exit(f"守卫未通过，不能提交 M09（未完成闭环请用 --park 记入停车场）：{run}")
    d = home(learner) / "m09"
    d.mkdir(parents=True, exist_ok=True)
    if any(p.name.endswith(f"-{run.name}.md") for p in d.glob("*.md")):
        sys.exit(f"该闭环已提交过 M09：{run.name}")
    nxt = _next_candidates(s)
    out = d / f"{len(m09_records(learner)) + 1:03d}-{run.name}.md"
    out.write_text(
        f"# 已结束闭环：{run.name}\n\n"
        f"- 结束时间：{_dt.datetime.fromtimestamp(closure.stat().st_mtime):%Y-%m-%d %H:%M}\n"
        f"- 轮数：{_turns(s)}\n{_m08_ref(run)}\n"
        + (f"## 按知识点（派生索引，可重建；以下方守卫核对为准）\n\n{idx}\n\n" if (idx := by_node(_current_scene(s), closure.read_text(encoding="utf-8"))) else "")
        + f"## 验收范围（结束时版本）\n\n{_current_scene(s).strip()}\n\n"
        f"## 守卫逐条核对\n\n{closure.read_text(encoding='utf-8').strip()}\n\n"
        f"## 范围外的下一闭环候选（诊断记录）\n\n" + ("\n".join(f"- {x}" for x in nxt) or "无") + "\n",
        encoding="utf-8")
    return out


def guard_check(run: Path, model: str = "opus") -> None:
    """搁置前让守卫核对一次（闭环从未提议结束时没有守卫结果），结果存进最后一轮。"""
    s = Session(run)
    scene = _current_scene(s)
    res = llm.call(model, assemble.prompt("guard"), assemble.for_guard(s, scene))
    n = _turns(s)
    s.log_call(n, "guard", res)
    s.write_asset(n, "guard", res.text)


def park(run: Path, learner: str, reason: str) -> Path:
    """记入 M05 停车场：未完成闭环 + 最后一次守卫缺口 + 接续点。"""
    s = Session(run)
    if (run / "closure.md").exists():
        sys.exit(f"守卫已通过，应提交 M09 而不是停车场：{run}")
    g = _last_guard(s)
    turns = _turns(s)
    gaps = (f"第 {g[0]} 轮守卫核对（此后又进行了 {turns - g[0]} 轮，缺口可能已部分补上）：\n\n{g[1].strip()}"
            if g and g[0] < turns else f"第 {g[0]} 轮守卫核对：\n\n{g[1].strip()}" if g
            else "无守卫核对：缺口未经核对，需看运行目录的对话与诊断记录")
    nxt = _next_candidates(s)
    p = home(learner) / "parking.md"
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("a", encoding="utf-8") as f:
        f.write(f"## {run.name}（{_dt.datetime.now():%Y-%m-%d %H:%M} 记入）\n\n"
                f"- 状态：未完成（{reason}）\n- 轮数：{turns}\n"
                f"- 接续点：`python3 -m studium.loop --run {run.name}` 从第 {turns} 轮后接着跑；或由下一闭环承接缺口\n{_m08_ref(run)}\n"
                + (f"### 按知识点（派生索引，可重建；以下方守卫核对为准）\n\n{idx}\n\n" if g and (idx := by_node(_current_scene(s), g[1])) else "")
                + 
                f"### 验收范围（当前版本）\n\n{_current_scene(s).strip()}\n\n"
                f"### 缺口\n\n{gaps}\n\n### 范围外的下一闭环候选（诊断记录）\n\n"
                + ("\n".join(f"- {x}" for x in nxt) or "无") + "\n\n")
    return p


def main(argv=None):
    ap = argparse.ArgumentParser(description="闭环结束后的提交：M09（守卫通过）或 M05 停车场（未完成）")
    ap.add_argument("--run", required=True)
    ap.add_argument("--learner", help="学习者（缺省读运行目录的 learner.txt）")
    ap.add_argument("--park", metavar="理由", help="未完成闭环：记入停车场")
    ap.add_argument("--check", action="store_true", help="记入停车场前先让守卫核对一次（缺口以它为准）")
    a = ap.parse_args(argv)
    run = RUNS / a.run
    learner = a.learner or learner_of(run)
    if not learner:
        sys.exit("不知道这是哪个学习者的闭环：加 --learner，或在运行目录写 learner.txt")
    (run / "learner.txt").write_text(learner + "\n", encoding="utf-8")
    if a.park and a.check:
        guard_check(run)
    out = park(run, learner, a.park) if a.park else commit_m09(run, learner)
    print(f"已写入：{out}")


if __name__ == "__main__":
    main()
