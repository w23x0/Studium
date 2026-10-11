// 跨资料与跨领域（批 10b）：同一知识点在不同书里的讲法连起来（重复线索）、检索标签、资料的来源说明、
// 跨领域闭环的单子核对与开场。对应 M07:18-19 · M05:18。
// 都由程序按 M08 点的锚点 / 检索词 / 目录算，不调模型；模型只在工具里读结果，或补一句来源说明（只追加）。
// 设计没写清的地方的补法见 工作单.md「补位清单」。
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, normalize } from 'node:path';
import { z } from 'zod';
import { formatCitation } from '../shared/citation.ts';
import {
  CONTENT_TYPES,
  SOURCE_NOTE_FIELDS,
  type ClueView,
  type CluesResponse,
  type ContentType,
  type HitTags,
  type NoteItem,
  type SectionLink,
  type SectionLinksResponse,
  type SourceNoteAddition,
  type SourceNoteField,
  type SourceNoteView,
  type TaggedHit,
  type TaggedSearchResponse,
} from '../shared/protocol.ts';
import type { CrossDomain, CrossKind } from '../shared/records-cross.ts';
import type { Ticket } from '../shared/records.ts';
import { NotFoundError } from './hub.ts';
import type { Library } from './knowledge/m07.ts';
import type { Originals } from './knowledge/m07-originals.ts';
import type { SourceReports } from './knowledge/m07-reports.ts';
import type { Anchor, M08, Point } from './knowledge/m08.ts';
import type { SourceNotes } from './knowledge/source-notes.ts';
import { isNotFound } from './log/session-log.ts';
import type { ToolResult, ToolSpec } from './model/port.ts';
import { BadRequestError } from './studium.ts';

/** 重复线索里一个检索词最多牵出多少个点：再多说明这个词太泛，不拿它连。 */
const MAX_GROUP = 40;
/** 检索词 / 点名至少几个字才拿来连。 */
const MIN_TOKEN = 2;
/** 带标签的检索一次最多先取多少段命中再筛（核心全文检索的上限）。 */
const TAGGED_FETCH = 100;
/** 补一句来源说明最多多少字。 */
const NOTE_MAX = 300;
/** 跨领域候选一次最多列几个。 */
const CANDIDATE_LIMIT = 12;

interface Sec {
  /** 书库里的书目录名。 */
  book: string;
  file: string;
}

interface Index {
  /** 点 → 它的锚点（已对到书库里的书；对不上书库的锚点不算）。 */
  sections: Map<string, Sec[]>;
  /** 小节 → 锚点落在这一节的点。 */
  byFile: Map<string, string[]>;
  /** 点 → 名字 / 检索词相同、而且讲法在别的书里的点。 */
  neighbors: Map<string, Map<string, 'same_name' | 'same_key'>>;
}

export interface CrosslinksDeps {
  library: Library;
  m08: M08;
  reports: SourceReports;
  originals: Originals;
  notes: SourceNotes;
  now?: () => Date;
}

export interface CrossToolEnv {
  /** 项目选用的资料（没选 = 全库，返回空）。 */
  scope(all: boolean): Promise<string[] | undefined>;
  /** M09 里已合上的点。 */
  known(): string[];
}

export class Crosslinks {
  private index: Promise<Index> | undefined;
  private readonly now: () => Date;

  constructor(private readonly d: CrosslinksDeps) {
    this.now = d.now ?? (() => new Date());
  }

  // ───────────── 重复线索：别的书也讲这里 ─────────────

  private build(): Promise<Index> {
    this.index ??= this.buildIndex();
    return this.index;
  }

