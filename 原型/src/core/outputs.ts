// 高阶学习与知识产出（批 8）：学习者自己的产出物（笔记整理、推导、小论文、方法比较……）挂在项目下，
// 只追加存版本，可列、可取任一版、可比较两版；正文里用出处标记引资料原文（【教材|…】），
// 核心能解析、核对、回查；相关文献只追加；方法比较是一种结构化产出；“写产出”任务对话让模型协助写。
// 引用核对只认教材出处；旧的知识点 / 子句引用标记不再解析。
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { formatCitation, parseCitations } from '../shared/citation.ts';
import {
  OUTPUT_KINDS,
  RELATION_KINDS,
  type AddLiteratureRequest,
  type CompareView,
  type ComparedMethod,
  type CreateOutputRequest,
  type LiteratureEntry,
  type LiteratureView,
  type MethodComparison,
  type OutputAuthor,
  type OutputKind,
  type OutputSummary,
  type OutputVersion,
  type OutputView,
  type ReferencesView,
  type SaveVersionRequest,
  type VersionSummary,
  type VersionView,
} from '../shared/output.ts';
import { diffLines } from './diff.ts';
import { NotFoundError, type Hub } from './hub.ts';
import type { Library } from './knowledge/library.ts';
import type { OutputStore } from './knowledge/output.ts';
import type { ToolResult, ToolSpec } from './model/port.ts';
import type { Sources } from './sources.ts';
import { BadRequestError } from './studium.ts';

export interface OutputsDeps {
  store: OutputStore;
  sources: Sources;
  library: Library;
  now?: () => Date;
}

export class Outputs {
  private hubRef: Hub | undefined;
  private readonly now: () => Date;

  constructor(private readonly d: OutputsDeps) {
    this.now = d.now ?? (() => new Date());
  }

  attach(hub: Hub): void {
    this.hubRef = hub;
  }

  private get hub(): Hub {
    if (!this.hubRef) throw new Error('Outputs 还没接上 Hub');
    return this.hubRef;
  }

  private iso(): string {
    return this.now().toISOString();
  }

  private readonly idListeners = new Set<(prefix: string, id: string) => void>();

  /** 生成的编号（产出物、版本、文献、候选）；录带按生成顺序给它们稳定记号（Studium 转发）。 */
  private id(prefix: string): string {
    const id = `${prefix}-${randomBytes(4).toString('hex')}`;
    for (const fn of this.idListeners) fn(prefix, id);
    return id;
  }

  onNewId(fn: (prefix: string, id: string) => void): () => void {
    this.idListeners.add(fn);
    return () => this.idListeners.delete(fn);
  }

  // ───────────── 产出物 ─────────────

  private async requireProject(project: string): Promise<void> {
    const opened = await this.hub.opened(project);
    if (opened.kind !== 'main') throw new BadRequestError('这不是一个项目。');
  }

  private require(id: string) {
    const o = this.d.store.output(id);
    if (o === undefined) throw new NotFoundError(`没有这个产出物：${id}`);
    return o;
  }

  private summary(id: string): OutputSummary {
    const o = this.require(id);
    const vs = this.d.store.versionsOf(id);
    const last = vs.at(-1);
    return {
      id: o.id,
      project: o.project,
      title: o.title,
      kind: o.kind,
      createdAt: o.at,
      latest: last?.n ?? 0,
      updatedAt: last?.at ?? o.at,
      versions: vs.length,
      ...(last !== undefined ? { latestBy: last.by } : {}),
      taskSessions: this.d.store.tasksOf(id).map((t) => t.sessionId),
    };
  }

