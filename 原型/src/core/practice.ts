// 练习任务（批 9，M03）：布置 → 作答 → 反馈 → 完成 / 放弃的生命周期、书里习题的清单、重复错误成模式（跨闭环）、
// 题型 / 方法归纳、阶段验收。对应 M03:13-21 · 工作单「补位清单」54-65。
// 记录都挂在练习所在的闭环自己的正本里（只追加）；任务状态、错误模式由记录折叠得出，不另存盘。
// studium.ts 只在几处挂钩（闭环工具、闭环开场、阶段验收的单子），逻辑都在这里。
import { z } from 'zod';
import { formatCitation } from '../shared/citation.ts';
import type {
  ErrorPatternsResponse,
  ErrorPatternView,
  ExerciseBookView,
  ExercisesResponse,
  PracticeErrorOccurrence,
  PracticeSummariesResponse,
  PracticeSummaryView,
  PracticeTaskView,
} from '../shared/protocol.ts';
import type { NumberedRecord, SessionOpened, Ticket } from '../shared/records.ts';
import {
  PRACTICE_DIFFICULTIES,
  PRACTICE_FUNCTIONS,
  type PracticeError,
  type PracticeSource,
} from '../shared/records-practice.ts';
import type { Hub } from './hub.ts';
import type { Library } from './knowledge/m07.ts';
import type { ToolResult, ToolSpec } from './model/port.ts';
import { foldPractice, labelKey, learnerTexts } from './practice-fold.ts';
import { learnerLines } from './transcript.ts';
import { BadRequestError } from './studium.ts';

/** 习题清单里一份文件最多列多少行（其余用 read_source 读）。 */
const EXERCISE_ITEM_LINES = 40;
/** 书里的题面最多取多少行。 */
const PROMPT_MAX_LINES = 40;
/** 一个错误类型名最多多少字。 */
const LABEL_MAX = 30;
/** 归纳至少要几道已完成的练习。 */
export const SUMMARY_MIN_TASKS = 2;
/** 开场里最多放几个错误模式、每个模式放最近几次出现。 */
const PATTERN_LINES = 5;
const OCCURRENCE_LINES = 4;

export interface PracticeDeps {
  hub(): Hub;
  m07: Library;
  iso(): string;
  newId(prefix: string): string;
  /** 资料范围（项目选的书）；undefined = 全库。 */
  scopeOf(sessionId: string, all: boolean): Promise<string[] | undefined>;
  /** 闭环还开着、没搁置（要布置 / 反馈 / 完成）。 */
  assertActiveLoop(loopId: string): Promise<void>;
  /** 闭环还没结束（学习者作答 / 要提示 / 放弃；搁置着的由 learnerSays 恢复）。 */
  assertOpenLoop(loopId: string): Promise<void>;
  /** 学习者在闭环里说一句话；practice 标明这是对某任务的作答。 */
  learnerSays(loopId: string, text: string, practice?: { taskId: string }): Promise<void>;
}

/** 一次错误出现（反馈记录里的一条错误）：跨闭环合并成模式的原料。 */
interface Occurrence {
  key: string;
  label: string;
  loopSessionId: string;
  taskId: string;
  feedbackId: string;
  at: string;
  detail: string;
  lines: number[];
  /** 这道题对应的点（含子句两端）。 */
  points: string[];
}

export class Practice {
  /** 全部闭环里出现过的错误（启动时扫一遍，之后写反馈时增量加）。 */
  private occurrences: Occurrence[] = [];
  private readonly seen = new Set<string>();
  private warming: Promise<void> | undefined;

  constructor(private readonly d: PracticeDeps) {}

  private get hub(): Hub {
    return this.d.hub();
  }

  // ───────────── 折叠与查询 ─────────────

  private async loopRecords(
    loopId: string,
  ): Promise<{ opened: SessionOpened; recs: NumberedRecord[] }> {
    const opened = await this.hub.opened(loopId);
    if (opened.kind !== 'loop') throw new BadRequestError('这段对话不是一次学习任务。');
    return { opened, recs: await this.hub.records(loopId) };
  }

  private fold(loopId: string, recs: NumberedRecord[]): PracticeTaskView[] {
    return foldPractice(loopId, recs, { pointName: (id) => id });
  }

  async tasks(loopId: string): Promise<PracticeTaskView[]> {
    const { recs } = await this.loopRecords(loopId);
    return this.fold(loopId, recs);
  }

  async task(loopId: string, taskId: string): Promise<PracticeTaskView> {
    const t = (await this.tasks(loopId)).find((x) => x.id === taskId);
    if (t === undefined) throw new BadRequestError(`这个学习任务里没有练习 ${taskId}。`);
    return t;
  }

  /** 按任务编号在所有闭环里找（归纳可以引用别的闭环里完成的练习）。 */
  private async findTask(taskId: string): Promise<PracticeTaskView | undefined> {
    for (const s of this.hub.listSessions().filter((x) => x.kind === 'loop')) {
      const t = this.fold(s.sessionId, await this.hub.records(s.sessionId)).find(
        (x) => x.id === taskId,
      );
      if (t !== undefined) return t;
    }
    return undefined;
  }

  /** 任务对应的点：布置时给的点（子句只是文字，不再拆两端）。 */
  private taskPoints(points: string[], clause: string | undefined): string[] {
    return [
      ...new Set([...points, ...(clause !== undefined && clause.trim() !== '' ? [clause] : [])]),
    ];
  }

