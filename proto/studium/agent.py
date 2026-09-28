"""统一的判断调用接口：模型 + 系统提示词 + 用户输入 +（可选）学习环境目录 → 结果。

借鉴 pi（pi-ai 统一模型接口 + pi-agent-core 工具循环）：上层（教学、守卫、M05）只认 run()，
不管底下是哪家模型。给了学习环境目录，模型就能用三个只读工具按需翻资料：
    read_file  读一个文件（可指定行段）
    grep       在环境里按正则搜索
    list_dir   列目录
工具只能看到环境目录以内（路径不许绝对、不许 ..；环境里的软链接照常跟随）。

后端（模型名前缀）：
    opus / sonnet …      claude -p（走 Claude 订阅；开放 Read / Grep / Glob，工作目录 = 环境）
    oc:<模型>            OpenAI 兼容接口（地址与密钥读 proto/.env 的 STUDIUM_OC_*），自己的工具循环
    anthropic:<模型>     Anthropic Messages API（密钥 ANTHROPIC_API_KEY），自己的工具循环——未实测
无环境目录时退化为一次无工具调用（与 llm.call 相同）。
"""

import json
import os
import re
import subprocess
import time
import urllib.request
from pathlib import Path

from . import llm
from .llm import Result, _env

MAX_STEPS = 12  # 工具循环上限（实现期阈值）：到了就要求模型直接作答
_READ_LIMIT = 400

TOOLS = [
    {"name": "read_file", "description": "读学习环境里的一个文件，返回带行号的文本。长文件用 offset / limit 分段读。",
     "parameters": {"type": "object", "properties": {
         "path": {"type": "string", "description": "相对环境根目录的路径，如 m07/ch04/sec-4.7.md"},
         "offset": {"type": "integer", "description": "从第几行开始（1 起）"},
         "limit": {"type": "integer", "description": f"最多读几行，默认 {_READ_LIMIT}"}},
         "required": ["path"]}},
    {"name": "grep", "description": "在学习环境里按正则搜索，返回 文件:行号: 行内容（最多 60 条）。",
     "parameters": {"type": "object", "properties": {
         "pattern": {"type": "string"}, "path": {"type": "string", "description": "限定在某个子目录或文件，默认整个环境"}},
         "required": ["pattern"]}},
    {"name": "list_dir", "description": "列出学习环境里某个目录的内容。",
     "parameters": {"type": "object", "properties": {"path": {"type": "string", "description": "默认环境根目录"}}}},
]


def _safe(env: Path, rel: str | None) -> Path:
    rel = (rel or ".").strip()
    if os.path.isabs(rel) or ".." in Path(rel).parts:
        raise ValueError(f"路径必须在学习环境以内：{rel}")
    return env / rel


def run_tool(env: Path, name: str, args: dict) -> str:
    try:
        if name == "read_file":
            lines = _safe(env, args["path"]).read_text(encoding="utf-8").splitlines()
            start = max(int(args.get("offset") or 1), 1)
            n = int(args.get("limit") or _READ_LIMIT)
            chunk = lines[start - 1:start - 1 + n]
            more = f"\n……（共 {len(lines)} 行，继续读用 offset={start + n}）" if start - 1 + n < len(lines) else ""
            return "\n".join(f"{start + i}\t{l}" for i, l in enumerate(chunk)) + more
        if name == "grep":
            rx = re.compile(args["pattern"])
            base = _safe(env, args.get("path"))
            files = [base] if base.is_file() else sorted(  # 跟随软链接（m07 / m09 是链到书库与记录目录的）
                Path(d) / f for d, _, fs in os.walk(base, followlinks=True) for f in fs if f.endswith(".md"))
            hits = []
            for f in files:
                for i, l in enumerate(f.read_text(encoding="utf-8", errors="ignore").splitlines(), 1):
                    if rx.search(l):
                        hits.append(f"{f.relative_to(env)}:{i}: {l[:200]}")
                        if len(hits) >= 60:
                            return "\n".join(hits) + "\n……（结果过多，缩小范围）"
            return "\n".join(hits) or "（无匹配）"
        if name == "list_dir":
            d = _safe(env, args.get("path"))
            return "\n".join(p.name + ("/" if p.is_dir() else "") for p in sorted(d.iterdir())) or "（空）"
        return f"未知工具：{name}"
    except Exception as e:  # 工具出错如实告诉模型，由它换个做法
        return f"工具出错：{e}"