  async list(project: string): Promise<OutputSummary[]> {
    await this.requireProject(project);
    return this.d.store
      .outputsOf(project)
      .map((o) => this.summary(o.id))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async create(
    project: string,
    req: Partial<CreateOutputRequest>,
    by: OutputAuthor,
    session?: string,
  ): Promise<OutputView> {
    await this.requireProject(project);
    const title = typeof req.title === 'string' ? req.title.trim() : '';
    if (title === '') throw new BadRequestError('title 不能为空');
    if (!OUTPUT_KINDS.includes(req.kind as OutputKind)) {
      throw new BadRequestError(`kind 要是 ${OUTPUT_KINDS.join(' / ')} 之一`);
    }
    const kind = req.kind as OutputKind;
    const hasBody = req.text !== undefined || req.comparison !== undefined;
    // 先核对第一版，不过就什么都不写
    const first = hasBody ? checkVersion(kind, req) : undefined;
    const out = {
      id: this.id('out'),
      project,
      title,
      kind,
      at: this.iso(),
      createdBy: by,
    };
    await this.d.store.addOutput(out);
    if (first !== undefined) await this.append(out.id, first, by, session);
    return this.view(out.id);
  }

  // ───────────── 版本 ─────────────

  private async append(
    output: string,
    v: { text: string; note: string; comparison?: MethodComparison },
    by: OutputAuthor,
    session: string | undefined,
    base?: number,
  ): Promise<OutputVersion> {
    const r = await this.d.store.addVersion(
      {
        id: this.id('ov'),
        output,
        at: this.iso(),
        by,
        ...(session !== undefined ? { session } : {}),
        note: v.note,
        text: v.text,
        ...(v.comparison !== undefined ? { comparison: v.comparison } : {}),
      },
      base,
    );
    if (!r.ok) {
      throw new BadRequestError(
        `这个产出物已经有更新的版本（现在最新是第 ${String(r.latest)} 版），你这次基于第 ${String(base)} 版的保存没存；先看最新版再改。`,
      );
    }
    return r.version;
  }

  async save(
    output: string,
    req: Partial<SaveVersionRequest>,
    by: OutputAuthor,
    session?: string,
  ): Promise<VersionView> {
    const o = this.require(output);
    if (req.base !== undefined && (!Number.isInteger(req.base) || req.base < 0)) {
      throw new BadRequestError('base 要是非负整数（基于哪一版；还没有版本是 0）');
    }
    const v = checkVersion(o.kind, req);
    const saved = await this.append(output, v, by, session, req.base);
    return this.versionView(saved);
  }

  versions(output: string): VersionSummary[] {
    this.require(output);
    return this.d.store.versionsOf(output).map(versionSummary);
  }

  async version(output: string, n: number): Promise<VersionView> {
    this.require(output);
    const v = this.d.store.version(output, n);
    if (v === undefined) throw new NotFoundError(`${output} 没有第 ${String(n)} 版`);
    return this.versionView(v);
  }

  compare(output: string, from: number, to: number): CompareView {
    this.require(output);
    const a = this.d.store.version(output, from);
    const b = this.d.store.version(output, to);
    if (a === undefined) throw new NotFoundError(`${output} 没有第 ${String(from)} 版`);
    if (b === undefined) throw new NotFoundError(`${output} 没有第 ${String(to)} 版`);
    const lines = diffLines(a.text, b.text);
    const refsOf = (t: string): Set<string> => new Set(parseCitations(t).map((r) => r.raw));
    const ra = refsOf(a.text);
    const rb = refsOf(b.text);
    return {
      output,
      from: versionSummary(a),
      to: versionSummary(b),
      lines,
      added: lines.filter((l) => l.op === 'add').length,
      removed: lines.filter((l) => l.op === 'del').length,
      refsAdded: [...rb].filter((r) => !ra.has(r)),
      refsRemoved: [...ra].filter((r) => !rb.has(r)),
    };
  }

  // ───────────── 引用 ─────────────

  /** 解析并核对一段文字里的教材出处；对不上的标出，不编。 */
  async references(text: string): Promise<ReferencesView> {
    const sources = await this.d.sources.citations(text);
    return { sources, unresolved: sources.filter((s) => !s.resolved).length };
  }

  private async versionView(v: OutputVersion): Promise<VersionView> {
    return {
      ...versionSummary(v),
      id: v.id,
      output: v.output,
      text: v.text,
      ...(v.comparison !== undefined ? { comparison: v.comparison } : {}),
      references: await this.references(v.text),
    };
  }

  async view(output: string): Promise<OutputView> {
    const s = this.summary(output);
    const last = this.d.store.latest(output);
    const literature: LiteratureView[] = [];
    for (const e of this.d.store.literatureOf(output))
      literature.push(await this.literatureView(e));
    return {
      ...s,
      ...(last !== undefined ? { current: await this.versionView(last) } : {}),
      history: this.d.store.versionsOf(output).map(versionSummary),
      literature,
      tasks: this.d.store.tasksOf(output),
    };
  }

  // ───────────── 相关文献 ─────────────

  async addLiterature(
    output: string,
    req: Partial<AddLiteratureRequest>,
    by: OutputAuthor,
    session?: string,
  ): Promise<LiteratureView> {
    this.require(output);
    const relation = typeof req.relation === 'string' ? req.relation.trim() : '';
    if (relation === '')
      throw new BadRequestError('relation 不能为空：用一句话说它和这个产出物是什么关系');
    if (req.relationKind !== undefined && !RELATION_KINDS.includes(req.relationKind)) {
      throw new BadRequestError(`relationKind 要是 ${RELATION_KINDS.join(' / ')} 之一`);
    }
    const common = {
      id: this.id('lit'),
      output,
      at: this.iso(),
      by,
      ...(session !== undefined ? { session } : {}),
      relation,
      ...(req.relationKind !== undefined ? { relationKind: req.relationKind } : {}),
    };
    let entry: LiteratureEntry;
    if (typeof req.book === 'string' && req.book.trim() !== '') {
      const books = await this.d.library.books();
      const book = books.find((b) => b === req.book || b.trim() === req.book?.trim());
      if (book === undefined) throw new BadRequestError(`书库里没有这份资料：${req.book}`);
      if (req.file === undefined && (req.from !== undefined || req.to !== undefined)) {
        throw new BadRequestError('给了行号就要同时给 file（哪个小节文件）');
      }
      if (req.file !== undefined) {
        const from = req.from ?? 1;
        const to = req.to ?? from;
        const c = (
          await this.d.sources.citations(formatCitation({ book, file: req.file, from, to }))
        )[0];
        if (c === undefined || !c.resolved) {
          throw new BadRequestError(c?.problem ?? '这个小节对不上');
        }
        entry = {
          ...common,
          source: 'library',
          title: await this.d.library.title(book),
          book,
          file: req.file,
          from,
          to,
        };
      } else {
        entry = { ...common, source: 'library', title: await this.d.library.title(book), book };
      }
    } else {
      const title = typeof req.title === 'string' ? req.title.trim() : '';
      if (title === '') throw new BadRequestError('外部条目要有 title（标题）；书库里的书给 book');
      if (
        req.authors !== undefined &&
        !(Array.isArray(req.authors) && req.authors.every((a) => typeof a === 'string'))
      ) {
        throw new BadRequestError('authors 要是字符串数组');
      }
      if (req.url !== undefined && !/^https?:\/\/\S+$/.test(req.url)) {
        throw new BadRequestError('url 要是 http(s):// 开头的链接');
      }
      entry = {
        ...common,
        source: 'external',
        title,
        ...(req.authors !== undefined && req.authors.length > 0 ? { authors: req.authors } : {}),
        ...(req.url !== undefined ? { url: req.url } : {}),
      };
    }
    await this.d.store.addLiterature(entry);
    return this.literatureView(entry);
  }

  async literature(output: string): Promise<LiteratureView[]> {
    this.require(output);
    const out: LiteratureView[] = [];
    for (const e of this.d.store.literatureOf(output)) out.push(await this.literatureView(e));
    return out;
  }

  private async literatureView(e: LiteratureEntry): Promise<LiteratureView> {
    if (e.source !== 'library' || e.book === undefined) return e;
    if (e.file === undefined) {
      const has = (await this.d.library.books()).includes(e.book);
      return has ? e : { ...e, problem: `书库里现在没有这份资料：${e.book}` };
    }
    const c = (
      await this.d.sources.citations(
        formatCitation({ book: e.book, file: e.file, from: e.from ?? 1, to: e.to ?? e.from ?? 1 }),
      )
    )[0];
    return c === undefined
      ? e
      : c.resolved
        ? { ...e, citation: c }
        : { ...e, citation: c, problem: c.problem ?? '对不上' };
  }

  // ───────────── 会话：主对话开“写产出”任务对话，任务对话里的工具 ─────────────

  /** 主对话的工具：在学习者刚才那条消息下开一个“写产出”对话。 */
  mainTool(mainId: string): ToolSpec {
    return {
      name: 'open_output_task',
      description:
        '学习者想写 / 整理 / 继续写一份自己的产出（笔记整理、推导、小论文、方法比较……）时调用：在他刚才这条消息下开一个“写产出”对话，学习者点进去和模型一起写。续写已有产出物给 output；新写的给 title 和 kind。',
      input: {
        output: z.string().optional().describe('已有产出物 id（续写）；新写的不填'),
        title: z.string().optional().describe('新产出物的标题'),
        kind: z.enum(OUTPUT_KINDS).optional().describe('新产出物的类型'),
        brief: z.string().optional().describe('学习者想写什么，一两句'),
      },
      run: async (a) => {
        const recs = await this.hub.records(mainId);
        const asked = recs.filter((r) => r.record.type === 'user_message').at(-1);
        if (asked?.record.type !== 'user_message') return err('主对话里还没有学习者的话');
        let outputId = a.output as string | undefined;
        if (outputId !== undefined && outputId !== '') {
          const o = this.d.store.output(outputId);
          if (o?.project !== mainId) return err(`本项目里没有这个产出物：${outputId}`);
        } else {
          const title = (a.title as string | undefined)?.trim() ?? '';
          if (title === '' || a.kind === undefined) return err('新写的产出物要给 title 和 kind');
          outputId = (await this.create(mainId, { title, kind: a.kind as OutputKind }, '模型协助'))
            .id;
        }
        const { sessionId, title } = await this.startTask(
          outputId,
          mainId,
          [`学习者在主对话里说（主对话第 ${String(asked.line)} 行）：${asked.record.text}`],
          typeof a.brief === 'string' ? a.brief : undefined,
          '接着学习者这句话，和他一起写。',
          asked.line,
        );
        await this.hub.record(mainId, {
          type: 'task_opened',
          at: this.iso(),
          sessionId,
          kind: 'output',
          title,
          anchorLine: asked.line,
        });
        return ok('已在学习者这条消息下开了“写产出”对话，学习者点进去和你一起写。');
      },
    };
  }

  /**
   * 开一个“写产出”对话并绑定产出物，开场交给模型：来由几行 + 想写的 + 产出物现状 + 最后一句怎么接。
   * 主对话的工具与学习者从产出物页直接开都走这里。
   */
  private async startTask(
    outputId: string,
    project: string,
    origin: string[],
    brief: string | undefined,
    closing: string,
    anchorLine?: number,
  ): Promise<{ sessionId: string; title: string }> {
    const s = this.summary(outputId);
    const title = `写：${s.title}`;
    const task = await this.hub.createSession('output', {
      title,
      parent: project,
      ...(anchorLine !== undefined ? { anchorLine } : {}),
    });
    await this.d.store.bindTask({ sessionId: task.sessionId, output: outputId, at: this.iso() });
    await this.hub.send(task.sessionId, {
      role: 'program',
      text: [
        ...origin,
        ...(brief !== undefined && brief.trim() !== '' ? [`想写的：${brief.trim()}`] : []),
        `产出物：${outputId}「${s.title}」（${s.kind}），${s.latest === 0 ? '还没有版本' : `已有 ${String(s.latest)} 版，先用 read_output 看最新版`}。`,
        '',
        closing,
      ].join('\n'),
    });
    return { sessionId: task.sessionId, title };
  }

  /** 学习者在产出物页上点“和老师一起写”：在产出物所在项目下开一个“写产出”对话（不挂在主对话的哪句话下）。 */
  async openTask(output: string, brief?: unknown): Promise<string> {
    const o = this.require(output);
    if (brief !== undefined && typeof brief !== 'string') {
      throw new BadRequestError('brief 要是字符串');
    }
    const { sessionId } = await this.startTask(
      output,
      o.project,
      ['学习者在产出物页上开了这个对话，想和你一起写这份产出物。'],
      brief,
      '先问学习者这次想写或改哪里，再一起写。',
    );
    return sessionId;
  }

  /** “写产出”对话里的工具（只读资料的工具由 Studium 另给）。写入时程序记“模型协助”和本对话。 */
  sessionTools(sessionId: string): ToolSpec[] {
    const bound = (): string | undefined => this.d.store.taskOf(sessionId)?.output;
    return [
      {
        name: 'read_output',
        description:
          '读本产出物的某一版（不给 version 就是最新版），每行前印行号；同时列出这一版里的引用哪些对得上、哪些对不上。',
        input: { version: z.number().int().optional() },
        run: async (a) => {
          const output = bound();
          if (output === undefined) return err('这个对话没有绑定产出物');
          const last = this.d.store.latest(output);
          if (last === undefined) return ok('这个产出物还没有任何版本。');
          const n = (a.version as number | undefined) ?? last.n;
          const v = this.d.store.version(output, n);
          if (v === undefined) return err(`没有第 ${String(n)} 版（现有 1–${String(last.n)}）`);
          const refs = await this.references(v.text);
          const body = v.text
            .split('\n')
            .map((t, i) => `${String(i + 1)}\t${t}`)
            .join('\n');
          return ok(
            `第 ${String(v.n)} 版（${v.by}，${v.at.slice(0, 16).replace('T', ' ')}；改动说明：${v.note || '无'}）\n${body}\n\n${refProblems(refs)}`,
          );
        },
      },
      {
        name: 'save_output_version',
        description:
          '把你和学习者写好的内容存成产出物的新版本（每次保存都是新的一版，旧版本不动）。text 是整篇完整正文，不是只写改的部分。要引教材原文就在句后附出处标记（【教材|书名|小节文件|L起-止】，照 read_source 给的）。note 写这一版改了什么。方法比较类用 comparison，不用 text。',
        input: {
          text: z.string().optional(),
          note: z.string().describe('这一版改了什么，一句话'),
          base: z
            .number()
            .int()
            .optional()
            .describe('这次改动基于第几版；给了而不是最新版会被拒绝'),
          comparison: comparisonShape.optional(),
        },
        run: async (a) => {
          const output = bound();
          if (output === undefined) return err('这个对话没有绑定产出物');
          try {
            const v = await this.save(
              output,
              {
                ...(a.text !== undefined ? { text: a.text as string } : {}),
                note: a.note as string,
                ...(a.base !== undefined ? { base: a.base as number } : {}),
                ...(a.comparison !== undefined
                  ? {
                      comparison: comparisonFromTool(
                        a.comparison as z.infer<typeof comparisonShape>,
                      ),
                    }
                  : {}),
              },
              '模型协助',
              sessionId,
            );
            return await ok(`已存为第 ${String(v.n)} 版。\n${refProblems(v.references)}`);
          } catch (e) {
            if (e instanceof BadRequestError) return err(e.message);
            throw e;
          }
        },
      },
      {
        name: 'add_literature',
        description:
          '给本产出物登记一条相关文献：书库里的书 / 小节（给 book，可加 file 与行号），或外部条目（给 title，可加 authors、url）。relation 用一句话说它和这个产出物是什么关系。只追加。',
        input: {
          book: z.string().optional(),
          file: z.string().optional(),
          from_line: z.number().int().optional(),
          to_line: z.number().int().optional(),
          title: z.string().optional(),
          authors: z.array(z.string()).optional(),
          url: z.string().optional(),
          relation: z.string(),
          relation_kind: z.enum(RELATION_KINDS).optional(),
        },
        run: async (a) => {
          const output = bound();
          if (output === undefined) return err('这个对话没有绑定产出物');
          try {
            const e = await this.addLiterature(
              output,
              {
                ...(a.book !== undefined ? { book: a.book as string } : {}),
                ...(a.file !== undefined ? { file: a.file as string } : {}),
                ...(a.from_line !== undefined ? { from: a.from_line as number } : {}),
                ...(a.to_line !== undefined ? { to: a.to_line as number } : {}),
                ...(a.title !== undefined ? { title: a.title as string } : {}),
                ...(a.authors !== undefined ? { authors: a.authors as string[] } : {}),
                ...(a.url !== undefined ? { url: a.url as string } : {}),
                relation: a.relation as string,
                ...(a.relation_kind !== undefined
                  ? { relationKind: a.relation_kind as (typeof RELATION_KINDS)[number] }
                  : {}),
              },
              '模型协助',
              sessionId,
            );
            return await ok(`已登记：${e.id}「${e.title}」`);
          } catch (e) {
            if (e instanceof BadRequestError || e instanceof NotFoundError) return err(e.message);
            throw e;
          }
        },
      },
    ];
  }
}

// ───────────── 内部 ─────────────

const comparisonShape = z.object({
  dimensions: z.array(z.string()).describe('比较的维度（表的列），如“假设”“适用条件”“局限”'),
  methods: z.array(
    z.object({
      name: z.string(),
      boundary: z.string().describe('适用边界：什么条件下能用、什么条件下不能用'),
      values: z.array(z.object({ dimension: z.string(), value: z.string() })),
      evidence: z.array(z.string()).describe('证据与出处，可附出处标记'),
    }),
  ),
  tentative: z.string().optional().describe('研究中尚未定论的暂时论证'),
});

function comparisonFromTool(c: z.infer<typeof comparisonShape>): MethodComparison {
  return {
    dimensions: c.dimensions,
    methods: c.methods.map((m) => ({
      name: m.name,
      boundary: m.boundary,
      values: Object.fromEntries(m.values.map((v) => [v.dimension, v.value])),
      evidence: m.evidence,
    })),
    ...(c.tentative !== undefined ? { tentative: c.tentative } : {}),
  };
}

function ok(text: string): Promise<ToolResult> {
  return Promise.resolve({ text });
}

function err(text: string): Promise<ToolResult> {
  return Promise.resolve({ text, isError: true });
}

function refProblems(refs: ReferencesView): string {
  const bad = refs.sources
    .filter((s) => !s.resolved)
    .map((s) => `${s.raw}：${s.problem ?? '对不上'}`);
  const n = refs.sources.length;
  return bad.length === 0
    ? `引用 ${String(n)} 处，都对得上。`
    : `引用 ${String(n)} 处，${String(bad.length)} 处对不上（请核对后改正再存一版，别照着编）：\n${bad.join('\n')}`;
}

function versionSummary(v: OutputVersion): VersionSummary {
  return {
    n: v.n,
    at: v.at,
    by: v.by,
    ...(v.session !== undefined ? { session: v.session } : {}),
    note: v.note,
    length: v.text.length,
  };
}

/** 校验一次保存并得出要存的内容：方法比较类必须给结构化比较（正文由它渲染），别的类必须给正文。 */
function checkVersion(
  kind: OutputKind,
  req: { text?: string; note?: string; comparison?: MethodComparison },
): { text: string; note: string; comparison?: MethodComparison } {
  if (req.note !== undefined && typeof req.note !== 'string')
    throw new BadRequestError('note 要是字符串');
  const note = req.note?.trim() ?? '';
  if (kind === '方法比较') {
    if (req.comparison === undefined)
      throw new BadRequestError('方法比较类的产出物要给 comparison（方法 × 维度表）');
    const comparison = checkComparison(req.comparison);
    return { text: renderComparison(comparison), note, comparison };
  }
  if (req.comparison !== undefined) {
    throw new BadRequestError('只有“方法比较”类的产出物才有 comparison');
  }
  if (typeof req.text !== 'string' || req.text.trim() === '') {
    throw new BadRequestError('text 不能为空');
  }
  return { text: req.text, note };
}

function checkComparison(raw: unknown): MethodComparison {
  const c = raw as Partial<MethodComparison> | null;
  const strs = (v: unknown): v is string[] =>
    Array.isArray(v) && v.every((x) => typeof x === 'string');
  if (c === null || typeof c !== 'object' || !strs(c.dimensions) || !Array.isArray(c.methods)) {
    throw new BadRequestError('comparison 要有 dimensions（字符串数组）和 methods（数组）');
  }
  const dimensions = c.dimensions.map((d) => d.trim());
  if (
    dimensions.length === 0 ||
    dimensions.some((d) => d === '') ||
    new Set(dimensions).size !== dimensions.length
  ) {
    throw new BadRequestError('dimensions 至少一个，不能空、不能重名');
  }
  if (c.methods.length < 2) throw new BadRequestError('方法比较至少要两个方法');
  const methods: ComparedMethod[] = [];
  for (const m of c.methods as Partial<ComparedMethod>[]) {
    const name = typeof m.name === 'string' ? m.name.trim() : '';
    if (name === '') throw new BadRequestError('每个方法都要有 name');
    if (methods.some((x) => x.name === name)) throw new BadRequestError(`方法重名：${name}`);
    const boundary = typeof m.boundary === 'string' ? m.boundary.trim() : '';
    if (boundary === '') throw new BadRequestError(`方法“${name}”要写适用边界（boundary）`);
    const values = m.values ?? {};
    if (typeof values !== 'object' || Array.isArray(values)) {
      throw new BadRequestError(`方法“${name}”的 values 要是 {维度: 内容}`);
    }
    for (const [k, v] of Object.entries(values)) {
      if (!dimensions.includes(k))
        throw new BadRequestError(`方法“${name}”的 values 里有不在 dimensions 里的维度：${k}`);
      if (typeof v !== 'string') throw new BadRequestError(`方法“${name}”的维度“${k}”要写成字符串`);
    }
    const evidence = m.evidence ?? [];
    if (!strs(evidence)) throw new BadRequestError(`方法“${name}”的 evidence 要是字符串数组`);
    methods.push({ name, boundary, values, evidence });
  }
  if (c.tentative !== undefined && typeof c.tentative !== 'string') {
    throw new BadRequestError('tentative 要是字符串');
  }
  return {
    dimensions,
    methods,
    ...(c.tentative !== undefined && c.tentative.trim() !== ''
      ? { tentative: c.tentative.trim() }
      : {}),
  };
}

/** 方法比较渲染成正文：不用表格（出处标记里有竖线，进表格会乱），每个方法一节。 */
export function renderComparison(c: MethodComparison): string {
  const out = [`比较的维度：${c.dimensions.join('、')}`];
  for (const m of c.methods) {
    out.push('', `## ${m.name}`, `- 适用边界：${m.boundary}`);
    for (const d of c.dimensions) {
      const v = m.values[d];
      if (v !== undefined && v !== '') out.push(`- ${d}：${v}`);
    }
    for (const e of m.evidence) out.push(`- 出处：${e}`);
  }
  if (c.tentative !== undefined) out.push('', '## 暂时论证（尚未定论）', c.tentative);
  return out.join('\n');
}