  private ticketPoints(t: Ticket | undefined): Set<string> {
    if (t === undefined) return new Set();
    return new Set([
      t.newPoint,
      ...t.startPoints.map((s) => s.point),
      ...this.taskPoints([], t.clause),
    ]);
  }

  // ───────────── 书里的习题清单 ─────────────

  /** 书里的习题（M07 习题文件）：按章列；按功能 / 难度筛由模型判断，这里只给清单。 */
  async exercises(opt: {
    scope?: string[];
    book?: string;
    chapter?: string;
  }): Promise<ExercisesResponse> {
    const all = await this.d.m07.books();
    const books = opt.book !== undefined ? all.filter((b) => b === opt.book) : (opt.scope ?? all);
    if (opt.book !== undefined && books.length === 0) {
      throw new BadRequestError(`书库里没有这本书：${opt.book}。有：${all.join('；') || '（无）'}`);
    }
    const out: ExerciseBookView[] = [];
    const wantChapter = opt.chapter !== undefined ? chapterKey(opt.chapter) : undefined;
    for (const book of books) {
      if (!all.includes(book)) continue;
      const entries = (await this.d.m07.toc(book)).filter(
        (e) =>
          e.kind === 'prob' &&
          e.file !== undefined &&
          (wantChapter === undefined || chapterKey(e.chapter) === wantChapter),
      );
      if (entries.length === 0) continue;
      const sections: ExerciseBookView['sections'] = [];
      for (const e of entries) {
        if (e.file === undefined) continue;
        const text = await this.d.m07.lines(book, e.file);
        const items = text.lines
          .filter((l) => l.text.trim() !== '' && !l.text.startsWith('#'))
          .map((l) => ({ line: l.n, text: l.text }));
        sections.push({
          num: e.num,
          title: e.title,
          chapter: e.chapter,
          file: e.file,
          ...(e.pages !== undefined ? { pages: e.pages } : {}),
          citation: formatCitation({ book, file: e.file, from: 1, to: Math.max(1, text.total) }),
          totalLines: text.total,
          items: items.slice(0, EXERCISE_ITEM_LINES),
          truncated: items.length > EXERCISE_ITEM_LINES,
        });
      }
      out.push({ book, bookTitle: await this.d.m07.title(book), sections });
    }
    return { books: out };
  }

  // ───────────── 学习者这一侧的动作（接口）─────────────

  /** 学习者提交作答：text = 新的一句原话（进闭环对话，教学侧给反馈）；lines = 认已有的学习者原话行。 */
  async submit(
    loopId: string,
    taskId: string,
    body: { text?: string; lines?: number[] },
  ): Promise<PracticeTaskView> {
    await this.d.assertOpenLoop(loopId);
    const task = await this.task(loopId, taskId);
    this.assertOpenTask(task);
    const hasText = typeof body.text === 'string' && body.text.trim() !== '';
    const hasLines = Array.isArray(body.lines) && body.lines.length > 0;
    if (hasText === hasLines)
      throw new BadRequestError(
        '作答要么给 text（新的一句话），要么给 lines（已有的学习者原话行），二选一。',
      );
    if (hasText) {
      await this.d.learnerSays(loopId, (body.text ?? '').trim(), { taskId });
    } else {
      const lines = body.lines ?? [];
      const { recs } = await this.loopRecords(loopId);
      const problem = lineProblem(recs, lines, task.line);
      if (problem !== undefined) throw new BadRequestError(problem);
      await this.hub.record(loopId, {
        type: 'practice_submitted',
        at: this.d.iso(),
        taskId,
        lines,
      });
    }
    return this.task(loopId, taskId);
  }

  /** 学习者要提示：这道题设定不给提示就拒绝；否则记一次“要了”，并告诉教学侧。 */
  async askHint(loopId: string, taskId: string): Promise<PracticeTaskView> {
    await this.d.assertOpenLoop(loopId);
    const task = await this.task(loopId, taskId);
    this.assertOpenTask(task);
    if (!task.hintsAllowed) {
      throw new BadRequestError('这道题设定为不给提示，先自己试试；卡住了可以在对话里说。');
    }
    await this.hub.record(loopId, {
      type: 'practice_hint',
      at: this.d.iso(),
      taskId,
      by: 'learner',
    });
    const asked = task.hintsAsked + 1;
    await this.hub.send(loopId, {
      role: 'program',
      text: `学习者对练习任务 ${taskId}（${task.focus}）要了提示（这道题第 ${String(asked)} 次要）。给了提示就用 give_practice_hint 记一次。`,
    });
    return this.task(loopId, taskId);
  }

  /** 学习者放弃这道练习。 */
  async abandon(loopId: string, taskId: string, note: string): Promise<PracticeTaskView> {
    await this.d.assertOpenLoop(loopId);
    const task = await this.task(loopId, taskId);
    this.assertOpenTask(task);
    await this.hub.record(loopId, {
      type: 'practice_done',
      at: this.d.iso(),
      taskId,
      outcome: 'abandoned',
      note: note.trim(),
      by: 'learner',
    });
    await this.hub.send(loopId, {
      role: 'program',
      text: `学习者放弃了练习任务 ${taskId}（${task.focus}）${note.trim() !== '' ? `：${note.trim()}` : ''}。`,
    });
    return this.task(loopId, taskId);
  }

