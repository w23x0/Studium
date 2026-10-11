// 跨闭环的长期功能（批 6）：复习 / 复检、重新掌握与降档、M09 当前视图、接着学、阶段复盘、
// 应用内提醒与“今天该做的”、路线偏差记录。对应 M05:22-25,29-30 · M09:18,28,30,32 · M04:18,49。
// 设计没写清的地方的补法见 工作单.md「补位清单」。studium.ts 只在几处挂钩，逻辑都在这里。
import { z } from 'zod';
import type {
  PointViewEntry,
  RegressionView,
  ReminderView,
  ReviewBrief,
  TimelineView,
  TodayItem,
  TodayView,
} from '../shared/protocol-longterm.ts';
import type {
  ChoiceCard,
  LogRecord,
  NumberedRecord,
  ReminderAdded,
  ReminderClosed,
  Ticket,
} from '../shared/records.ts';
import {
  REMINDER_KINDS,
  reviewReturnedFact,
  SUSPICIONS,
  type ReminderKind,
  type Revisit,
} from '../shared/records-longterm.ts';
import { NotFoundError, type Hub } from './hub.ts';
import type { Deviations } from './knowledge/m05-deviations.ts';
import type { M08 } from './knowledge/m08.ts';
import { LEVELS, TIMELINE_KINDS, type M09, type TimelineRecord } from './knowledge/m09.ts';
import { buildPointView } from './knowledge/m09-view.ts';
import type { M15 } from './knowledge/m15.ts';
import type { ToolResult, ToolSpec } from './model/port.ts';
import { learnerLines, renderTranscript } from './transcript.ts';
import { BadRequestError, foldDeadline } from './studium.ts';

/** 期限还有几天内算“临近”，进“今天该做的”（实现细节，可调）。 */
export const DEADLINE_NEAR_DAYS = 7;
/** 距上次复盘（或项目开始）多少天、期间又收尾了几个闭环，就建议做阶段复盘（实现细节，可调）。 */
export const REVIEW_EVERY_DAYS = 14;
export const REVIEW_MIN_ENDED = 2;
/** 开出去后学习者只说了这么几句就没合上结束，记为“很快放下”（实现细节，可调）。 */
export const QUICK_DROP_MESSAGES = 3;
/** M05 开场里最多列多少个点的现状 / 多少条路线偏差。 */
const VIEW_LINES = 25;
const DEVIATION_LINES = 8;
/** 复盘开场里各部分最多放多少条。 */
const REVIEW_LINES = 30;

export interface LongTermDeps {
  hub(): Hub;
  m08: M08;
  m09: M09;
  m15: M15;
  deviations: Deviations;
  now(): Date;
  iso(): string;
  newId(prefix: string): string;
  loopOpening(t: Ticket): string;
  projectOf(sessionId: string): Promise<string | undefined>;
  stateQueryTool(): ToolSpec;
}

/** 写 M09 的会话在干哪次活：哪个闭环、学习者的行、是不是重新分析。 */
interface M09Job {
  loopId: string;
  learner: Set<number>;
  redo: boolean;
}

export class LongTerm {
  private readonly m09Jobs = new Map<string, M09Job>();

  constructor(private readonly d: LongTermDeps) {}

  private get hub(): Hub {
    return this.d.hub();
  }

  private name(id: string): string {
    return this.d.m08.name(id);
  }

  private pointText(id: string): string {
    return `${id}「${this.name(id)}」`;
  }

  // ───────────── M09 当前视图（派生层，随时从记录重算）─────────────

  pointView(opt: { q?: string; status?: string } = {}): PointViewEntry[] {
    let entries = buildPointView(this.d.m09, (id) => this.name(id), this.d.now());
    if (opt.status !== undefined && opt.status !== '') {
      entries = entries.filter((e) => e.status === opt.status);
    }
    const q = opt.q?.trim().toLowerCase();
    if (q !== undefined && q !== '') {
      entries = entries.filter((e) =>
        [e.point.id, e.point.name, e.summary, ...e.keywords].some((s) =>
          s.toLowerCase().includes(q),
        ),
      );
    }
    return entries;
  }

  pointDetail(point: string): { entry: PointViewEntry; timeline: TimelineView[] } {
    const entry = this.pointView().find((e) => e.point.id === point);
    if (entry === undefined) throw new BadRequestError(`M09 里没有这个点的记录：${point}。`);
    return { entry, timeline: this.timelineViews(point) };
  }

  timelineViews(point?: string): TimelineView[] {
    return this.d.m09
      .timelines()
      .filter((t) => point === undefined || t.point === point)
      .map((t) => ({
        id: t.id,
        at: t.at,
        kind: t.kind,
        point: { id: t.point, name: this.name(t.point) },
        loopSessionId: t.loopSessionId,
        targets: t.targets,
        reason: t.reason,
        evidenceLines: t.evidenceLines,
        ...(t.stateRuledOut !== undefined ? { stateRuledOut: t.stateRuledOut } : {}),
        ...(t.level !== undefined ? { level: t.level } : {}),
        model: { name: t.model },
      }));
  }

  private viewLine(e: PointViewEntry): string {
    const ev = e.lastEvidence;
    return [
      `- ${this.pointText(e.point.id)}：状态 ${e.status}${e.level !== undefined ? `，层级 ${e.level}` : ''}；${
        ev !== undefined
          ? `最近证据 ${ev.at.slice(0, 10)}（距今 ${String(e.daysSince)} 天，${ev.role}，${ev.strength}${ev.revisit !== undefined ? `，${ev.revisit}` : ''}，记录 ${ev.recordId}）`
          : `只有外部导入（${e.lastTouchedAt.slice(0, 10)}，距今 ${String(e.daysSince)} 天）`
      }；摘要：${e.summary}`,
      ...e.timeline.map((t) => `    时间版本：${t.at.slice(0, 10)} ${t.kind}（${t.id}）`),
    ].join('\n');
  }

  /** 给模型的只读工具：M09 当前视图。 */
  viewTools(): ToolSpec[] {
    return [
      {
        name: 'query_m09_view',
        description:
          '查 M09 的当前视图（派生层，每个点一行：当前层级、状态、最近一次证据与强度、距今几天、一句话摘要）。可按点 id 或关键词查；不给参数列出全部（最久没碰的在前）。它是索引，不替代形成记录和证据。',
        input: { point: z.string().optional(), keyword: z.string().optional() },
        run: (a) => {
          let entries = this.pointView({ q: (a.keyword as string | undefined) ?? '' });
          const p = a.point as string | undefined;
          if (p !== undefined && p !== '') entries = entries.filter((e) => e.point.id === p);
          entries.sort((x, y) => x.lastTouchedAt.localeCompare(y.lastTouchedAt));
          return ok(
            entries.length > 0 ? entries.map((e) => this.viewLine(e)).join('\n') : '没有记录',
          );
        },
      },
    ];
  }

