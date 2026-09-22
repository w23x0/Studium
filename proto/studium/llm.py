"""隔离判断调用：每次调用 = 一次独立的 `claude -p`，无工具、无会话持久化、无项目上下文。"""

import json
import os
import subprocess
import tempfile
from dataclasses import dataclass

# 在空目录里运行，避免 CLAUDE.md / 项目记忆被自动带进上下文
_ISOLATED_CWD = tempfile.mkdtemp(prefix="studium-llm-")


@dataclass
class Result:
    text: str
    model: str  # 实际执行的模型（横切原则 3：模型身份可追溯）
    input_tokens: int
    output_tokens: int
    seconds: float


def call(model: str, system: str, user: str, timeout: int = 600) -> Result:
    cmd = [
        "claude", "-p",
        "--model", model,
        "--system-prompt", system,
        "--tools", "",
        "--no-session-persistence",
        "--output-format", "json",
    ]
    proc = subprocess.run(
        cmd, input=user, capture_output=True, text=True,
        cwd=_ISOLATED_CWD, timeout=timeout, env=os.environ.copy(),
    )
    if proc.returncode != 0:
        raise RuntimeError(f"claude -p 失败（{proc.returncode}）：{proc.stderr.strip()[:500]}")
    data = json.loads(proc.stdout)
    if data.get("is_error"):
        raise RuntimeError(f"模型调用出错：{data.get('result')}")
    actual = next(iter(data.get("modelUsage", {})), model)
    usage = data.get("usage", {})
    return Result(
        text=data["result"].strip(),
        model=actual,
        input_tokens=usage.get("input_tokens", 0) + usage.get("cache_read_input_tokens", 0)
        + usage.get("cache_creation_input_tokens", 0),
        output_tokens=usage.get("output_tokens", 0),
        seconds=data.get("duration_ms", 0) / 1000,
    )
