"""资产存储：纯文本、只追加，按会话 / 轮次 / 模块存放，可用 `文件:行号` 引用。

目录结构（一个会话 = 一个闭环）：
    runs/<会话>/
        scene.md                 闭环目标与验收范围（M05 给定，本原型手写）
        transcript.md            对话本体（只追加，带行号引用），含学习者看不到的【练习条件】
        turns/NNN/<模块>.md      每轮各判断点的产出资产
        calls.log                每次模型调用：判断点、实际模型、token、耗时
        closure.md               闭环守卫通过后的闭环总结（提交 M09 的替身）
"""

import datetime as _dt
from pathlib import Path


class Session:
    def __init__(self, root: Path):
        self.root = root
        self.transcript = root / "transcript.md"
        (root / "turns").mkdir(parents=True, exist_ok=True)
        self.transcript.touch()

    # ---- 对话本体 ----
    def append(self, speaker: str, text: str) -> None:
        with self.transcript.open("a", encoding="utf-8") as f:
            f.write(f"[{speaker}] {text.strip()}\n")

    def size(self) -> int:
        return self.transcript.stat().st_size

    def truncate(self, size: int) -> None:
        """回退到指定长度（本轮调用失败时，撤回未得到回应的输入，含多行输入）。"""
        with self.transcript.open("r+b") as f:
            f.truncate(size)

    def numbered_transcript(self) -> str:
        """带行号的对话本体，供需要 `文件:行号` 引用的判断点读取。"""
        lines = self.transcript.read_text(encoding="utf-8").splitlines()
        return "\n".join(f"transcript.md:{i} {line}" for i, line in enumerate(lines, 1))

    def learner_view(self) -> str:
        """学习者能看到的对话（去掉【练习条件】这类系统侧记录）。"""
        lines = self.transcript.read_text(encoding="utf-8").splitlines()
        return "\n".join(l for l in lines if not l.startswith("[练习条件]"))

    # ---- 轮次资产 ----
    def turn_dir(self, n: int) -> Path:
        d = self.root / "turns" / f"{n:03d}"
        d.mkdir(parents=True, exist_ok=True)
        return d

    def write_asset(self, n: int, module: str, text: str) -> Path:
        p = self.turn_dir(n) / f"{module}.md"
        p.write_text(text.strip() + "\n", encoding="utf-8")
        return p

    def read_asset(self, n: int, module: str) -> str | None:
        p = self.root / "turns" / f"{n:03d}" / f"{module}.md"
        return p.read_text(encoding="utf-8") if p.exists() else None

    def latest_asset(self, module: str, before: int | None = None) -> str | None:
        """读侧“取最新有效”：同一槽位只取最新一份，不并喂新旧版本（02 §3.7）。"""
        turns = sorted((self.root / "turns").iterdir(), reverse=True)
        for d in turns:
            if before is not None and int(d.name) >= before:
                continue
            p = d / f"{module}.md"
            if p.exists():
                return p.read_text(encoding="utf-8")
        return None

    def log_call(self, turn: int, point: str, res) -> None:
        stamp = _dt.datetime.now().isoformat(timespec="seconds")
        with (self.root / "calls.log").open("a", encoding="utf-8") as f:
            f.write(f"{stamp}\tturn={turn}\t{point}\tmodel={res.model}\t"
                    f"in={res.input_tokens}\tout={res.output_tokens}\t{res.seconds:.1f}s\n")