  // ───────────── 复习 / 复检 ─────────────

  /** M05 交回的单子上的 revisit 是否站得住：指向的形成记录存在、新点与单子的新点一致。 */
  revisitProblem(t: Ticket): string | undefined {
    const r = t.revisit;
    if (r === undefined) return undefined;
    if (r.formationIds.length === 0) return '复习 / 复检要指向以前的形成记录（formation_ids）';
    for (const id of r.formationIds) {
      const rec = this.d.m09.record(id);
      if (rec === undefined) return `M09 里没有形成记录 ${id}`;
      if (rec.newPoint !== t.newPoint) {
        return `形成记录 ${id} 的新点是 ${rec.newPoint}，不是单子的新点 ${t.newPoint}；复习 / 复检回头看的就是以前合上过的那个点`;
      }
    }
    return undefined;
  }

  /** 闭环开场里复习 / 复检的事实（没有就空）。 */
  revisitOpening(t: Ticket): string[] {
    const r = t.revisit;
    if (r === undefined) return [];
    const old = r.formationIds.flatMap((id) => {
      const rec = this.d.m09.record(id);
      return rec !== undefined ? [this.d.m09.describe(rec)] : [];
    });
    const timeline = this.d.m09
      .timelines()
      .filter((x) => x.point === t.newPoint)
      .map((x) => this.d.m09.describeTimeline(x, (id) => this.name(id)));
    return [
      `这是一次${r.kind}，不是第一次学这个点。${r.kind === '复检' ? '复检 = 对以前作出的掌握结论重新验证，是个短闭环。' : '复习 = 巩固已经形成的内容，是个短闭环。'}`,
      `以前的形成记录：\n${old.join('\n') || '（查不到）'}`,
      ...(timeline.length > 0 ? [`此后这个点的时间版本记录：\n${timeline.join('\n')}`] : []),
      '',
    ];
  }

  /** 复检 / 复习闭环写 M09 时，形成记录上标明（单子上有就标）。 */
  async revisitOfLoop(loopId: string): Promise<Revisit | undefined> {
    return (await this.hub.opened(loopId)).ticket?.revisit;
  }

  // ───────────── 教学侧：以前会的现在答不出（结构化诊断条目）─────────────

  loopTools(loopId: string): ToolSpec[] {
    return [
      {
        name: 'note_regression',
        description:
          '闭环里发现“以前会的（M09 里有记录，含外部导入）现在答不出 / 表现与之不符”时，在诊断里记一条结构化条目：哪个点、指回学习者原话的行、怀疑是什么原因（遗忘 / 提取失败 / 状态原因：疲劳、分心等）、针对 M09 哪条旧记录。这只是候选，不是 M09 记录；闭环合上时写 M09 的会话会读到这类条目（不读诊断全文），自己判断记不记。',
        input: {
          point: z.string().describe('哪个点（M08 点 id）'),
          observed: z.string().describe('观察到什么：以前的记录说会，现在表现怎样（一两句）'),
          basis_lines: z.array(z.number().int()).describe('指回学习者原话的行号'),
          suspicion: z.enum(SUSPICIONS),
          against: z
            .array(z.string())
            .optional()
            .describe('针对的 M09 旧记录 id（形成记录 / 外部导入）；不确定可不填'),
        },
        run: async (a) => {
          const recs = await this.hub.records(loopId);
          if (recs.some((r) => r.record.type === 'loop_ended')) return fail('这个闭环已经结束了。');
          const point = a.point as string;
          if (!this.d.m08.points.has(point)) return fail(`M08 里没有点 ${point}。`);
          const observed = (a.observed as string).trim();
          if (observed === '') return fail('observed 不能是空的：写清观察到什么。');
          const basis = a.basis_lines as number[];
          if (basis.length === 0) return fail('basis_lines 至少给一行学习者的原话。');
          const learner = learnerLines(recs);
          const bad = basis.filter((l) => !learner.has(l));
          if (bad.length > 0) {
            return fail(`第 ${bad.join('、')} 行不是学习者说的话；依据只指回学习者的原话行。`);
          }
          const against = (a.against as string[] | undefined) ?? [];
          const known = this.knownRecordIds(point);
          const unknown = against.filter((id) => !known.has(id));
          if (unknown.length > 0) return fail(`M09 里没有这个点的记录 ${unknown.join('、')}。`);
          if (known.size === 0) {
            return fail(
              `M09 里还没有点 ${point} 的记录，谈不上“以前会的”；这是前置缺口，用 request_detour 通知。`,
            );
          }
          await this.hub.record(loopId, {
            type: 'loop_note',
            at: this.d.iso(),
            text: observed,
            regression: {
              point,
              basisLines: basis,
              suspicion: a.suspicion as (typeof SUSPICIONS)[number],
              against,
            },
          });
          return ok(
            '已记为诊断里的结构化条目（候选）。它不构成 M09 记录；接着教，闭环合上时写 M09 的会话会读到。',
          );
        },
      },
    ];
  }

  /** M09 里与某个点有关的记录 id（形成记录、外部导入、时间版本记录）。 */
  private knownRecordIds(point: string): Set<string> {
    return new Set([
      ...this.d.m09
        .all()
        .filter((r) => r.newPoint === point || r.startPoints.includes(point))
        .map((r) => r.id),
      ...this.d.m09.externalsForPoint(point).map((r) => r.id),
      ...this.d.m09
        .timelines()
        .filter((t) => t.point === point)
        .map((t) => t.id),
    ]);
  }

  // ───────────── 写 M09 的会话：重新分析、复检、提取失败 / 降档 / 重新掌握 ─────────────

  /** 写 M09 的会话开出来时登记它在干哪个闭环的活。 */
  m09Opened(sessionId: string, loopId: string, records: NumberedRecord[], redo: boolean): void {
    this.m09Jobs.set(sessionId, { loopId, learner: learnerLines(records), redo });
  }

  m09Closed(sessionId: string): void {
    this.m09Jobs.delete(sessionId);
  }