  private assertOpenTask(task: PracticeTaskView): void {
    if (task.done !== undefined) {
      throw new BadRequestError(
        `练习 ${task.id} 已经${task.done.outcome === 'completed' ? '完成' : '放弃'}了。`,
      );
    }
  }

  // ───────────── 重复错误成模式（跨闭环）─────────────

  /** 启动时把各闭环已有的练习反馈里的错误读进来（只读一次；之后写反馈时增量加）。 */
  warm(): Promise<void> {
    this.warming ??= (async () => {
      for (const s of this.hub.listSessions().filter((x) => x.kind === 'loop')) {
        this.indexLoop(s.sessionId, await this.hub.records(s.sessionId));
      }
    })();
    return this.warming;
  }

  private indexLoop(loopId: string, recs: NumberedRecord[]): void {
    const assigned = new Map<string, { points: string[]; clause?: string }>();
    for (const { record: r } of recs) {
      if (r.type === 'practice_assigned') {
        assigned.set(r.id, {
          points: r.points,
          ...(r.clause !== undefined ? { clause: r.clause } : {}),
        });
      } else if (r.type === 'practice_feedback') {
        const a = assigned.get(r.taskId);
        this.addOccurrences(loopId, r.id, r.taskId, r.at, r.errors, a?.points ?? [], a?.clause);
      }
    }
  }

  private addOccurrences(
    loopId: string,
    feedbackId: string,
    taskId: string,
    at: string,
    errors: PracticeError[],
    points: string[],
    clause: string | undefined,
  ): void {
    const pts = this.taskPoints(points, clause);
    errors.forEach((e, i) => {
      const id = `${feedbackId}#${String(i)}`;
      if (this.seen.has(id)) return;
      this.seen.add(id);
      this.occurrences.push({
        key: labelKey(e.label),
        label: e.label.trim(),
        loopSessionId: loopId,
        taskId,
        feedbackId,
        at,
        detail: e.detail,
        lines: e.lines,
        points: pts,
      });
    });
  }

  private groups(): Map<string, Occurrence[]> {
    const g = new Map<string, Occurrence[]>();
    for (const o of this.occurrences) {
      const list = g.get(o.key);
      if (list === undefined) g.set(o.key, [o]);
      else list.push(o);
    }
    return g;
  }

  private loopCount(list: Occurrence[]): number {
    return new Set(list.map((o) => o.loopSessionId)).size;
  }

  /** 开场里给的“以前出现过的错误模式”：跨闭环出现 >= 2 次、且涉及本闭环单子里的点的错误类型。只给事实与出处。 */
  patternFacts(ticket: Ticket): string[] {
    const related = this.ticketPoints(ticket);
    const rows = [...this.groups().values()]
      .filter(
        (list) =>
          this.loopCount(list) >= 2 && list.some((o) => o.points.some((p) => related.has(p))),
      )
      .sort((a, b) => b.length - a.length)
      .slice(0, PATTERN_LINES);
    if (rows.length === 0) return [];
    const out = [
      '以前练习的反馈里记过的错误模式（程序事实：同一类错误跨闭环出现 2 次以上；只给出处，不是对学习者的结论，也不是判决；是不是还在，要看这一次的表现）：',
    ];
    for (const list of rows) {
      out.push(
        `- 「${list[0]?.label ?? ''}」在 ${String(this.loopCount(list))} 个学习任务里出现过：`,
      );
      for (const o of list.slice(-OCCURRENCE_LINES)) {
        out.push(
          `  · 会话 ${o.loopSessionId} 第 ${o.lines.map(String).join('、')} 行（学习者的原话）：${o.detail}`,
        );
      }
    }
    out.push('需要原话时用 read_loop 读那个会话。', '');
    return out;
  }

  /** 与这些点有关的已有错误类型名（给教学侧沿用同一个名字）。 */
  private labelHints(points: Set<string>): string {
    const rows = [...this.groups().values()]
      .filter((list) => list.some((o) => o.points.some((p) => points.has(p))))
      .map(
        (list) =>
          `「${list[0]?.label ?? ''}」${String(this.loopCount(list))} 个学习任务 / ${String(list.length)} 次`,
      );
    return rows.length > 0
      ? `与这些点有关的已有错误类型名（同一类错误请沿用同一个名字，才能合并成模式）：${rows.join('；')}`
      : '与这些点有关的错误类型还没有记过。';
  }