  private async buildIndex(): Promise<Index> {
    const ids = await this.d.library.books();
    const byTrim = new Map(ids.map((b) => [b.trim(), b]));
    const sections = new Map<string, Sec[]>();
    const byFile = new Map<string, string[]>();
    for (const p of this.d.m08.points.values()) {
      const seen = new Set<string>();
      const list: Sec[] = [];
      for (const a of p.anchors) {
        const book = byTrim.get(a.book.trim());
        if (book === undefined || a.file.trim() === '') continue;
        const k = secKey(book, a.file);
        if (seen.has(k)) continue;
        seen.add(k);
        list.push({ book, file: normalize(a.file) });
        byFile.set(k, [...(byFile.get(k) ?? []), p.id]);
      }
      if (list.length > 0) sections.set(p.id, list);
    }
    // 名字 / 检索词相同的点：只连“讲法不都在同一本书里”的
    const groups = new Map<string, { id: string; kind: 'same_name' | 'same_key' }[]>();
    for (const p of this.d.m08.points.values()) {
      if (!sections.has(p.id)) continue;
      const toks = new Map<string, 'same_name' | 'same_key'>();
      const name = token(p.name);
      if (name.length >= MIN_TOKEN) toks.set(name, 'same_name');
      for (const k of p.keys ?? []) {
        const t = token(k);
        if (t.length >= MIN_TOKEN && !toks.has(t)) toks.set(t, 'same_key');
      }
      for (const [t, kind] of toks) groups.set(t, [...(groups.get(t) ?? []), { id: p.id, kind }]);
    }
    const booksOf = (id: string): Set<string> =>
      new Set((sections.get(id) ?? []).map((s) => s.book));
    const neighbors = new Map<string, Map<string, 'same_name' | 'same_key'>>();
    const link = (a: string, b: string, kind: 'same_name' | 'same_key'): void => {
      const m = neighbors.get(a) ?? new Map<string, 'same_name' | 'same_key'>();
      if (m.get(b) !== 'same_name') m.set(b, kind);
      neighbors.set(a, m);
    };
    for (const g of groups.values()) {
      if (g.length < 2 || g.length > MAX_GROUP) continue;
      for (let i = 0; i < g.length; i++) {
        for (let j = i + 1; j < g.length; j++) {
          const x = g[i];
          const y = g[j];
          if (x === undefined || y === undefined || x.id === y.id) continue;
          const bx = booksOf(x.id);
          const by = booksOf(y.id);
          const sameSingle = bx.size === 1 && by.size === 1 && [...bx][0] === [...by][0];
          if (sameSingle) continue;
          const kind = x.kind === 'same_name' && y.kind === 'same_name' ? 'same_name' : 'same_key';
          link(x.id, y.id, kind);
          link(y.id, x.id, kind);
        }
      }
    }
    return { sections, byFile, neighbors };
  }

  /** 一个小节里讲到的点，和别的书里讲同一处的小节。没有就是空的（不编）。 */
  async linksFor(book: string, file: string): Promise<SectionLinksResponse> {
    const id = await this.bookId(book);
    const ix = await this.build();
    const here = ix.byFile.get(secKey(id, file)) ?? [];
    const found = new Map<
      string,
      { sec: Sec; points: Map<string, string>; via: SectionLink['via'] }
    >();
    const add = (sec: Sec, via: SectionLink['via'], ...pts: string[]): void => {
      const k = secKey(sec.book, sec.file);
      const cur = found.get(k) ?? { sec, points: new Map<string, string>(), via };
      for (const p of pts) cur.points.set(p, this.d.m08.name(p));
      if (RANK[via] < RANK[cur.via]) cur.via = via;
      found.set(k, cur);
    };
    for (const pid of here) {
      for (const s of ix.sections.get(pid) ?? []) if (s.book !== id) add(s, 'anchor', pid);
      for (const [q, kind] of ix.neighbors.get(pid) ?? []) {
        for (const s of ix.sections.get(q) ?? []) if (s.book !== id) add(s, kind, pid, q);
      }
    }
    const others: SectionLink[] = [];
    for (const f of found.values()) {
      const entry = await this.d.library.entryOf(f.sec.book, f.sec.file);
      others.push({
        book: f.sec.book,
        bookTitle: await this.d.library.title(f.sec.book),
        file: f.sec.file,
        num: entry?.num ?? '',
        title: entry?.title ?? f.sec.file,
        ...(entry?.pdfPages !== undefined ? { pdfPage: entry.pdfPages.from } : {}),
        points: [...f.points].map(([pid, name]) => ({ id: pid, name })),
        via: f.via,
      });
    }
    others.sort((a, b) => a.book.localeCompare(b.book, 'zh-CN') || a.file.localeCompare(b.file));
    return {
      book: id,
      file,
      points: here.map((p) => ({ id: p, name: this.d.m08.name(p) })),
      others,
    };
  }

