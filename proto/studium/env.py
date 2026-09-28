"""学习环境：教学调用与守卫能用只读工具翻的目录（类比 Claude Code 面对的仓库）。

每次调用前在临时目录里搭好，内容全是软链接或小文件，不复制书：
    README.md        这里有什么、从哪看起（常驻索引）
    m08.md           本学习项目的知识结构（通用，不属于学习者）
    路线-*.md        教材路线：哪一节按什么顺序讲哪些知识点
    m07/             教材原文（按小节切好；m07/index.md 为目录）→ 书库里的原文
    m09/             学习者已结束闭环的记录（有才放）
    skills/          教学工具（M03 维护，skill 格式）→ proto/skills/；描述由 agent.run 列进系统提示，正文按需读
"""

import re
import tempfile
from pathlib import Path

from . import commit, m08

SKILLS = m08.PROTO / "skills"

README = """# 学习环境

- `m08.md`：本学习项目的知识结构——知识点（编号 K / P）与它们之间的关系（前置 / 推导 / 组成 / 混淆），每条带原文引文与页码。它是索引：要讲某个知识点时，先在这里找到它，再去读原文。
- `路线-*.md`：教材路线——教材按什么顺序、在哪一节讲哪些知识点，以及对应的原文文件。
- `m07/`：教材原文，按小节切好（`m07/index.md` 为全书目录；另有章末附注、习题与书末答案）。
{m09}- `skills/`：教学工具，每份一个 `SKILL.md`；什么时候用见系统提示里的列表。
"""


def build(run: Path) -> Path | None:
    """按运行目录登记的 M08（m08.txt）与学习者（learner.txt）搭环境；没有 M08 则返回 None。"""
    ref = run / "m08.txt"
    if not ref.exists():
        return None
    m08_path = m08.PROTO / ref.read_text(encoding="utf-8").strip()
    env = Path(tempfile.mkdtemp(prefix="studium-env-"))
    (env / "m08.md").symlink_to(m08_path.resolve())
    for route in sorted(m08_path.parent.glob("路线-*.md")):
        (env / route.name).symlink_to(route.resolve())
        book = re.search(r"原文：`([^`]+)/m07/`", route.read_text(encoding="utf-8"))
        if book and not (env / "m07").exists():
            (env / "m07").symlink_to(Path(book.group(1)) / "m07")
    learner = commit.learner_of(run)
    has_m09 = bool(learner and commit.m09_records(learner))
    if has_m09:
        (env / "m09").symlink_to((commit.home(learner) / "m09").resolve())
    (env / "skills").symlink_to(SKILLS.resolve())
    note = "- `m09/`：这位学习者已结束闭环的记录（守卫核对过的、他已经走通的知识链）。\n" if has_m09 else ""
    (env / "README.md").write_text(README.format(m09=note), encoding="utf-8")
    return env
