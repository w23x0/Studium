#!/usr/bin/env python3
"""深挖调研用的检索脚本（只用标准库）。

子命令：
  search  <查询> [<查询> ...]   论文检索：arXiv + OpenAlex，多个查询并发
  get     <id|url> [...]        论文全文 → md，存缓存目录，打印路径
  cites   <id|doi>              谁引用了这篇（OpenAlex）
  web     <查询> [...]          本机 SearXNG 泛搜索：去重、丢掉 related suggestions
  page    <url> [...]           任意网页 → md（博客、文档）
  hn      <查询> [...]          Hacker News 讨论检索（Algolia）
  thread  <hn 帖子 id>          Hacker News 一帖的全部评论 → md

全文缓存：$STUDIUM_RESEARCH_CACHE，默认 ~/.cache/studium-research（不进仓库）。
OpenAlex 可选密钥：$OPENALEX_KEY。
"""

import argparse
import base64
import html
import json
import os
import re
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser

CACHE = os.path.expanduser(os.environ.get("STUDIUM_RESEARCH_CACHE", "~/.cache/studium-research"))
UA = "Mozilla/5.0 (X11; Linux x86_64) studium-research/1.0"

# 每个站点：最多几个并发、两次请求至少隔几秒（arXiv API 官方要求 3 秒一次）
HOST_RULES = {
    "export.arxiv.org": (1, 3.0),
    "arxiv.org": (2, 1.0),
    "api.openalex.org": (4, 0.2),
    "r.jina.ai": (2, 3.0),
    "api.semanticscholar.org": (1, 3.0),
}
_host_locks = {}
_host_last = {}
_guard = threading.Lock()


def _host_slot(host):
    with _guard:
        if host not in _host_locks:
            n, _ = HOST_RULES.get(host, (4, 0.3))
            _host_locks[host] = threading.Semaphore(n)
            _host_last[host] = 0.0
    return _host_locks[host]


def fetch(url, binary=False, tries=5, accept=None):
    """带站点限速与退避重试的 GET；429 / 5xx 自动退避。"""
    host = urllib.parse.urlparse(url).netloc
    _, gap = HOST_RULES.get(host, (4, 0.3))
    headers = {"User-Agent": UA}
    if accept:
        headers["Accept"] = accept
    delay = 2.0
    for attempt in range(tries):
        with _host_slot(host):
            with _guard:
                wait = _host_last[host] + gap - time.time()
            if wait > 0:
                time.sleep(wait)
            with _guard:
                _host_last[host] = time.time()
            try:
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req, timeout=60) as r:
                    data = r.read()
                    return data if binary else data.decode(r.headers.get_content_charset() or "utf-8", "replace")
            except urllib.error.HTTPError as e:
                if e.code not in (429, 500, 502, 503, 504) or attempt == tries - 1:
                    raise
                retry = e.headers.get("Retry-After")
                pause = float(retry) if retry and retry.isdigit() else delay
            except (urllib.error.URLError, TimeoutError):
                if attempt == tries - 1:
                    raise
                pause = delay
        time.sleep(pause)
        delay *= 2
    raise RuntimeError("unreachable")


def openalex(path, **params):
    if os.environ.get("OPENALEX_KEY"):
        params["api_key"] = os.environ["OPENALEX_KEY"]
    return json.loads(fetch(f"https://api.openalex.org/{path}?{urllib.parse.urlencode(params)}"))


# ---------- HTML → md ----------

SKIP_TAGS = {"head", "script", "style", "nav", "header", "footer", "noscript", "svg", "button", "form"}
SKIP_CLASSES = ("ltx_page_header", "ltx_page_footer", "ltx_TOC", "ltx_role_footnote_mark", "package-alerts")
BLOCK = {"p", "div", "section", "article", "blockquote", "figure", "figcaption", "br", "dd", "dt", "tr", "pre"}
VOID = {"br", "img", "hr", "meta", "link", "input", "col", "area", "base", "source", "wbr"}