  /** 全部重复线索：同一知识点在几本书里各讲在哪里（讲在 2 本以上才算）。 */
  async clues(): Promise<CluesResponse> {
    const ix = await this.build();
    const parent = new Map<string, string>();
    const find = (x: string): string => {
      let r = x;
      while ((parent.get(r) ?? r) !== r) r = parent.get(r) ?? r;
      parent.set(x, r);
      return r;
    };
    const join2 = (a: string, b: string): void => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent.set(ra, rb);
    };
    for (const id of ix.sections.keys()) parent.set(id, id);
    for (const [a, m] of ix.neighbors) for (const b of m.keys()) join2(a, b);
    const comps = new Map<string, string[]>();
    for (const id of ix.sections.keys()) comps.set(find(id), [...(comps.get(find(id)) ?? []), id]);
    const out: ClueView[] = [];
    for (const members of comps.values()) {
      const secs = new Map<string, Sec>();
      for (const m of members)
        for (const s of ix.sections.get(m) ?? []) secs.set(secKey(s.book, s.file), s);
      if (new Set([...secs.values()].map((s) => s.book)).size < 2) continue;
      const names = new Map<string, number>();
      for (const m of members) {
        const n = this.d.m08.name(m);
        names.set(n, (names.get(n) ?? 0) + 1);
      }
      const label =
        [...names.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? '';
      const sections: ClueView['sections'] = [];
      for (const s of secs.values()) {
        const entry = await this.d.library.entryOf(s.book, s.file);
        sections.push({
          book: s.book,
          bookTitle: await this.d.library.title(s.book),
          file: s.file,
          num: entry?.num ?? '',
          title: entry?.title ?? s.file,
        });
      }
      sections.sort(
        (a, b) => a.book.localeCompare(b.book, 'zh-CN') || a.file.localeCompare(b.file),
      );
      out.push({
        id: `clue:${[...members].sort()[0] ?? label}`,
        label,
        points: members.sort().map((m) => ({ id: m, name: this.d.m08.name(m) })),
        sections,
      });
    }
    out.sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
    return { clues: out };
  }

  // ───────────── 检索标签 ─────────────

  /** 一个小节的标签：落在这一节的点名；内容类型有依据才标（习题看目录类型，例题看目录的“节内例题”，定义看这一节有没有书给的点）。 */
  async tagsOf(book: string, file: string): Promise<HitTags> {
    const ix = await this.build();
    const ids = ix.byFile.get(secKey(book, file)) ?? [];
    const types = new Set<ContentType>();
    const entry = await this.d.library.entryOf(book, file);
    if (entry !== undefined && (entry.kind === 'prob' || entry.kind === 'ans')) types.add('习题');
    if ((entry?.examples ?? []).length > 0) types.add('例题');
    if (ids.some((p) => this.d.m08.points.get(p)?.source === '书给的')) types.add('定义');
    return {
      points: ids.map((p) => ({ id: p, name: this.d.m08.name(p) })),
      types: CONTENT_TYPES.filter((t) => types.has(t)),
    };
  }

