"""整个书库并发批量跑 M08（可重跑续上：m08 自己跳过已完成的步骤）。

    python3 -m studium.m08_batch <书库根目录> --out-root <目录> --model <模型> [--jobs 16] [--only <子串>]... [--retries 2] [--dry-run]

书 = <书库根>/<学科>/<书>/ 下有 m07/index.md 的目录；学科 = 第一层目录名。每本书的每个有节的章一个任务：
子进程 `python3 -m studium.m08 run`，产出在 <out-root>/<书短名>/ch<章号>，日志 <产出目录>.log。
状态表 <out-root>/status.tsv，书名对照 <out-root>/books.tsv。
"""
import argparse
import concurrent.futures as cf
import re
import subprocess
import sys
import threading
import time
from pathlib import Path

from .m08 import _index_rows, chapter_sections

HERE = Path(__file__).resolve().parent.parent  # 书库处理/
WAIT_RETRY = 60


def find_books(root: Path, only: list[str], exclude: list[str] = ()) -> list[tuple[Path, str]]:
    out = []
    for subj in sorted(p for p in root.iterdir() if p.is_dir()):
        for b in sorted(p for p in subj.iterdir() if p.is_dir()):
            if (b / "m07" / "index.md").is_file() and (not only or any(o in str(b) for o in only)) \
                    and not any(x in str(b) for x in exclude):
                out.append((b, subj.name))
    return out


def short_names(books: list[tuple[Path, str]]) -> list[str]:
    used, names = set(), []
    for b, _ in books:
        n = re.sub(r"[^\w .\-+()]", "", b.name).strip().replace(" ", "_")[:60] or "book"
        base, i = n, 2
        while n in used:
            n, i = f"{base}-{i}", i + 1
        used.add(n)
        names.append(n)
    return names


def chapters(book: Path) -> tuple[list[str], list[str]]:
    """(可跑的章号, 无节的章号)：章 = kind ch；至少有一个节（见 m08.chapter_sections）。"""
    rows = _index_rows(book)
    ok, skip = [], []
    for r in rows:
        if r["kind"] != "ch" or r["number"] in ok or r["number"] in skip:
            continue
        n = r["number"]
        has = n and bool(chapter_sections(rows, n))
        (ok if has else skip).append(n)
    return ok, skip


class Table:
    COLS = ["书", "章", "状态", "尝试", "耗时秒", "退出码", "日志"]

    def __init__(self, path: Path):
        self.path, self.rows, self.lock = path, {}, threading.Lock()

    def set(self, key, **kw):
        with self.lock:
            self.rows.setdefault(key, dict(zip(self.COLS, [key[0], key[1], "等待", 0, "", "", ""]))).update(kw)
            lines = ["\t".join(self.COLS)] + ["\t".join(str(r[c]) for c in self.COLS) for r in self.rows.values()]
            self.path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def running_elsewhere(out: Path) -> bool:
    """别的进程（如换并发数前的旧调度）正在跑这一章：命令行里有它的产出目录。"""
    me, target = str(Path("/proc/self").resolve().name), f"--out\0{out}\0"
    for p in Path("/proc").iterdir():
        if p.name.isdigit() and p.name != me:
            try:
                if target in (p / "cmdline").read_bytes().decode("utf-8", "replace"):
                    return True
            except OSError:
                pass
    return False


