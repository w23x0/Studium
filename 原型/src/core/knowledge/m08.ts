// M08：点 + 子句（M08 审查单「点与子句」）。只读：闭环内外的会话都只经查询工具读它。
// 生成（先生成后回扫）在资料线做（书库处理/studium/m08.py），不在这里；这里读 points.jsonl / clauses.jsonl。
// 样例只有 id / name / sentence / anchors / source 等基本字段；资料线产出多出的字段都是可选的。
import { readdir } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { isNotFound } from '../log/session-log.ts';
import { latestById, readJsonl } from './jsonl.ts';

/** 原文锚点：书 + M07 文件 + 原文引文（TextQuoteSelector 的 exact）；资料线另给原件位置。 */
export interface Anchor {
  book: string;
  file: string;
  quote: string;
  /** 原件 PDF 页（1 起）。 */
  page?: number;
  /** 原件上的位置框（MinerU content_list 坐标，0–1000 归一）。 */
  bbox?: number[];
  /** 引文在 M07 文件里的行号：按引文重算的提示，转录修订后会变；以 page / bbox / quote 为准。 */
  line?: number;
}

/** 书给的 = 原文有支撑；模型补的 = 找不到支撑（候选）；未审 = 不在处理过的范围里，没对原文审过。 */
export type Source = '书给的' | '模型补的' | '未审';

export interface Point {
  id: string;
  /** 点的名字。 */
  name: string;
  /** 一句话：这个点是什么（按定义拆）。 */
  sentence: string;
  anchors: Anchor[];
  source: Source;
  threshold?: boolean;
  /** 程序粗筛用的检索词（中英文名、记号、公式）。 */
  keys?: string[];
  /** 范围内 = 本次处理范围里的点；前置 = 范围外、作出发点用的点。 */
  scope?: '范围内' | '前置';
  /** 书按另一种定义引入同一对象时拆出的点：指向清单里原来那个点。 */
  split_of?: string;
  /** 书里明写的“别混淆”，作锚点留在点上（不存成结构）。 */
  cautions?: { text: string; anchors: Anchor[] }[];
  /** 多套 M08 合并时：来自哪一套（目录标签）；id 因重复加了前缀时 originalId 是原来的 id。读入时由核心补，文件里不存。 */
  origin?: string;
  originalId?: string;
}

export interface Clause {
  id: string;
  /** 出发点。 */
  from: string[];
  /** 新点。 */
  to: string;
  /** 一两句：从哪出发、学出什么理解、用到出发点的哪一面。 */
  text: string;
  /** 书给的：支撑原文；模型补的：书里露出的零件（可空）。 */
  anchors: Anchor[];
  source: Source;
  /** 审核时写下的差别 / 缺了什么。 */
  notes?: string[];
  origin?: string;
  originalId?: string;
}

/** 合并进来的一套 M08（一个产出目录）。 */
export interface M08Origin {
  label: string;
  dir: string;
  points: number;
  clauses: number;
  /** 这一套的 id 与别的套重复，全部加了“标签.”前缀。 */
  prefixed: boolean;
}

export interface BookChapterCount {
  book: string;
  chapters: { chapter: string; points: number; clauses: number }[];
  points: number;
  clauses: number;
}

/** 点没有锚点（模型补的，找不到原文支撑）时归到这一章。 */
export const NO_ANCHOR_CHAPTER = '（无锚点）';

/** 一个目录里直接放着 points.jsonl / clauses.jsonl 就是一套；否则往下找（产出常按 <书>/<章>/ 摆）。 */
const SKIP_DIR = /^(work|runs|obsidian|\.)/;
const MAX_DISCOVER_DEPTH = 4;

function describeAnchor(a: Anchor): string {
  const where = [
    a.page !== undefined ? `PDF 第 ${String(a.page)} 页` : '',
    a.line !== undefined ? `文件第 ${String(a.line)} 行附近` : '',
  ].filter((s) => s !== '');
  return `  原文：${a.book} / ${a.file}${where.length > 0 ? `（${where.join('，')}）` : ''}：“${a.quote}”`;
}

