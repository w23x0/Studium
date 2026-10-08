// Studium 的闭环外：按事件跑清单（03「闭环外：事件与清单」「收口与闭环守卫」）。
// 每种会话的系统提示与工具在这里给；写权限靠给什么工具来卡（03「读写权限」）。
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import type {
  ChoiceCard,
  ChoiceOption,
  ConversationKind,
  GuardVerdict,
  LogRecord,
  NumberedRecord,
  Ticket,
} from '../shared/records.ts';
import { NotFoundError, type Hub, type KindConfig } from './hub.ts';
import type { Library } from './knowledge/m07.ts';
import type { M08 } from './knowledge/m08.ts';
import type { M09 } from './knowledge/m09.ts';
import type { M10 } from './knowledge/m10.ts';
import { STAGES, type M15 } from './knowledge/m15.ts';
import type { ToolResult, ToolSpec } from './model/port.ts';
import { learnerLines, renderTranscript } from './transcript.ts';

export class BadRequestError extends Error {}

/** 学习者离开多久算“隔了一阵回来”，回来时程序追加离开多久。 */
const AWAY_MS = 30 * 60 * 1000;
/** 隔多久回来算“隔很久”，M15 顺带整理一次（03「M15」何时整理；阈值属实现细节，先定 12 小时）。 */
const LONG_AWAY_MS = 12 * 3600 * 1000;
/** M15 开场里教学行只放开头一段（作紧邻前序事件），全文用 read_session 查。 */
const TEACHING_EXCERPT = 160;

export interface StudiumOptions {
  prompts: Record<ConversationKind, string>;
  m07: Library;
  m08: M08;
  m09: M09;
  m10: M10;
  m15: M15;
  now?: () => Date;
}

export class Studium {
  private hubRef: Hub | undefined;
  private readonly now: () => Date;
  /** 后台跑着的清单（合上之后、M15 整理、M10 记录……），回放与测试用来等它们跑完。 */
  private readonly tasks = new Set<Promise<unknown>>();
  /** M15 整理一次只跑一个，后到的排在后面。 */
  private stateChain: Promise<void> = Promise.resolve();

  constructor(private readonly o: StudiumOptions) {
    this.now = o.now ?? (() => new Date());
  }

  private iso(): string {
    return this.now().toISOString();
  }

  private readonly idListeners = new Set<(prefix: string, id: string) => void>();

  /** 程序生成的编号（选择卡、M09 / M15 / M10 记录）；录带按生成顺序给它们稳定记号。 */
  private newId(prefix: string): string {
    const id = `${prefix}-${randomBytes(4).toString('hex')}`;
    for (const fn of this.idListeners) fn(prefix, id);
    return id;
  }

  onNewId(fn: (prefix: string, id: string) => void): () => void {
    this.idListeners.add(fn);
    return () => this.idListeners.delete(fn);
  }

  /** 后台还有事在跑吗（录带记下学习者动作时系统是否空闲）。 */
  busy(): boolean {
    return this.tasks.size > 0 || this.hub.anyRunning();
  }

  /** 在后台跑一件事，不挡调用方；失败写进核心日志（不吞）。 */
  background(what: string, fn: () => Promise<unknown>): void {
    const p = fn()
      .catch((e: unknown) => {
        console.error(`${what}失败：`, e);
      })
      .finally(() => this.tasks.delete(p));
    this.tasks.add(p);
  }

  /** 等后台清单与所有会话都停下（回放、测试用）。 */
  async settled(): Promise<void> {
    for (;;) {
      await Promise.all([...this.tasks]);
      await this.hub.idleAll();
      if (this.tasks.size === 0 && !this.hub.anyRunning()) return;
    }
  }

  attach(hub: Hub): void {
    this.hubRef = hub;
  }

  private get hub(): Hub {
    if (!this.hubRef) throw new Error('Studium 还没接上 Hub');
    return this.hubRef;
  }

  // ───────────── 会话种类：系统提示 + 工具 ─────────────

  kind = (kind: ConversationKind): KindConfig => ({
    systemPrompt: this.o.prompts[kind],
    tools: (sessionId) => {
      switch (kind) {
        case 'main':
          return this.mainTools(sessionId);
        case 'talk':
          return [...this.readTools(), this.settleGoalTool(sessionId)];
        case 'loop':
          return [...this.readTools(), ...this.loopTools(sessionId)];
        case 'guard':
          return [...this.readTools({ m09: false }), this.verdictTool(sessionId)];
        case 'm09':
          return [...this.readTools({ m09: false }), this.formationTool(sessionId)];
        case 'm05':
          return [
            ...this.readTools(),
            this.loopTranscriptTool(),
            this.stateQueryTool(),
            this.cardTool(sessionId),
          ];
        case 'm15':
          return this.stateTools(sessionId);
        case 'm10':
          return [
            ...this.readTools({ m07: false, m09: false }),
            this.stateQueryTool(),
            this.strategyTool(sessionId),
          ];
      }
    },
  });

  // ───────────── 事件 ─────────────

  /** 一个项目一条主对话；没有就开一条。 */
  async ensureMain(): Promise<string> {
    const main = this.hub.listSessions().find((s) => s.kind === 'main');
    if (main) return main.sessionId;
    return this.createProject();
  }

  /** 开一个新项目（= 一条新的主对话）。 */
  async createProject(title?: string): Promise<string> {
    const n = this.hub.listSessions().filter((s) => s.kind === 'main').length + 1;
    const t = title?.trim() ? title.trim() : `项目 ${String(n)}`;
    return (await this.hub.createSession('main', { title: t })).sessionId;
  }

  /** 所有项目：主对话 + 最近谈定的方向目标；项目名取最新一条 project_title（没有就用开项目时的名字）。 */
  async listProjects(): Promise<{ mainSessionId: string; title: string; goal?: string }[]> {
    const out: { mainSessionId: string; title: string; goal?: string }[] = [];
    for (const m of this.hub.listSessions().filter((s) => s.kind === 'main')) {
      const recs = (await this.hub.records(m.sessionId)).map((r) => r.record);
      const goal = recs.filter((r) => r.type === 'project_goal').at(-1);
      const title = recs.filter((r) => r.type === 'project_title').at(-1);
      const opened = recs[0];
      out.push({
        mainSessionId: m.sessionId,
        title:
          title?.type === 'project_title'
            ? title.title
            : opened?.type === 'session_opened'
              ? opened.title
              : m.title,
        ...(goal?.type === 'project_goal' ? { goal: goal.text } : {}),
      });
    }
    return out;
  }