  /** 写 M09 开场里追加的事实：重新分析的说明、复习 / 复检的旧记录、教学侧记的结构化条目（不含诊断全文）。 */
  async m09Opening(loopId: string, records: NumberedRecord[], redo: boolean): Promise<string[]> {
    const opened = await this.hub.opened(loopId);
    const out: string[] = [];
    if (redo) {
      const versions = this.d.m09.forLoop(loopId);
      out.push(
        `这一次是对这个已合上闭环的重新分析：已经有 ${String(versions.length)} 版分析（模型：${[...new Set(versions.map((v) => v.model))].join('、')}）。从原文独立重做一版，新版本与旧版本并存，旧的不改；只用 write_formation_record。`,
        '',
      );
      return out;
    }
    if (opened.ticket?.revisit !== undefined) {
      out.push(...this.revisitOpening(opened.ticket));
      out.push(
        `（这个闭环是${opened.ticket.revisit.kind}闭环，形成记录上程序会标明。${
          opened.ticket.revisit.kind === '复检'
            ? '复检合上后，若这个点此前有提取失败 / 降档记录，可用 write_timeline_record 追加“重新掌握”，须引学习者在本闭环里的原话行。'
            : ''
        }）`,
        '',
      );
    }
    const notes = records.flatMap((r) =>
      r.record.type === 'loop_note' && r.record.regression !== undefined
        ? [{ line: r.line, text: r.record.text, reg: r.record.regression }]
        : [],
    );
    if (notes.length > 0) {
      out.push(
        '教学侧在本闭环里记下的“以前会的现在答不出 / 表现不符”条目（结构化条目，只列这类，不含诊断全文）：',
        ...notes.map(({ line, text, reg }) => {
          const quotes = reg.basisLines.map((l) => {
            const rec = records.find((x) => x.line === l)?.record;
            return `L${String(l)}「${rec?.type === 'user_message' ? rec.text.slice(0, 120) : ''}」`;
          });
          return `- 诊断第 ${String(line)} 行：点 ${this.pointText(reg.point)}；怀疑：${reg.suspicion}；针对旧记录：${reg.against.join('、') || '未指明'}；依据学习者原话 ${quotes.join('、')}；教学侧说明：${text}`;
        }),
        '这些只是候选。要记“提取失败 / 降档”（write_timeline_record），得你自己判断学习者的表现确实与旧记录不符，并且已排除疲劳等状态侧解释（可用 query_state 看；教学侧怀疑是状态原因的，不记）。拿不准就不记。',
        '',
      );
    }
    return out;
  }

  /** 写 M09 的会话里的额外工具：追加时间版本记录（重新分析的会话没有）。 */
  m09Tools(sessionId: string): ToolSpec[] {
    const job = this.m09Jobs.get(sessionId);
    if (job === undefined || job.redo) return [];
    return [this.timelineTool(sessionId, job)];
  }

  private timelineTool(sessionId: string, job: M09Job): ToolSpec {
    return {
      name: 'write_timeline_record',
      description:
        '追加一条时间版本记录，指向 M09 里的旧记录，旧记录不改：提取失败 / 降档（来自本闭环里教学侧记下的结构化条目，须已排除状态侧解释）；重新掌握（只在复检闭环合上之后，此前这个点有提取失败 / 降档）。可以调用多次，每个点一条。',
      input: {
        kind: z.enum(TIMELINE_KINDS),
        point: z.string().describe('M08 点 id'),
        targets: z
          .array(z.string())
          .min(1)
          .describe('指向的旧记录 id（形成记录 / 外部导入 / 更早的时间版本记录）'),
        reason: z.string().describe('依据什么：学习者表现与旧记录哪里不符 / 复检里怎样做到了'),
        evidence_lines: z.array(z.number().int()).describe('学习者在本闭环里的原话行'),
        level: z.enum(LEVELS).optional().describe('降档后 / 重新掌握后的理解层级（降档必填）'),
        state_ruled_out: z
          .string()
          .optional()
          .describe('提取失败 / 降档必填：怎样排除了疲劳等状态侧解释'),
      },
      run: async (a) => {
        const kind = a.kind as (typeof TIMELINE_KINDS)[number];
        const point = a.point as string;
        if (!this.d.m08.points.has(point)) return fail(`M08 里没有点 ${point}。`);
        const lines = a.evidence_lines as number[];
        if (lines.length === 0) return fail('evidence_lines 至少给一行学习者的原话。');
        const bad = lines.filter((l) => !job.learner.has(l));
        if (bad.length > 0)
          return fail(`第 ${bad.join('、')} 行不是学习者说的话；证据只引学习者的行。`);
        const targets = a.targets as string[];
        const known = this.knownRecordIds(point);
        const unknown = targets.filter((id) => !known.has(id));
        if (unknown.length > 0) return fail(`M09 里没有点 ${point} 的记录 ${unknown.join('、')}。`);
        const reason = (a.reason as string).trim();
        if (reason === '') return fail('reason 不能是空的。');
        const level = a.level as (typeof LEVELS)[number] | undefined;
        const ruledOut = (a.state_ruled_out as string | undefined)?.trim();
        const recs = await this.hub.records(job.loopId);
        const opened = await this.hub.opened(job.loopId);
        if (kind === '重新掌握') {
          if (opened.ticket?.revisit?.kind !== '复检' || opened.ticket.newPoint !== point) {
            return fail('“重新掌握”只能来自这个点的复检闭环合上之后。');
          }
          const priors = this.d.m09
            .timelines()
            .filter((t) => t.point === point && (t.kind === '提取失败' || t.kind === '降档'));
          if (priors.length === 0) {
            return fail('这个点没有提取失败 / 降档记录，不需要记“重新掌握”。');
          }
        } else {
          // 遗忘 / 提取失败只能来自闭环结束的那次提交，且提交时已排除状态侧解释（M04:49 · M09:32）
          if (ruledOut === undefined || ruledOut === '') {
            return fail('提取失败 / 降档要写明怎样排除了疲劳等状态侧解释（state_ruled_out）。');
          }
          const flagged = recs.flatMap((r) =>
            r.record.type === 'loop_note' && r.record.regression?.point === point
              ? [r.record.regression]
              : [],
          );
          if (flagged.length === 0) {
            return fail(
              `本闭环里教学侧没有记过点 ${point} 的“以前会的现在答不出”条目；进行中没发现的，不能在提交时补记提取失败 / 降档。`,
            );
          }
          if (flagged.every((f) => f.suspicion === '状态原因')) {
            return fail('教学侧怀疑是状态原因（不是遗忘 / 提取失败），不记提取失败 / 降档。');
          }
          if (kind === '降档' && level === undefined)
            return fail('降档要写降档后的理解层级（level）。');
        }
        const rec: TimelineRecord = {
          id: this.d.newId('tl'),
          at: this.d.iso(),
          kind,
          point,
          loopSessionId: job.loopId,
          targets,
          reason,
          evidenceLines: lines,
          ...(ruledOut !== undefined && ruledOut !== '' ? { stateRuledOut: ruledOut } : {}),
          ...(level !== undefined ? { level } : {}),
          model: await this.hub.executedModel(sessionId),
        };
        await this.d.m09.addTimeline(rec);
        return ok(`已追加${kind}记录（${rec.id}），旧记录没有改。`);
      },
    };
  }

  // ───────────── M05：开场的长期读数、提醒工具、路线偏差挂钩 ─────────────