export class M08 {
  private constructor(
    readonly points: Map<string, Point>,
    readonly clauses: Map<string, Clause>,
    readonly origins: M08Origin[] = [],
  ) {}

  static async load(dir: string): Promise<M08> {
    return M08.loadAll([dir]);
  }

  /**
   * 读多套 M08 合并：每个给定目录若自己放着 points.jsonl / clauses.jsonl 就是一套，否则往下找这样的子目录
   * （如 <书>/<章>/）。点 / 子句 id 在不同套之间重复时，涉及的各套整套加“标签.”前缀（标签 = 目录名去掉各套共有的开头），
   * 子句的 from / to / 点的 split_of 一并改写；每个点 / 子句记 origin（来自哪套），改过 id 的另记 originalId。
   */
  static async loadAll(dirs: string[]): Promise<M08> {
    const found: string[] = [];
    for (const d of dirs) {
      const abs = resolve(d);
      const sub = await discover(abs, 0);
      for (const x of sub.length > 0 ? sub : [abs]) if (!found.includes(x)) found.push(x);
    }
    const labels = shortLabels(found);
    const loaded: { label: string; dir: string; points: Point[]; clauses: Clause[] }[] = [];
    for (const [i, dir] of found.entries()) {
      loaded.push({
        label: labels[i] ?? basename(dir),
        dir,
        points: [...latestById(await readJsonl<Point>(join(dir, 'points.jsonl'))).values()],
        clauses: [...latestById(await readJsonl<Clause>(join(dir, 'clauses.jsonl'))).values()],
      });
    }
    // 哪些 id 在不止一套里出现
    const seen = new Map<string, Set<number>>();
    loaded.forEach((l, i) => {
      for (const id of [...l.points, ...l.clauses].map((x) => x.id)) {
        const set = seen.get(id) ?? new Set<number>();
        set.add(i);
        seen.set(id, set);
      }
    });
    const clash = new Set<number>();
    for (const set of seen.values()) if (set.size > 1) for (const i of set) clash.add(i);

    const points = new Map<string, Point>();
    const clauses = new Map<string, Clause>();
    const origins: M08Origin[] = [];
    loaded.forEach((l, i) => {
      const prefixed = clash.has(i);
      const own = new Set(l.points.map((p) => p.id));
      const re = (id: string): string => (prefixed && own.has(id) ? `${l.label}.${id}` : id);
      for (const p of l.points) {
        const id = re(p.id);
        points.set(id, {
          ...p,
          id,
          origin: l.label,
          ...(prefixed ? { originalId: p.id } : {}),
          ...(p.split_of !== undefined ? { split_of: re(p.split_of) } : {}),
        });
      }
      for (const c of l.clauses) {
        const id = prefixed ? `${l.label}.${c.id}` : c.id;
        clauses.set(id, {
          ...c,
          id,
          from: c.from.map(re),
          to: re(c.to),
          origin: l.label,
          ...(prefixed ? { originalId: c.id } : {}),
        });
      }
      origins.push({
        label: l.label,
        dir: l.dir,
        points: l.points.length,
        clauses: l.clauses.length,
        prefixed,
      });
    });
    return new M08(points, clauses, origins);
  }

  get empty(): boolean {
    return this.points.size === 0;
  }

  search(keyword: string, books?: ReadonlySet<string>): Point[] {
    const k = keyword.trim().toLowerCase();
    return [...this.points.values()].filter(
      (p) =>
        (books === undefined || this.pointInBooks(p, books)) &&
        (p.name.toLowerCase().includes(k) ||
          p.sentence.toLowerCase().includes(k) ||
          p.id.toLowerCase() === k ||
          (p.keys ?? []).some((x) => x.toLowerCase().includes(k))),
    );
  }