def _post(url: str, headers: dict, body: dict, timeout: int) -> dict:
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def _openai(model: str, system: str, user: str, env: Path, timeout: int, trace: list) -> Result:
    url = _env("STUDIUM_OC_BASE_URL").rstrip("/") + "/chat/completions"
    headers = {"Authorization": f"Bearer {_env('STUDIUM_OC_API_KEY')}", "Content-Type": "application/json",
               "x-opencode-session": llm._OC_SESSION, "User-Agent": "studium-proto"}
    tools = [{"type": "function", "function": t} for t in TOOLS]
    msgs = [{"role": "system", "content": system}, {"role": "user", "content": user}]
    start, tin, tout, cached, reqs, name = time.monotonic(), 0, 0, 0, 0, model
    for step in range(MAX_STEPS + 1):
        body = {"model": model, "messages": msgs}
        if step < MAX_STEPS:
            body["tools"] = tools
        data = _post(url, headers, body, timeout)
        reqs += 1
        u = data.get("usage") or {}
        tin += u.get("prompt_tokens", 0); tout += u.get("completion_tokens", 0)
        cached += (u.get("prompt_tokens_details") or {}).get("cached_tokens", 0)
        name = data.get("model", model)
        msg = data["choices"][0]["message"]
        calls = msg.get("tool_calls") or []
        if not calls:
            return Result(text=(msg.get("content") or "").strip(), model=name, input_tokens=tin,
                          cache_read=cached, output_tokens=tout, requests=reqs, seconds=time.monotonic() - start)
        msgs.append({"role": "assistant", "content": msg.get("content"), "tool_calls": calls})
        for c in calls:
            args = json.loads(c["function"].get("arguments") or "{}")
            out = run_tool(env, c["function"]["name"], args)
            trace.append((c["function"]["name"], args, len(out)))
            msgs.append({"role": "tool", "tool_call_id": c["id"], "content": out})
    raise RuntimeError("工具循环超过上限仍未作答")


def _anthropic(model: str, system: str, user: str, env: Path, timeout: int, trace: list) -> Result:
    headers = {"x-api-key": _env("ANTHROPIC_API_KEY"), "anthropic-version": "2023-06-01",
               "content-type": "application/json"}
    tools = [{"name": t["name"], "description": t["description"], "input_schema": t["parameters"]} for t in TOOLS]
    msgs = [{"role": "user", "content": user}]
    start, tin, tout, cached, reqs = time.monotonic(), 0, 0, 0, 0
    for step in range(MAX_STEPS + 1):
        body = {"model": model, "max_tokens": 8000, "system": system, "messages": msgs}
        if step < MAX_STEPS:
            body["tools"] = tools
        data = _post("https://api.anthropic.com/v1/messages", headers, body, timeout)
        reqs += 1
        u = data.get("usage") or {}
        tin += u.get("input_tokens", 0) + u.get("cache_read_input_tokens", 0); tout += u.get("output_tokens", 0)
        cached += u.get("cache_read_input_tokens", 0)
        blocks = data.get("content") or []
        uses = [b for b in blocks if b.get("type") == "tool_use"]
        if not uses:
            text = "".join(b.get("text", "") for b in blocks if b.get("type") == "text")
            return Result(text=text.strip(), model=data.get("model", model), input_tokens=tin,
                          cache_read=cached, output_tokens=tout, requests=reqs, seconds=time.monotonic() - start)
        msgs.append({"role": "assistant", "content": blocks})
        results = []
        for b in uses:
            out = run_tool(env, b["name"], b.get("input") or {})
            trace.append((b["name"], b.get("input") or {}, len(out)))
            results.append({"type": "tool_result", "tool_use_id": b["id"], "content": out})
        msgs.append({"role": "user", "content": results})
    raise RuntimeError("工具循环超过上限仍未作答")


def _claude_cli(model: str, system: str, user: str, env: Path, timeout: int) -> Result:
    extra = sorted({str(p.resolve().parent) for p in env.iterdir() if p.is_symlink()} |
                   {str(p.resolve()) for p in env.iterdir() if p.is_symlink() and p.resolve().is_dir()})
    cmd = ["claude", "-p", "--model", model, "--system-prompt", system,
           "--tools", "Read,Grep,Glob", "--allowedTools", "Read,Grep,Glob",
           "--no-session-persistence", "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}',
           "--output-format", "json"] + (["--add-dir", *extra] if extra else [])
    proc = subprocess.run(cmd, input=user, capture_output=True, text=True, cwd=env, timeout=timeout,
                          env=os.environ.copy())
    if proc.returncode != 0:
        raise RuntimeError(f"claude -p 失败（退出码 {proc.returncode}）：{(proc.stderr or proc.stdout)[:800]}")
    data = json.loads(proc.stdout)
    if data.get("is_error"):
        raise RuntimeError(f"模型调用出错：{data.get('result')}")
    usage = data.get("usage", {})
    used = list(data.get("modelUsage", {})) or [model]
    return Result(text=data["result"].strip(), model=next((m for m in used if model in m), used[0]),
                  input_tokens=usage.get("input_tokens", 0) + usage.get("cache_read_input_tokens", 0)
                  + usage.get("cache_creation_input_tokens", 0),
                  cache_read=usage.get("cache_read_input_tokens", 0), output_tokens=usage.get("output_tokens", 0),
                  requests=data.get("num_turns", 1), seconds=data.get("duration_ms", 0) / 1000)


def run(model: str, system: str, user: str, env: Path | None = None, timeout: int = 900,
        trace: list | None = None) -> Result:
    """trace：自己的工具循环会把每次工具调用 (名称, 参数, 返回长度) 追加进来；claude -p 后端不提供。"""
    if env is None:
        return llm.call(model, system, user, timeout)
    trace = [] if trace is None else trace
    if model.startswith("oc:"):
        return _openai(model[3:], system, user, env, timeout, trace)
    if model.startswith("anthropic:"):
        return _anthropic(model[len("anthropic:"):], system, user, env, timeout, trace)
    return _claude_cli(model, system, user, env, timeout)