  /** M05 开场追加的段落：各点多久没碰了与当时证据强度、提醒、最近的路线偏差。 */
  async m05Opening(mainId: string): Promise<string[]> {
    const entries = this.pointView().filter((e) => e.status !== '仅外部导入');
    const oldest = [...entries].sort((x, y) => x.lastTouchedAt.localeCompare(y.lastTouchedAt));
    const reminders = (await this.reminderViews(mainId)).filter((r) => r.closed === undefined);
    const devs = this.d.deviations.all(mainId).slice(-DEVIATION_LINES);
    const resumes = await this.resumeLines(mainId);
    return [
      '── 长期读数（程序整理，供复习 / 复检与难度参考）──',
      entries.length > 0
        ? `M09 里合上过的点的现状（共 ${String(entries.length)} 个，最久没碰的在前，列前 ${String(VIEW_LINES)} 个；全部用 query_m09_view 查）：\n${oldest
            .slice(0, VIEW_LINES)
            .map((e) => this.viewLine(e))
            .join('\n')}`
        : 'M09 里还没有合上过的点（没有可复习 / 复检的）。',
      '',
      `提醒（还没办的）：${
        reminders.length > 0
          ? '\n' +
            reminders
              .map(
                (r) =>
                  `- ${r.id} ${r.due}${r.isDue ? '（已到期）' : `（还有 ${String(daysBetween(this.today(), r.due))} 天）`} ${r.text}`,
              )
              .join('\n')
          : '没有'
      }`,
      '',
      ...(resumes.length > 0 ? [`已经有人接着学的没合上的闭环：\n${resumes.join('\n')}`, ''] : []),
      `最近的路线偏差记录（只是计划偏差的事实：学习者没选推荐项、选了后很快放下 / 没合上、小卡上没照推荐走；不是对学习者水平的结论；${
        devs.length > 0 ? '' : '目前没有'
      }）：${
        devs.length > 0 ? '\n' + devs.map((r) => `- ${this.deviationText(r)}`).join('\n') : ''
      }`,
      '',
    ];
  }

  private deviationText(r: ReturnType<Deviations['all']>[number]): string {
    const day = r.at.slice(0, 10);
    const pick = (x?: { title: string; newPoint?: string }): string =>
      x === undefined
        ? ''
        : `「${x.title}」${x.newPoint !== undefined ? `（${this.pointText(x.newPoint)}）` : ''}`;
    if (r.kind === 'not_recommended') {
      return `${day} 没选推荐项：推荐 ${pick(r.recommended)}，学习者选了 ${pick(r.chosen)}（闭环 ${r.loopSessionId ?? ''}）`;
    }
    if (r.kind === 'ended_unclosed') {
      return `${day} 闭环 ${r.loopSessionId ?? ''} 没合上就结束：学习者说了 ${String(r.facts?.learnerMessages ?? 0)} 句、开了约 ${String(r.facts?.minutes ?? 0)} 分钟${r.facts?.quickDrop === true ? '（很快放下）' : ''}`;
    }
    return `${day} 闭环 ${r.loopSessionId ?? ''} 中途小卡上学习者选了${r.chosen?.kind ?? ''}${r.recommended !== undefined && r.chosen?.option === r.recommended.option ? '（照推荐）' : '（没照推荐）'}`;
  }

  /** M05 选择卡会话里的额外工具：加提醒。 */
  m05Tools(sessionId: string): ToolSpec[] {
    return [
      {
        name: 'add_reminder',
        description:
          '加一条应用内提醒（只追加，不是系统通知）：什么时候、做什么。复检某个点（kind=recheck，填 point）、接着某个没合上的闭环（kind=resume，填 loop）、期限前（kind=deadline，填 before_deadline_days）、其他。时间由你按 M09 记录的时间与证据强度判断，没有固定天数。可以调用多次。',
        input: {
          due: z.string().optional().describe('YYYY-MM-DD'),
          before_deadline_days: z
            .number()
            .int()
            .min(0)
            .optional()
            .describe('在项目期限前几天；与 due 二选一'),
          text: z.string().describe('做什么，给学习者看的日常话'),
          kind: z.enum(REMINDER_KINDS),
          point: z.string().optional().describe('recheck 时：M08 点 id'),
          loop: z.string().optional().describe('resume 时：闭环对话的会话 id'),
        },
        run: async (a) => {
          const main = await this.d.projectOf(sessionId);
          if (main === undefined) return fail('找不到这个会话所属的项目。');
          try {
            const r = await this.addReminder(
              main,
              {
                ...(a.due !== undefined ? { due: a.due as string } : {}),
                ...(a.before_deadline_days !== undefined
                  ? { beforeDeadlineDays: a.before_deadline_days as number }
                  : {}),
                text: a.text as string,
                kind: a.kind as ReminderKind,
                ...(a.point !== undefined ? { point: a.point as string } : {}),
                ...(a.loop !== undefined ? { loopSessionId: a.loop as string } : {}),
              },
              'm05',
              sessionId,
            );
            return await ok(`提醒已加（${r.id}，${r.due}）。`);
          } catch (e) {
            if (e instanceof BadRequestError) return fail(e.message);
            throw e;
          }
        },
      },
    ];
  }

  // ───────────── 提醒与“今天该做的” ─────────────

  /** 核心时钟的现在（ISO）。 */
  nowIso(): string {
    return this.d.iso();
  }

  today(): string {
    return this.d.now().toISOString().slice(0, 10);
  }