  /** 全文检索 + 标签：先取命中再按书 / 内容类型 / 点名筛；facets 按筛之前的命中算。 */
  async taggedSearch(
    q: string,
    opt: {
      book?: string;
      books?: string[];
      limit?: number;
      filterBook?: string;
      type?: string;
      point?: string;
    } = {},
  ): Promise<TaggedSearchResponse> {
    const r = await this.d.library.search(q, {
      ...(opt.book !== undefined
        ? { book: opt.book }
        : opt.books !== undefined
          ? { books: opt.books }
          : {}),
      limit: TAGGED_FETCH,
    });
    const cache = new Map<string, HitTags>();
    const all: TaggedHit[] = [];
    for (const h of r.hits) {
      const k = secKey(h.book, h.file);
      let tags = cache.get(k);
      if (tags === undefined) {
        tags = await this.tagsOf(h.book, h.file);
        cache.set(k, tags);
      }
      all.push({ ...h, tags });
    }
    const books = new Map<string, { bookTitle: string; count: number }>();
    const types = new Map<ContentType, number>();
    const points = new Map<string, { name: string; count: number }>();
    for (const h of all) {
      const b = books.get(h.book) ?? { bookTitle: h.bookTitle, count: 0 };
      b.count++;
      books.set(h.book, b);
      for (const t of h.tags.types) types.set(t, (types.get(t) ?? 0) + 1);
      for (const p of h.tags.points) {
        const e = points.get(p.id) ?? { name: p.name, count: 0 };
        e.count++;
        points.set(p.id, e);
      }
    }
    const wantType = opt.type !== undefined && opt.type !== '' ? opt.type : undefined;
    if (wantType !== undefined && !(CONTENT_TYPES as readonly string[]).includes(wantType)) {
      throw new BadRequestError(`type 要是 ${CONTENT_TYPES.join(' / ')} 之一`);
    }
    const wantPoint = opt.point !== undefined && opt.point !== '' ? opt.point : undefined;
    const hits = all
      .filter(
        (h) =>
          (opt.filterBook === undefined || opt.filterBook === '' || h.book === opt.filterBook) &&
          (wantType === undefined || h.tags.types.includes(wantType as ContentType)) &&
          (wantPoint === undefined ||
            h.tags.points.some((p) => p.id === wantPoint || p.name === wantPoint)),
      )
      .slice(0, Math.min(Math.max(opt.limit ?? 50, 1), TAGGED_FETCH));
    return {
      query: q,
      hits,
      total: r.total,
      facets: {
        books: [...books].map(([book, v]) => ({ book, ...v })),
        types: CONTENT_TYPES.filter((t) => types.has(t)).map((type) => ({
          type,
          count: types.get(type) ?? 0,
        })),
        points: [...points].map(([id, v]) => ({ id, ...v })),
      },
    };
  }

  // ───────────── 来源可靠性与适用性说明 ─────────────

  private async bookId(name: string): Promise<string> {
    const books = await this.d.library.books();
    const id = books.includes(name) ? name : books.find((b) => b.trim() === name.trim());
    if (id === undefined) throw new NotFoundError(`书库里没有这本书：${name}`);
    return id;
  }

  async sourceNotes(): Promise<SourceNoteView[]> {
    const out: SourceNoteView[] = [];
    for (const id of await this.d.library.books()) out.push(await this.sourceNote(id));
    return out;
  }

  async sourceNote(book: string): Promise<SourceNoteView> {
    const id = await this.bookId(book);
    const info = await this.d.library.info(id);
    const title = await this.d.library.title(id);
    const kind = info?.kind ?? 'book';
    const adds = this.d.notes.forBook(id);
    const latest = (f: SourceNoteField): NoteItem | undefined => {
      const a = adds.filter((x) => x.field === f).at(-1);
      return a === undefined ? undefined : { value: a.text, from: a.by, at: a.at };
    };
    const type: NoteItem | undefined =
      latest('type') ?? (kind === 'note' ? { value: '个人笔记', from: '程序' } : undefined);
    const author: NoteItem | undefined =
      latest('author') ??
      (info?.meta?.author !== undefined && info.meta.author !== ''
        ? { value: info.meta.author, from: '资料' }
        : undefined);
    const level = latest('level');
    const scope = latest('scope');
    const remark = latest('remark');
    const reports = this.d.reports.list({ book: id }).length;
    const sus = await this.suspected(id);
    const hasOriginal = await this.d.originals.hasOriginal(id);
    const toc = await this.d.library.toc(id);
    const qParts = [
      reports > 0 ? `学习者报过 ${String(reports)} 处转录错` : '学习者还没报过转录错',
      sus !== undefined
        ? `知识点抽取审核时标出疑似转录错误 ${String(sus.count)} 处（${sus.from}，没核实）`
        : '没有审核数据',
      hasOriginal ? '有 PDF 原件可对照' : '没有 PDF 原件',
    ];
    const text = `${qParts.join('；')}。这些只是已知的数据，不等于没有别的错。`;
    const short = [
      type?.value ?? '类型没说明',
      author !== undefined ? `作者：${author.value}` : undefined,
      level !== undefined ? `层次：${level.value}` : undefined,
      scope !== undefined ? `适用：${scope.value}` : undefined,
      remark !== undefined ? `备注：${remark.value}` : undefined,
      `转写：${reports > 0 ? `报错 ${String(reports)} 处` : '无报错'}${sus !== undefined ? `，疑似转录错误 ${String(sus.count)} 处` : ''}${hasOriginal ? '' : '，无原件'}`,
    ].filter((x): x is string => x !== undefined);
    return {
      book: id,
      title,
      kind,
      ...(type !== undefined ? { type } : {}),
      ...(level !== undefined ? { level } : {}),
      ...(author !== undefined ? { author } : {}),
      ...(scope !== undefined ? { scope } : {}),
      ...(remark !== undefined ? { remark } : {}),
      ...(info?.subject !== undefined && info.subject !== '' ? { subject: info.subject } : {}),
      sections: toc.filter((e) => e.file !== undefined).length,
      hasOriginal,
      ...(info?.meta?.importedAt !== undefined ? { importedAt: info.meta.importedAt } : {}),
      quality: {
        reports,
        ...(sus !== undefined ? { suspected: sus.count, suspectedFrom: sus.from } : {}),
        text,
      },
      additions: adds,
      summary: `《${title}》${short.join('；')}`,
    };
  }

