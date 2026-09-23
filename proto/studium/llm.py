"""隔离判断调用：每次调用 = 一次独立的 `claude -p`，无工具、无会话持久化、无项目上下文。

模型名写 `oc:<模型>`（如 `oc:deepseek-v4.1-flash`）时改走 OpenAI 兼容接口（地址与密钥读 proto/.env）。
只用于模拟学习者这类不属于架构的角色：判断点用最强模型，免得把模型不足误读成设计问题。
"""

import json
import os
import subprocess
import tempfile
import time
import urllib.request
import uuid
from dataclasses import dataclass
from pathlib import Path

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"
_OC_SESSION = str(uuid.uuid4())  # OpenCode Go 按会话路由，要求带 x-opencode-session；一次运行一个

# 在空目录里运行，避免 CLAUDE.md / 项目记忆被自动带进上下文
_ISOLATED_CWD = tempfile.mkdtemp(prefix="studium-llm-")


@dataclass
class Result:
    text: str
    model: str  # 实际执行的模型（横切原则 3：模型身份可追溯）
    input_tokens: int  # 含读缓存与写缓存
    cache_read: int
    output_tokens: int
    seconds: float


def _env(name: str) -> str:
    if name in os.environ:
        return os.environ[name]
    if _ENV_FILE.exists():
        for line in _ENV_FILE.read_text(encoding="utf-8").splitlines():
            key, sep, value = line.partition("=")
            if sep and key.strip() == name:
                return value.strip()
    raise RuntimeError(f"缺 {name}：在 proto/.env 里配置（见 .env.example）")


def _call_oc(model: str, system: str, user: str, timeout: int) -> Result:
    body = json.dumps({"model": model, "messages": [
        {"role": "system", "content": system}, {"role": "user", "content": user}]}).encode()
    req = urllib.request.Request(
        _env("STUDIUM_OC_BASE_URL").rstrip("/") + "/chat/completions", data=body,
        headers={"Authorization": f"Bearer {_env('STUDIUM_OC_API_KEY')}", "Content-Type": "application/json",
                 "x-opencode-session": _OC_SESSION, "User-Agent": "studium-proto"})
    start = time.monotonic()
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = json.load(resp)
    usage = data.get("usage") or {}
    return Result(
        text=data["choices"][0]["message"]["content"].strip(),
        model=data.get("model", model),
        input_tokens=usage.get("prompt_tokens", 0),
        cache_read=(usage.get("prompt_tokens_details") or {}).get("cached_tokens", 0),
        output_tokens=usage.get("completion_tokens", 0),
        seconds=time.monotonic() - start,
    )


def call(model: str, system: str, user: str, timeout: int = 600) -> Result:
    if model.startswith("oc:"):
        return _call_oc(model[3:], system, user, timeout)
    cmd = [
        "claude", "-p",
        "--model", model,
        "--system-prompt", system,
        "--tools", "",
        "--no-session-persistence",
        # 不加载任何 MCP 服务：否则连接器说明会异步混进上下文——既破坏隔离，也让前缀不稳定、读不到缓存
        "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}',
        "--output-format", "json",
    ]
    proc = subprocess.run(
        cmd, input=user, capture_output=True, text=True,
        cwd=_ISOLATED_CWD, timeout=timeout, env=os.environ.copy(),
    )
    if proc.returncode != 0:
        detail = (proc.stderr.strip() or proc.stdout.strip() or "（无输出）")[:800]
        raise RuntimeError(f"claude -p 失败（退出码 {proc.returncode}）：{detail}\n"
                           f"排查：在同一终端运行  echo hi | claude -p  看能否正常返回")
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
        cache_read=usage.get("cache_read_input_tokens", 0),
        output_tokens=usage.get("output_tokens", 0),
        seconds=data.get("duration_ms", 0) / 1000,
    )