  async addReminder(
    mainId: string,
    input: {
      due?: string;
      beforeDeadlineDays?: number;
      text: string;
      kind?: ReminderKind;
      point?: string;
      loopSessionId?: string;
    },
    by: 'm05' | 'learner',
    m05SessionId?: string,
  ): Promise<ReminderView> {
    const main = await this.hub.records(mainId);
    const opened = main[0]?.record;
    if (opened?.type !== 'session_opened' || opened.kind !== 'main') {
      throw new BadRequestError('这不是一个项目。');
    }
    const text = input.text.trim();
    if (text === '') throw new BadRequestError('提醒要写清做什么。');
    const kind = input.kind ?? 'other';
    if (!(REMINDER_KINDS as readonly string[]).includes(kind)) {
      throw new BadRequestError(`提醒类型只能是 ${REMINDER_KINDS.join(' / ')}。`);
    }
    let due = input.due?.trim();
    if (due === undefined || due === '') {
      if (input.beforeDeadlineDays === undefined) {
        throw new BadRequestError(
          '要写提醒的日期（due），或写在期限前几天（beforeDeadlineDays）。',
        );
      }
      const dl = foldDeadline(main.map((r) => r.record)).deadline;
      if (dl === undefined) throw new BadRequestError('项目没有记期限，没法写“期限前几天”。');
      due = new Date(Date.parse(`${dl}T00:00:00Z`) - input.beforeDeadlineDays * 86_400_000)
        .toISOString()
        .slice(0, 10);
    } else if (!isDate(due)) {
      throw new BadRequestError('日期要写成 YYYY-MM-DD 的真实日期。');
    }
    if (input.point !== undefined && !this.d.m08.points.has(input.point)) {
      throw new BadRequestError(`M08 里没有点 ${input.point}。`);
    }
    if (kind === 'recheck' && input.point === undefined) {
      throw new BadRequestError('复检提醒要写是哪个点（point）。');
    }
    if (input.loopSessionId !== undefined) {
      const loop = await this.hub.opened(input.loopSessionId).catch((e: unknown) => {
        if (e instanceof NotFoundError) return undefined;
        throw e;
      });
      if (loop?.kind !== 'loop' || loop.parent !== mainId) {
        throw new BadRequestError(`本项目里没有这个闭环：${input.loopSessionId}。`);
      }
    }
    if (kind === 'resume' && input.loopSessionId === undefined) {
      throw new BadRequestError('接着学的提醒要写是哪个闭环（loop）。');
    }
    const rec: ReminderAdded = {
      type: 'reminder_added',
      at: this.d.iso(),
      id: this.d.newId('rm'),
      due,
      kind,
      text,
      ...(input.point !== undefined ? { point: input.point } : {}),
      ...(input.loopSessionId !== undefined ? { loopSessionId: input.loopSessionId } : {}),
      by,
      ...(m05SessionId !== undefined ? { m05SessionId } : {}),
    };
    await this.hub.record(mainId, rec);
    return this.reminderView(rec, undefined);
  }

  async closeReminder(
    mainId: string,
    id: string,
    outcome: 'done' | 'dismissed',
    by: 'learner' | 'program',
    note?: string,
  ): Promise<ReminderView> {
    const views = await this.reminderViews(mainId);
    const v = views.find((r) => r.id === id);
    if (v === undefined) throw new BadRequestError(`本项目里没有这条提醒：${id}。`);
    if (v.closed !== undefined) throw new BadRequestError('这条提醒已经办完 / 不要了。');
    const rec: ReminderClosed = {
      type: 'reminder_closed',
      at: this.d.iso(),
      id,
      outcome,
      by,
      ...(note !== undefined && note.trim() !== '' ? { note: note.trim() } : {}),
    };
    await this.hub.record(mainId, rec);
    return {
      ...v,
      closed: { at: rec.at, outcome, by, ...(rec.note !== undefined ? { note: rec.note } : {}) },
      isDue: false,
    };
  }

  private reminderView(r: ReminderAdded, closed: ReminderClosed | undefined): ReminderView {
    return {
      id: r.id,
      due: r.due,
      kind: r.kind,
      text: r.text,
      ...(r.point !== undefined ? { point: { id: r.point, name: this.name(r.point) } } : {}),
      ...(r.loopSessionId !== undefined ? { loopSessionId: r.loopSessionId } : {}),
      by: r.by,
      addedAt: r.at,
      ...(closed !== undefined
        ? {
            closed: {
              at: closed.at,
              outcome: closed.outcome,
              by: closed.by,
              ...(closed.note !== undefined ? { note: closed.note } : {}),
            },
          }
        : {}),
      isDue: closed === undefined && r.due <= this.today(),
    };
  }

  /** 项目里全部提醒（按到期日、添加先后），含办完的。 */
  async reminderViews(mainId: string): Promise<ReminderView[]> {
    const recs = (await this.hub.records(mainId)).map((r) => r.record);
    const closed = new Map<string, ReminderClosed>();
    for (const r of recs) if (r.type === 'reminder_closed') closed.set(r.id, r);
    return recs
      .flatMap((r) => (r.type === 'reminder_added' ? [this.reminderView(r, closed.get(r.id))] : []))
      .sort((a, b) => a.due.localeCompare(b.due) || a.addedAt.localeCompare(b.addedAt));
  }

  /** 今天该做的：到期的提醒、期限临近、该做阶段复盘了。 */
  async todayView(mainId: string): Promise<TodayView> {
    const date = this.today();
    const items: TodayItem[] = [];
    for (const r of await this.reminderViews(mainId)) {
      if (r.isDue)
        items.push({ kind: 'reminder', reminder: r, overdueDays: daysBetween(r.due, date) });
    }
    const recs = (await this.hub.records(mainId)).map((r) => r.record);
    const dl = foldDeadline(recs);
    if (dl.deadline !== undefined) {
      const daysLeft = daysBetween(date, dl.deadline);
      if (daysLeft <= DEADLINE_NEAR_DAYS) {
        items.push({
          kind: 'deadline',
          date: dl.deadline,
          daysLeft,
          ...(dl.note !== undefined ? { note: dl.note } : {}),
        });
      }
    }
    const since = await this.reviewSince(mainId);
    const base = Date.parse(since);
    if ((this.d.now().getTime() - base) / 86_400_000 >= REVIEW_EVERY_DAYS) {
      const ended = await this.endedLoopsSince(mainId, since);
      if (ended >= REVIEW_MIN_ENDED) items.push({ kind: 'review', since, endedLoops: ended });
    }
    return { date, items };
  }

  // ───────────── 路线偏差记录 ─────────────

  /** 学习者在选择卡上选定之后：没选推荐项记一条；顺手办掉已经对上的提醒。 */
  async onChosen(mainId: string, card: ChoiceCard, option: number, loopId: string): Promise<void> {
    const picked = card.options[option];
    const rec = card.options[card.recommended];
    if (picked === undefined) return;
    if (option !== card.recommended && rec !== undefined) {
      await this.d.deviations.add({
        id: this.d.newId('dv'),
        at: this.d.iso(),
        mainSessionId: mainId,
        kind: 'not_recommended',
        loopSessionId: loopId,
        cardId: card.cardId,
        recommended: { option: card.recommended, title: rec.title, newPoint: rec.ticket.newPoint },
        chosen: { option, title: picked.title, newPoint: picked.ticket.newPoint },
      });
    }
    for (const r of await this.reminderViews(mainId)) {
      if (
        r.closed === undefined &&
        r.kind === 'recheck' &&
        r.point?.id === picked.ticket.newPoint
      ) {
        await this.closeReminder(mainId, r.id, 'done', 'program', `已开出闭环 ${loopId}`);
      }
    }
  }

  /** 闭环没合上就结束：记一条路线偏差（说了几句、开了多久、是不是很快放下）。 */
  async onUnclosed(loopId: string): Promise<void> {
    const opened = await this.hub.opened(loopId);
    if (opened.parent === undefined) return;
    const recs = await this.hub.records(loopId);
    const ended = recs.find((r) => r.record.type === 'loop_ended');
    const messages = recs.filter((r) => r.record.type === 'user_message').length;
    const minutes = Math.max(
      0,
      Math.round((Date.parse(ended?.record.at ?? this.d.iso()) - Date.parse(opened.at)) / 60_000),
    );
    await this.d.deviations.add({
      id: this.d.newId('dv'),
      at: this.d.iso(),
      mainSessionId: opened.parent,
      kind: 'ended_unclosed',
      loopSessionId: loopId,
      facts: {
        learnerMessages: messages,
        minutes,
        quickDrop: messages <= QUICK_DROP_MESSAGES,
        ...(ended?.record.type === 'loop_ended' && ended.record.note !== ''
          ? { note: ended.record.note }
          : {}),
      },
    });
  }

