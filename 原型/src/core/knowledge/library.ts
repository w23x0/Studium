// 资料：书库里每本书的切分结果（`书库处理/` 的产出：<书>/<切分结果目录>/index.md + 各小节文件）。只读。
// 目录（index.md 的表）两种格式都认：旧的 6 列（编号 类型 标题 页 文件 节内例题）和带 PDF 页的 10 列。
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import type {
  BookSummary,
  NumberedLine,
  PageSpan,
  SearchHit,
  TocEntry,
} from '../../shared/protocol.ts';
import { isNotFound } from '../log/session-log.ts';

export interface SearchOptions {
  /** 只搜这一本。 */
  book?: string;
  /** 只在这几本里搜（项目资料）；给了 book 时以 book 为准。 */
  books?: string[];
  /** 最多返回几条（默认 20，上限 100）。 */
  limit?: number;
  /** 同一小节最多返回几条（默认 3）。 */
  perSection?: number;
}

export interface SearchResult {
  hits: SearchHit[];
  /** 命中的段落总数（返回之前，含被 limit / perSection 截掉的）。 */
  total: number;
}

interface IndexedFile {
  entry: TocEntry;
  lines: string[];
  lower: string[];
}

interface BookCache {
  title: string;
  entries: TocEntry[];
  files?: IndexedFile[];
}

/** 个人笔记导入时写在笔记目录里的 meta.json（数据目录自己的区，不在书库里）。 */
export interface NoteMeta {
  id: string;
  title: string;
  author: string;
  source: string;
  originalPath: string;
  importedAt: string;
  files: { chapter: string; title: string; originalFile: string; sections: number }[];
  assets: { ref: string; path: string; found: boolean; file: string; line: number }[];
  previous?: string;
  skipped?: string[];
}

/** 书库里认出来的一本书（或一份个人笔记）。 */
export interface BookInfo {
  id: string;
  /** 书目录（其下是切分结果目录）。 */
  dir: string;
  /** 学科目录（相对书库根，/ 隔开）；平铺的书为空。 */
  subject: string;
  kind: 'book' | 'note';
  meta?: NoteMeta;
}

/** 书库根下最多往下找几层学科目录（学科/子学科/书）。 */
const MAX_SUBJECT_DEPTH = 4;
/** 扫描结果缓存多久（毫秒）；导入笔记会主动清掉。 */
const SCAN_TTL_MS = 2000;
/** 切分结果所在的子目录名：`书库处理/` 的产出格式，真书库与样例书库都是这样。 */
export const BOOK_DIR = 'm07';
/** 不往里找的目录：切分结果目录与页段。（原来还跳过 `m08`；知识点已取消、不再有这种目录，一并去掉。） */
const SKIP_DIR = new RegExp(`^(\\.|node_modules$|${BOOK_DIR}$|p\\d+-\\d+$)`);

export class Library {
  private readonly cache = new Map<string, BookCache>();
  private scanned: { at: number; map: Map<string, BookInfo> } | undefined;

  /**
   * root = 书库根：下面可以有学科目录再到书，“书”= 有切分结果 index.md 的那一层。
   * notesRoot = 个人笔记的区（<id>/<切分结果目录>/index.md + meta.json），在数据目录里，和书库分开。
   */
  constructor(
    readonly root: string,
    readonly notesRoot?: string,
  ) {}

  /** 书库有变（导入了笔记、放进了新书）后调用，下次重新扫。 */
  invalidate(): void {
    this.scanned = undefined;
  }

  private async scan(fresh = false): Promise<Map<string, BookInfo>> {
    const now = Date.now();
    if (!fresh && this.scanned && now - this.scanned.at < SCAN_TTL_MS) return this.scanned.map;
    const raw: (Omit<BookInfo, 'id'> & { leaf: string })[] = [];
    await this.walk(this.root, '', 0, raw);
    if (this.notesRoot !== undefined) await this.walkNotes(this.notesRoot, raw);
    const byLeaf = new Map<string, number>();
    for (const r of raw) byLeaf.set(r.leaf, (byLeaf.get(r.leaf) ?? 0) + 1);
    const map = new Map<string, BookInfo>();
    for (const r of raw.sort(
      (a, b) => a.leaf.localeCompare(b.leaf) || a.dir.localeCompare(b.dir),
    )) {
      // 不同学科下同名的书：用“名（学科）”区分；书名里不能有 /
      let id = r.leaf;
      if ((byLeaf.get(r.leaf) ?? 0) > 1 && r.subject !== '') {
        id = `${r.leaf}（${r.subject.replaceAll('/', '·')}）`;
      }
      for (let n = 2; map.has(id); n++) id = `${r.leaf}（${String(n)}）`;
      map.set(id, {
        id,
        dir: r.dir,
        subject: r.subject,
        kind: r.kind,
        ...(r.meta !== undefined ? { meta: r.meta } : {}),
      });
    }
    this.scanned = { at: now, map };
    return map;
  }

