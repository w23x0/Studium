"""上下文装配：按各判断点的读清单取上游资产（Harness 02 §6）。

规则（A-03 / 02 §3.7）：
- 缺必需项 → 不发调用（抛 MissingInput）；缺条件项 → 降级并在上下文里标注。
- 同一槽位只取最新有效一份。
- 诊断记录不回灌下一轮输入（只出不回，01-节点设计 §2.6）。
"""

from pathlib import Path

from . import m08
from .store import Session

PROMPTS = Path(__file__).parent / "prompts"


class MissingInput(Exception):
    pass


def prompt(name: str) -> str:
    return (PROMPTS / f"{name}.md").read_text(encoding="utf-8")


def _need(value, what: str):
    if not value:
        raise MissingInput(what)
    return value


def _section(title: str, body: str) -> str:
    return f"## {title}\n\n{body.strip()}\n"


_SLICE = "M08 本闭环片（通用知识结构，由 M05 索引；不是学习者的掌握情况）"


def for_guard(s: Session, scene: str) -> str:
    parts = [_section("验收范围", _need(scene, "验收范围"))]
    piece = m08.slice_of_run(s.root, scene)
    if piece:
        parts.append(_section(_SLICE, piece))
    if s.numbered_draft():
        parts.append(_section("讲解稿（定稿，带行号；每轮改动记在对话本体的 [讲解稿] 行）", s.numbered_draft()))
    parts.append(_section("对话本体", _need(s.numbered_transcript(), "对话本体")))
    return "\n".join(parts)


def for_teach(s: Session, scene: str, guard_note: str | None, history: str | None = None) -> str:
    parts = [_section("闭环目标与验收范围", _need(scene, "闭环目标"))]
    piece = m08.slice_of_run(s.root, scene)
    if piece:
        parts.append(_section(_SLICE, piece))
    if history:  # M09 条件接入：背景参考，不得覆盖本次对话里的证据（01-节点设计 §2）
        parts.append(_section("个人历史（M09 已结束闭环记录；背景参考，不得覆盖本次对话证据）", history))
    if guard_note:
        parts.append(_section("闭环守卫上次核对结果", guard_note))
    if s.numbered_draft():
        parts.append(_section("讲解稿（学习者自己的笔记，当前版，带行号；每轮改动记在对话本体的 [讲解稿] 行）",
                              s.numbered_draft()))
    if s.board.exists():
        parts.append(_section("板书（当前版，你上次写的）", s.board.read_text(encoding="utf-8")))
    parts += [
        _section("通用策略知识", prompt("strategy_knowledge")),
        _section("对话本体", _need(s.numbered_transcript(), "对话本体")),
    ]
    return "\n".join(parts)


def for_route(scene: str, basis: str, route_log: str | None, m08_full: str | None = None) -> str:
    """M05 只读场景、改线依据、自己的路线偏差记录、M08（补前置时查前置边）；不读对话本体、不判掌握。"""
    parts = [
        _section("当前场景", _need(scene, "当前场景")),
        _section("改线依据（诊断方本轮报出）", _need(basis, "改线依据")),
    ]
    if m08_full:
        parts.append(_section("M08 知识结构（通用，不属于学习者）", m08_full))
    parts.append(_section("路线偏差记录", route_log) if route_log
                 else _section("路线偏差记录", "（本闭环尚无调整）"))
    return "\n".join(parts)


def for_design(goal: str, about: str | None, m09: list[str], parked: str | None,
               route_logs: list[str], plans: list[str] | None = None, split: str | None = None,
               m08: str | None = None) -> str:
    """M05 设计闭环：学习目标、自述（条件项）、M08 知识结构（条件项）、M09 已结束闭环记录、停车场、相关路线偏差记录。"""
    cold = not m09 and not parked
    parts = [
        _section("学习目标（学习者原话）", _need(goal, "学习目标")),
        _section("学习者自述", about) if about
        else _section("学习者自述", "（缺：学习者未提供；已学范围只能按学段假定）"),
        _section("是否冷启动", "是：该学习者尚无任何闭环记录" if cold else "否"),
        _section("M08 知识结构（通用，不属于学习者）", m08) if m08
        else _section("M08 知识结构", "（缺：本学习项目尚无知识结构；按目标自行划定知识点）"),
    ]
    if not cold:
        parts.append(_section("M09 已结束闭环记录", "\n\n---\n\n".join(m09) if m09 else "（无：还没有守卫通过的闭环）"))
        parts.append(_section("停车场（未完成闭环）", parked or "（无）"))
        if route_logs:
            parts.append(_section("相关闭环的路线偏差记录", "\n\n---\n\n".join(route_logs)))
        if plans:
            parts.append(_section("已有的拆分计划（后续小闭环按计划设计）", "\n\n---\n\n".join(plans)))
    if split:
        parts.append(_section("拆分要求", f"把停车场里的 {split} 拆成若干最小闭环：原主张与要点一条不删，全部分配；"
                              f"按依赖排先后，前置不牢的先补；先写【拆分计划】，再为第一个小闭环写【场景】。"))
    return "\n".join(parts)