  /** 闭环中途小卡上选定之后：记 M05 最终的调整（开分叉 / 维持 / 搁置），标明是否照推荐。 */
  async onDetourChosen(
    loopId: string,
    cardId: string,
    option: number,
    choice: string,
  ): Promise<void> {
    const opened = await this.hub.opened(loopId);
    if (opened.parent === undefined) return;
    const card = (await this.hub.records(loopId)).find(
      (r) => r.record.type === 'detour_card' && r.record.cardId === cardId,
    )?.record;
    if (card?.type !== 'detour_card') return;
    const rec = card.options[card.recommended];
    await this.d.deviations.add({
      id: this.d.newId('dv'),
      at: this.d.iso(),
      mainSessionId: opened.parent,
      kind: 'detour_choice',
      loopSessionId: loopId,
      cardId,
      ...(rec !== undefined ? { recommended: { option: card.recommended, title: rec.title } } : {}),
      chosen: { option, title: card.options[option]?.title ?? '', kind: choice },
    });
  }

  deviationViews(mainId?: string) {
    return this.d.deviations.all(mainId).map((r) => ({
      id: r.id,
      at: r.at,
      mainSessionId: r.mainSessionId,
      kind: r.kind,
      ...(r.loopSessionId !== undefined ? { loopSessionId: r.loopSessionId } : {}),
      ...(r.cardId !== undefined ? { cardId: r.cardId } : {}),
      ...(r.recommended !== undefined
        ? {
            recommended: {
              option: r.recommended.option,
              title: r.recommended.title,
              ...(r.recommended.newPoint !== undefined
                ? {
                    newPoint: {
                      id: r.recommended.newPoint,
                      name: this.name(r.recommended.newPoint),
                    },
                  }
                : {}),
            },
          }
        : {}),
      ...(r.chosen !== undefined
        ? {
            chosen: {
              option: r.chosen.option,
              title: r.chosen.title,
              ...(r.chosen.newPoint !== undefined
                ? { newPoint: { id: r.chosen.newPoint, name: this.name(r.chosen.newPoint) } }
                : {}),
              ...(r.chosen.kind !== undefined ? { kind: r.chosen.kind } : {}),
            },
          }
        : {}),
      ...(r.facts !== undefined ? { facts: r.facts } : {}),
    }));
  }

  // ───────────── 停车场：接着学原闭环 ─────────────

  /** 没合上就结束的闭环，学习者点“接着学”：开一个新闭环续接它（记 resumeOf），原闭环正本不改。 */
  async continueLoop(loopId: string): Promise<string> {
    const orig = await this.hub.opened(loopId);
    if (orig.kind !== 'loop') throw new BadRequestError('这段对话不是一次学习任务。');
    const recs = await this.hub.records(loopId);
    const ended = recs.find((r) => r.record.type === 'loop_ended');
    if (ended?.record.type !== 'loop_ended') {
      throw new BadRequestError('这部分还没结束；搁置着的点“接着学”，进行中的直接继续。');
    }
    if (ended.record.closed) throw new BadRequestError('这部分已经合上了，不用接着学。');
    const ticket = orig.ticket;
    const main = orig.parent;
    if (ticket === undefined || main === undefined) {
      throw new BadRequestError('这部分没有单子，接不上。');
    }
    if (ticket.revisit === undefined && this.d.m09.knownPoints().includes(ticket.newPoint)) {
      throw new BadRequestError('这个点后来已经合上了，不用再接着学。');
    }
    const successor = this.hub.listSessions().filter((s) => s.kind === 'loop' && s.parent === main);
    for (const s of successor) {
      const o = await this.hub.opened(s.sessionId);
      if (o.resumeOf?.fromLoop !== loopId) continue;
      const st = await this.hub.records(s.sessionId);
      if (!st.some((r) => r.record.type === 'loop_ended')) {
        throw new BadRequestError(`已经在接着学了（${s.sessionId}），回到那里继续。`);
      }
    }
    const block = this.resumeBlock(orig.title, loopId, orig.at, recs);
    const loop = await this.hub.createSession('loop', {
      title: `接着学：${orig.title}`,
      parent: main,
      ticket,
      resumeOf: { fromLoop: loopId, endedAt: ended.record.at },
    });
    await this.hub.send(loop.sessionId, {
      role: 'program',
      text: [...block, '', this.d.loopOpening(ticket)].join('\n'),
    });
    for (const r of await this.reminderViews(main)) {
      if (r.closed === undefined && r.kind === 'resume' && r.loopSessionId === loopId) {
        await this.closeReminder(main, r.id, 'done', 'program', `已开出闭环 ${loop.sessionId}`);
      }
    }
    return loop.sessionId;
  }

  private resumeBlock(
    title: string,
    loopId: string,
    openedAt: string,
    recs: NumberedRecord[],
  ): string[] {
    const ended = recs.find((r) => r.record.type === 'loop_ended')?.record;
    const parking = recs.filter((r) => r.record.type === 'parking_note').at(-1)?.record;
    const verdict = recs.filter((r) => r.record.type === 'guard_verdict').at(-1)?.record;
    const signals = recs.flatMap((r) =>
      r.record.type === 'route_signal'
        ? [
            `原闭环第 ${String(r.line)} 行 ${r.record.kind === 'gap' ? '前置缺口' : '想分叉'}：${r.record.missingText}`,
          ]
        : [],
    );
    const talk = recs.filter(
      (r) => r.record.type === 'user_message' || r.record.type === 'assistant_message',
    );
    const learnerSaid = talk
      .filter((r) => r.record.type === 'user_message')
      .slice(0, 30)
      .map(
        (r) =>
          `  原闭环第 ${String(r.line)} 行：${(r.record.type === 'user_message' ? r.record.text : '').slice(0, 120)}`,
      );
    return [
      `这是接着以前没合上的闭环学，不是从头开始。原闭环：「${title}」（会话 ${loopId}，${openedAt.slice(0, 10)} 开始，${ended?.at.slice(0, 10) ?? ''} 结束）。原闭环的正本不改；下面是它的摘要。`,
      `结束时学习者说：${ended?.type === 'loop_ended' ? ended.note : ''}`,
      ...(parking?.type === 'parking_note'
        ? [
            `停车记录：缺 ${parking.missing.map((m) => (m.point !== undefined ? this.pointText(m.point) : m.text)).join('、')}；恢复计划：${parking.when}，从${parking.resumeFrom}接上。`,
          ]
        : ['停车记录：没有。']),
      ...(verdict?.type === 'guard_verdict'
        ? [
            `守卫最后一次判定：${verdict.closed ? '合上' : '未合上'}。${verdict.problem ?? verdict.basis}`,
          ]
        : []),
      ...(signals.length > 0 ? ['教学侧中途报过的缺口：', ...signals] : []),
      '学习者在原闭环里说过的话（行号是原闭环的，不能当本闭环的证据行）：',
      ...(learnerSaid.length > 0 ? learnerSaid : ['  （没说过）']),
      '原闭环最后几轮：',
      renderTranscript(talk.slice(-6))
        .replace(/^L(\d+)/gm, '  原闭环第 $1 行')
        .slice(0, 2400),
      '要看原闭环的全文，用 read_loop 读会话 ' +
        loopId +
        '。接着时先简短说明接上哪里，不重复讲已经讲通的。',
    ];
  }