  private async walk(
    dir: string,
    subject: string,
    depth: number,
    out: (Omit<BookInfo, 'id'> & { leaf: string })[],
  ): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (err) {
      if (isNotFound(err)) return;
      throw err;
    }
    for (const e of entries) {
      if (!e.isDirectory() || SKIP_DIR.test(e.name)) continue;
      const child = join(dir, e.name);
      if (await hasIndex(child)) {
        out.push({ leaf: e.name, dir: child, subject, kind: 'book' });
      } else if (depth < MAX_SUBJECT_DEPTH) {
        await this.walk(child, subject === '' ? e.name : `${subject}/${e.name}`, depth + 1, out);
      }
    }
  }

  private async walkNotes(
    dir: string,
    out: (Omit<BookInfo, 'id'> & { leaf: string })[],
  ): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (err) {
      if (isNotFound(err)) return;
      throw err;
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const child = join(dir, e.name);
      if (!(await hasIndex(child))) continue;
      let meta: NoteMeta | undefined;
      try {
        meta = JSON.parse(await readFile(join(child, 'meta.json'), 'utf8')) as NoteMeta;
      } catch (err) {
        if (!isNotFound(err)) throw err;
      }
      out.push({
        leaf: e.name,
        dir: child,
        subject: '个人笔记',
        kind: 'note',
        ...(meta !== undefined ? { meta } : {}),
      });
    }
  }

  async books(): Promise<string[]> {
    return [...(await this.scan()).keys()].sort();
  }

  /** 一本书的位置与来源；找不到（新放进去的？）先重扫一次，还找不到返回空。 */
  async info(book: string): Promise<BookInfo | undefined> {
    const hit = (await this.scan()).get(book);
    if (hit) return hit;
    return (await this.scan(true)).get(book);
  }

  /** 每本书一行概况（hasOriginal 由调用方补）。 */
  async summaries(): Promise<Omit<BookSummary, 'hasOriginal'>[]> {
    const out: Omit<BookSummary, 'hasOriginal'>[] = [];
    for (const [id, info] of await this.scan()) {
      const b = await this.load(id);
      out.push({
        id,
        title: b.title,
        sections: b.entries.filter((e) => e.file !== undefined).length,
        kind: info.kind,
        ...(info.subject !== '' ? { subject: info.subject } : {}),
        ...(info.meta !== undefined
          ? {
              author: info.meta.author,
              source: info.meta.source,
              originalPath: info.meta.originalPath,
            }
          : {}),
      });
    }
    return out.sort((a, b) => a.id.localeCompare(b.id));
  }

  async index(book: string): Promise<string> {
    return readFile(await this.path(book, 'index.md'), 'utf8');
  }

  /** 读一个小节文件，每行前印行号；from / to 从 1 数、含两端。 */
  async read(book: string, file: string, from = 1, to = Number.MAX_SAFE_INTEGER): Promise<string> {
    return (await this.lines(book, file, from, to)).lines
      .map((l) => `${String(l.n)}\t${l.text}`)
      .join('\n');
  }

  /** 同 read，但给结构化的行；from / to 从 1 数、含两端，超出文件末尾的截到末尾。 */
  async lines(
    book: string,
    file: string,
    from = 1,
    to = Number.MAX_SAFE_INTEGER,
  ): Promise<{ total: number; from: number; to: number; lines: NumberedLine[] }> {
    const all = splitLines(await readFile(await this.path(book, file), 'utf8'));
    const lo = Math.max(1, from);
    const hi = Math.min(to, all.length);
    const lines: NumberedLine[] = [];
    for (let i = lo; i <= hi; i++) lines.push({ n: i, text: all[i - 1] ?? '' });
    return { total: all.length, from: lo, to: hi, lines };
  }

  async title(book: string): Promise<string> {
    return (await this.load(book)).title;
  }

  /** 目录（章 / 节 / 习题 …），按书里顺序。 */
  async toc(book: string): Promise<TocEntry[]> {
    return (await this.load(book)).entries;
  }

  /** 目录里对应某个小节文件的条目。 */
  async entryOf(book: string, file: string): Promise<TocEntry | undefined> {
    const f = normalize(file);
    return (await this.load(book)).entries.find(
      (e) => e.file !== undefined && normalize(e.file) === f,
    );
  }

  /** 目录顺序里前一个 / 后一个有正文文件的小节。 */
  async neighbors(book: string, file: string): Promise<{ prev?: TocEntry; next?: TocEntry }> {
    const withFile = (await this.load(book)).entries.filter((e) => e.file !== undefined);
    const f = normalize(file);
    const i = withFile.findIndex((e) => e.file !== undefined && normalize(e.file) === f);
    if (i < 0) return {};
    const prev = withFile[i - 1];
    const next = withFile[i + 1];
    return { ...(prev ? { prev } : {}), ...(next ? { next } : {}) };
  }

  /** 全文检索：所有词（空白隔开）都出现在同一段里才算命中；命中按整句匹配 / 标题含词 / 词频排序。 */
  async search(query: string, opt: SearchOptions = {}): Promise<SearchResult> {
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t !== '');
    if (terms.length === 0) return { hits: [], total: 0 };
    const limit = Math.min(Math.max(opt.limit ?? 20, 1), 100);
    const perSection = Math.max(opt.perSection ?? 3, 1);
    const phrase = terms.join(' ');
    const books = opt.book !== undefined ? [opt.book] : (opt.books ?? (await this.books()));
    const scored: { hit: SearchHit; score: number; order: number }[] = [];
    let order = 0;
    for (const book of books) {
      const b = await this.load(book);
      for (const f of await this.files(book)) {
        const titleLower = f.entry.title.toLowerCase();
        for (const para of paragraphs(f.lower)) {
          const text = f.lower.slice(para.from, para.to + 1).join('\n');
          if (!terms.every((t) => text.includes(t))) continue;
          const first = terms[0] ?? '';
          // 报哪一行：有整句就取含整句的那行，否则取含词最多的那行（并列取靠前的）
          let at = para.from;
          let best = -1;
          for (let i = para.from; i <= para.to; i++) {
            const l = f.lower[i] ?? '';
            const n = (l.includes(phrase) ? 100 : 0) + terms.filter((t) => l.includes(t)).length;
            if (n > best) {
              best = n;
              at = i;
            }
          }
          const score =
            (text.includes(phrase) ? 3 : 0) +
            (terms.some((t) => titleLower.includes(t)) ? 2 : 0) +
            Math.min(
              terms.reduce((s, t) => s + text.split(t).length - 1, 0),
              5,
            ) *
              0.2;
          scored.push({
            score,
            order: order++,
            hit: {
              book,
              bookTitle: b.title,
              file: f.entry.file ?? '',
              num: f.entry.num,
              title: f.entry.title,
              line: at + 1,
              snippet: snippet(
                f.lines[at] ?? '',
                f.lower[at] ?? '',
                terms.find((t) => (f.lower[at] ?? '').includes(t)) ?? first,
              ),
              ...(f.entry.pdfPages !== undefined ? { pdfPage: f.entry.pdfPages.from } : {}),
            },
          });
        }
      }
    }
    scored.sort((a, c) => c.score - a.score || a.order - c.order);
    const perFile = new Map<string, number>();
    const hits: SearchHit[] = [];
    for (const s of scored) {
      const key = `${s.hit.book}\0${s.hit.file}`;
      const used = perFile.get(key) ?? 0;
      if (used >= perSection) continue;
      perFile.set(key, used + 1);
      hits.push(s.hit);
      if (hits.length >= limit) break;
    }
    return { hits, total: scored.length };
  }

  /** 书的全部有正文的小节（读进内存，检索用）。 */
  private async files(book: string): Promise<IndexedFile[]> {
    const b = await this.load(book);
    if (b.files !== undefined) return b.files;
    const files: IndexedFile[] = [];
    for (const entry of b.entries) {
      if (entry.file === undefined) continue;
      let text: string;
      try {
        text = await readFile(await this.path(book, entry.file), 'utf8');
      } catch (err) {
        // 目录里列了、磁盘上没有的文件（处理报告里已标出）：检索跳过它，不当错误
        if (isNotFound(err)) continue;
        throw err;
      }
      const lines = splitLines(text);
      files.push({ entry, lines, lower: lines.map((l) => l.toLowerCase()) });
    }
    b.files = files;
    return files;
  }

  private async load(book: string): Promise<BookCache> {
    const hit = this.cache.get(book);
    if (hit) return hit;
    const parsed = parseIndex(await this.index(book));
    this.cache.set(book, parsed);
    return parsed;
  }

  private async path(book: string, file: string): Promise<string> {
    const rel = normalize(file);
    if (
      rel.startsWith('..') ||
      rel.startsWith('/') ||
      book === '' ||
      book.includes('/') ||
      book.includes('..')
    ) {
      throw new Error(`路径越界：${book} / ${file}`);
    }
    return join(await this.bookDir(book), BOOK_DIR, rel);
  }

  /** 书目录（<书>/）的绝对路径；原件页面从这里找。认不出的书按书库根下的直接子目录算（读不到就是“没有这本书”）。 */
  async bookDir(book: string): Promise<string> {
    if (book === '' || book.includes('/') || book.includes('..')) {
      throw new Error(`路径越界：${book}`);
    }
    return (await this.info(book))?.dir ?? join(this.root, book);
  }

  /** 小节文件所在的章目录名（如 ch03）。 */
  static chapterOf(file: string): string {
    const d = dirname(file);
    return d === '.' ? '' : d;
  }
}

