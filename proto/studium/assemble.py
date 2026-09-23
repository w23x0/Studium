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