  /** M05 开场：哪些没合上的闭环已经有人接着学了。 */
  private async resumeLines(mainId: string): Promise<string[]> {
    const out: string[] = [];
    for (const s of this.hub
      .listSessions()
      .filter((x) => x.kind === 'loop' && x.parent === mainId)) {
      const o = await this.hub.opened(s.sessionId);
      if (o.resumeOf === undefined) continue;
      const done = (await this.hub.records(s.sessionId)).find(
        (r) => r.record.type === 'loop_ended',
      )?.record;
      out.push(
        `- ${o.resumeOf.fromLoop} 被 ${s.sessionId}「${s.title}」接着学：${done?.type === 'loop_ended' ? (done.closed ? '已合上' : '又没合上就结束') : '进行中'}`,
      );
    }
    return out;
  }

  /** 某个没合上的闭环被哪些新闭环接着学（项目页用）。 */
  async resumedBy(
    mainId: string,
    loopId: string,
  ): Promise<{ loopSessionId: string; title: string; closed?: boolean; ended: boolean }[]> {
    const out = [];
    for (const s of this.hub
      .listSessions()
      .filter((x) => x.kind === 'loop' && x.parent === mainId)) {
      const o = await this.hub.opened(s.sessionId);
      if (o.resumeOf?.fromLoop !== loopId) continue;
      const done = (await this.hub.records(s.sessionId)).find(
        (r) => r.record.type === 'loop_ended',
      )?.record;
      out.push({
        loopSessionId: s.sessionId,
        title: s.title,
        ended: done?.type === 'loop_ended',
        ...(done?.type === 'loop_ended' ? { closed: done.closed } : {}),
      });
    }
    return out;
  }

  // ───────────── 阶段复盘 ─────────────

  mainTools(mainId: string): ToolSpec[] {
    return [
      {
        name: 'open_review',
        description:
          '学习者要“复盘”、回看这段时间学得怎么样、下一阶段怎么走时调用：在他刚才这条消息下开一个单独复盘的对话。主对话自己不复盘。since 是回看的起点 YYYY-MM-DD，学习者没说就不填（默认从上一次复盘或项目开始算起）。',
        input: { since: z.string().optional() },
        run: async (a) => {
          const recs = await this.hub.records(mainId);
          const asked = recs.filter((r) => r.record.type === 'user_message').at(-1);
          try {
            const r = await this.startReview(mainId, {
              ...(a.since !== undefined && a.since !== '' ? { since: a.since as string } : {}),
              ...(asked !== undefined ? { anchorLine: asked.line } : {}),
            });
            return await ok(
              `已在学习者这条消息下开了复盘的对话（回看 ${r.since.slice(0, 10)} 起），学习者点进去看；复盘完会交回这里一句。`,
            );
          } catch (e) {
            if (e instanceof BadRequestError) return fail(e.message);
            throw e;
          }
        },
      },
    ];
  }

  /** 畅谈类会话的另一种活（阶段复盘）的工具：状态与当前视图查询 + 交回（查询 M08 / M07 / M09 的工具畅谈本来就有）。 */
  reviewTools(talkId: string): ToolSpec[] {
    return [
      this.d.stateQueryTool(),
      ...this.viewTools(),
      {
        name: 'finish_review',
        description:
          '阶段复盘专用（谈方向的对话里不要用）：复盘说完、学习者没有别的要接着聊时，把交回主对话的一句话交回，本对话随之结束。只调一次。',
        input: { summary: z.string().describe('交回主对话的一句话：这一阶段的要点和下一步') },
        run: async (a) => {
          const opened = await this.hub.opened(talkId);
          if (opened.review === undefined) return fail('这不是阶段复盘的对话，不能用这个工具。');
          const recs = await this.hub.records(talkId);
          if (recs.some((r) => r.record.type === 'talk_ended')) return fail('已经交回过了。');
          const summary = (a.summary as string).trim();
          if (summary === '') return fail('summary 不能是空的。');
          const mainId = opened.parent;
          if (mainId === undefined) return fail('找不到这个对话所属的项目。');
          await this.hub.record(talkId, {
            type: 'talk_ended',
            at: this.d.iso(),
            goal: summary,
            title: opened.title,
            review: opened.review,
          });
          await this.hub.send(mainId, {
            role: 'program',
            text: reviewReturnedFact(talkId, summary),
          });
          return ok('复盘已交回项目，本对话结束。和学习者简短说一句就好。');
        },
      },
    ];
  }

  /** 复盘窗口的起点：上一次复盘的终点，没有就是项目开始。 */
  private async reviewSince(mainId: string): Promise<string> {
    const reviews = await this.reviews(mainId);
    const last = reviews.at(-1);
    if (last !== undefined) return last.until;
    return (await this.hub.opened(mainId)).at;
  }

  private async endedLoopsSince(mainId: string, since: string): Promise<number> {
    let n = 0;
    for (const s of this.hub
      .listSessions()
      .filter((x) => x.kind === 'loop' && x.parent === mainId)) {
      const e = (await this.hub.records(s.sessionId)).find((r) => r.record.type === 'loop_ended');
      if (e !== undefined && e.record.at >= since) n++;
    }
    return n;
  }

  async reviews(mainId: string): Promise<ReviewBrief[]> {
    const out: ReviewBrief[] = [];
    for (const s of this.hub
      .listSessions()
      .filter((x) => x.kind === 'talk' && x.parent === mainId)) {
      const o = await this.hub.opened(s.sessionId);
      if (o.review === undefined) continue;
      const end = (await this.hub.records(s.sessionId)).find(
        (r) => r.record.type === 'talk_ended',
      )?.record;
      out.push({
        sessionId: s.sessionId,
        openedAt: o.at,
        since: o.review.since,
        until: o.review.until,
        ...(end?.type === 'talk_ended' ? { summary: end.goal, endedAt: end.at } : {}),
      });
    }
    return out.sort((a, b) => a.openedAt.localeCompare(b.openedAt));
  }