  /** 这本书在 M08 审核报告里被标出的疑似转录错误数：只在报告对得上这一本书（这一套 M08 只涉及它）时才算。 */
  private async suspected(book: string): Promise<{ count: number; from: string } | undefined> {
    let count = 0;
    const from: string[] = [];
    for (const o of this.d.m08.origins) {
      const books = new Set<string>();
      for (const p of this.d.m08.points.values()) {
        if (p.origin !== o.label) continue;
        for (const a of p.anchors) if (a.book.trim() !== '') books.add(a.book.trim());
      }
      if (books.size !== 1 || [...books][0] !== book.trim()) continue;
      let text: string;
      try {
        text = await readFile(join(o.dir, 'report.md'), 'utf8');
      } catch (err) {
        if (isNotFound(err)) continue;
        throw err;
      }
      const m = /疑似转录错误\s*(\d+)/.exec(text);
      if (m?.[1] === undefined) continue;
      count += Number(m[1]);
      from.push(o.label);
    }
    return from.length > 0 ? { count, from: `M08 审核报告 ${from.join('、')}` } : undefined;
  }

  /** 补一句来源说明（只追加）：学习者在资料页补，模型经工具补（须说明依据）。 */
  async addNote(req: {
    book: string;
    field: string;
    text: string;
    by: '学习者' | '模型';
    sessionId?: string;
    basis?: string;
  }): Promise<SourceNoteAddition> {
    const id = await this.bookId(req.book);
    if (!(SOURCE_NOTE_FIELDS as readonly string[]).includes(req.field)) {
      throw new BadRequestError(`field 要是 ${SOURCE_NOTE_FIELDS.join(' / ')} 之一`);
    }
    const text = req.text.trim();
    if (text === '') throw new BadRequestError('text 不能为空');
    if (text.length > NOTE_MAX)
      throw new BadRequestError(`一句话说完，不超过 ${String(NOTE_MAX)} 字`);
    const row: SourceNoteAddition = {
      id: `sn-${randomBytes(4).toString('hex')}`,
      at: this.now().toISOString(),
      book: id,
      field: req.field as SourceNoteField,
      text,
      by: req.by,
      ...(req.sessionId !== undefined ? { sessionId: req.sessionId } : {}),
      ...(req.basis !== undefined && req.basis.trim() !== '' ? { basis: req.basis.trim() } : {}),
    };
    await this.d.notes.add(row);
    return row;
  }

  /** 给模型工具结果末尾附的来源说明（每本书一行）；书库里没有的名字跳过。 */
  async noteLines(books: string[]): Promise<string> {
    const lines: string[] = [];
    for (const b of [...new Set(books)]) {
      try {
        lines.push(`- ${(await this.sourceNote(b)).summary}`);
      } catch (err) {
        if (!(err instanceof NotFoundError)) throw err;
      }
    }
    return lines.length > 0
      ? `\n\n来源说明（只是已知情况，不是打分；转写质量有疑问时以原文页面为准）：\n${lines.join('\n')}`
      : '';
  }

  // ───────────── 跨领域 ─────────────

  /** 点所在的领域：第一个对得上书库的锚点所在的书的学科目录的第一段；笔记、平铺的书、没有锚点的点认不出。 */
  async domainOf(pointId: string): Promise<string | undefined> {
    const p = this.d.m08.points.get(pointId);
    if (p === undefined) return undefined;
    for (const a of p.anchors) {
      if (a.book.trim() === '') continue;
      const id = (await this.d.library.books()).find((b) => b.trim() === a.book.trim());
      if (id === undefined) continue;
      const info = await this.d.library.info(id);
      if (info === undefined || info.kind === 'note') return undefined;
      const top = info.subject.split('/')[0] ?? '';
      return top === '' ? undefined : top;
    }
    return undefined;
  }

