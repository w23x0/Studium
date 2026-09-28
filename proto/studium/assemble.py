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


_SLICE = "M08 本段片（通用知识结构中这段链用到的知识点与关系；不是学习者的掌握情况）"


def for_guard(s: Session, scene: str) -> str:
    parts = [_section("这段知识链", _need(scene, "知识链"))]
    piece = m08.slice_of_run(s.root, scene)
    if piece:
        parts.append(_section(_SLICE, piece))
    parts.append(_section("对话本体", _need(s.numbered_transcript(), "对话本体")))
    return "\n".join(parts)


def for_teach(s: Session, scene: str, guard_note: str | None, history: str | None = None) -> str:
    parts = [_section("这段知识链", _need(scene, "知识链"))]
    piece = m08.slice_of_run(s.root, scene)
    if piece:
        parts.append(_section(_SLICE, piece))
    if history:  # M09 条件接入：背景参考，不得覆盖本次对话里的证据（01-节点设计 §2）
        parts.append(_section("学习者已结束闭环的记录（M09；背景参考，不得覆盖本次对话）", history))
    if guard_note:
        parts.append(_section("闭环守卫上次核对结果", guard_note))
    parts.append(_section("对话本体", _need(s.numbered_transcript(), "对话本体")))
    return "\n".join(parts)


def for_design(goal: str, about: str | None, m09: list[str], parked: str | None,
               route_logs: list[str], m08_text: str | None = None, routes: str | None = None) -> str:
    """M05 设计闭环：学习目标、自述、M08 与教材路线、M09 已结束闭环记录、停车场、相关路线偏差记录。"""
    cold = not m09 and not parked
    parts = [
        _section("学习目标（学习者原话）", _need(goal, "学习目标")),
        _section("学习者自述", about) if about
        else _section("学习者自述", "（缺：学习者未提供；已学范围只能按学段假定）"),
        _section("是否冷启动", "是：该学习者尚无任何闭环记录" if cold else "否"),
        _section("M08 知识结构（通用，不属于学习者）", _need(m08_text, "M08 知识结构")),
    ]
    if routes:
        parts.append(_section("教材路线", routes))
    if not cold:
        parts.append(_section("M09 已结束闭环记录", "\n\n---\n\n".join(m09) if m09 else "（无：还没有走通的闭环）"))
        parts.append(_section("停车场（未走通的闭环）", parked or "（无）"))
        if route_logs:
            parts.append(_section("相关闭环的路线偏差记录", "\n\n---\n\n".join(route_logs)))
    return "\n".join(parts)