async function hasIndex(dir: string): Promise<boolean> {
  try {
    await readFile(join(dir, BOOK_DIR, 'index.md'));
    return true;
  } catch (err) {
    if (isNotFound(err) || (err as NodeJS.ErrnoException).code === 'ENOTDIR') return false;
    throw err;
  }
}

function splitLines(text: string): string[] {
  const lines = text.split('\n');
  // 文件以换行结尾时 split 多出一个空串：它不是一行
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/** 以空行分段，返回每段在行数组里的起止下标（含两端）。 */
function paragraphs(lines: string[]): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  let start = -1;
  for (let i = 0; i <= lines.length; i++) {
    const blank = i === lines.length || (lines[i] ?? '').trim() === '';
    if (!blank && start < 0) start = i;
    if (blank && start >= 0) {
      out.push({ from: start, to: i - 1 });
      start = -1;
    }
  }
  return out;
}

function snippet(line: string, lower: string, term: string): string {
  const i = Math.max(lower.indexOf(term), 0);
  const from = Math.max(0, i - 60);
  const body = line.slice(from, i + term.length + 100).trim();
  return `${from > 0 ? '…' : ''}${body}${i + term.length + 100 < line.length ? '…' : ''}`;
}

// ───────────── 目录解析 ─────────────

const NUMS = /^\d+(?:–|-)\d+$/;

