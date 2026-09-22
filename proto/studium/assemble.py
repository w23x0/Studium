"""上下文装配：按各判断点的读清单取上游资产（Harness 02 §6）。

规则（A-03 / 02 §3.7）：
- 缺必需项 → 不发调用（抛 MissingInput）；缺条件项 → 降级并在上下文里标注。
- 同一槽位只取最新有效一份。
- M04 不读自己的历史输出（只出不回，01-节点设计 §2.6）。
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


def for_m04(s: Session, scene: str, turn: int, guard_note: str | None) -> str:
    parts = [_section("闭环目标与验收范围", _need(scene, "闭环目标"))]
    strategy = s.latest_asset("m10", before=turn)
    parts.append(_section("当前策略条件", strategy or "（缺失：本闭环尚无策略条件，证据权重按“教学条件未知”处理）"))
    if guard_note:
        parts.append(_section("闭环守卫上次核对结果", guard_note))
    parts.append(_section("对话本体", _need(s.numbered_transcript(), "对话本体")))
    return "\n".join(parts)


def for_m10(s: Session, scene: str, turn: int, guard_note: str | None) -> str:
    parts = [
        _section("闭环目标与验收范围", _need(scene, "闭环目标")),
        _section("最新诊断", _need(s.read_asset(turn, "m04"), "M04 当前诊断")),
    ]
    if guard_note:
        parts.append(_section("闭环守卫核对结果", guard_note))
    parts.append(_section("通用策略知识", prompt("strategy_knowledge")))
    return "\n".join(parts)


def for_m02(s: Session, scene: str, turn: int) -> str:
    parts = [
        _section("闭环目标与学习者范围", _need(scene, "闭环目标")),
        _section("最新诊断", _need(s.read_asset(turn, "m04"), "M04 最新分析")),
    ]
    strategy = s.read_asset(turn, "m10")
    parts.append(_section("本轮策略条件", strategy or "（缺失：按保守表达，一次一小步）"))
    parts.append(_section("对话", s.learner_view()))
    return "\n".join(parts)


def for_guard(s: Session, scene: str) -> str:
    return "\n".join([
        _section("验收范围", _need(scene, "验收范围")),
        _section("对话本体", _need(s.numbered_transcript(), "对话本体")),
    ])


def for_single(s: Session, scene: str, guard_note: str | None) -> str:
    parts = [_section("闭环目标与验收范围", _need(scene, "闭环目标"))]
    if guard_note:
        parts.append(_section("闭环守卫上次核对结果", guard_note))
    parts += [
        _section("通用策略知识", prompt("strategy_knowledge")),
        _section("对话本体", _need(s.numbered_transcript(), "对话本体")),
    ]
    return "\n".join(parts)
