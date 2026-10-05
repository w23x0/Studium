"""书库批量转换：每本书一个 MinerU batch，同时跑 N 本；已完整转完的跳过（可反复重跑续上）。

    python3 -m studium.mineru_batch <书库目录> [并发数，默认 4]

语言：文件路径含 ZH 里的关键词按中文（ch），其余按英文。SKIP：已转 / 重复 / 超 200 MB 已另拆的原书。
"""
import concurrent.futures as cf
import subprocess
import sys
import traceback
from pathlib import Path

from . import mineru

ZH = ["郑君里", "普林斯顿微积分读本", "C++ Primer中文版", "概率论与数理统计", "赵凯华"]
SKIP = ["Gilbert Strang) .pdf", "Calculus, Volume 1 One", "Calculus, Vol. 2 Multi", "Kleppner",
        "数据科学概率导论/Mathematics for Machine Learning.pdf",  # 与线性代数目录下那份相同
        "The x Chapters 电子学艺术X.pdf"]  # 263 MB，已拆成“The Art of Electronics X 拆分/”两半


def pages(pdf: Path) -> int:
    out = subprocess.run(["pdfinfo", str(pdf)], capture_output=True, text=True).stdout
    return int(next(l.split()[1] for l in out.splitlines() if l.startswith("Pages")))


def ranges(n: int) -> list[str]:
    return [f"{a}-{min(a + 199, n)}" for a in range(1, n + 1, 200)]


def done(out: Path, rs: list[str]) -> bool:
    return all((out / f"p{r}" / "full.md").exists() for r in rs)


def todo(lib: Path) -> list[tuple[Path, list[str], str]]:
    jobs = []
    for pdf in sorted(lib.rglob("*.pdf")):
        s = str(pdf)
        if ".pdf-" in s or (pdf.parent / "full.md").exists() or any(k in s for k in SKIP):
            continue
        rs = ranges(pages(pdf))
        if not done(pdf.with_suffix(""), rs):
            jobs.append((pdf, rs, "ch" if any(k in s for k in ZH) else "en"))
    return jobs


def run(job) -> str:
    pdf, rs, lang = job
    try:
        mineru.convert(pdf, rs, lang, pdf.with_suffix(""))
        return f"{'完成' if done(pdf.with_suffix(''), rs) else '部分失败'}  {pdf.name}"
    except Exception:
        return f"出错  {pdf.name}\n{traceback.format_exc(limit=2)}"


if __name__ == "__main__":
    jobs = todo(Path(sys.argv[1]))
    print(f"{len(jobs)} 本，{sum(len(j[1]) for j in jobs)} 段", flush=True)
    for j in jobs:
        print(f"  {j[2]}  {len(j[1])} 段  {j[0].name}", flush=True)
    with cf.ThreadPoolExecutor(int(sys.argv[2]) if len(sys.argv) > 2 else 4) as ex:
        for msg in ex.map(run, jobs):
            print(msg, flush=True)
