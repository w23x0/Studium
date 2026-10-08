// Studium 的闭环外：按事件跑清单（03「闭环外：事件与清单」「收口与闭环守卫」）。
// 每种会话的系统提示与工具在这里给；写权限靠给什么工具来卡（03「读写权限」）。
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import type {
  ChoiceCard,
  ChoiceOption,
  ConversationKind,
  GuardVerdict,
  NumberedRecord,
  Ticket,
} from '../shared/records.ts';
import type { Hub, KindConfig } from './hub.ts';
import type { Library } from './knowledge/m07.ts';
import type { M08 } from './knowledge/m08.ts';
import type { M09 } from './knowledge/m09.ts';
import type { ToolResult, ToolSpec } from './model/port.ts';
import { learnerLines, renderTranscript } from './transcript.ts';

export class BadRequestError extends Error {}

/** 学习者离开多久算“隔了一阵回来”，回来时程序追加离开多久。 */
const AWAY_MS = 30 * 60 * 1000;

export interface StudiumOptions {
  prompts: Record<ConversationKind, string>;
  m07: Library;
  m08: M08;
  m09: M09;
}

export class Studium {
  private hubRef: Hub | undefined;

  constructor(private readonly o: StudiumOptions) {}

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
        case 'loop':
          return [...this.readTools(), ...this.loopTools(sessionId)];
        case 'guard':
          return [...this.readTools({ m09: false }), this.verdictTool(sessionId)];
        case 'm09':
          return [...this.readTools({ m09: false }), this.formationTool(sessionId)];
        case 'm05':
          return [...this.readTools(), this.loopTranscriptTool(), this.cardTool(sessionId)];
      }
    },
  });

  // ───────────── 事件 ─────────────

  /** 一个项目一条主对话；没有就开一条。 */
  async ensureMain(): Promise<string> {
    const main = this.hub.listSessions().find((s) => s.kind === 'main');
    if (main) return main.sessionId;
    return (await this.hub.createSession('main', { title: '主对话' })).sessionId;
  }

  /** 学习者在某个对话里发话。隔了一阵回来，先追加离开多久（03「闭环外」暂停）。 */
  async learnerSays(sessionId: string, text: string): Promise<void> {
    const recs = await this.hub.records(sessionId);
    const last = recs
      .map((r) => r.record)
      .filter((r) => r.type === 'user_message' || r.type === 'assistant_message')
      .at(-1);
    if (last !== undefined) {
      const away = Date.now() - Date.parse(last.at);
      if (away > AWAY_MS) {
        await this.hub.send(sessionId, {
          role: 'program',
          text: `学习者离开了约 ${formatDuration(away)}，现在回来了。`,
        });
      }
    }
    await this.hub.send(sessionId, { role: 'learner', text });
  }

  /** M05 出选择卡，贴进主对话。trigger 写明为什么要卡。 */
  async requestCard(trigger: string): Promise<ChoiceCard> {
    const mainId = await this.ensureMain();
    const m05 = await this.hub.createSession('m05', { title: '出选择卡', parent: mainId });
    await this.hub.send(m05.sessionId, { role: 'program', text: await this.m05Opening(trigger) });
    await this.hub.idle(m05.sessionId);
    const card = this.cards.get(m05.sessionId);
    if (!card) throw new Error('M05 没有提交选择卡（见该会话记录）');
    const record: ChoiceCard = {
      type: 'choice_card',
      at: new Date().toISOString(),
      cardId: `card-${randomBytes(4).toString('hex')}`,
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
    const mainId = await this.ensureMain();
    const recs = (await this.hub.records(mainId)).map((r) => r.record);
    const card = recs.find((r) => r.type === 'choice_card' && r.cardId === cardId);
    if (card?.type !== 'choice_card') throw new BadRequestError(`没有这张选择卡：${cardId}`);
    if (recs.some((r) => r.type === 'choice_made' && r.cardId === cardId)) {
      throw new BadRequestError('这张选择卡已经选过了');
    }
    const picked = card.options[option];
    if (!picked) throw new BadRequestError(`选择卡没有第 ${String(option + 1)} 项`);
    // 必需项：单子（新点 + 子句）在 M08 里查得到，否则不开（03「缺料与冲突」）
    const problem = this.ticketProblem(picked.ticket);
    if (problem) throw new BadRequestError(`单子有问题，不开闭环对话：${problem}`);

    const loop = await this.hub.createSession('loop', {
      title: picked.title,
      parent: mainId,
      ticket: picked.ticket,
    });
    await this.hub.record(mainId, {
      type: 'choice_made',
      at: new Date().toISOString(),
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
      at: new Date().toISOString(),
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
      throw new BadRequestError(
        '守卫还没判合上，不能确认结束；没合上要结束请用“结束闭环（没合上）”',
      );
    }
    await this.hub.record(loopId, {
      type: 'loop_ended',
      at: new Date().toISOString(),
      closed: true,
      note,
    });
    void this.afterLoop(loopId, true);
  }

  /** 学习者要结束、没合上：不开守卫、不写 M09，M05 读原文出下一张卡。 */
  async endUnclosed(loopId: string, note: string): Promise<void> {
    await this.assertOpenLoop(loopId);
    await this.hub.record(loopId, {
      type: 'loop_ended',
      at: new Date().toISOString(),
      closed: false,
      note,
    });
    void this.afterLoop(loopId, false);
  }

  // ───────────── 清单 ─────────────

  /** 合上之后：① 存盘（已在 loop_ended）② 写 M09 ③ M05 出选择卡（② 在 ③ 前）。没合上：跳过 ②。 */
  private async afterLoop(loopId: string, closed: boolean): Promise<void> {
    const opened = await this.hub.opened(loopId);
    const mainId = opened.parent ?? (await this.ensureMain());
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
          at: new Date().toISOString(),
          step: 'm09_written',
          detail: '形成记录已写入 M09',
        });
      }
      const card = await this.requestCard(
        closed
          ? `闭环“${opened.title}”（${loopId}）合上了`
          : `闭环“${opened.title}”（${loopId}）没合上就结束了；可读它的原文`,
      );
      await this.hub.record(loopId, {
        type: 'after_loop_step',
        at: new Date().toISOString(),
        step: 'card_ready',
        detail: card.cardId,
      });
    } catch (err) {
      console.error(`闭环 ${loopId} 结束后的清单失败：`, err);
      await this.hub.record(loopId, {
        type: 'after_loop_step',
        at: new Date().toISOString(),
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
      at: new Date().toISOString(),
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
          id: `f-${randomBytes(4).toString('hex')}`,
          at: new Date().toISOString(),
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

  private async m05Opening(trigger: string): Promise<string> {
    const mainId = await this.ensureMain();
    const main = (await this.hub.records(mainId)).map((r) => r.record);
    const goal = main.filter((r) => r.type === 'project_goal').at(-1);
    const loops = this.hub.listSessions().filter((s) => s.kind === 'loop');
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
      '学习者状态（M15）：缺，按无状态约束。',
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
      description: '读某个闭环对话的原文（带行号），用于没合上就结束的闭环。',
      input: { session: z.string().describe('闭环对话的会话 id') },
      run: async (a) => {
        const opened = await this.hub.opened(a.session as string);
        if (opened.kind !== 'loop') return err('这不是闭环对话');
        return ok(renderTranscript(await this.hub.records(opened.sessionId)));
      },
    };
  }

  // ───────────── 主对话 ─────────────

  private mainTools(mainId: string): ToolSpec[] {
    return [
      {
        name: 'set_goal',
        description: '记下（或更新）这个项目的方向目标。',
        input: { goal: z.string() },
        run: async (a) => {
          await this.hub.record(mainId, {
            type: 'project_goal',
            at: new Date().toISOString(),
            text: a.goal as string,
          });
          return ok('方向目标已记下');
        },
      },
      {
        name: 'request_card',
        description: '请 M05 出下一闭环的选择卡；出好后贴在主对话里，由学习者选。',
        input: { reason: z.string() },
        run: async (a) => {
          const card = await this.requestCard(`学习者在主对话里要下一步：${a.reason as string}`);
          return ok(
            `选择卡已贴出（${String(card.options.length)} 个选项，推荐第 ${String(card.recommended + 1)} 个）。学习者会在卡上选。`,
          );
        },
      },
      {
        name: 'list_learned',
        description: '按记录列出合上过的闭环与进行中、没合上的闭环。',
        input: {},
        run: async () => {
          const rows = this.o.m09.all().map((r) => this.o.m09.describe(r));
          const loops: string[] = [];
          for (const l of this.hub.listSessions().filter((s) => s.kind === 'loop')) {
            const ended = (await this.hub.records(l.sessionId))
              .map((r) => r.record)
              .filter((r) => r.type === 'loop_ended')
              .at(-1);
            loops.push(
              `- 「${l.title}」：${ended?.type === 'loop_ended' ? (ended.closed ? '合上' : '没合上就结束') : '进行中'}`,
            );
          }
          return ok(
            `闭环：\n${loops.join('\n') || '（还没有）'}\n\nM09 形成记录：\n${rows.join('\n') || '（还没有）'}`,
          );
        },
      },
    ];
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
            at: new Date().toISOString(),
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
      '学习者状态（M15）：缺，按无状态约束。',
      '',
      '现在开始这个闭环：先简短说明这次学什么、从哪出发，然后开始。',
    ].join('\n');
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
    if (opened.kind !== 'loop') throw new BadRequestError('这不是闭环对话');
    const ended = (await this.hub.records(loopId)).some((r) => r.record.type === 'loop_ended');
    if (ended) throw new BadRequestError('这个闭环已经结束了');
  }

  /** 只读查询工具：M08、M07、M09（按 03「读写权限」）。 */
  private readTools(opt: { m09?: boolean } = {}): ToolSpec[] {
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
    ];
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

function formatDuration(ms: number): string {
  const h = ms / 3_600_000;
  if (h < 1) return `${String(Math.round(ms / 60_000))} 分钟`;
  if (h < 48) return `${String(Math.round(h))} 小时`;
  return `${String(Math.round(h / 24))} 天`;
}