  /** 点所在的书：第一个有书名的锚点；没有锚点为空。 */
  bookOf(p: Point): string | undefined {
    return p.anchors.find((a) => a.book.trim() !== '')?.book;
  }

  /** 点所在的章（第一个锚点的小节文件所在目录，如 ch03）；没有锚点为 NO_ANCHOR_CHAPTER。 */
  chapterOf(p: Point): string {
    const a = p.anchors.find((x) => x.book.trim() !== '' && x.file.trim() !== '');
    if (a === undefined) return NO_ANCHOR_CHAPTER;
    const d = a.file.includes('/') ? a.file.slice(0, a.file.lastIndexOf('/')) : '';
    return d === '' ? '（根）' : d;
  }

  /** 点是否在选定的几本书里：没有锚点的点（模型补的）一律算在（不知道属于哪本，不替它排除）。 */
  pointInBooks(p: Point, books: ReadonlySet<string>): boolean {
    const b = this.bookOf(p);
    if (b === undefined) return true;
    return [...books].some((x) => x.trim() === b.trim());
  }

  /** 子句算在哪：看它的新点。 */
  clauseInBooks(c: Clause, books: ReadonlySet<string>): boolean {
    const p = this.points.get(c.to);
    return p === undefined ? true : this.pointInBooks(p, books);
  }

  /** 按书、按章数点与子句（子句算在新点那一章）。 */
  counts(books?: ReadonlySet<string>): BookChapterCount[] {
    const out = new Map<string, Map<string, { points: number; clauses: number }>>();
    const slot = (book: string, chapter: string): { points: number; clauses: number } => {
      const b = out.get(book) ?? new Map<string, { points: number; clauses: number }>();
      out.set(book, b);
      const c = b.get(chapter) ?? { points: 0, clauses: 0 };
      b.set(chapter, c);
      return c;
    };
    for (const p of this.points.values()) {
      if (books !== undefined && !this.pointInBooks(p, books)) continue;
      slot(this.bookOf(p)?.trim() ?? NO_ANCHOR_CHAPTER, this.chapterOf(p)).points++;
    }
    for (const c of this.clauses.values()) {
      const to = this.points.get(c.to);
      if (books !== undefined && !this.clauseInBooks(c, books)) continue;
      slot(
        to !== undefined ? (this.bookOf(to)?.trim() ?? NO_ANCHOR_CHAPTER) : NO_ANCHOR_CHAPTER,
        to !== undefined ? this.chapterOf(to) : NO_ANCHOR_CHAPTER,
      ).clauses++;
    }
    return [...out.entries()]
      .map(([book, chapters]) => ({
        book,
        chapters: [...chapters.entries()]
          .map(([chapter, n]) => ({ chapter, ...n }))
          .sort((a, b) => a.chapter.localeCompare(b.chapter, 'zh-CN', { numeric: true })),
        points: [...chapters.values()].reduce((n, x) => n + x.points, 0),
        clauses: [...chapters.values()].reduce((n, x) => n + x.clauses, 0),
      }))
      .sort((a, b) => a.book.localeCompare(b.book, 'zh-CN', { numeric: true }));
  }

  /** 某书某章的点与子句（chapter 不给 = 整本）。章名认 ch03 / 03 / 3。 */
  inChapter(book: string, chapter?: string): { points: Point[]; clauses: Clause[] } {
    const want = chapter === undefined || chapter.trim() === '' ? undefined : chapterKey(chapter);
    const points = [...this.points.values()].filter(
      (p) =>
        this.bookOf(p)?.trim() === book.trim() &&
        (want === undefined || chapterKey(this.chapterOf(p)) === want),
    );
    const ids = new Set(points.map((p) => p.id));
    const clauses = [...this.clauses.values()].filter((c) => ids.has(c.to));
    return { points, clauses };
  }

  clausesInto(pointId: string): Clause[] {
    return [...this.clauses.values()].filter((c) => c.to === pointId);
  }

  clausesFrom(pointId: string): Clause[] {
    return [...this.clauses.values()].filter((c) => c.from.includes(pointId));
  }

