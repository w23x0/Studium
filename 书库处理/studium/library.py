"""全书库调度：每本书先 M07 切书（m07toc run；已切好则跳过），再 M08 整本按节接力抽取（extract.run_whole）。

    python3 -m studium.library <书库目录> [并发数，默认 8] [--only 书目录名里的关键词] [--model oc:xxx]

书间并发、书内严格顺序（接力要带前文知识点表）；可反复重跑续上：已切好的不再切，已抽完的节不再调用。
某本失败（切书出错或某节调用失败）只记日志、这本停下，不挡别的书；下次重跑从失败处继续。
进度日志 runs/lib-progress.log，每行一个事件（制表符分隔）：时间 · 书 · 节 · 状态 · 秒 · 错误。
run 目录 runs/lib-<短名>/（进 git 前已在 .gitignore 里忽略：书的原文摘录不入库）。
"""
import argparse
import concurrent.futures as cf
import hashlib
import re
import threading
import time
import traceback
from pathlib import Path

from . import extract, m07toc

SKIP = ["Kleppner"]  # K&K 已单独处理过
LOG = extract.RUNS / "lib-progress.log"
_lock = threading.Lock()


def log(book: str, sec: str, status: str, secs: float = 0.0, err: str = "") -> None:
    row = "\t".join([time.strftime("%Y-%m-%d %H:%M:%S"), book, sec, status, f"{secs:.0f}", err.replace("\n", " ⏎ ")])
    with _lock, LOG.open("a", encoding="utf-8") as f:
        f.write(row + "\n")


def books(lib: Path, only: str | None) -> list[Path]:
    """书库里所有转换过的书（目录下有 source.json）。"""
    out = [f.parent for f in sorted(lib.rglob("source.json")) if not any(k in str(f.parent) for k in SKIP)]
    out = [b for b in out if not only or only.lower() in str(b).lower()]
    return sorted(out, key=lambda b: -remaining(b))


def remaining(book: Path) -> int:
    """还没抽的节数（没切好的书记作无穷大）。书内只能顺序跑，总时长由最长的书决定，所以按剩余节数从多到少开跑。"""
    if not (book / "m07" / "index.md").exists():
        return 10 ** 6
    return len(extract.book_sections(book)) - len(list((extract.RUNS / short(book)).glob("raw-*.md")))


def short(book: Path) -> str:
    """run 名：书名前 28 个字符 + 路径哈希 4 位（同名不同本也不冲突）。"""
    return "lib-" + re.sub(r"[^\w]+", "-", book.name[:28]).strip("-") + "-" + hashlib.md5(str(book).encode()).hexdigest()[:4]


def converted(book: Path) -> bool:
    import json
    src = json.loads((book / "source.json").read_text(encoding="utf-8"))
    return all((book / part / "full.md").exists() for part in src["parts"])


def process(book: Path, model: str) -> str:
    name = short(book)
    root = extract.RUNS / name
    try:
        if not converted(book):
            log(name, "m07toc", "跳过", err="MinerU 转换未完成")
            return f"跳过（未转完）{name}"
        out = book / "m07"
        if not (out / "index.md").exists():
            t = time.monotonic()
            try:
                m07toc.main(["split" if (out / "toc.tsv").exists() else "run", "--book", str(book)])
            except BaseException as e:  # SystemExit 也算失败：这本跳过，不挡别的
                log(name, "m07toc", "失败", time.monotonic() - t, f"{type(e).__name__}: {e}"[:300])
                return f"m07toc 失败 {name}"
            log(name, "m07toc", "完成", time.monotonic() - t)
        if (root / "raw.md").exists():
            log(name, "-", "已完成")
            return f"已完成 {name}"

        def on_step(i, n, label, status, secs, err):
            log(name, f"{i}/{n} {label}", status, secs, err)

        extract.run_whole(book, name, model, on_step)
        log(name, "-", "全书完成")
        return f"完成 {name}"
    except Exception as e:
        log(name, "-", "中止", err=f"{type(e).__name__}: {e}"[:300])
        return f"中止 {name}：{e}\n{traceback.format_exc(limit=2)}"


def main(argv=None):
    ap = argparse.ArgumentParser(description="全书库：M07 切书 + M08 按节接力抽取")
    ap.add_argument("lib", type=Path)
    ap.add_argument("workers", type=int, nargs="?", default=8, help="同时跑几本书")
    ap.add_argument("--only", help="只跑路径里含此关键词的书")
    ap.add_argument("--model", default="oc:space-bunny-free")
    a = ap.parse_args(argv)
    bs = books(a.lib, a.only)
    LOG.parent.mkdir(parents=True, exist_ok=True)
    log("-", "-", "启动", err=f"{len(bs)} 本，并发 {a.workers}，模型 {a.model}")
    print(f"{len(bs)} 本，并发 {a.workers}", flush=True)
    with cf.ThreadPoolExecutor(a.workers) as ex:
        for msg in ex.map(lambda b: process(b, a.model), bs):
            print(msg, flush=True)
    log("-", "-", "结束")


if __name__ == "__main__":
    main()