class ToMd(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = []
        self.skip = 0
        self.stack = []  # 每层是否开启了跳过
        self.in_math = 0
        self.pre = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        cls = a.get("class") or ""
        if tag in VOID:
            if tag == "br" and not self.skip:
                self.out.append("\n")
            if tag == "img" and not self.skip and a.get("alt"):
                self.out.append(f"[图：{a['alt']}]")
            return
        skipping = tag in SKIP_TAGS or any(c in cls for c in SKIP_CLASSES)
        if tag == "math" and not self.skip:
            alt = a.get("alttext", "")
            self.out.append(f" ${alt}$ " if alt else "")
            skipping = True
        self.stack.append(skipping)
        if skipping:
            self.skip += 1
            return
        if self.skip:
            return
        if re.fullmatch(r"h[1-6]", tag):
            self.out.append("\n\n" + "#" * int(tag[1]) + " ")
        elif tag == "li":
            self.out.append("\n- ")
        elif tag in ("td", "th"):
            self.out.append(" | ")
        elif tag == "pre":
            self.pre += 1
            self.out.append("\n```\n")
        elif tag == "a" and a.get("href", "").startswith("http") and "ltx_ref" not in cls:
            self.out.append("")
        elif tag in BLOCK or "ltx_para" in cls or "ltx_bibitem" in cls:
            self.out.append("\n\n")
        if tag == "figcaption":
            self.out.append("> ")

    def handle_endtag(self, tag):
        if tag in VOID or not self.stack:
            return
        skipping = self.stack.pop()
        if skipping:
            self.skip -= 1
            return
        if self.skip:
            return
        if tag == "pre":
            self.pre -= 1
            self.out.append("\n```\n")
        elif re.fullmatch(r"h[1-6]", tag) or tag in BLOCK:
            self.out.append("\n")
        elif tag == "tr":
            self.out.append(" |\n")

    def handle_data(self, data):
        if self.skip:
            return
        self.out.append(data if self.pre else re.sub(r"\s+", " ", data))

    def text(self):
        s = "".join(self.out)
        s = re.sub(r"[ \t]+\n", "\n", s)
        s = re.sub(r"\n{3,}", "\n\n", s)
        return s.strip() + "\n"


def html_to_md(src):
    p = ToMd()
    p.feed(src)
    return p.text()


def pdf_to_md(data):
    r = subprocess.run(["pdftotext", "-enc", "UTF-8", "-", "-"], input=data, capture_output=True)
    if r.returncode != 0:
        raise RuntimeError("pdftotext 失败：" + r.stderr.decode(errors="replace")[:200])
    return r.stdout.decode("utf-8", "replace")


# ---------- 论文 ----------

ARXIV_RE = re.compile(r"(?:arxiv\.org/(?:abs|pdf|html)/|arxiv:)?(\d{4}\.\d{4,5}(?:v\d+)?|[a-z\-]+(?:\.[A-Z]{2})?/\d{7}(?:v\d+)?)", re.I)


def arxiv_id(s):
    s = s.strip()
    if "doi.org/10.48550/arxiv." in s.lower():
        s = s.lower().split("arxiv.")[-1]
    m = ARXIV_RE.fullmatch(s) or (ARXIV_RE.search(s) if "arxiv" in s.lower() else None)
    return m.group(1).removesuffix(".pdf") if m else None


def arxiv_query(q):
    """词之间取“且”；带引号的短语整体匹配。"""
    parts = re.findall(r'"[^"]+"|\S+', q)
    return " AND ".join(f"all:{x}" for x in parts)


def search_arxiv(q, n):
    url = "https://export.arxiv.org/api/query?" + urllib.parse.urlencode(
        {"search_query": arxiv_query(q), "max_results": n, "sortBy": "relevance"})
    ns = {"a": "http://www.w3.org/2005/Atom"}
    root = ET.fromstring(fetch(url))
    rows = []
    for e in root.findall("a:entry", ns):
        aid = e.find("a:id", ns).text.rsplit("/abs/", 1)[-1]
        rows.append({
            "src": "arxiv", "id": f"arxiv:{aid}", "date": e.find("a:published", ns).text[:10],
            "title": " ".join(e.find("a:title", ns).text.split()),
            "venue": "", "cited": "",
            "authors": ", ".join(x.find("a:name", ns).text for x in e.findall("a:author", ns)[:3]),
        })
    return rows


def search_openalex(q, n):
    d = openalex("works", search=q, per_page=n,
                 select="id,doi,title,publication_date,cited_by_count,primary_location,authorships,ids")
    rows = []
    for w in d.get("results", []):
        loc = (w.get("primary_location") or {}).get("source") or {}
        rows.append({
            "src": "openalex", "id": w.get("doi") or w["id"], "date": w.get("publication_date") or "",
            "title": w.get("title") or "", "venue": loc.get("display_name") or "",
            "cited": w.get("cited_by_count", ""),
            "authors": ", ".join(a["author"]["display_name"] for a in (w.get("authorships") or [])[:3]),
        })
    return rows


def cmd_search(args):
    jobs = []
    for q in args.query:
        if "arxiv" in args.source:
            jobs.append((q, "arxiv", search_arxiv))
        if "openalex" in args.source:
            jobs.append((q, "openalex", search_openalex))
    with ThreadPoolExecutor(8) as ex:
        futs = [(q, s, ex.submit(f, q, args.n)) for q, s, f in jobs]
        for q, s, fu in futs:
            print(f"\n## {q}  [{s}]")
            try:
                for r in fu.result():
                    extra = " · ".join(x for x in (r["venue"], f"被引 {r['cited']}" if r["cited"] != "" else "") if x)
                    print(f"- {r['date']} · {r['title']} — {r['authors']}" + (f" · {extra}" if extra else "") + f"\n  {r['id']}")
            except Exception as e:
                print(f"- 失败：{e}")


def _clean_url(url):
    p = urllib.parse.urlsplit(url)
    q = [(k, v) for k, v in urllib.parse.parse_qsl(p.query, keep_blank_values=True)
         if not k.lower().startswith("utm_")]
    return urllib.parse.urlunsplit((
        p.scheme.lower(), p.netloc.lower(), p.path.rstrip("/") or "/",
        urllib.parse.urlencode(q), "",
    ))


def _snippet(text, limit=240):
    text = re.sub(r"\s+", " ", text or "").strip()
    return text if len(text) <= limit else text[:limit - 1] + "…"


def searxng(q, n, time_range=None, engines=None, categories=None, language=None):
    """查本机 SearXNG，去重、丢掉 engine 的 related-search suggestions。"""
    endpoint = os.environ.get("SEARXNG_ENDPOINT", "http://127.0.0.1:8080").rstrip("/")
    params = {"q": q, "format": "json"}
    for k, v in (("time_range", time_range), ("engines", engines),
                 ("categories", categories), ("language", language)):
        if v:
            params[k] = v
    headers = {"User-Agent": UA, "Accept": "application/json"}
    if os.environ.get("SEARXNG_TOKEN"):
        headers["Authorization"] = "Bearer " + os.environ["SEARXNG_TOKEN"]
    if os.environ.get("SEARXNG_BASIC"):
        headers["Authorization"] = "Basic " + base64.b64encode(
            os.environ["SEARXNG_BASIC"].encode()).decode()
    req = urllib.request.Request(endpoint + "/search?" + urllib.parse.urlencode(params), headers=headers)
    with urllib.request.urlopen(req, timeout=30) as r:
        body = r.read().decode(r.headers.get_content_charset() or "utf-8", "replace")
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        raise RuntimeError(f"SearXNG 没返回 JSON（{endpoint} 可访问吗？formats 里有 json 吗？）")
    rows, seen = [], set()
    for r in data.get("results") or []:
        url = (r.get("url") or "").strip()
        if not url:
            continue
        key = _clean_url(url)
        if key in seen:
            continue
        seen.add(key)
        rows.append({
            "title": (r.get("title") or url).strip(),
            "url": url,
            "snippet": _snippet(r.get("content") or r.get("snippet")),
            "engine": r.get("engine") or "",
            "date": r.get("publishedDate") or r.get("published_date") or "",
        })
        if len(rows) >= n:
            break
    return rows, data.get("unresponsive_engines") or []


def cmd_web(args):
    n = max(1, min(args.n, 50))
    for q in args.query:
        try:
            rows, failed = searxng(q, n, args.time_range, args.engines,
                                   args.categories, args.language)
        except Exception as e:
            print(f"## {q}\n- 失败：{e}")
            continue
        if args.json:
            print(json.dumps({"query": q, "results": rows,
                              "unresponsive_engines": failed}, ensure_ascii=False, indent=1))
        else:
            print(f"\n## {q}")
            for i, r in enumerate(rows, 1):
                meta = " · ".join(x for x in (r["engine"], r["date"][:10]) if x)
                print(f"{i}. {r['title']}\n   {r['url']}")
                if r["snippet"]:
                    print(f"   {r['snippet']}")
                if meta:
                    print(f"   [{meta}]")
            if not rows:
                print("- 无结果")
        if failed:
            detail = "; ".join(f"{e}: {m}" for e, m in failed)
            print(f"上游引擎失败：{detail}", file=sys.stderr)


def _save(name, text, header, kind="papers"):
    os.makedirs(os.path.join(CACHE, kind), exist_ok=True)
    path = os.path.join(CACHE, kind, re.sub(r"[^\w.\-]+", "_", name)[:120] + ".md")
    with open(path, "w", encoding="utf-8") as f:
        f.write(header + "\n\n" + text)
    return path


def get_arxiv(aid):
    meta = ""
    try:
        html_src = fetch(f"https://arxiv.org/html/{aid}")
        title = re.search(r"<title>(.*?)</title>", html_src, re.S)
        meta = html.unescape(title.group(1)).strip() if title else ""
        body = html_to_md(html_src)
        how = "arXiv HTML"
        if len(body) < 3000:
            raise ValueError("HTML 版太短")
    except Exception:
        body = pdf_to_md(fetch(f"https://arxiv.org/pdf/{aid}", binary=True))
        how = "arXiv PDF（pdftotext，公式与表格会乱）"
    return _save(f"arxiv-{aid}", body, f"<!-- 来源 https://arxiv.org/abs/{aid} · {how} · {meta} -->")


def get_doi_or_openalex(key):
    ref = key if key.startswith("https://openalex.org/") else "https://doi.org/" + re.sub(r"^(https?://(dx\.)?doi\.org/|doi:)", "", key, flags=re.I)
    w = openalex("works/" + urllib.parse.quote(ref, safe=":/"))
    aid = arxiv_id(((w.get("ids") or {}).get("arxiv") or "")) or next(
        (arxiv_id(l.get("landing_page_url") or "") for l in w.get("locations") or [] if "arxiv" in (l.get("landing_page_url") or "")), None)
    if aid:
        return get_arxiv(aid)
    tried = []
    for loc in [w.get("best_oa_location")] + (w.get("locations") or []):
        if not loc:
            continue
        for u in (loc.get("pdf_url"), loc.get("landing_page_url")):
            if not u or u in tried:
                continue
            tried.append(u)
            try:
                data = fetch(u, binary=True)
                body = pdf_to_md(data) if data[:4] == b"%PDF" else html_to_md(data.decode("utf-8", "replace"))
                if len(body) > 5000:
                    return _save(w["id"].rsplit("/", 1)[-1], body,
                                 f"<!-- 来源 {u} · {w.get('title')} · {w.get('publication_date')} -->")
            except Exception:
                continue
    raise RuntimeError(f"没有可直接下载的全文（试过 {len(tried)} 处）；出版商页面走浏览器 CDP：{w.get('doi') or w['id']}")


def get_one(key):
    aid = arxiv_id(key)
    if aid:
        return get_arxiv(aid)
    if key.lower().startswith(("10.", "doi:", "https://doi.org", "http://dx.doi.org", "https://openalex.org/")):
        return get_doi_or_openalex(key)
    return get_page(key)


def get_page(url, jina=False):
    if jina:
        body = fetch("https://r.jina.ai/" + url)
    else:
        data = fetch(url, binary=True)
        body = pdf_to_md(data) if data[:4] == b"%PDF" else html_to_md(data.decode("utf-8", "replace"))
    name = urllib.parse.urlparse(url).netloc + urllib.parse.urlparse(url).path
    return _save("page-" + name, body, f"<!-- 来源 {url} · 取于 {time.strftime('%Y-%m-%d')} -->", "pages")


def _run_many(fn, keys):
    with ThreadPoolExecutor(6) as ex:
        for k, fu in [(k, ex.submit(fn, k)) for k in keys]:
            try:
                p = fu.result()
                print(f"{k}\t{p}\t{os.path.getsize(p) // 1024} KB")
            except Exception as e:
                print(f"{k}\t失败：{e}")


def s2_key(key):
    aid = arxiv_id(key)
    if aid:
        return "arXiv:" + re.sub(r"v\d+$", "", aid)
    return "DOI:" + re.sub(r"^(https?://(dx\.)?doi\.org/|doi:)", "", key, flags=re.I)


def cmd_cites(args):
    """先用 Semantic Scholar（新论文覆盖全，匿名限流会自动退避），不行再用 OpenAlex。"""
    try:
        key = s2_key(args.id)
        d = json.loads(fetch(f"https://api.semanticscholar.org/graph/v1/paper/{urllib.parse.quote(key, safe=':')}"
                             f"/citations?fields=title,year,publicationDate,citationCount,externalIds&limit={args.n}", tries=8))
        print(f"# 引用 {key} 的论文（Semantic Scholar，前 {args.n} 篇）")
        for c in d.get("data", []):
            p = c["citingPaper"]
            ids = p.get("externalIds") or {}
            ref = f"arxiv:{ids['ArXiv']}" if ids.get("ArXiv") else (f"doi:{ids['DOI']}" if ids.get("DOI") else p.get("paperId"))
            print(f"- {p.get('publicationDate') or p.get('year')} · {p.get('title')} · 被引 {p.get('citationCount')}\n  {ref}")
        return
    except Exception as e:
        print(f"Semantic Scholar 失败（{e}），改用 OpenAlex")
    aid = arxiv_id(args.id)
    ref = "https://doi.org/10.48550/arXiv." + re.sub(r"v\d+$", "", aid) if aid else (
        args.id if args.id.startswith("https://openalex.org/") else "https://doi.org/" + re.sub(r"^(https?://doi\.org/|doi:)", "", args.id))
    w = openalex("works/" + urllib.parse.quote(ref, safe=":/"), select="id,title,cited_by_count")
    print(f"# {w['title']} · 被引 {w['cited_by_count']}")
    d = openalex("works", filter=f"cites:{w['id'].rsplit('/', 1)[-1]}", per_page=args.n, sort="publication_date:desc",
                 select="id,doi,title,publication_date,cited_by_count")
    for r in d.get("results", []):
        print(f"- {r['publication_date']} · {r['title']} · 被引 {r['cited_by_count']}\n  {r.get('doi') or r['id']}")


# ---------- Hacker News ----------

def cmd_hn(args):
    def one(q):
        params = {"query": q, "tags": "story", "hitsPerPage": args.n}
        if args.since:
            params["numericFilters"] = "created_at_i>" + str(int(time.mktime(time.strptime(args.since, "%Y-%m-%d"))))
        return json.loads(fetch("https://hn.algolia.com/api/v1/search?" + urllib.parse.urlencode(params)))["hits"]
    with ThreadPoolExecutor(6) as ex:
        for q, fu in [(q, ex.submit(one, q)) for q in args.query]:
            print(f"\n## {q}")
            for h in fu.result():
                print(f"- {h['created_at'][:10]} · {h['title']} · {h.get('points')} 分 / {h.get('num_comments')} 评\n"
                      f"  帖 {h['objectID']} · {h.get('url') or ''}")


def cmd_thread(args):
    d = json.loads(fetch(f"https://hn.algolia.com/api/v1/items/{args.id}"))
    lines = [f"# {d.get('title')}", f"<!-- https://news.ycombinator.com/item?id={args.id} · {d.get('url') or ''} -->", ""]

    def walk(node, depth):
        for c in node.get("children") or []:
            if c.get("text"):
                t = html_to_md(c["text"]).strip().replace("\n", "\n" + "  " * depth + "  ")
                lines.append(f"{'  ' * depth}- **{c.get('author')}** {c.get('created_at', '')[:10]}: {t}")
            walk(c, depth + 1)
    walk(d, 0)
    p = _save(f"hn-{args.id}", "\n".join(lines), "", "threads")
    print(f"{p}\t{os.path.getsize(p) // 1024} KB")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("search"); s.add_argument("query", nargs="+"); s.add_argument("--n", type=int, default=8)
    s.add_argument("--source", default="arxiv,openalex")
    g = sub.add_parser("get"); g.add_argument("ids", nargs="+")
    c = sub.add_parser("cites"); c.add_argument("id"); c.add_argument("--n", type=int, default=25)
    w = sub.add_parser("web"); w.add_argument("query", nargs="+"); w.add_argument("--n", type=int, default=10)
    w.add_argument("--time-range", choices=["day", "month", "year"])
    w.add_argument("--engines", help='逗号分隔，如 "google cse,yahoo"')
    w.add_argument("--categories"); w.add_argument("--language")
    w.add_argument("--json", action="store_true")
    p = sub.add_parser("page"); p.add_argument("urls", nargs="+"); p.add_argument("--jina", action="store_true")
    h = sub.add_parser("hn"); h.add_argument("query", nargs="+"); h.add_argument("--n", type=int, default=10)
    h.add_argument("--since", help="YYYY-MM-DD")
    t = sub.add_parser("thread"); t.add_argument("id")
    args = ap.parse_args()
    if args.cmd == "search":
        cmd_search(args)
    elif args.cmd == "get":
        _run_many(get_one, args.ids)
    elif args.cmd == "web":
        cmd_web(args)
    elif args.cmd == "page":
        _run_many(lambda u: get_page(u, args.jina), args.urls)
    elif args.cmd == "cites":
        cmd_cites(args)
    elif args.cmd == "hn":
        cmd_hn(args)
    elif args.cmd == "thread":
        cmd_thread(args)


if __name__ == "__main__":
    sys.exit(main())