  /** 资料范围里有哪些领域（两个以上才有意义）；scope 空 = 全库。 */
  async domainsIn(scope: string[] | undefined): Promise<string[]> {
    const out = new Set<string>();
    for (const id of scope ?? (await this.d.library.books())) {
      const info = await this.d.library.info(id);
      if (info === undefined || info.kind === 'note') continue;
      const top = info.subject.split('/')[0] ?? '';
      if (top !== '') out.add(top);
    }
    return [...out].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }

  /**
   * 核对一个跨领域选项并补上程序算的领域。补习型：新点是学习者没学过的、在另一个领域里的前置，
   * 另一边的点是原问题所在领域里需要它的点；对比链接型：另一边的点学习者已经会了（M09 有合上的记录）。
   * 返回错误话（给模型改）或补全的 CrossDomain。
   */
  async buildCross(
    newPoint: string,
    input: { kind: CrossKind; otherPoint: string; problem: string },
    known: ReadonlySet<string>,
  ): Promise<{ error: string } | { cross: CrossDomain }> {
    const m08 = this.d.m08;
    if (!m08.points.has(input.otherPoint)) {
      return { error: `另一边的点 ${input.otherPoint} 在 M08 里查不到` };
    }
    if (input.otherPoint === newPoint) return { error: '另一边的点不能就是新点' };
    if (input.problem.trim() === '') return { error: '跨领域选项要写原问题（动机）' };
    const domain = await this.domainOf(newPoint);
    const otherDomain = await this.domainOf(input.otherPoint);
    for (const [id, d] of [
      [newPoint, domain],
      [input.otherPoint, otherDomain],
    ] as const) {
      if (d === undefined) {
        return {
          error: `点 ${id}「${m08.name(id)}」认不出领域（没有原文锚点，或它的书不在书库的学科目录里），不能出跨领域选项`,
        };
      }
    }
    if (domain === otherDomain) {
      return {
        error: `两边都在「${domain ?? ''}」领域，不是跨领域；同领域的选项不填 cross_domain`,
      };
    }
    if (input.kind === '补习型' && known.has(newPoint)) {
      return {
        error: `学习者已经学过「${m08.name(newPoint)}」（M09 有合上的记录），补习型不成立；要对照两边结构就出对比链接型，要巩固就出复习`,
      };
    }
    if (input.kind === '对比链接型' && !known.has(input.otherPoint)) {
      return {
        error: `另一边的「${m08.name(input.otherPoint)}」学习者还没有合上的记录（没学过），不能对照；该出补习型，或先学它`,
      };
    }
    return {
      cross: {
        kind: input.kind,
        otherPoint: input.otherPoint,
        problem: input.problem.trim(),
        domain: domain ?? '',
        otherDomain: otherDomain ?? '',
      },
    };
  }

  /** 一个点的原文出处标记（锚点所在行：先用锚点自带的行号，没有就在小节里找引文）。 */
  private async marks(p: Point): Promise<string[]> {
    const out: string[] = [];
    for (const a of p.anchors.slice(0, 2)) {
      const m = await this.anchorMark(a);
      if (m !== undefined) out.push(m);
    }
    return out;
  }

  private async anchorMark(a: Anchor): Promise<string | undefined> {
    const id = (await this.d.library.books()).find((b) => b.trim() === a.book.trim());
    if (id === undefined) return undefined;
    try {
      const all = await this.d.library.lines(id, a.file);
      let line = a.line;
      const needle = a.quote.slice(0, 16);
      if (line === undefined || all.lines[line - 1]?.text.includes(needle) !== true) {
        line = needle === '' ? undefined : all.lines.find((l) => l.text.includes(needle))?.n;
      }
      return line === undefined
        ? undefined
        : formatCitation({ book: id, file: a.file, from: line });
    } catch (err) {
      if (isNotFound(err)) return undefined;
      throw err;
    }
  }

