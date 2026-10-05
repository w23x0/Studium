"""书 → md：本地 PDF 经 MinerU 精准解析 API（vlm）转成 full.md + content_list.json + images。

M06 入库流水线的最小一段，只做格式转换；不抽概念、不判结构。
单次上限 200 页，长书按页码分段，每段一个子目录，页码偏移记在 source.json：
每段 content_list 的 page_idx 从 0 起，PDF 页码 = first_page + page_idx。

用法：python3 -m studium.mineru <pdf> --ranges 1-200,201-400,401-564 [--lang en] [--out 目录]
密钥：书库处理/.env 的 MINERU_TOKEN（或同名环境变量）。
"""

import argparse
import http.client
import io
import json
import sys
import time
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

from .llm import _env

_API = "https://mineru.net/api/v4"


def _call(method: str, path: str, body: dict | None = None) -> dict:
    req = urllib.request.Request(
        _API + path, method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Authorization": f"Bearer {_env('MINERU_TOKEN')}",
                 "Content-Type": "application/json", "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=60) as r:
        res = json.load(r)
    if res.get("code") != 0:
        raise RuntimeError(f"MinerU {path}: {res}")
    return res["data"]


def _upload(url: str, data: bytes) -> None:
    # 签名链接：不能带 Content-Type（urllib 的 PUT 会自动加），所以直接用 http.client
    # 大文件（100 MB 级）上传偶尔中途断开：放长超时，断了重传
    u = urllib.parse.urlsplit(url)
    for attempt in range(1, 4):
        try:
            conn = http.client.HTTPSConnection(u.netloc, timeout=1200)
            conn.putrequest("PUT", u.path + ("?" + u.query if u.query else ""), skip_accept_encoding=True)
            conn.putheader("Content-Length", str(len(data)))
            conn.endheaders()
            conn.send(data)
            r = conn.getresponse()
            if r.status == 200:
                return
            err = RuntimeError(f"上传失败 {r.status}: {r.read()[:300]!r}")
        except OSError as e:
            err = e
        print(f"上传第 {attempt} 次失败：{err}", file=sys.stderr)
        time.sleep(30 * attempt)
    raise err


def convert(pdf: Path, ranges: list[str], lang: str, out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    files = [{"name": pdf.name, "data_id": f"p{r}", "page_ranges": r} for r in ranges]
    batch = _call("POST", "/file-urls/batch", {
        "files": files, "model_version": "vlm", "language": lang,
        "enable_formula": True, "enable_table": True})
    data = pdf.read_bytes()
    for r, url in zip(ranges, batch["file_urls"]):
        _upload(url, data)
        print(f"已上传 {r}", file=sys.stderr)

    pending = set(ranges)
    while pending:
        time.sleep(20)
        for item in _call("GET", f"/extract-results/batch/{batch['batch_id']}")["extract_result"]:
            r = item["data_id"][1:]
            if r not in pending:
                continue
            state = item["state"]
            if state == "done":
                sub = out / f"p{r}"
                with urllib.request.urlopen(item["full_zip_url"], timeout=300) as z:
                    zipfile.ZipFile(io.BytesIO(z.read())).extractall(sub)
                pending.discard(r)
                print(f"完成 {r} → {sub}", file=sys.stderr)
            elif state == "failed":
                pending.discard(r)
                print(f"失败 {r}: {item.get('err_msg')}", file=sys.stderr)
            else:
                prog = item.get("extract_progress") or {}
                print(f"{r}: {state} {prog.get('extracted_pages', '')}/{prog.get('total_pages', '')}",
                      file=sys.stderr)

    (out / "source.json").write_text(json.dumps({
        "file": pdf.name, "batch_id": batch["batch_id"], "model_version": "vlm", "language": lang,
        "parts": {f"p{r}": {"page_ranges": r, "first_page": int(r.split("-")[0])} for r in ranges},
        "converted": time.strftime("%Y-%m-%d %H:%M"),
    }, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf", type=Path)
    ap.add_argument("--ranges", required=True, help="逗号分隔，每段 ≤ 200 页，如 1-200,201-400")
    ap.add_argument("--lang", default="en")
    ap.add_argument("--out", type=Path, help="默认：PDF 同目录下以书名为名的文件夹")
    a = ap.parse_args()
    convert(a.pdf, a.ranges.split(","), a.lang, a.out or a.pdf.with_suffix(""))


if __name__ == "__main__":
    main()