  /** 开一个复盘对话：读这段时间的 M09 / 停车场 / M15 当前状态，给学习者一段复盘，最后交回主对话一句。 */
  async startReview(
    mainId: string,
    opt: { since?: string; anchorLine?: number } = {},
  ): Promise<{ sessionId: string; since: string; until: string }> {
    const main = await this.hub.records(mainId);
    const mainOpened = main[0]?.record;
    if (mainOpened?.type !== 'session_opened' || mainOpened.kind !== 'main') {
      throw new BadRequestError('这不是一个项目。');
    }
    let since: string;
    if (opt.since !== undefined && opt.since !== '') {
      if (!isDate(opt.since)) throw new BadRequestError('since 要写成 YYYY-MM-DD 的真实日期。');
      since = `${opt.since}T00:00:00.000Z`;
    } else {
      since = await this.reviewSince(mainId);
    }
    const until = this.d.iso();
    if (since > until) throw new BadRequestError('回看的起点要早于现在。');
    const anchorLine = opt.anchorLine ?? main.at(-1)?.line ?? 1;
    const title = '阶段复盘';
    const talk = await this.hub.createSession('talk', {
      title,
      parent: mainId,
      anchorLine,
      review: { since, until },
    });
    await this.hub.record(mainId, {
      type: 'task_opened',
      at: until,
      sessionId: talk.sessionId,
      kind: 'talk',
      title,
      anchorLine,
    });
    await this.hub.send(talk.sessionId, {
      role: 'program',
      text: await this.reviewOpening(mainId, since, until),
    });
    return { sessionId: talk.sessionId, since, until };
  }

  private async reviewOpening(mainId: string, since: string, until: string): Promise<string> {
    const recs = (await this.hub.records(mainId)).map((r) => r.record);
    const goal = recs.filter((r) => r.type === 'project_goal').at(-1);
    const dl = foldDeadline(recs);
    const inWin = (at: string): boolean => at >= since && at <= until;
    const loopLines: string[] = [];
    const parked: string[] = [];
    const known = new Set(this.d.m09.knownPoints());
    for (const s of this.hub
      .listSessions()
      .filter((x) => x.kind === 'loop' && x.parent === mainId)) {
      const o = await this.hub.opened(s.sessionId);
      const lr = await this.hub.records(s.sessionId);
      const end = lr.find((r) => r.record.type === 'loop_ended')?.record;
      const touched = lr.some((r) => inWin(r.record.at));
      if (!touched) continue;
      const state =
        end?.type === 'loop_ended'
          ? end.closed
            ? '合上'
            : '没合上就结束'
          : lr.some((r) => r.record.type === 'loop_shelved')
            ? '进行中或搁置'
            : '进行中';
      loopLines.push(
        `- ${s.sessionId}「${s.title}」${o.ticket !== undefined ? `（${this.pointText(o.ticket.newPoint)}${o.ticket.revisit !== undefined ? `，${o.ticket.revisit.kind}` : ''}）` : ''}：${state}，${o.at.slice(0, 10)} 开始`,
      );
      const parking = lr.filter((r) => r.record.type === 'parking_note').at(-1)?.record;
      if (
        end?.type === 'loop_ended' &&
        !end.closed &&
        o.ticket !== undefined &&
        !known.has(o.ticket.newPoint)
      ) {
        parked.push(
          `- ${s.sessionId}「${s.title}」${parking?.type === 'parking_note' ? `：缺 ${parking.missing.map((m) => m.text).join('、')}；恢复计划 ${parking.when}，从${parking.resumeFrom}接上` : '：没有停车记录'}`,
        );
      }
    }
    const forms = this.d.m09
      .current()
      .filter((r) => inWin(this.d.m09.forLoop(r.loopSessionId)[0]?.at ?? r.at));
    const tl = this.d.m09.timelines().filter((t) => inWin(t.at));
    const touchedPoints = new Set([...forms.map((f) => f.newPoint), ...tl.map((t) => t.point)]);
    const viewLines = this.pointView()
      .filter((e) => touchedPoints.has(e.point.id))
      .map((e) => this.viewLine(e));
    const devs = this.d.deviations.all(mainId).filter((r) => inWin(r.at));
    const earlier = (await this.reviews(mainId)).filter((r) => r.summary !== undefined);
    const state = this.d.m15.describeCurrent();
    return [
      `这一次的活：给学习者做一次阶段复盘（回看 ${since.slice(0, 10)} 到 ${until.slice(0, 10)}），不是谈方向。`,
      `方向目标：${goal?.type === 'project_goal' ? goal.text : '（还没有）'}；期限：${dl.deadline ?? '没有记'}`,
      '',
      `这段时间动过的闭环：\n${loopLines.join('\n') || '（没有）'}`,
      '',
      `本阶段 M09 新增的形成记录（每个闭环最新一版分析）：\n${
        forms
          .slice(0, REVIEW_LINES)
          .map((f) => this.d.m09.describe(f))
          .join('\n') || '（没有）'
      }`,
      '',
      `本阶段的时间版本记录（提取失败 / 降档 / 重新掌握）：\n${tl.map((t) => this.d.m09.describeTimeline(t, (id) => this.name(id))).join('\n') || '（没有）'}`,
      '',
      `涉及的点现在的状态（M09 当前视图）：\n${viewLines.slice(0, REVIEW_LINES).join('\n') || '（没有）'}`,
      '',
      `停车场（本阶段没合上就结束、缺口还没补上）：\n${parked.join('\n') || '空'}`,
      '',
      `学习者的状态（M15 当前状态页）：\n${state}`,
      '',
      `本阶段的路线偏差（计划偏差的事实）：\n${devs.map((r) => `- ${this.deviationText(r)}`).join('\n') || '（没有）'}`,
      '',
      `此前的复盘交回的话：\n${earlier.map((r) => `- ${r.until.slice(0, 10)}：${r.summary ?? ''}`).join('\n') || '（没有）'}`,
      '',
      '按上面的事实写复盘：综合阶段目标、已完成的、没满足的、关键连接，给下一阶段路线的建议；不用单一分数代替证据。说完后学习者可能追问，他没有别的要聊时用 finish_review 交回一句。',
    ].join('\n');
  }
}

function ok(text: string): Promise<ToolResult> {
  return Promise.resolve({ text });
}

function fail(text: string): Promise<ToolResult> {
  return Promise.resolve({ text, isError: true });
}

function isDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = Date.parse(`${s}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
}

/** b 比 a 晚几天（YYYY-MM-DD；b 在 a 之前为负）。 */
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export type { LogRecord, RegressionView };