  async errorPatterns(point?: string): Promise<ErrorPatternsResponse> {
    await this.warm();
    const patterns: ErrorPatternView[] = [];
    const others: ErrorPatternView[] = [];
    const recCache = new Map<string, NumberedRecord[]>();
    const titles = new Map<string, string>();
    for (const list of this.groups().values()) {
      if (point !== undefined && !list.some((o) => o.points.includes(point))) continue;
      const occurrences: PracticeErrorOccurrence[] = [];
      for (const o of list) {
        let recs = recCache.get(o.loopSessionId);
        if (recs === undefined) {
          recs = await this.hub.records(o.loopSessionId);
          recCache.set(o.loopSessionId, recs);
          titles.set(o.loopSessionId, (await this.hub.opened(o.loopSessionId)).title);
        }
        const texts = learnerTexts(recs);
        occurrences.push({
          loopSessionId: o.loopSessionId,
          ...(titles.get(o.loopSessionId) !== undefined
            ? { loopTitle: titles.get(o.loopSessionId) ?? '' }
            : {}),
          taskId: o.taskId,
          feedbackId: o.feedbackId,
          at: o.at,
          detail: o.detail,
          lines: o.lines.map((line) => ({ line, text: texts.get(line) ?? '' })),
          points: o.points.map((id) => ({ id, name: id })),
        });
      }
      const view: ErrorPatternView = {
        label: list[0]?.label ?? '',
        loops: this.loopCount(list),
        occurrences,
      };
      (view.loops >= 2 ? patterns : others).push(view);
    }
    patterns.sort((a, b) => b.loops - a.loops || b.occurrences.length - a.occurrences.length);
    return { patterns, others };
  }

  // ───────────── 题型 / 方法归纳 ─────────────

  async summaries(loopId?: string): Promise<PracticeSummariesResponse> {
    const loops =
      loopId !== undefined
        ? [loopId]
        : this.hub
            .listSessions()
            .filter((s) => s.kind === 'loop')
            .map((s) => s.sessionId);
    const out: PracticeSummaryView[] = [];
    const focusOf = new Map<string, string>();
    const textCache = new Map<string, Map<number, string>>();
    const textsOf = async (id: string): Promise<Map<number, string>> => {
      let t = textCache.get(id);
      if (t === undefined) {
        t = learnerTexts(await this.hub.records(id));
        textCache.set(id, t);
      }
      return t;
    };
    for (const id of loops) {
      const recs = await this.hub.records(id);
      for (const { record: r } of recs) {
        if (r.type === 'practice_assigned') focusOf.set(r.id, r.focus);
      }
      for (const { record: r } of recs) {
        if (r.type !== 'practice_summary') continue;
        for (const t of r.tasks) {
          if (!focusOf.has(t.taskId)) {
            const found = await this.findTask(t.taskId);
            if (found !== undefined) focusOf.set(t.taskId, found.focus);
          }
        }
        const evidence: PracticeSummaryView['evidence'] = [];
        for (const e of r.evidence) {
          evidence.push({ ...e, text: (await textsOf(e.loopSessionId)).get(e.line) ?? '' });
        }
        out.push({
          id: r.id,
          loopSessionId: id,
          at: r.at,
          text: r.text,
          requestedBy: r.requestedBy,
          tasks: r.tasks.map((t) => ({ ...t, focus: focusOf.get(t.taskId) ?? '' })),
          evidence,
        });
      }
    }
    return { summaries: out.sort((a, b) => a.at.localeCompare(b.at)) };
  }

  /** 学习者单独请求一次归纳：告诉这个闭环里的教学侧，由它用 write_practice_summary 写。闭环已结束就不行。 */
  async requestSummary(loopId: string, taskIds?: string[]): Promise<{ taskIds: string[] }> {
    await this.d.assertActiveLoop(loopId);
    const mine = (await this.tasks(loopId)).filter((t) => t.status === 'completed');
    let picked = mine;
    if (taskIds !== undefined && taskIds.length > 0) {
      picked = [];
      for (const id of taskIds) {
        const t = mine.find((x) => x.id === id) ?? (await this.findTask(id));
        if (t === undefined || t.status !== 'completed') {
          throw new BadRequestError(`练习 ${id} 不存在，或还没完成；只能据已完成的练习归纳。`);
        }
        picked.push(t);
      }
    }
    if (picked.length < SUMMARY_MIN_TASKS) {
      throw new BadRequestError(
        `据已完成的练习归纳，至少要 ${String(SUMMARY_MIN_TASKS)} 道；现在有 ${String(picked.length)} 道。`,
      );
    }
    await this.hub.send(loopId, {
      role: 'program',
      text: [
        '学习者请求把已完成的练习归纳一次（这类题怎么想）。',
        `可据的已完成练习：${picked.map((t) => `${t.id}「${t.focus}」`).join('；')}。`,
        '用 write_practice_summary 写：关键条件、逻辑链、方法、易混点；指回练习和学习者的原话行。归纳只依据这些练习里学习者实际做出来的，不替学习者补。',
      ].join('\n'),
    });
    return { taskIds: picked.map((t) => t.id) };
  }

  // ───────────── 开场里的练习事实 ─────────────

  /** 闭环开场里和练习有关的几段：阶段验收的说明、以前出现过的错误模式。 */
  openingFacts(t: Ticket): string[] {
    return [
      ...(t.stageCheck === true
        ? [
            '这是一次阶段验收闭环（M05 标的）：这里布置的练习都按阶段验收算（assign_practice 自动标阶段验收），默认不给提示；它和日常练习分开，目的是看独立表现，不是逐题审判，措辞照常平和。练习做完不等于掌握，合上仍由守卫按同一标准判。',
            '',
          ]
        : []),
      ...this.patternFacts(t),
    ];
  }

  // ───────────── 教学侧的工具 ─────────────