  /** 跨领域闭环开场里加的一段：类型、两边的领域、原问题、两边的点和原文出处、这一类怎么教。 */
  async crossOpening(t: Ticket): Promise<string[]> {
    const c = t.crossDomain;
    if (c === undefined) return [];
    const m08 = this.d.m08;
    const side = async (id: string, label: string): Promise<string[]> => {
      const p = m08.points.get(id);
      if (p === undefined) return [`${label}：${id}（M08 里没有）`];
      const marks = await this.marks(p);
      return [
        `${label}（${id === t.newPoint ? c.domain : c.otherDomain}）：`,
        m08.describePoint(p),
        ...(marks.length > 0 ? [`  原文出处标记（引用时直接用）：${marks.join(' ')}`] : []),
      ];
    };
    return [
      `跨领域（${c.kind}）：新点在「${c.domain}」领域，另一边在「${c.otherDomain}」领域。`,
      `原问题（动机）：${c.problem}`,
      ...(c.kind === '补习型'
        ? [
            '补习型：学习者还没学过新点。这是由原问题驱动的最小闭环，只学到原问题需要的程度；最后一步是回到原问题（另一边的点）上用一下新点，用学习者自己的话讲明白，然后就结束、路线交回 M05，不顺势展开学别的。可以按历史上这个想法怎么出现的顺序讲，别灌输。',
          ]
        : [
            '对比链接型：学习者已经会另一边的点。目的是对照两边的结构加深理解，深度在结构 / 迁移级：让学习者自己说出两边哪里对应、哪里不同、类比到哪一步就不成立；不要重教另一边已会的内容，对应关系要落到具体的东西上。',
          ]),
      ...(await side(t.newPoint, '新点（这一边）')),
      ...(await side(
        c.otherPoint,
        c.kind === '补习型' ? '原问题所在的点（那一边）' : '另一边的点（学习者已会）',
      )),
      '',
    ];
  }

  // ───────────── 给模型的工具 ─────────────

  /** 读：别的书也讲这里（给小节或点）。放在读资料的工具里。 */
  relatedTool(): ToolSpec {
    return {
      name: 'related_sections',
      description:
        '看别的书里讲同一处的小节（按 M08 点的锚点和相同的名字 / 检索词连起来的，程序算的，不保证没有遗漏）。给 book + file（一个小节），或给 point（一个点 id）。',
      input: {
        book: z.string().optional(),
        file: z.string().optional(),
        point: z.string().optional(),
      },
      run: async (a) => {
        const point = a.point as string | undefined;
        let targets: { book: string; file: string }[];
        if (point !== undefined && point !== '') {
          const ix = await this.build();
          targets = ix.sections.get(point) ?? [];
          if (!this.d.m08.points.has(point)) return err(`没有这个点：${point}`);
          if (targets.length === 0) return ok(`点 ${point} 没有对得上书库的原文锚点，连不到小节。`);
        } else if (typeof a.book === 'string' && typeof a.file === 'string') {
          targets = [{ book: a.book, file: a.file }];
        } else {
          return err('给 book + file（一个小节），或给 point（一个点 id）');
        }
        const lines: string[] = [];
        for (const t of targets) {
          let r;
          try {
            r = await this.linksFor(t.book, t.file);
          } catch (e) {
            if (e instanceof NotFoundError) return err(e.message);
            throw e;
          }
          if (r.others.length === 0) continue;
          lines.push(
            `《${await this.d.library.title(r.book)}》${t.file} 的点：${r.points.map((p) => `${p.id}「${p.name}」`).join('、') || '（没有锚点落在这一节）'}`,
          );
          for (const o of r.others) {
            lines.push(
              `  - 《${o.bookTitle}》${o.num} ${o.title}｜${o.file}（${VIA_TEXT[o.via]}：${o.points.map((p) => `${p.id}「${p.name}」`).join('、')}）出处标记：${formatCitation({ book: o.book, file: o.file, from: 1 })}`,
            );
          }
        }
        return ok(
          lines.length > 0
            ? lines.join('\n')
            : '没有查到别的书讲同一处（M08 里没有连得上的点；不等于别的书没讲）。',
        );
      },
    };
  }

