"""上下文装配：按各判断点的读清单取上游资产（Harness 02 §6）。

规则（A-03 / 02 §3.7）：
- 缺必需项 → 不发调用（抛 MissingInput）；缺条件项 → 降级并在上下文里标注。
- 同一槽位只取最新有效一份。
- 诊断记录不回灌下一轮输入（只出不回，01-节点设计 §2.6）。
"""

from pathlib import Path

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


def for_guard(s: Session, scene: str) -> str:
    return "\n".join([
        _section("验收范围", _need(scene, "验收范围")),
        _section("对话本体", _need(s.numbered_transcript(), "对话本体")),
    ])


def for_teach(s: Session, scene: str, guard_note: str | None) -> str:
    parts = [_section("闭环目标与验收范围", _need(scene, "闭环目标"))]
    if guard_note:
        parts.append(_section("闭环守卫上次核对结果", guard_note))
    parts += [
        _section("通用策略知识", prompt("strategy_knowledge")),
        _section("对话本体", _need(s.numbered_transcript(), "对话本体")),
    ]
    return "\n".join(parts)


def for_route(scene: str, basis: str, route_log: str | None) -> str:
    """M05 只读场景、改线依据、自己的路线偏差记录；不读对话本体、不判掌握。"""
    parts = [
        _section("当前场景", _need(scene, "当前场景")),
        _section("改线依据（诊断方本轮报出）", _need(basis, "改线依据")),
    ]
    parts.append(_section("路线偏差记录", route_log) if route_log
                 else _section("路线偏差记录", "（本闭环尚无调整）"))
    return "\n".join(parts)


def for_design(goal: str, about: str | None, cold_start: bool) -> str:
    """M05 设计闭环：读学习目标、学习者自述（条件项）、是否冷启动；v0 无 M09 / M08。"""
    return "\n".join([
        _section("学习目标（学习者原话）", _need(goal, "学习目标")),
        _section("学习者自述", about) if about
        else _section("学习者自述", "（缺：学习者未提供；已学范围只能按学段假定）"),
        _section("是否冷启动", "是：该学习者尚无已结束闭环的记录" if cold_start else "否"),
    ])