  name(pointId: string): string {
    return this.points.get(pointId)?.name ?? pointId;
  }

  describePoint(p: Point): string {
    const lines = [
      `${p.id}「${p.name}」${p.threshold === true ? '（阈值概念）' : ''}（${p.source}${p.scope === '前置' ? '，前置' : ''}）`,
      `  ${p.sentence}`,
      ...(p.split_of !== undefined
        ? [`  同一对象的另一种定义：${p.split_of}「${this.name(p.split_of)}」`]
        : []),
      ...p.anchors.map(describeAnchor),
      ...(p.cautions ?? []).flatMap((c) => [
        `  书里提醒：${c.text}`,
        ...c.anchors.map(describeAnchor),
      ]),
    ];
    return lines.join('\n');
  }

  describeClause(c: Clause): string {
    const from = c.from.map((f) => `${f}「${this.name(f)}」`).join(' + ');
    const lines = [
      `${c.id}：${from} → ${c.to}「${this.name(c.to)}」（${c.source}）`,
      `  ${c.text}`,
      ...(c.anchors.length > 0 && c.source !== '书给的' ? ['  书里只露出零件：'] : []),
      ...c.anchors.map(describeAnchor),
      ...(c.notes ?? []).map((n) => `  审核注：${n}`),
    ];
    return lines.join('\n');
  }

  /** 全部点与子句的提纲（给 M05 开场用；量大了换成按需查）。 */
  outline(): string {
    const tag = (s: Source): string => (s === '书给的' ? '' : `（${s}）`);
    const pts = [...this.points.values()].map(
      (p) => `- ${p.id}「${p.name}」${tag(p.source)}：${p.sentence}`,
    );
    const cls = [...this.clauses.values()].map(
      (c) =>
        `- ${c.id}：${c.from.map((f) => this.name(f)).join(' + ')} → ${this.name(c.to)}${tag(c.source)}`,
    );
    return `点（${String(pts.length)}；未标的是书给的）：\n${pts.join('\n')}\n\n子句（${String(cls.length)}；未标的是书给的）：\n${cls.join('\n')}`;
  }
}

/** 章名比较用：ch03、03、3 视为同一章；其他按原样。 */
function chapterKey(ch: string): string {
  const t = ch.trim().toLowerCase();
  const m = /^(?:ch(?:apter)?\s*)?0*(\d+)$/.exec(t);
  return m?.[1] !== undefined ? `ch${m[1]}` : t;
}

async function discover(dir: string, depth: number): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (isNotFound(err)) return [];
    throw err;
  }
  if (
    entries.some((e) => e.isFile() && (e.name === 'points.jsonl' || e.name === 'clauses.jsonl'))
  ) {
    return [dir];
  }
  if (depth >= MAX_DISCOVER_DEPTH) return [];
  const out: string[] = [];
  for (const e of entries.sort((a, b) =>
    a.name.localeCompare(b.name, 'zh-CN', { numeric: true }),
  )) {
    if (e.isDirectory() && !SKIP_DIR.test(e.name))
      out.push(...(await discover(join(dir, e.name), depth + 1)));
  }
  return out;
}

/** 各套的短标签：目录名去掉各套共有的开头（在 - _ . 边界上切），去不出区别就用整个目录名。 */
function shortLabels(dirs: string[]): string[] {
  const names = dirs.map((d) => basename(d));
  if (names.length < 2) return names;
  const first = names[0] ?? '';
  let n = 0;
  while (n < first.length && names.every((x) => x[n] === first[n])) n++;
  const cut = Math.max(
    first.lastIndexOf('-', n - 1),
    first.lastIndexOf('_', n - 1),
    first.lastIndexOf('.', n - 1),
  );
  const short = cut >= 0 ? names.map((x) => x.slice(cut + 1)) : names;
  return short.every((x) => x !== '') && new Set(short).size === short.length ? short : names;
}