/** 索引文件的标题格式（`书库处理/` 的产出格式）：`# M07 索引：书名`。 */
const INDEX_TITLE = /^#\s*M07 索引[:：]\s*(.+?)\s*$/m;

/** 写索引文件时用的标题行（个人笔记的切分结果也照这个格式）。 */
export function indexTitle(name: string): string {
  return `# M07 索引：${name}`;
}

function parseIndex(text: string): BookCache {
  const title = (INDEX_TITLE.exec(text)?.[1] ?? '').replace(/\s*\.pdf$/i, '');
  let header: string[] | undefined;
  const entries: TocEntry[] = [];
  for (const raw of text.split('\n')) {
    if (!raw.startsWith('|')) continue;
    // 标题里可能有“ | ”（如 | K | = ∞）：多出来的格并回标题格
    const cells = raw
      .trim()
      .replace(/^\|\s?/, '')
      .replace(/\s?\|$/, '')
      .split(' | ');
    if (header === undefined) {
      header = cells.map((c) => c.trim());
      continue;
    }
    if (/^[\s|:-]+$/.test(raw)) continue;
    const col = (name: string): number => header?.indexOf(name) ?? -1;
    const extra = cells.length - header.length;
    const fixed =
      extra > 0
        ? [...cells.slice(0, 2), cells.slice(2, 3 + extra).join(' | '), ...cells.slice(3 + extra)]
        : cells;
    const cell = (name: string): string => (fixed[col(name)] ?? '').trim();
    const num = cell('编号');
    if (num === '') continue;
    const fileCell = cell('文件').replace(/^`|`$/g, '').trim();
    const file = fileCell === '' || fileCell === '—' ? undefined : fileCell;
    const pdf = parseSpan(cell('PDF 页'));
    const level = Number(cell('层级'));
    const note = cell('说明');
    const examples = cell('节内例题');
    entries.push({
      num,
      kind: cell('类型'),
      title: cell('标题').replace(/^\s+/, ''),
      ...(cell('页') !== '' ? { pages: cell('页') } : {}),
      ...(file !== undefined ? { file } : {}),
      chapter: file !== undefined ? Library.chapterOf(file) : `ch${num.split('.')[0] ?? num}`,
      ...(Number.isInteger(level) && level > 0 ? { level } : {}),
      ...(pdf !== undefined ? { pdfPages: pdf } : {}),
      ...(note !== '' ? { note } : {}),
      ...(examples !== '' ? { examples: examples.split('；').filter((x) => x !== '') } : {}),
    });
  }
  return { title, entries };
}

function parseSpan(s: string): PageSpan | undefined {
  const t = s.trim();
  if (t === '') return undefined;
  if (/^\d+$/.test(t)) return { from: Number(t), to: Number(t) };
  if (NUMS.test(t)) {
    const [a, b] = t.split(/–|-/);
    return { from: Number(a), to: Number(b) };
  }
  return undefined;
}