  loopTools(loopId: string): ToolSpec[] {
    const fail = (text: string): Promise<ToolResult> => Promise.resolve({ text, isError: true });
    const ok = (text: string): Promise<ToolResult> => Promise.resolve({ text });
    /** 闭环还开着；练习任务在本闭环里找得到且没结束。 */
    const openTask = async (
      taskId: string,
    ): Promise<{ task: PracticeTaskView; recs: NumberedRecord[] } | string> => {
      try {
        await this.d.assertActiveLoop(loopId);
      } catch (e) {
        if (e instanceof BadRequestError) return e.message;
        throw e;
      }
      const { recs } = await this.loopRecords(loopId);
      const task = this.fold(loopId, recs).find((t) => t.id === taskId);
      if (task === undefined) return `这个闭环里没有练习 ${taskId}。`;
      if (task.done !== undefined) {
        return `练习 ${taskId} 已经${task.done.outcome === 'completed' ? '完成' : '放弃'}了。`;
      }
      return { task, recs };
    };
    return [
      {
        name: 'list_exercises',
        description:
          '列书里的习题（M07 习题文件）：按书、按章；默认只查项目选用的资料。只给清单（每份文件的非空行与行号），按练习功能 / 难度选哪道由你判断；选定后用 assign_practice 的 textbook 布置，题面由程序按行读出。',
        input: {
          book: z.string().optional().describe('书名（书库 id）；不给 = 项目选用的全部'),
          chapter: z.string().optional().describe('章，如 ch02 或 2；不给 = 全部'),
          all: z.boolean().optional().describe('true = 查整个书库'),
        },
        run: async (a) => {
          const scope = await this.d.scopeOf(loopId, a.all === true);
          let r: ExercisesResponse;
          try {
            r = await this.exercises({
              ...(scope !== undefined ? { scope } : {}),
              ...(a.book !== undefined ? { book: a.book as string } : {}),
              ...(a.chapter !== undefined ? { chapter: a.chapter as string } : {}),
            });
          } catch (e) {
            if (e instanceof BadRequestError) return fail(e.message);
            throw e;
          }
          if (r.books.length === 0) return ok('没有找到习题文件（这些书的目录里没有习题类条目）。');
          return ok(
            r.books
              .map((b) =>
                [
                  `《${b.book}》${b.bookTitle}`,
                  ...b.sections.flatMap((s) => [
                    `${s.num} ${s.title}（${s.file}，共 ${String(s.totalLines)} 行${s.truncated ? '，只列前面一部分' : ''}）`,
                    ...s.items.map((i) => `  L${String(i.line)} ${i.text}`),
                  ]),
                ].join('\n'),
              )
              .join('\n\n'),
          );
        },
      },
      {
        name: 'assign_practice',
        description:
          '布置一道正式练习（生命周期由程序管：布置 → 学习者作答 → 你给反馈 → 完成 / 放弃）。题目来源二选一：textbook（书里的习题，给书名、小节文件、行号，题面由程序读出，带出处）或 generated_prompt（你出的题，标“生成”）。布置后把题面和要交什么用日常话讲给学习者，然后停在等作答的地方。',
        input: {
          focus: z.string().describe('练什么：一句日常话'),
          points: z.array(z.string()).optional().describe('对应的点（文字）'),
          clause: z.string().optional().describe('对应的预期理解（文字）'),
          textbook: z
            .object({
              book: z.string(),
              file: z.string(),
              from: z.number().int(),
              to: z.number().int().optional(),
            })
            .optional()
            .describe('书里的习题：书名、小节文件、起止行（照 list_exercises 的写）'),
          generated_prompt: z.string().optional().describe('你出的题的题面（与 textbook 二选一）'),
          deliverable: z.string().describe('交什么：结果、关键步骤、理由……'),
          hints_allowed: z
            .boolean()
            .optional()
            .describe('能否给提示；阶段验收默认不给，日常默认给'),
          done_when: z.string().describe('何时算完'),
          function: z.enum(PRACTICE_FUNCTIONS).describe('练习的功能：巩固 / 变式 / 迁移 / 诊断'),
          difficulty: z.enum(PRACTICE_DIFFICULTIES),
          stage_check: z.boolean().optional().describe('是阶段验收；阶段验收闭环里自动为真'),
          follows: z.string().optional().describe('接在本闭环里哪道练习之后（递进 / 变式）'),
        },
        run: async (a) => {
          try {
            await this.d.assertActiveLoop(loopId);
          } catch (e) {
            if (e instanceof BadRequestError) return fail(e.message);
            throw e;
          }
          const { opened, recs } = await this.loopRecords(loopId);
          const existing = this.fold(loopId, recs);
          const textbook = a.textbook as
            { book: string; file: string; from: number; to?: number } | undefined;
          const generated = (a.generated_prompt as string | undefined)?.trim();
          if ((textbook === undefined) === (generated === undefined || generated === '')) {
            return fail('题目来源二选一：textbook（书里的习题）或 generated_prompt（你出的题）。');
          }
          const focus = (a.focus as string).trim();
          const deliverable = (a.deliverable as string).trim();
          const doneWhen = (a.done_when as string).trim();
          if (focus === '' || deliverable === '' || doneWhen === '') {
            return fail(
              'focus（练什么）、deliverable（交什么）、done_when（何时算完）都要写，不能空。',
            );
          }
          let points = (a.points as string[] | undefined) ?? [];
          let clause = a.clause as string | undefined;
          let defaulted = false;
          if (points.length === 0 && clause === undefined) {
            // 练习对应单子里的点 / 子句：没指定就落在本闭环的单子上
            const t = opened.ticket;
            if (t === undefined)
              return fail('请指定 points 或 clause：这道练习练的是哪个点 / 子句。');
            points = [t.newPoint];
            clause = t.clause;
            defaulted = true;
          }
          const follows = a.follows as string | undefined;
          if (follows !== undefined && !existing.some((t) => t.id === follows)) {
            return fail(`follows 指的练习 ${follows} 不在这个闭环里。`);
          }
          let source: PracticeSource;
          let prompt: string;
          if (textbook !== undefined) {
            const to = textbook.to ?? textbook.from;
            if (to < textbook.from || textbook.from < 1)
              return fail('行号要从 1 起，止行不小于起行。');
            if (to - textbook.from + 1 > PROMPT_MAX_LINES) {
              return fail(`一道题最多取 ${String(PROMPT_MAX_LINES)} 行；缩小行号范围。`);
            }
            if (!(await this.d.m07.books()).includes(textbook.book)) {
              return fail(`书库里没有这本书：${textbook.book}。`);
            }
            let text: Awaited<ReturnType<Library['lines']>>;
            try {
              text = await this.d.m07.lines(textbook.book, textbook.file, textbook.from, to);
            } catch (e) {
              return fail(
                `读不到 ${textbook.book}/${textbook.file}：${e instanceof Error ? e.message : String(e)}`,
              );
            }
            prompt = text.lines
              .map((l) => l.text)
              .join('\n')
              .trim();
            if (prompt === '') return fail('这几行是空的，换个行号范围。');
            source = {
              kind: 'textbook',
              book: textbook.book,
              bookTitle: await this.d.m07.title(textbook.book),
              file: textbook.file,
              from: text.from,
              to: text.to,
              citation: formatCitation({
                book: textbook.book,
                file: textbook.file,
                from: text.from,
                to: text.to,
              }),
            };
          } else {
            source = { kind: 'generated' };
            prompt = generated ?? '';
          }
          const stageCheck = opened.ticket?.stageCheck === true || a.stage_check === true;
          const hintsAllowed = (a.hints_allowed as boolean | undefined) ?? !stageCheck;
          const id = this.d.newId('pr');
          await this.hub.record(loopId, {
            type: 'practice_assigned',
            at: this.d.iso(),
            id,
            focus,
            points,
            ...(clause !== undefined ? { clause } : {}),
            source,
            prompt,
            deliverable,
            hintsAllowed,
            doneWhen,
            function: a.function as (typeof PRACTICE_FUNCTIONS)[number],
            difficulty: a.difficulty as (typeof PRACTICE_DIFFICULTIES)[number],
            stageCheck,
            ...(follows !== undefined ? { follows } : {}),
          });
          const last = existing.filter((t) => t.status === 'completed').at(-1);
          return ok(
            [
              `练习 ${id} 已布置（${source.kind === 'textbook' ? `书里的习题 ${source.citation}` : '生成题，界面会标“生成”'}；${stageCheck ? '阶段验收' : '日常练习'}；${hintsAllowed ? '可以给提示' : '不给提示'}）。`,
              ...(defaulted ? ['没指定点 / 子句，按本闭环的单子记（新点与选中的子句）。'] : []),
              ...(source.kind === 'textbook' ? [`题面（程序读出）：\n${prompt}`] : []),
              ...(last !== undefined
                ? [`上一道完成的是 ${last.id}，提示用了 ${String(last.hintsUsed)} 次。`]
                : []),
              '现在把题面和要交什么讲给学习者（生成题说明是你出的），一轮话停在等作答处。',
            ].join('\n'),
          );
        },
      },
      {
        name: 'mark_practice_submission',
        description:
          '学习者在对话里答了某道练习（不是经界面提交的）时，把他的原话行认作这道练习的作答。行号只能是学习者的话、且在布置之后。',
        input: { task_id: z.string(), lines: z.array(z.number().int()).min(1) },
        run: async (a) => {
          const r = await openTask(a.task_id as string);
          if (typeof r === 'string') return fail(r);
          const lines = a.lines as number[];
          const problem = lineProblem(r.recs, lines, r.task.line);
          if (problem !== undefined) return fail(problem);
          await this.hub.record(loopId, {
            type: 'practice_submitted',
            at: this.d.iso(),
            taskId: r.task.id,
            lines,
          });
          return ok('已记为这道练习的作答。接着给反馈（give_practice_feedback）。');
        },
      },
      {
        name: 'give_practice_feedback',
        description:
          '给练习作答的反馈：定位到知识、思路、技巧或过程，不评价人。反馈里发现的错误可以记类型：label 是错误类型的短名（同一类错误沿用同一个名字，程序按名字把跨闭环重复的合成模式）、detail 一句话、lines 指回学习者的原话行。没有错误就不填 errors。',
        input: {
          task_id: z.string(),
          text: z.string().describe('反馈的要点（也要在回复里讲给学习者）'),
          errors: z
            .array(
              z.object({
                label: z.string().describe(`错误类型短名，${String(LABEL_MAX)} 字内`),
                detail: z.string().describe('这一次具体错在哪，一句话'),
                lines: z.array(z.number().int()).min(1).describe('指回学习者的原话行'),
              }),
            )
            .optional(),
        },
        run: async (a) => {
          const r = await openTask(a.task_id as string);
          if (typeof r === 'string') return fail(r);
          if (r.task.submissions.length === 0) {
            return fail(
              '学习者还没有作答这道题；先等他作答（或用 mark_practice_submission 认他在对话里的作答）。',
            );
          }
          const text = (a.text as string).trim();
          if (text === '') return fail('text 不能是空的。');
          const errors = ((a.errors as PracticeError[] | undefined) ?? []).map((e) => ({
            label: e.label.trim(),
            detail: e.detail.trim(),
            lines: e.lines,
          }));
          for (const e of errors) {
            if (e.label === '' || e.label.length > LABEL_MAX) {
              return fail(`错误类型名要 1 到 ${String(LABEL_MAX)} 个字：${e.label}`);
            }
            if (e.detail === '') return fail(`错误「${e.label}」要写一句具体错在哪。`);
            const problem = lineProblem(r.recs, e.lines, r.task.line);
            if (problem !== undefined) return fail(`错误「${e.label}」：${problem}`);
          }
          const id = this.d.newId('pf');
          const at = this.d.iso();
          await this.hub.record(loopId, {
            type: 'practice_feedback',
            at,
            id,
            taskId: r.task.id,
            text,
            errors,
          });
          await this.warm();
          const assigned = r.task;
          this.addOccurrences(
            loopId,
            id,
            assigned.id,
            at,
            errors,
            assigned.points.map((p) => p.id),
            assigned.clauseId,
          );
          const pts = new Set(
            this.taskPoints(
              assigned.points.map((p) => p.id),
              assigned.clauseId,
            ),
          );
          return ok(
            [
              `反馈已记；这道题提示用了 ${String(assigned.hintsUsed)} 次。`,
              ...(errors.length > 0 ? [this.labelHints(pts)] : []),
              '练习完成（finish_practice）和闭环合上是两件事：做完不等于掌握。',
            ].join('\n'),
          );
        },
      },
      {
        name: 'give_practice_hint',
        description:
          '给了学习者一次提示（学习者要的，或你主动给的）就记一次，“提示用了几次”由此得出。这道题设定不给提示时不能记。',
        input: { task_id: z.string(), note: z.string().optional().describe('提示的内容要点') },
        run: async (a) => {
          const r = await openTask(a.task_id as string);
          if (typeof r === 'string') return fail(r);
          if (!r.task.hintsAllowed) {
            return fail(`练习 ${r.task.id} 设定为不给提示；不给，或先说明为什么要改。`);
          }
          await this.hub.record(loopId, {
            type: 'practice_hint',
            at: this.d.iso(),
            taskId: r.task.id,
            by: 'teacher',
            ...(typeof a.note === 'string' && a.note.trim() !== '' ? { note: a.note.trim() } : {}),
          });
          return ok(`已记；这道题提示用了 ${String(r.task.hintsUsed + 1)} 次。`);
        },
      },
      {
        name: 'finish_practice',
        description:
          '结束一道练习：completed（完成：学习者作答过、你也给过反馈，且达到 done_when）或 abandoned（放弃）。完成只是这道题做完了，不等于掌握，也不会让闭环合上；合上仍用 request_close 交守卫判。',
        input: {
          task_id: z.string(),
          outcome: z.enum(['completed', 'abandoned']),
          note: z.string().describe('依据：完成是怎么达到 done_when 的；放弃是为什么'),
        },
        run: async (a) => {
          const r = await openTask(a.task_id as string);
          if (typeof r === 'string') return fail(r);
          const outcome = a.outcome as 'completed' | 'abandoned';
          const note = (a.note as string).trim();
          if (note === '') return fail('note 不能是空的。');
          if (outcome === 'completed' && r.task.status !== 'feedback') {
            return fail(
              r.task.submissions.length === 0
                ? '学习者还没有作答，不能标完成。'
                : '最近一次作答还没有反馈；先 give_practice_feedback 再标完成。',
            );
          }
          await this.hub.record(loopId, {
            type: 'practice_done',
            at: this.d.iso(),
            taskId: r.task.id,
            outcome,
            note,
            by: 'teacher',
          });
          return ok(
            outcome === 'completed'
              ? `练习 ${r.task.id} 已标完成（提示用了 ${String(r.task.hintsUsed)} 次）。这只表示这道题做完了；掌握与否、闭环合不合上都不由它定。下一道练习可据提示次数安排（有提示 → 少提示 → 无提示，再变式 / 迁移）。`
              : `练习 ${r.task.id} 已标放弃。`,
          );
        },
      },
      {
        name: 'list_practice',
        description:
          '列本闭环的练习任务（状态、功能、难度、提示用了几次 / 要了几次）和与单子里的点有关的已有错误类型名。related 为真时另列别的学习任务里已完成的、涉及同样的点的练习（归纳时可引用）。',
        input: { related: z.boolean().optional() },
        run: async (a) => {
          const { opened, recs } = await this.loopRecords(loopId);
          const mine = this.fold(loopId, recs);
          const pts = this.ticketPoints(opened.ticket);
          const row = (t: PracticeTaskView): string =>
            `${t.id}「${t.focus}」 ${statusText(t.status)}；${t.function} / 难度${t.difficulty}${t.stageCheck ? ' / 阶段验收' : ''}；${t.source.kind === 'textbook' ? t.source.citation : '生成'}；提示用了 ${String(t.hintsUsed)} 次、学习者要了 ${String(t.hintsAsked)} 次${t.follows !== undefined ? `；接在 ${t.follows} 之后` : ''}`;
          const out = [
            mine.length > 0
              ? `本闭环的练习：\n${mine.map(row).join('\n')}`
              : '本闭环还没有布置过练习。',
            this.labelHints(pts),
          ];
          if (a.related === true) {
            await this.warm();
            const rel: PracticeTaskView[] = [];
            for (const s of this.hub
              .listSessions()
              .filter((x) => x.kind === 'loop' && x.sessionId !== loopId)) {
              for (const t of this.fold(s.sessionId, await this.hub.records(s.sessionId))) {
                const tp = this.taskPoints(
                  t.points.map((p) => p.id),
                  t.clauseId,
                );
                if (t.status === 'completed' && tp.some((p) => pts.has(p))) rel.push(t);
              }
            }
            out.push(
              rel.length > 0
                ? `别的学习任务里涉及同样的点、已完成的练习：\n${rel.map((t) => `会话 ${t.loopSessionId}：${row(t)}`).join('\n')}`
                : '别的学习任务里没有涉及同样的点的已完成练习。',
            );
          }
          return ok(out.join('\n\n'));
        },
      },
      {
        name: 'write_practice_summary',
        description:
          '题型 / 方法归纳：据已完成的练习（至少两道，可含别的学习任务里完成的）写一段“这类题怎么想”——关键条件、逻辑链、方法、易混点。必须指回练习和学习者的原话行（evidence）。只依据学习者实际做出来的，不替他补。',
        input: {
          task_ids: z.array(z.string()).min(SUMMARY_MIN_TASKS),
          text: z.string(),
          evidence: z
            .array(z.object({ task_id: z.string(), line: z.number().int() }))
            .min(1)
            .describe('指回的学习者原话：哪道练习（所在闭环）里的第几行'),
          requested_by_learner: z.boolean().optional().describe('是学习者请求的就填真'),
        },
        run: async (a) => {
          try {
            await this.d.assertActiveLoop(loopId);
          } catch (e) {
            if (e instanceof BadRequestError) return fail(e.message);
            throw e;
          }
          const ids = [...new Set(a.task_ids as string[])];
          if (ids.length < SUMMARY_MIN_TASKS)
            return fail(`至少据 ${String(SUMMARY_MIN_TASKS)} 道不同的练习。`);
          const text = (a.text as string).trim();
          if (text === '') return fail('text 不能是空的。');
          const found: PracticeTaskView[] = [];
          for (const id of ids) {
            const t = await this.findTask(id);
            if (t === undefined) return fail(`没有这道练习：${id}。`);
            if (t.status !== 'completed')
              return fail(`练习 ${id} 还没完成，只能据已完成的练习归纳。`);
            found.push(t);
          }
          const loopOf = new Map(found.map((t) => [t.id, t.loopSessionId]));
          const evidence: { loopSessionId: string; line: number }[] = [];
          for (const e of a.evidence as { task_id: string; line: number }[]) {
            const lid = loopOf.get(e.task_id);
            if (lid === undefined) return fail(`evidence 里的练习 ${e.task_id} 不在 task_ids 里。`);
            const learner = learnerLines(await this.hub.records(lid));
            if (!learner.has(e.line)) {
              return fail(
                `会话 ${lid} 第 ${String(e.line)} 行不是学习者说的话；归纳只指回学习者的原话。`,
              );
            }
            evidence.push({ loopSessionId: lid, line: e.line });
          }
          const id = this.d.newId('ps');
          await this.hub.record(loopId, {
            type: 'practice_summary',
            at: this.d.iso(),
            id,
            tasks: found.map((t) => ({ loopSessionId: t.loopSessionId, taskId: t.id })),
            text,
            evidence,
            requestedBy: a.requested_by_learner === true ? 'learner' : 'teacher',
          });
          return ok(`归纳 ${id} 已记（只追加，界面里可看）。把要点简短讲给学习者。`);
        },
      },
    ];
  }
}

function statusText(s: PracticeTaskView['status']): string {
  switch (s) {
    case 'assigned':
      return '已布置、还没作答';
    case 'submitted':
      return '已作答、还没反馈';
    case 'feedback':
      return '已反馈';
    case 'completed':
      return '已完成';
    case 'abandoned':
      return '已放弃';
  }
}

/** 章的比较键：ch02 / 02 / 2 同一章。 */
function chapterKey(c: string): string {
  const t = c
    .trim()
    .toLowerCase()
    .replace(/^ch(apter)?[-_ ]*/, '');
  return /^\d+$/.test(t) ? String(Number(t)) : t;
}

/** 行号都得是学习者的话，且在布置之后；不对返回说明。 */
function lineProblem(
  recs: NumberedRecord[],
  lines: number[],
  afterLine: number,
): string | undefined {
  const learner = learnerLines(recs);
  const notLearner = lines.filter((l) => !learner.has(l));
  if (notLearner.length > 0) {
    return `第 ${notLearner.join('、')} 行不是学习者说的话；作答和依据只指回学习者的原话。`;
  }
  const early = lines.filter((l) => l <= afterLine);
  if (early.length > 0) return `第 ${early.join('、')} 行在这道练习布置之前，不算它的作答。`;
  return undefined;
}