  /** 学习者在某个对话里发话。隔了一阵回来，先追加离开多久（03「闭环外」暂停）。 */
  async learnerSays(sessionId: string, text: string): Promise<void> {
    const recs = await this.hub.records(sessionId);
    if (recs.some((r) => r.record.type === 'loop_ended' || r.record.type === 'talk_ended')) {
      throw new BadRequestError('这段对话已经结束了，回到项目里接着聊。');
    }
    const last = recs
      .map((r) => r.record)
      .filter((r) => r.type === 'user_message' || r.type === 'assistant_message')
      .at(-1);
    if (last !== undefined) {
      const away = this.now().getTime() - Date.parse(last.at);
      if (away > AWAY_MS) {
        await this.hub.send(sessionId, {
          role: 'program',
          text: `学习者离开了约 ${formatDuration(away)}，现在回来了。`,
        });
      }
      await this.hub.send(sessionId, { role: 'learner', text });
      if (away > LONG_AWAY_MS) {
        this.organizeStateLater(`学习者隔了约 ${formatDuration(away)} 回来`, sessionId);
      }
      return;
    }
    await this.hub.send(sessionId, { role: 'learner', text });
  }

  /** M05 出选择卡，贴进主对话。trigger 写明为什么要卡。 */
  async requestCard(trigger: string, projectId?: string): Promise<ChoiceCard> {
    const mainId = projectId ?? (await this.ensureMain());
    const m05 = await this.hub.createSession('m05', { title: '出选择卡', parent: mainId });
    await this.hub.send(m05.sessionId, {
      role: 'program',
      text: await this.m05Opening(trigger, mainId),
    });
    await this.hub.idle(m05.sessionId);
    const card = this.cards.get(m05.sessionId);
    if (!card) throw new Error('M05 没有提交选择卡（见该会话记录）');
    const record: ChoiceCard = {
      type: 'choice_card',
      at: this.iso(),
      cardId: this.newId('card'),
      m05SessionId: m05.sessionId,
      options: card.options,
      recommended: card.recommended,
      trigger,
    };
    await this.hub.record(mainId, record);
    return record;
  }

  /** 学习者在选择卡上选定：存路线事实，开闭环对话，交开场。 */
  async choose(cardId: string, option: number): Promise<string> {
    let mainId = '';
    let recs: LogRecord[] = [];
    let card: LogRecord | undefined;
    for (const m of this.hub.listSessions().filter((s) => s.kind === 'main')) {
      const rs = (await this.hub.records(m.sessionId)).map((r) => r.record);
      const found = rs.find((r) => r.type === 'choice_card' && r.cardId === cardId);
      if (found) {
        mainId = m.sessionId;
        recs = rs;
        card = found;
        break;
      }
    }
    if (card?.type !== 'choice_card') throw new BadRequestError('找不到这组选项，刷新一下再选。');
    if (recs.some((r) => r.type === 'choice_made' && r.cardId === cardId)) {
      throw new BadRequestError('这组选项已经选过了。');
    }
    const picked = card.options[option];
    if (!picked) throw new BadRequestError(`没有第 ${String(option + 1)} 个选项。`);
    // 必需项：单子（新点 + 子句）在 M08 里查得到，否则不开（03「缺料与冲突」）
    const problem = this.ticketProblem(picked.ticket);
    if (problem) {
      console.error(
        `选择卡 ${cardId} 第 ${String(option)} 项的单子有问题，不开闭环对话：${problem}`,
      );
      throw new BadRequestError('这个选项现在开不了（资料里查不到它要学的内容），换一个试试。');
    }

    const loop = await this.hub.createSession('loop', {
      title: picked.title,
      parent: mainId,
      ticket: picked.ticket,
    });
    await this.hub.record(mainId, {
      type: 'choice_made',
      at: this.iso(),
      cardId,
      option,
      loopSessionId: loop.sessionId,
    });
    await this.hub.send(loop.sessionId, {
      role: 'program',
      text: this.loopOpening(picked.ticket),
    });
    return loop.sessionId;
  }

  /** 申请收口：开守卫、核对引用行、记判定。学习者申请时把结论作为事实追加回闭环对话。 */
  async requestClose(
    loopId: string,
    by: 'model' | 'learner',
    reason: string,
  ): Promise<GuardVerdict> {
    await this.assertOpenLoop(loopId);
    await this.hub.record(loopId, {
      type: 'close_requested',
      at: this.iso(),
      by,
      reason,
    });
    const verdict = await this.runGuard(loopId);
    await this.hub.record(loopId, verdict);
    if (by === 'learner') {
      await this.hub.send(loopId, { role: 'program', text: verdictFact(verdict) });
    }
    return verdict;
  }

  /** 守卫判合上后，学习者确认结束 → 合上之后的清单。 */
  async confirmClose(loopId: string, note: string): Promise<void> {
    await this.assertOpenLoop(loopId);
    const recs = (await this.hub.records(loopId)).map((r) => r.record);
    const verdict = recs.filter((r) => r.type === 'guard_verdict').at(-1);
    if (verdict?.type !== 'guard_verdict' || !verdict.closed) {
      // 守卫还没判合上，不能确认结束；没合上要结束走“先到这里”
      throw new BadRequestError(
        '还没确认你掌握了这部分：先点“我觉得懂了”；想先停下就点“先到这里”。',
      );
    }
    await this.hub.record(loopId, {
      type: 'loop_ended',
      at: this.iso(),
      closed: true,
      note,
    });
    this.background('合上之后的清单', () => this.afterLoop(loopId, true));
  }

  /** 学习者要结束、没合上：不开守卫、不写 M09，M05 读原文出下一张卡。 */
  async endUnclosed(loopId: string, note: string): Promise<void> {
    await this.assertOpenLoop(loopId);
    await this.hub.record(loopId, {
      type: 'loop_ended',
      at: this.iso(),
      closed: false,
      note,
    });
    this.background('没合上之后的清单', () => this.afterLoop(loopId, false));
  }

  // ───────────── 清单 ─────────────