def run_task(t: dict, tab: Table, a) -> None:
    key = (t["short"], t["ch"])
    out: Path = t["out"]
    if (out / "report.md").is_file() and (out / "points.jsonl").is_file():
        tab.set(key, 状态="已完成", 日志=str(t["log"]))
        return
    if running_elsewhere(out):
        tab.set(key, 状态="别处在跑", 日志=str(t["log"]))  # 跑完后再起一次调度即记为已完成
        return
    out.parent.mkdir(parents=True, exist_ok=True)
    cmd = [sys.executable, "-m", "studium.m08", "run", "--book", str(t["book"]), "--chapter", t["ch"],
           "--subject", t["subject"], "--out", str(out), "--model", a.model]
    t0 = time.time()
    for n in range(1, a.retries + 2):
        tab.set(key, 状态="运行", 尝试=n, 日志=str(t["log"]))
        with open(t["log"], "a", encoding="utf-8") as lf:
            lf.write(f"\n=== 尝试 {n} {time.strftime('%F %T')} ===\n")
            lf.flush()
            code = subprocess.run(cmd, cwd=HERE, stdout=lf, stderr=subprocess.STDOUT).returncode
        tab.set(key, 耗时秒=int(time.time() - t0), 退出码=code)
        if code == 0:
            tab.set(key, 状态="完成")
            return
        if n <= a.retries:
            time.sleep(WAIT_RETRY)
    tab.set(key, 状态="失败")


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("root", type=Path)
    ap.add_argument("--out-root", type=Path, required=True)
    ap.add_argument("--model", required=True)
    ap.add_argument("--jobs", type=int, default=16)
    ap.add_argument("--only", action="append", default=[])
    ap.add_argument("--exclude", action="append", default=[], help="书目录路径含该子串的不跑（可多次）")
    ap.add_argument("--retries", type=int, default=2)
    ap.add_argument("--passes", type=int, default=1, help="整轮跑完后，失败 / 别处在跑的章再跑几轮")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args(argv)

    books = find_books(a.root, a.only, a.exclude)
    names = short_names(books)
    a.out_root.mkdir(parents=True, exist_ok=True)
    (a.out_root / "books.tsv").write_text(
        "".join(f"{n}\t{b}\t{s}\n" for n, (b, s) in zip(names, books)), encoding="utf-8")

    tab = Table(a.out_root / "status.tsv")
    per_book, no_run = [], []
    for n, (b, subj) in zip(names, books):
        ok, skip = chapters(b)
        per_book.append([dict(short=n, book=b, subject=subj, ch=c, out=a.out_root / n / f"ch{c}",
                              log=a.out_root / n / f"ch{c}.log") for c in ok])
        if not ok:
            no_run.append(n)
        for c in skip:
            tab.set((n, c or "(无号)"), 状态="跳过:无节")
    # 按书交错：每本书第 1 章、第 2 章……
    tasks = [t for grp in zip_longest_lists(per_book) for t in grp]
    for t in tasks:
        tab.set((t["short"], t["ch"]), 日志=str(t["log"]))

    n_skip = sum(1 for r in tab.rows.values() if r["状态"] == "跳过:无节")
    print(f"书 {len(books)} 本，任务 {len(tasks)} 个，跳过无节的章 {n_skip} 个")
    if a.dry_run:
        for t in tasks:
            print(f"跑\t{t['short']}\tch{t['ch']}\t{t['subject']}")
        for k, r in tab.rows.items():
            if r["状态"] == "跳过:无节":
                print(f"跳过\t{k[0]}\tch{k[1]}")
        print("无可跑章的书：", no_run or "无")
        return

    for n in range(1, a.passes + 1):  # 多轮：上一轮失败 / 别处在跑的章，下一轮再跑（已完成的自动跳过）
        todo = tasks if n == 1 else [t for t in tasks if tab.rows[(t["short"], t["ch"])]["状态"] in ("失败", "别处在跑")]
        if not todo:
            break
        if n > 1:
            print(f"第 {n} 轮：{len(todo)} 章", flush=True)
            time.sleep(WAIT_RETRY * 2)
        with cf.ThreadPoolExecutor(a.jobs) as ex:
            for f in [ex.submit(run_task, t, tab, a) for t in todo]:
                f.result()
    cnt = {}
    for r in tab.rows.values():
        cnt[r["状态"]] = cnt.get(r["状态"], 0) + 1
    print("汇总：", "，".join(f"{k} {v}" for k, v in cnt.items()))
    for k, r in tab.rows.items():
        if r["状态"] == "失败":
            print(f"失败：{k[0]} ch{k[1]} 退出码 {r['退出码']} 日志 {r['日志']}")


def zip_longest_lists(lists):
    """按轮取：第 1 轮每本书的第 1 项，第 2 轮每本书的第 2 项……"""
    i = 0
    while any(i < len(l) for l in lists):
        yield [l[i] for l in lists if i < len(l)]
        i += 1


if __name__ == "__main__":
    main()