  /** M05：另一个领域里可以连起来的点，附学习者学没学过和该出哪一种。 */
  crossCandidatesTool(env: CrossToolEnv): ToolSpec {
    return {
      name: 'cross_candidates',
      description:
        '找另一个领域里可以连起来的点（跨领域选项用）：按相同的名字 / 检索词，和你给的关键词在 M08 里搜。给出每个点的领域、学习者合上过没有（M09）、该出哪种：没学过出“补习型”，已经会了出“对比链接型”。',
      input: {
        point: z.string().describe('出发的点 id（原问题所在的点，或你想对照的点）'),
        keyword: z.string().optional().describe('另一个领域里可能叫什么，如“特征值”'),
        all: z.boolean().optional().describe('true = 不限项目选用的资料'),
      },
      run: async (a) => {
        const start = this.d.m08.points.get(a.point as string);
        if (start === undefined) return err(`没有这个点：${a.point as string}`);
        const d0 = await this.domainOf(start.id);
        if (d0 === undefined)
          return err(`点 ${start.id} 认不出领域（没有原文锚点或书不在学科目录里）`);
        const scope = await env.scope(a.all === true);
        const set = scope ? new Set(scope) : undefined;
        const ix = await this.build();
        const cands = new Map<string, string>();
        for (const [q, kind] of ix.neighbors.get(start.id) ?? []) cands.set(q, VIA_TEXT[kind]);
        const words = [a.keyword as string | undefined, start.name].filter(
          (w): w is string => w !== undefined && w.trim() !== '',
        );
        for (const w of words) {
          for (const p of this.d.m08.search(w, set)) {
            if (!cands.has(p.id)) cands.set(p.id, `搜“${w}”`);
          }
        }
        const known = new Set(env.known());
        const rows: string[] = [];
        for (const [id, why] of cands) {
          if (set !== undefined) {
            const p = this.d.m08.points.get(id);
            if (p === undefined || !this.d.m08.pointInBooks(p, set)) continue;
          }
          const d = await this.domainOf(id);
          if (d === undefined || d === d0) continue;
          rows.push(
            `- ${id}「${this.d.m08.name(id)}」领域：${d}；学习者${known.has(id) ? '合上过（可作对比链接型的另一边）' : '没合上过（作新点可出补习型）'}；来历：${why}`,
          );
          if (rows.length >= CANDIDATE_LIMIT) break;
        }
        return ok(
          rows.length > 0
            ? `出发点 ${start.id}「${start.name}」在「${d0}」领域。另一个领域里的候选：\n${rows.join('\n')}`
            : `出发点在「${d0}」领域；没有找到另一个领域里连得上的点（换个关键词，或不出跨领域选项）。`,
        );
      },
    };
  }

  /** 补一句资料的来源说明（只追加）。 */
  addNoteTool(sessionId: string): ToolSpec {
    return {
      name: 'add_source_note',
      description:
        '给一本书 / 笔记补一句来源说明：type 类型（教材 / 讲义 / 个人笔记 / 网页）· level 层次 · author 作者 · scope 适用范围 · remark 已知限制。只在你读到依据时写（basis 写你读了什么），拿不准不写；只追加，学习者看得到，也能自己改。',
      input: {
        book: z.string(),
        field: z.enum(SOURCE_NOTE_FIELDS),
        text: z.string().describe('一句话'),
        basis: z.string().min(1).describe('依据：读了哪个目录 / 哪段原文'),
      },
      run: async (a) => {
        try {
          await this.addNote({
            book: a.book as string,
            field: a.field as string,
            text: a.text as string,
            by: '模型',
            sessionId,
            basis: a.basis as string,
          });
        } catch (e) {
          if (e instanceof NotFoundError || e instanceof BadRequestError) return err(e.message);
          throw e;
        }
        return ok('已记下（只追加；学习者在资料页能看到来历）');
      },
    };
  }
}

const RANK = { anchor: 0, same_name: 1, same_key: 2 } as const;
const VIA_TEXT = {
  anchor: '同一个点在两本书里都有锚点',
  same_name: '名字相同的点',
  same_key: '检索词相同的点',
} as const;

function secKey(book: string, file: string): string {
  return `${book}\0${normalize(file)}`;
}

/** 点名 / 检索词比较用：小写、去空白和常见标点。 */
function token(s: string): string {
  return s.toLowerCase().replace(/[\s\-_·.,，。、:：;；()（）[\]{}"'“”‘’]/g, '');
}

function ok(text: string): Promise<ToolResult> {
  return Promise.resolve({ text });
}

function err(text: string): Promise<ToolResult> {
  return Promise.resolve({ text, isError: true });
}