  /**
   * 合上之后：① 存盘（已在 loop_ended）② 写 M09 ③ M05 出选择卡（② 在 ③ 前）④ M15 整理、M10 记录在后台跑、不等。
   * 没合上：跳过 ②。
   */
  private async afterLoop(loopId: string, closed: boolean): Promise<void> {
    const opened = await this.hub.opened(loopId);
    const mainId = opened.parent ?? (await this.ensureMain());
    this.organizeStateLater(`一段学习（${loopId}）结束了`, loopId);
    this.background('M10 记录', () => this.recordStrategy(loopId));
    try {
      await this.hub.send(mainId, {
        role: 'program',
        text: closed
          ? `闭环“${opened.title}”合上了（学习者已确认）。下一张选择卡正在出，出好会贴在这里。`
          : `闭环“${opened.title}”没合上就结束了。下一张选择卡正在出，出好会贴在这里。`,
      });
      if (closed) {
        await this.writeM09(loopId);
        await this.hub.record(loopId, {
          type: 'after_loop_step',
          at: this.iso(),
          step: 'm09_written',
          detail: '形成记录已写入 M09',
        });
      }
      const card = await this.requestCard(
        closed
          ? `闭环“${opened.title}”（${loopId}）合上了`
          : `闭环“${opened.title}”（${loopId}）没合上就结束了；可读它的原文`,
        mainId,
      );
      await this.hub.record(loopId, {
        type: 'after_loop_step',
        at: this.iso(),
        step: 'card_ready',
        detail: card.cardId,
      });
    } catch (err) {
      console.error(`闭环 ${loopId} 结束后的清单失败：`, err);
      await this.hub.record(loopId, {
        type: 'after_loop_step',
        at: this.iso(),
        step: 'failed',
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ───────────── 守卫 ─────────────

  private readonly verdicts = new Map<string, Omit<GuardVerdict, 'type' | 'at'>>();

  private async runGuard(loopId: string): Promise<GuardVerdict> {
    const opened = await this.hub.opened(loopId);
    const records = await this.hub.records(loopId);
    const guard = await this.hub.createSession('guard', { title: '闭环守卫', parent: loopId });
    this.guardTarget.set(guard.sessionId, records);
    const ticket = opened.ticket;
    await this.hub.send(guard.sessionId, {
      role: 'program',
      text: [
        '要判的闭环单子：',
        ticket ? this.describeTicket(ticket) : '（缺单子）',
        '',
        '闭环对话原文（L 后是行号；只放对话本身，不含教学侧的诊断记录）：',
        renderTranscript(records),
      ].join('\n'),
    });
    await this.hub.idle(guard.sessionId);
    const v = this.verdicts.get(guard.sessionId);
    this.guardTarget.delete(guard.sessionId);
    return {
      type: 'guard_verdict',
      at: this.iso(),
      ...(v ?? {
        guardSessionId: guard.sessionId,
        closed: false,
        basis: '守卫没有提交判定',
        lines: [],
        problem: '守卫没有提交判定',
      }),
    };
  }

  private readonly guardTarget = new Map<string, NumberedRecord[]>();

  private verdictTool(guardId: string): ToolSpec {
    return {
      name: 'submit_verdict',
      description: '交回闭环是否合上。证据行只能是学习者的行。只提交一次。',
      input: {
        closed: z.boolean(),
        basis: z.string().describe('一段话，引用写行号'),
        evidence_lines: z.array(z.number().int()).describe('学习者的行号'),
      },
      run: (a) => {
        const closed = a.closed as boolean;
        const basis = a.basis as string;
        const lines = a.evidence_lines as number[];
        if (this.verdicts.has(guardId)) return err('已经提交过判定');
        const target = this.guardTarget.get(guardId) ?? [];
        const learner = learnerLines(target);
        const bad = lines.filter((l) => !learner.has(l));
        // 程序核对：引用的行须落在学习者的行上（00 原则 7）；不对就退回让守卫重交
        if (bad.length > 0) {
          return err(
            `第 ${bad.join('、')} 行不是学习者说的话，不能当证据；只引学习者的行，重新提交`,
          );
        }
        if (closed && lines.length === 0) return err('判合上必须引至少一行学习者的话作证据');
        this.verdicts.set(guardId, { guardSessionId: guardId, closed, basis, lines });
        return ok('判定已收到');
      },
    };
  }

  // ───────────── M09 ─────────────

  private readonly formations = new Set<string>();

  private async writeM09(loopId: string): Promise<void> {
    const opened = await this.hub.opened(loopId);
    const records = await this.hub.records(loopId);
    const verdict = records
      .map((r) => r.record)
      .filter((r) => r.type === 'guard_verdict')
      .at(-1);
    const s = await this.hub.createSession('m09', { title: '写形成记录', parent: loopId });
    this.m09Target.set(s.sessionId, { loopId, records });
    await this.hub.send(s.sessionId, {
      role: 'program',
      text: [
        '单子：',
        opened.ticket ? this.describeTicket(opened.ticket) : '（缺单子）',
        '',
        `守卫判定：${verdict?.type === 'guard_verdict' ? `${verdict.closed ? '合上' : '未合上'}。${verdict.basis}（证据行 ${verdict.lines.join('、')}）` : '（缺）'}`,
        '',
        '闭环对话原文：',
        renderTranscript(records),
      ].join('\n'),
    });
    await this.hub.idle(s.sessionId);
    this.m09Target.delete(s.sessionId);
    if (!this.formations.has(s.sessionId)) throw new Error('写 M09 的会话没有提交形成记录');
  }

  private readonly m09Target = new Map<string, { loopId: string; records: NumberedRecord[] }>();

  private formationTool(sessionId: string): ToolSpec {
    return {
      name: 'write_formation_record',
      description: '把这个闭环的个人形成记录写进 M09。只提交一次。',
      input: {
        new_point: z.string(),
        clause: z.string(),
        start_points: z.array(z.string()),
        understanding: z.string(),
        process: z.string(),
        unmet: z.string(),
        evidence_strength: z.string().describe('仅当场 / 含变式；独立 / 提示后'),
        evidence_lines: z.array(z.number().int()),
      },
      run: async (a) => {
        if (this.formations.has(sessionId)) return err('已经写过了');
        const target = this.m09Target.get(sessionId);
        if (!target) return err('找不到要写的闭环');
        const learner = learnerLines(target.records);
        const lines = a.evidence_lines as number[];
        const bad = lines.filter((l) => !learner.has(l));
        if (bad.length > 0)
          return err(`第 ${bad.join('、')} 行不是学习者说的话；证据只引学习者的行`);
        await this.o.m09.add({
          id: this.newId('f'),
          at: this.iso(),
          loopSessionId: target.loopId,
          newPoint: a.new_point as string,
          clause: a.clause as string,
          startPoints: a.start_points as string[],
          understanding: a.understanding as string,
          process: a.process as string,
          unmet: a.unmet as string,
          evidenceStrength: a.evidence_strength as string,
          evidenceLines: lines,
          model: this.hub.modelName,
        });
        this.formations.add(sessionId);
        return ok('已写入 M09');
      },
    };
  }

  // ───────────── M05 ─────────────

  private readonly cards = new Map<string, { options: ChoiceOption[]; recommended: number }>();

  private async m05Opening(trigger: string, mainId: string): Promise<string> {
    const main = (await this.hub.records(mainId)).map((r) => r.record);
    const goal = main.filter((r) => r.type === 'project_goal').at(-1);
    const loops = this.hub.listSessions().filter((s) => s.kind === 'loop' && s.parent === mainId);
    const loopStates: string[] = [];
    for (const l of loops) {
      const recs = (await this.hub.records(l.sessionId)).map((r) => r.record);
      const ended = recs.filter((r) => r.type === 'loop_ended').at(-1);
      const state =
        ended?.type === 'loop_ended' ? (ended.closed ? '合上' : '没合上就结束') : '进行中';
      loopStates.push(`- ${l.sessionId}「${l.title}」：${state}`);
    }
    const known = this.o.m09.knownPoints();
    return [
      `触发原因：${trigger}`,
      '',
      `方向目标：${goal?.type === 'project_goal' ? goal.text : '（还没有；按默认先验——高中以上、脱离应试——出临时选项，标“临时”）'}`,
      '',
      `已合上过的新点（M09）：${known.length > 0 ? known.map((p) => `${p}「${this.o.m08.name(p)}」`).join('、') : '（空：冷启动，第一个闭环选小的）'}`,
      '',
      `闭环（路线事实）：\n${loopStates.length > 0 ? loopStates.join('\n') : '（还没有）'}`,
      '',
      this.o.m08.empty ? 'M08：空（缺通用知识依据）' : `M08 提纲：\n${this.o.m08.outline()}`,
      '',
      '学习者状态（M15）：要用时用 query_state 查；没有记录按无状态约束。',
    ].join('\n');
  }

  private cardTool(sessionId: string): ToolSpec {
    const ticketShape = z.object({
      new_point: z.string().describe('M08 点 id'),
      clause: z.string().describe('M08 子句 id'),
      start_points: z.array(
        z.object({ point: z.string(), source: z.enum(['M09', '自述', '假定']) }),
      ),
      route_action: z.string(),
      title: z.string().describe('给学习者看的一句话'),
      reason: z.string(),
    });
    return {
      name: 'submit_choice_card',
      description: '交回 2–4 个候选单子，推荐其中一个（从 0 数）。只提交一次。',
      input: { options: z.array(ticketShape).min(1).max(4), recommended: z.number().int().min(0) },
      run: (a) => {
        if (this.cards.has(sessionId)) return err('已经提交过选择卡');
        const raw = a.options as z.infer<typeof ticketShape>[];
        const options: ChoiceOption[] = raw.map((o) => ({
          title: o.title,
          reason: o.reason,
          ticket: {
            newPoint: o.new_point,
            clause: o.clause,
            startPoints: o.start_points.map((s) => ({ point: s.point, source: s.source })),
            routeAction: o.route_action,
          },
        }));
        const problems = options
          .map((o, i) => [i, this.ticketProblem(o.ticket)] as const)
          .filter(([, p]) => p !== undefined)
          .map(([i, p]) => `第 ${String(i)} 项：${p ?? ''}`);
        if (problems.length > 0) return err(`${problems.join('；')}。改好后重新提交`);
        const recommended = a.recommended as number;
        if (recommended >= options.length) return err('推荐的序号超出选项范围');
        this.cards.set(sessionId, { options, recommended });
        return ok('选择卡已收到');
      },
    };
  }

  private loopTranscriptTool(): ToolSpec {
    return {
      name: 'read_loop',
      description:
        '读某个闭环对话的原文（带行号），用于没合上就结束的闭环；with_diagnosis 为真时连同闭环里写的诊断记录（M04）一起给，用来看状态解释候选有没有被裁决。',
      input: {
        session: z.string().describe('闭环对话的会话 id'),
        with_diagnosis: z.boolean().optional(),
      },
      run: async (a) => {
        const opened = await this.hub.opened(a.session as string);
        if (opened.kind !== 'loop') return err('这不是闭环对话');
        const records = await this.hub.records(opened.sessionId);
        const text = renderTranscript(records);
        if (a.with_diagnosis !== true) return ok(text);
        const notes = records.flatMap((r) =>
          r.record.type === 'loop_note' ? [`L${String(r.line)} 诊断：${r.record.text}`] : [],
        );
        return ok(`${text}\n\n诊断记录：\n${notes.join('\n') || '（无）'}`);
      },
    };
  }

  // ───────────── 主对话 ─────────────

  private mainTools(mainId: string): ToolSpec[] {
    return [
      {
        name: 'open_goal_talk',
        description:
          '学习者说出新的学习方向、或想改方向时调用：在他刚才这条消息下开一个单独谈方向的对话。主对话自己不谈方向。',
        input: {},
        run: async () => {
          const recs = await this.hub.records(mainId);
          const asked = recs.filter((r) => r.record.type === 'user_message').at(-1);
          if (asked?.record.type !== 'user_message') return err('主对话里还没有学习者的话');
          const goal = recs
            .map((r) => r.record)
            .filter((r) => r.type === 'project_goal')
            .at(-1);
          const title = '谈方向';
          const talk = await this.hub.createSession('talk', {
            title,
            parent: mainId,
            anchorLine: asked.line,
          });
          await this.hub.send(talk.sessionId, {
            role: 'program',
            text: [
              `学习者在主对话里说（主对话第 ${String(asked.line)} 行）：${asked.record.text}`,
              ...(goal?.type === 'project_goal' ? [`已有方向目标：${goal.text}`] : []),
              '',
              '接着学习者这句话谈。',
            ].join('\n'),
          });
          await this.hub.record(mainId, {
            type: 'task_opened',
            at: this.iso(),
            sessionId: talk.sessionId,
            kind: 'talk',
            title,
            anchorLine: asked.line,
          });
          return ok('已在学习者这条消息下开了谈方向的对话，学习者点进去谈；谈定后会交回这里。');
        },
      },
      {
        name: 'request_card',
        description: '请 M05 出下一闭环的选择卡；出好后贴在主对话里，由学习者选。',
        input: { reason: z.string() },
        run: async (a) => {
          const card = await this.requestCard(
            `学习者在主对话里要下一步：${a.reason as string}`,
            mainId,
          );
          return ok(
            `选择卡已贴出（${String(card.options.length)} 个选项，推荐第 ${String(card.recommended + 1)} 个）。学习者会在卡上选。`,
          );
        },
      },
      {
        name: 'list_learned',
        description: '按记录列出本项目合上过的、进行中的、没合上的闭环，以及 M09 形成记录。',
        input: {},
        run: async () => {
          const rows = this.o.m09.all().map((r) => this.o.m09.describe(r));
          const loops: string[] = [];
          for (const l of this.hub
            .listSessions()
            .filter((s) => s.kind === 'loop' && s.parent === mainId)) {
            const ended = (await this.hub.records(l.sessionId))
              .map((r) => r.record)
              .filter((r) => r.type === 'loop_ended')
              .at(-1);
            loops.push(
              `- ${l.sessionId}「${l.title}」：${ended?.type === 'loop_ended' ? (ended.closed ? '合上' : '没合上就结束') : '进行中'}`,
            );
          }
          return ok(
            `闭环：\n${loops.join('\n') || '（还没有）'}\n\nM09 形成记录：\n${rows.join('\n') || '（还没有）'}`,
          );
        },
      },
      {
        name: 'point_to_conversation',
        description:
          '学习者要接着某个已有的对话（比如一个还在进行的闭环）时调用：在主对话里放一个回到那里的入口。',
        input: { session: z.string().describe('会话 id（list_learned 里有）') },
        run: async (a) => {
          const id = a.session as string;
          const opened = await this.hub.opened(id).catch((e: unknown) => {
            if (e instanceof NotFoundError) return undefined;
            throw e;
          });
          if (opened?.parent !== mainId || (opened.kind !== 'loop' && opened.kind !== 'talk')) {
            return err(`本项目里没有这个对话：${id}`);
          }
          await this.hub.record(mainId, {
            type: 'conversation_pointer',
            at: this.iso(),
            sessionId: id,
          });
          return ok('入口已放好。');
        },
      },
    ];
  }

  // ───────────── 畅谈对话 ─────────────

  private settleGoalTool(talkId: string): ToolSpec {
    return {
      name: 'settle_goal',
      description:
        '方向谈清了（学什么、学到什么程度、为什么学）时调用：把方向目标交回项目，本对话随之结束。只调一次。',
      input: {
        goal: z.string().describe('一两句：学什么、学到什么程度、为什么学'),
        project_name: z.string().describe('项目名：几个字，学习者一眼认得出'),
      },
      run: async (a) => {
        const recs = await this.hub.records(talkId);
        if (recs.some((r) => r.record.type === 'talk_ended')) return err('已经交回过了');
        const opened = await this.hub.opened(talkId);
        const mainId = opened.parent;
        if (mainId === undefined) return err('找不到这个对话所属的项目');
        const goal = (a.goal as string).trim();
        if (goal === '') return err('方向目标不能是空的');
        const title = (a.project_name as string).trim() || shortTitle(goal);
        const at = this.iso();
        await this.hub.record(mainId, { type: 'project_goal', at, text: goal });
        await this.hub.record(mainId, { type: 'project_title', at, title, source: 'goal' });
        await this.hub.record(talkId, { type: 'talk_ended', at, goal, title });
        await this.hub.send(mainId, {
          role: 'program',
          text: `谈方向的对话（${talkId}）交回了：方向目标是“${goal}”，项目名改为“${title}”。`,
        });
        return ok('方向已交回项目，本对话结束。和学习者简短说一句就好。');
      },
    };
  }

  // ───────────── 闭环对话 ─────────────

  private loopTools(loopId: string): ToolSpec[] {
    return [
      {
        name: 'write_diagnosis',
        description: '记这一轮的诊断（不给学习者看，守卫不读）。每轮先记诊断、再写给学习者的话。',
        input: { text: z.string().describe('观察、指回的行号、怀疑、还缺什么') },
        run: async (a) => {
          await this.hub.record(loopId, {
            type: 'loop_note',
            at: this.iso(),
            text: a.text as string,
          });
          return ok('已记');
        },
      },
      {
        name: 'read_loop_transcript',
        description: '读本闭环对话的原文（带行号）；上下文压缩后要看原话时用。',
        input: {},
        run: async () => ok(renderTranscript(await this.hub.records(loopId))),
      },
      {
        name: 'request_close',
        description: '判断新点已沿子句合上时调用：程序开独立守卫判，返回守卫结论。',
        input: { reason: z.string() },
        run: async (a) => {
          const v = await this.requestClose(loopId, 'model', a.reason as string);
          return ok(verdictFact(v));
        },
      },
      this.stateQueryTool(),
      {
        name: 'query_strategy_records',
        description:
          '查这位学习者以前的教法记录（M10 个人策略过程）：在什么条件下用过什么做法、之后怎样。单条不证明因果。',
        input: {},
        run: () => {
          const rows = this.o.m10.all();
          return ok(
            rows.length > 0 ? rows.map((r) => this.o.m10.describe(r)).join('\n') : '还没有记录',
          );
        },
      },
      {
        name: 'request_state_recheck',
        description:
          '请 M15 重新确认某条状态记录（M04 → M15 唯一的反向请求）：只带记录 id，不带你的判断。',
        input: { record_id: z.string() },
        run: (a) => {
          const id = a.record_id as string;
          if (!this.o.m15.record(id)) return err(`没有这条状态记录：${id}`);
          this.organizeStateLater(`M04 请求重新确认状态记录 ${id}`, loopId, true);
          return ok('已请 M15 重新确认；结果之后用 query_state 查。');
        },
      },
      {
        name: 'end_loop_unclosed',
        description: '学习者明确要结束、而闭环没合上时调用。',
        input: { note: z.string().describe('学习者要结束的话在哪一行、为什么') },
        run: async (a) => {
          await this.endUnclosed(loopId, a.note as string);
          return ok('闭环已按“没合上就结束”处理；下一张选择卡会在主对话里出。和学习者道别即可。');
        },
      },
    ];
  }

  private loopOpening(t: Ticket): string {
    const p = this.o.m08.points.get(t.newPoint);
    const c = this.o.m08.clauses.get(t.clause);
    const starts = t.startPoints
      .map((s) => {
        const sp = this.o.m08.points.get(s.point);
        return sp ? this.o.m08.describePoint(sp) : `${s.point}（M08 里没有）`;
      })
      .join('\n');
    const history = t.startPoints
      .flatMap((s) => this.o.m09.forPoint(s.point))
      .map((r) => this.o.m09.describe(r));
    return [
      '本闭环的单子（M05）：',
      this.describeTicket(t),
      '',
      '新点（M08）：',
      p ? this.o.m08.describePoint(p) : '（缺通用知识依据）',
      '',
      '选中的子句（M08）：',
      c ? this.o.m08.describeClause(c) : '（缺）',
      '',
      '出发点（M08）：',
      starts || '（无）',
      '',
      `M09 相关记录：${history.length > 0 ? '\n' + history.join('\n') : '缺历史背景（这些出发点还没有闭环记录）'}`,
      '学习者状态（M15）与以前的教法记录（M10）：要用时查。',
      '',
      '现在开始这个闭环：先简短说明这次学什么、从哪出发，然后开始。',
    ].join('\n');
  }

  // ───────────── M15 学习者状态（存放处 + 后台整理）─────────────

  /** 排一次 M15 整理（03「M15」何时整理）；force = M04 重新确认请求，没有新记录也跑。 */
  organizeStateLater(trigger: string, from?: string, force = false): void {
    const run = this.stateChain.then(() => this.organizeState(trigger, from, force));
    // 链上只管排队：这次失败不挡下一次；失败本身由 background 写进核心日志
    this.stateChain = run.catch(() => undefined);
    this.background('M15 整理', () => run);
  }

  private async organizeState(trigger: string, from: string | undefined, force: boolean) {
    const covered = this.o.m15.covered();
    const facts = await this.stateFacts(covered);
    // 没有新记录不整理（03「M15」）
    if (facts.newLearnerLines === 0 && !force) return;
    const s = await this.hub.createSession('m15', {
      title: '整理学习者状态',
      ...(from !== undefined ? { parent: from } : {}),
    });
    await this.hub.send(s.sessionId, {
      role: 'program',
      text: [`触发原因：${trigger}`, '', this.o.m15.describeCurrent(), '', facts.text].join('\n'),
    });
    await this.hub.idle(s.sessionId);
    const failed = (await this.hub.records(s.sessionId)).some(
      (r) => r.record.type === 'turn_failed',
    );
    if (!failed) {
      await this.o.m15.addRun({
        at: this.iso(),
        trigger,
        m15SessionId: s.sessionId,
        covered: facts.covered,
      });
    }
  }

  /**
   * 交给 M15 的 M01 事实：与 M04 取不同的字段（03「M15」读什么）——时间、间隔、停顿、中断与停下的地方、
   * 学习者的话（含紧邻的前一句教学作前序事件）。不给诊断记录、守卫判定、M09，也不给“合上没有”。
   */
  private async stateFacts(covered: Record<string, number>) {
    const sessions = this.hub
      .listSessions()
      .filter((x) => x.kind === 'main' || x.kind === 'talk' || x.kind === 'loop')
      .sort((a, b) => a.openedAt.localeCompare(b.openedAt));
    const label = { main: '项目主对话', talk: '谈方向', loop: '一段学习' } as const;
    const out: string[] = [];
    const starts: string[] = [];
    const nextCovered: Record<string, number> = {};
    let newLearnerLines = 0;
    for (const x of sessions) {
      const recs = await this.hub.records(x.sessionId);
      const last = recs.at(-1)?.line ?? 0;
      nextCovered[x.sessionId] = last;
      const since = covered[x.sessionId] ?? 0;
      const talk = recs.filter(
        (r) => r.record.type === 'user_message' || r.record.type === 'assistant_message',
      );
      const firstLearner = talk.find((r) => r.record.type === 'user_message');
      if (firstLearner)
        starts.push(
          `${firstLearner.record.at.slice(0, 16).replace('T', ' ')}（${label[x.kind as keyof typeof label]}）`,
        );
      const fresh = talk.filter((r) => r.line > since);
      const freshLearner = fresh.filter((r) => r.record.type === 'user_message');
      newLearnerLines += freshLearner.length;
      if (freshLearner.length === 0) continue;
      const kindLabel = label[x.kind as keyof typeof label];
      const lines: string[] = [];
      let prev: NumberedRecord | undefined;
      for (const r of talk) {
        if (r.record.type === 'user_message' && r.line > since) {
          // 停顿：与上一条对话之间隔了多久
          if (prev !== undefined) {
            const gap = Date.parse(r.record.at) - Date.parse(prev.record.at);
            if (gap > AWAY_MS) lines.push(`（停了约 ${formatDuration(gap)}）`);
            if (prev.record.type === 'assistant_message' && prev.line <= since) {
              lines.push(excerpt(prev));
            }
          }
          lines.push(renderTranscript([r]));
        } else if (r.record.type === 'assistant_message' && r.line > since) {
          lines.push(excerpt(r));
        }
        prev = r;
      }
      const ended = recs.find(
        (r) => r.record.type === 'loop_ended' || r.record.type === 'talk_ended',
      );
      const stopped =
        ended?.record.type === 'loop_ended' && !ended.record.closed
          ? `学习者选择先停下（${ended.record.at.slice(0, 16).replace('T', ' ')}）`
          : ended
            ? `已结束（${ended.record.at.slice(0, 16).replace('T', ' ')}）`
            : '还开着';
      out.push(
        [
          `### ${kindLabel} ${x.sessionId}「${x.title}」`,
          `开始 ${x.openedAt.slice(0, 16).replace('T', ' ')}；最近一条 ${(recs.at(-1)?.record.at ?? '').slice(0, 16).replace('T', ' ')}；${stopped}；这次新增学习者的话 ${String(freshLearner.length)} 条`,
          ...lines,
        ].join('\n'),
      );
    }
    const text = [
      `各次开始说话的时间（节奏）：${starts.slice(-10).join('、') || '（无）'}`,
      '',
      '上次整理之后的新记录（L 后是该会话正本的行号；教学行只放开头一段，全文用 read_session 查）：',
      out.join('\n\n') || '（没有新的学习者的话）',
    ].join('\n');
    return { text, covered: nextCovered, newLearnerLines };
  }

  private stateQueryTool(): ToolSpec {
    return {
      name: 'query_state',
      description:
        '查学习者的非知识状态与条件（M15）：先看“当前状态”页；detail 为真时列出全部状态记录（每条标承载读数 / 解释候选、来源、时间范围、依据行号）。解释候选须经 M04 裁决才能当行动依据。',
      input: { detail: z.boolean().optional() },
      run: (a) => {
        const rows = this.o.m15.allRecords();
        if (rows.length === 0 && !this.o.m15.current()) {
          return ok('还没有状态记录（按无状态约束）');
        }
        const parts = [this.o.m15.describeCurrent()];
        if (a.detail === true || !this.o.m15.current()) {
          parts.push('', '状态记录：', ...rows.map((r) => this.o.m15.describeRecord(r)));
        }
        return ok(parts.join('\n'));
      },
    };
  }

  /** M15 会话的工具：读 M01 对话（不含诊断与判定）、读自己的底层，只写自己的两层。 */
  private stateTools(m15Id: string): ToolSpec[] {
    return [
      {
        name: 'read_session',
        description:
          '读某个会话（项目主对话 / 谈方向 / 一段学习）里学习者与教学的对话原文，带行号与时间；不含诊断记录与判定。',
        input: {
          session: z.string(),
          from_line: z.number().int().optional(),
          to_line: z.number().int().optional(),
        },
        run: async (a) => {
          const opened = await this.hub.opened(a.session as string).catch((e: unknown) => {
            if (e instanceof NotFoundError) return undefined;
            throw e;
          });
          if (!opened || !['main', 'talk', 'loop'].includes(opened.kind)) {
            return err('没有这个对话（只能读项目主对话、谈方向、学习对话）');
          }
          const from = (a.from_line as number | undefined) ?? 1;
          const to = (a.to_line as number | undefined) ?? Number.MAX_SAFE_INTEGER;
          const recs = (await this.hub.records(opened.sessionId)).filter(
            (r) =>
              r.line >= from &&
              r.line <= to &&
              (r.record.type === 'user_message' || r.record.type === 'assistant_message'),
          );
          return ok(renderTranscript(recs) || '（这一段没有对话）');
        },
      },
      {
        name: 'read_state_records',
        description: '读 M15 自己的底层状态记录（全部）与当前状态页。',
        input: {},
        run: () =>
          ok(
            [
              this.o.m15.describeCurrent(),
              '',
              ...this.o.m15.allRecords().map((r) => this.o.m15.describeRecord(r)),
            ].join('\n'),
          ),
      },
      {
        name: 'write_state_record',
        description:
          '写一条状态记录（底层，只追加）：一句话、来源、属于承载读数还是解释候选、适用时间范围、指回哪个会话的哪几行。自述须引学习者的行。',
        input: {
          text: z.string().describe('一句话；只写可观察行为与学习者的话，不写人格、能力或医学结论'),
          source: z.enum(['自述', '观察', '推断']),
          output_type: z.enum(['承载读数', '解释候选']),
          time_range: z.string().describe('本次会话 / 近期（几号到几号）/ 较稳定的现实约束'),
          refs: z.array(z.object({ session: z.string(), lines: z.array(z.number().int()) })),
        },
        run: async (a) => {
          const refs = a.refs as { session: string; lines: number[] }[];
          const source = a.source as '自述' | '观察' | '推断';
          let learnerRef = false;
          for (const ref of refs) {
            const opened = await this.hub.opened(ref.session).catch((e: unknown) => {
              if (e instanceof NotFoundError) return undefined;
              throw e;
            });
            if (!opened || !['main', 'talk', 'loop'].includes(opened.kind)) {
              return err(`没有这个对话：${ref.session}`);
            }
            const recs = await this.hub.records(ref.session);
            const talkLines = new Set(
              recs
                .filter(
                  (r) => r.record.type === 'user_message' || r.record.type === 'assistant_message',
                )
                .map((r) => r.line),
            );
            const bad = ref.lines.filter((l) => !talkLines.has(l));
            if (bad.length > 0) {
              return err(`${ref.session} 第 ${bad.join('、')} 行不是对话行，不能当依据`);
            }
            const learner = learnerLines(recs);
            if (ref.lines.some((l) => learner.has(l))) learnerRef = true;
          }
          if (source === '自述' && !learnerRef) return err('自述须引至少一行学习者自己的话');
          await this.o.m15.addRecord({
            id: this.newId('st'),
            at: this.iso(),
            text: a.text as string,
            source,
            output: a.output_type as '承载读数' | '解释候选',
            timeRange: a.time_range as string,
            refs: refs.map((r) => ({ sessionId: r.session, lines: r.lines })),
            m15SessionId: m15Id,
            model: this.hub.modelName,
          });
          return ok('已记');
        },
      },
      {
        name: 'write_current_state',
        description:
          '重写“当前状态”页（上层，可随时从底层重算）：现在仍有效的几条（带记录 id，过期的拿掉、自述与观察对不上的两条都留并标冲突）+ 阶段判断及依据的时间跨度。',
        input: {
          text: z.string(),
          stage: z.enum(STAGES),
          basis_span: z.string().describe('阶段判断依据的时间跨度'),
        },
        run: async (a) => {
          await this.o.m15.setCurrent({
            at: this.iso(),
            text: a.text as string,
            stage: a.stage as (typeof STAGES)[number],
            basisSpan: a.basis_span as string,
            m15SessionId: m15Id,
            model: this.hub.modelName,
          });
          return ok('当前状态页已更新');
        },
      },
    ];
  }

  // ───────────── M10 教法效果（后台记录）─────────────

  private readonly strategyTargets = new Map<
    string,
    { loopId: string; lines: Set<number>; toolsUsed: string[] }
  >();

  /** 闭环结束后记“这次教法管不管用”：对话原文 + 诊断记录（M04）+ 守卫判定 + 教学工具使用记录 + 单子。 */
  private async recordStrategy(loopId: string): Promise<void> {
    const opened = await this.hub.opened(loopId);
    const records = await this.hub.records(loopId);
    const notes = records.flatMap((r) =>
      r.record.type === 'loop_note' ? [`L${String(r.line)} ${r.record.text}`] : [],
    );
    const verdicts = records.flatMap((r) =>
      r.record.type === 'guard_verdict'
        ? [
            `L${String(r.line)} ${r.record.closed ? '合上' : '未合上'}：${r.record.problem ?? r.record.basis}（证据行 ${r.record.lines.join('、') || '无'}）`,
          ]
        : [],
    );
    const ended = records.find((r) => r.record.type === 'loop_ended');
    // 教学工具（skill）还没接入：用了哪份由程序从工具调用里记，现在为空（03「教学工具怎么落」）
    const toolsUsed: string[] = [];
    const s = await this.hub.createSession('m10', { title: '记教法效果', parent: loopId });
    this.strategyTargets.set(s.sessionId, {
      loopId,
      lines: new Set(records.map((r) => r.line)),
      toolsUsed,
    });
    await this.hub.send(s.sessionId, {
      role: 'program',
      text: [
        `闭环：${loopId}「${opened.title}」`,
        `单子：${opened.ticket ? this.describeTicket(opened.ticket) : '（缺）'}`,
        `结束：${ended?.record.type === 'loop_ended' ? (ended.record.closed ? '合上（学习者已确认）' : '没合上就结束') : '（缺）'}`,
        '',
        `守卫判定：\n${verdicts.join('\n') || '（没申请过收口）'}`,
        '',
        `诊断记录（M04，闭环对话里写的）：\n${notes.join('\n') || '（无）'}`,
        '',
        `教学工具使用记录：${toolsUsed.join('、') || '教学工具还没接入，只能从对话原文看用了什么做法'}`,
        '',
        '闭环对话原文：',
        renderTranscript(records),
      ].join('\n'),
    });
    await this.hub.idle(s.sessionId);
    this.strategyTargets.delete(s.sessionId);
  }

  private strategyTool(m10Id: string): ToolSpec {
    return {
      name: 'write_strategy_record',
      description:
        '写一条个人策略过程记录（M10 自己的记录，不进 M09）：当时的诊断与状态条件、用了哪些做法、之后诊断怎么变；引用写这个闭环的行号。单次记录不证明因果。',
      input: {
        conditions: z.string(),
        strategies: z.string(),
        followed_by: z.string(),
        evidence_lines: z.array(z.number().int()),
      },
      run: async (a) => {
        const target = this.strategyTargets.get(m10Id);
        if (!target) return err('找不到要记的闭环');
        const lines = a.evidence_lines as number[];
        const bad = lines.filter((l) => !target.lines.has(l));
        if (bad.length > 0) return err(`第 ${bad.join('、')} 行不在这个闭环的记录里`);
        await this.o.m10.add({
          id: this.newId('sr'),
          at: this.iso(),
          loopSessionId: target.loopId,
          conditions: a.conditions as string,
          strategies: a.strategies as string,
          followedBy: a.followed_by as string,
          evidenceLines: lines,
          toolsUsed: target.toolsUsed,
          m10SessionId: m10Id,
          model: this.hub.modelName,
        });
        return ok('已记');
      },
    };
  }

  // ───────────── 共用 ─────────────

  describeTicket(t: Ticket): string {
    const starts = t.startPoints
      .map((s) => `${s.point}「${this.o.m08.name(s.point)}」（来源：${s.source}）`)
      .join('、');
    return `新点 ${t.newPoint}「${this.o.m08.name(t.newPoint)}」；子句 ${t.clause}；出发点 ${starts || '（无）'}；路线动作：${t.routeAction}`;
  }

  private ticketProblem(t: Ticket): string | undefined {
    if (!this.o.m08.points.has(t.newPoint)) return `新点 ${t.newPoint} 在 M08 里查不到`;
    const c = this.o.m08.clauses.get(t.clause);
    if (!c) return `子句 ${t.clause} 在 M08 里查不到`;
    if (c.to !== t.newPoint) return `子句 ${t.clause} 指向的新点是 ${c.to}，不是 ${t.newPoint}`;
    return undefined;
  }

  private async assertOpenLoop(loopId: string): Promise<void> {
    const opened = await this.hub.opened(loopId);
    if (opened.kind !== 'loop') throw new BadRequestError('这段对话不是一次学习任务。');
    const ended = (await this.hub.records(loopId)).some((r) => r.record.type === 'loop_ended');
    if (ended) throw new BadRequestError('这部分已经结束了。');
  }

  /** 只读查询工具：M08、M07、M09（按 03「读写权限」）。 */
  private readTools(opt: { m07?: boolean; m09?: boolean } = {}): ToolSpec[] {
    const m08 = this.o.m08;
    const tools: ToolSpec[] = [
      {
        name: 'search_points',
        description: '在 M08 里按关键词找点（名字或一句话里含这个词）。',
        input: { keyword: z.string() },
        run: (a) => {
          const hits = m08.search(a.keyword as string);
          return ok(hits.length > 0 ? hits.map((p) => m08.describePoint(p)).join('\n') : '没找到');
        },
      },
      {
        name: 'get_point',
        description: '看 M08 的一个点：它的一句话、原文锚点、进入它的子句、从它出发的子句。',
        input: { point: z.string().describe('点 id') },
        run: (a) => {
          const p = m08.points.get(a.point as string);
          if (!p) return err(`没有这个点：${a.point as string}`);
          const into = m08.clausesInto(p.id).map((c) => m08.describeClause(c));
          const from = m08.clausesFrom(p.id).map((c) => m08.describeClause(c));
          return ok(
            `${m08.describePoint(p)}\n\n进入它的子句：\n${into.join('\n') || '（无）'}\n\n从它出发的子句：\n${from.join('\n') || '（无）'}`,
          );
        },
      },
      {
        name: 'get_clause',
        description: '看 M08 的一条子句。',
        input: { clause: z.string().describe('子句 id') },
        run: (a) => {
          const c = m08.clauses.get(a.clause as string);
          return c ? ok(m08.describeClause(c)) : err(`没有这条子句：${a.clause as string}`);
        },
      },
    ];
    if (opt.m07 !== false) {
      tools.push(
        {
          name: 'textbook_index',
          description: '不给书名：列出书库里的书；给书名：读这本书的 M07 目录。',
          input: { book: z.string().optional() },
          run: async (a) => {
            const book = a.book as string | undefined;
            if (book === undefined || book === '') {
              const books = await this.o.m07.books();
              return ok(books.length > 0 ? books.join('\n') : '书库是空的（缺资料依据）');
            }
            return ok(await this.o.m07.index(book));
          },
        },
        {
          name: 'read_source',
          description: '读 M07 一个小节文件的原文，每行前印行号；可只读一段。',
          input: {
            book: z.string(),
            file: z.string().describe('目录里的文件路径，如 ch01/sec-1.2.md'),
            from_line: z.number().int().optional(),
            to_line: z.number().int().optional(),
          },
          run: async (a) =>
            ok(
              await this.o.m07.read(
                a.book as string,
                a.file as string,
                (a.from_line as number | undefined) ?? 1,
                (a.to_line as number | undefined) ?? Number.MAX_SAFE_INTEGER,
              ),
            ),
        },
      );
    }
    if (opt.m09 !== false) {
      tools.push({
        name: 'query_m09',
        description: '查学习者已结束闭环的形成记录；给点 id 只看与这个点有关的。',
        input: { point: z.string().optional() },
        run: (a) => {
          const p = a.point as string | undefined;
          const rows = p ? this.o.m09.forPoint(p) : this.o.m09.all();
          return ok(
            rows.length > 0 ? rows.map((r) => this.o.m09.describe(r)).join('\n') : '没有记录',
          );
        },
      });
    }
    return tools;
  }
}

/** 教学行只取开头一段（M15 用作紧邻前序事件）。 */
function excerpt(r: NumberedRecord): string {
  const t = renderTranscript([r]);
  return t.length > TEACHING_EXCERPT ? `${t.slice(0, TEACHING_EXCERPT)}…` : t;
}

function verdictFact(v: GuardVerdict): string {
  if (v.problem !== undefined) return `守卫判定：未合上（${v.problem}）。接着教。`;
  return v.closed
    ? `守卫判定：合上。依据：${v.basis}\n请学习者确认结束；学习者在界面上确认后闭环结束。`
    : `守卫判定：未合上。依据：${v.basis}\n接着教。`;
}

function ok(text: string): Promise<ToolResult> {
  return Promise.resolve({ text });
}

function err(text: string): Promise<ToolResult> {
  return Promise.resolve({ text, isError: true });
}

/** 模型没给项目名时，从方向目标里取开头一小段。 */
function shortTitle(goal: string): string {
  const head = goal.split(/[，,。；;：:]/)[0] ?? goal;
  return head.length > 12 ? `${head.slice(0, 12)}…` : head;
}

function formatDuration(ms: number): string {
  const h = ms / 3_600_000;
  if (h < 1) return `${String(Math.round(ms / 60_000))} 分钟`;
  if (h < 48) return `${String(Math.round(h))} 小时`;
  return `${String(Math.round(h / 24))} 天`;
}
