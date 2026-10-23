// 依据可见：把守卫判定、单子与出处、教法记录 / 状态记录整理成界面能直接读的只读视图。
// 只读：不写任何记录；异议的写入在 studium.ts。
import {
  CONVERSATION_KIND_LABELS,
  modelInfoOf,
  type CardOptionView,
  type CardView,
  type CurrentStateView,
  type DisclosureResponse,
  type GoalView,
  type LoopLoad,
  type LoopRelationView,
  type GuardVerdictView,
  type LoopBrief,
  type LoopEvidence,
  type LoopStatus,
  type ObjectionView,
  type PointRef,
  type ProjectOverview,
  type QuoteView,
  type RouteDecisionView,
  type SourceView,
  type StateRecordView,
  type StrategyView,
  type TeachingToolResponse,
  type TeachingToolsResponse,
  type TicketEditView,
  type TicketView,
} from '../shared/protocol.ts';
import {
  type ChoiceCard,
  type ChoiceMade,
  type ConversationKind,
  type LearnerObjection,
  type NumberedRecord,
  type ProjectGoal,
  type RouteDecision,
  type Ticket,
} from '../shared/records.ts';
import { currentGoal } from './goal.ts';
import { NotFoundError, type Hub } from './hub.ts';
import type { Learned } from './learned.ts';
import { locate } from './locate.ts';
import { currentTicket } from './ticket.ts';

/** 批 8 起新增的会话类：外发披露里单列在 laterSessions。 */
const LATER_KINDS: ConversationKind[] = ['output', 'retrieve'];
import { foldLoop, LOAD_HEAVY, PARKING_PILE } from './loop-state.ts';
import type { PedagogyStore } from './knowledge/pedagogy.ts';
import type { StateStore } from './knowledge/state.ts';
import type { Objections } from './knowledge/objections.ts';
import type { Inputs } from './inputs.ts';
import type { Sources } from './sources.ts';
import { toolUsesOf, type TeachingTools } from './teaching-tools.ts';
import { BadRequestError, foldDeadline, foldMaterials } from './studium.ts';

export interface EvidenceDeps {
  hub: Hub;
  /** 学过的记录（按层读；项目概览的积压数从这里取）。 */
  learned: Learned;
  pedagogy: PedagogyStore;
  state: StateStore;
  objections: Objections;
  /** 回查书里的出处（批 2a）。 */
  sources: Sources;
  /** 图片转写、语音送往哪里（批 4）；不给就不列。 */
  inputs?: Inputs;
  /** 教学工具（批 7）。 */
  teaching: TeachingTools;
  /** 会联网搜索的会话种类（外发披露用；来自 Studium.kind，不另写名单）。 */
  webSearchKinds: () => ConversationKind[];
}

export class Evidence {
  constructor(private readonly d: EvidenceDeps) {}

  // ───────────── 一次学习：守卫判定、单子 ─────────────

  async loop(loopId: string): Promise<LoopEvidence> {
    const opened = await this.d.hub.opened(loopId);
    if (opened.kind !== 'loop') throw new BadRequestError('这段对话不是一次学习任务。');
    const recs = await this.d.hub.records(loopId);
    const flags = foldLoop(recs);
    const ended = recs.find((r) => r.record.type === 'loop_ended');
    const now = currentTicket(recs);
    // 没合上那次的上层之一：导航读那次完整对话出下一张卡时写的路线决定
    const unclosedDecision =
      ended?.record.type === 'loop_ended' && !ended.record.closed && opened.parent !== undefined
        ? await this.loopRouteDecision(recs, opened.parent)
        : undefined;
    const objections = this.loopObjections(loopId, recs);
    const verdicts: GuardVerdictView[] = [];
    for (const r of recs) {
      if (r.record.type !== 'guard_verdict') continue;
      const v = r.record;
      const request = recs
        .filter((x) => x.line < r.line && x.record.type === 'close_requested')
        .at(-1);
      verdicts.push({
        line: r.line,
        at: v.at,
        closed: v.closed,
        basis: v.basis,
        ...(v.problem !== undefined ? { problem: v.problem } : {}),
        guardSessionId: v.guardSessionId,
        // 判定记了实际执行的模型就用它；旧判定没记才退回会话模型
        model:
          v.model !== undefined
            ? modelInfoOf(v.model)
            : await this.d.hub.modelInfo(v.guardSessionId),
        // 每条理解带它引的那几行的原话，按行号升序（工单 §4.2）
        understanding: (v.understanding ?? []).map((u) => ({
          ...u,
          quotes: quotesOf(
            recs,
            [...u.lines].sort((a, b) => a - b),
          ),
        })),
        quotes: quotesOf(recs, v.lines),
        ...(request?.record.type === 'close_requested'
          ? {
              request: {
                line: request.line,
                at: request.record.at,
                by: request.record.by,
                reason: request.record.reason,
              },
            }
          : {}),
        objections: objections.filter(
          (o) => o.target.kind === 'guard_verdict' && o.target.line === r.line,
        ),
      });
    }
    return {
      sessionId: loopId,
      title: opened.title,
      ...(opened.parent !== undefined ? { mainSessionId: opened.parent } : {}),
      openedAt: opened.at,
      status: statusOf(recs),
      ...(ended?.record.type === 'loop_ended'
        ? { endedAt: ended.record.at, endNote: ended.record.note }
        : {}),
      ...(now !== undefined ? { ticket: await this.ticketView(now, this.editViews(recs)) } : {}),
      ...(unclosedDecision !== undefined ? { routeDecision: unclosedDecision } : {}),
      model: await this.d.hub.modelInfo(loopId),
      verdicts,
      teachingToolsUsed: toolUsesOf(recs),
      objections,
      ...(flags.shelved !== undefined
        ? { shelved: { at: flags.shelved.at, note: flags.shelved.note } }
        : {}),
    };
  }

  private async titleOf(sessionId: string): Promise<string | undefined> {
    try {
      return (await this.d.hub.opened(sessionId)).title;
    } catch (e) {
      if (e instanceof NotFoundError) return undefined;
      throw e;
    }
  }

  /** 项目下一次学习之间的关系：每次从哪来（选择卡 / 接着以前那次学习）。 */
  async loopRelations(mainId: string): Promise<LoopRelationView[]> {
    const main = await this.d.hub.opened(mainId);
    if (main.kind !== 'main') throw new BadRequestError('这不是一个项目。');
    const mainRecs = await this.d.hub.records(mainId);
    const out: LoopRelationView[] = [];
    for (const l of this.d.hub
      .listSessions()
      .filter((s) => s.kind === 'loop' && s.parent === mainId)) {
      const opened = await this.d.hub.opened(l.sessionId);
      const recs = await this.d.hub.records(l.sessionId);
      const flags = foldLoop(recs);
      const made = mainRecs.find(
        (r) => r.record.type === 'choice_made' && r.record.loopSessionId === l.sessionId,
      )?.record;
      out.push({
        loopSessionId: l.sessionId,
        title: opened.title,
        origin:
          opened.resumeOf !== undefined
            ? { kind: 'resume', fromLoop: opened.resumeOf.fromLoop }
            : made?.type === 'choice_made'
              ? { kind: 'card', cardId: made.cardId }
              : { kind: 'unknown' },
        status: statusOf(recs),
        ...(flags.shelved !== undefined ? { shelved: true } : {}),
      });
    }
    return out;
  }

  private loopObjections(loopId: string, recs: NumberedRecord[]): ObjectionView[] {
    const flagged: ObjectionView[] = recs.flatMap((r) =>
      r.record.type === 'user_message' && r.record.objection !== undefined
        ? [
            {
              id: `${loopId}:${String(r.line)}`,
              at: r.record.at,
              text: r.record.text,
              target: {
                kind: 'guard_verdict' as const,
                loopSessionId: loopId,
                line: r.record.objection.toLine,
              },
              inLoop: true,
              line: r.line,
            },
          ]
        : [],
    );
    const stored = this.d.objections.forLoop(loopId).map(storedView);
    return [...flagged, ...stored].sort((a, b) => a.at.localeCompare(b.at));
  }

  // ───────────── 单子与选择卡 ─────────────

  /** 单子平铺给界面：各字段原样 + `refs`（依据串回查，去重、按出现顺序）+ `edits`（本次的改动）。 */
  async ticketView(t: Ticket, edits: TicketEditView[]): Promise<TicketView> {
    const raws: string[] = [];
    for (const s of t.startPoints) if (s.ref !== undefined) raws.push(s.ref);
    for (const c of t.sourceCheck) if (c.at !== undefined) raws.push(c.at);
    const seen = new Set<string>();
    const refs: SourceView[] = [];
    for (const raw of raws) {
      const key = raw.trim();
      if (seen.has(key)) continue;
      seen.add(key);
      refs.push(await this.source(raw));
    }
    return { ...t, refs, edits };
  }

  /**
   * 一条路线决定 → 视图：`trigger` 取同一导航会话那张卡的触发原因；
   * `superseded` = 主对话里在它之后还有别的路线决定（不看 `supersedes` 字段）。
   */
  private async routeDecisionView(
    mainRecs: NumberedRecord[],
    line: number,
    rd: RouteDecision,
  ): Promise<RouteDecisionView> {
    const card = mainRecs.find(
      (r) => r.record.type === 'choice_card' && r.record.navSessionId === rd.navSessionId,
    )?.record;
    return {
      line,
      at: rd.at,
      navSessionId: rd.navSessionId,
      trigger: card?.type === 'choice_card' ? card.trigger : rd.trigger,
      decision: rd.decision,
      reason: rd.reason,
      basis: await Promise.all(rd.basis.map((b) => this.source(b))),
      superseded: mainRecs.some((r) => r.record.type === 'route_decision' && r.line > line),
    };
  }

  /**
   * 没合上那次的路线决定：那次学习里 `card_ready` 的卡号 → 项目主对话里那张卡 → 同一导航会话的路线决定。
   * 找不到就不给这一栏。
   */
  private async loopRouteDecision(
    recs: NumberedRecord[],
    mainId: string,
  ): Promise<RouteDecisionView | undefined> {
    const cardId = recs
      .filter((r) => r.record.type === 'after_loop_step' && r.record.step === 'card_ready')
      .map((r) => (r.record.type === 'after_loop_step' ? r.record.detail : ''))
      .at(-1);
    if (cardId === undefined || cardId === '') return undefined;
    const mainRecs = await this.d.hub.records(mainId);
    const card = mainRecs.find(
      (r) => r.record.type === 'choice_card' && r.record.cardId === cardId,
    )?.record;
    if (card?.type !== 'choice_card') return undefined;
    const rd = mainRecs.find(
      (r) => r.record.type === 'route_decision' && r.record.navSessionId === card.navSessionId,
    );
    if (rd?.record.type !== 'route_decision') return undefined;
    return this.routeDecisionView(mainRecs, rd.line, rd.record);
  }

  /** 学习者改单子的记录 → 改动视图（按行号升序）。 */
  private editViews(recs: NumberedRecord[]): TicketEditView[] {
    return recs.flatMap((r) =>
      r.record.type === 'ticket_edited'
        ? [{ line: r.line, at: r.record.at, before: r.record.before, after: r.record.after }]
        : [],
    );
  }

  /** 找到一张选择卡（遍历各项目的主对话）。 */
  async card(cardId: string): Promise<CardView> {
    for (const m of this.d.hub.listSessions().filter((s) => s.kind === 'main')) {
      const recs = await this.d.hub.records(m.sessionId);
      const found = recs.find((r) => r.record.type === 'choice_card' && r.record.cardId === cardId);
      if (found?.record.type === 'choice_card') {
        return this.cardView(m.sessionId, found.line, found.record, recs);
      }
    }
    throw new NotFoundError(`没有这组选项：${cardId}`);
  }

  private async cardView(
    mainId: string,
    line: number,
    card: ChoiceCard,
    recs: NumberedRecord[],
  ): Promise<CardView> {
    const made = recs
      .map((r) => r.record)
      .find((r): r is ChoiceMade => r.type === 'choice_made' && r.cardId === card.cardId);
    const options: CardOptionView[] = [];
    for (const [i, o] of card.options.entries()) {
      options.push({
        index: i,
        title: o.title,
        reason: o.reason,
        recommended: i === card.recommended,
        chosen: made?.option === i,
        // 卡上的单子是导航当时写的原样；改动记录只属于开出来的那次学习
        ticket: await this.ticketView(o.ticket, []),
        ...(o.sources !== undefined
          ? { sources: await Promise.all(o.sources.map((s) => this.source(s))) }
          : {}),
      });
    }
    const decisionAt = recs.find(
      (r) => r.record.type === 'route_decision' && r.record.navSessionId === card.navSessionId,
    );
    const decision = decisionAt?.record.type === 'route_decision' ? decisionAt.record : undefined;
    return {
      cardId: card.cardId,
      mainSessionId: mainId,
      line,
      at: card.at,
      trigger: card.trigger,
      ...(decision !== undefined && decisionAt !== undefined
        ? { routeDecision: await this.routeDecisionView(recs, decisionAt.line, decision) }
        : {}),
      recommended: card.recommended,
      navSessionId: card.navSessionId,
      model: await this.d.hub.modelInfo(card.navSessionId),
      ...(made !== undefined
        ? { chosen: { option: made.option, loopSessionId: made.loopSessionId } }
        : {}),
      options,
    };
  }

  /**
   * 把一条依据串回查成能给学习者看的内容：书里那一行给原文、以前学过的记录给它的理解、
   * 对话行给那一句；都认不出就原样给、标查不到（不编）。
   */
  private async source(raw: string): Promise<SourceView> {
    const id = raw.trim();
    const at = await locate(raw, { hub: this.d.hub, sources: this.d.sources });
    if (at.kind === 'book') {
      const cited = await this.bookSource(raw);
      if (cited !== undefined) return cited;
      // 只写了文件名、没写书名：认不出是哪一本，照给位置、标查不到
      const m = /^(.+):(\d+)(?:-\d+)?$/.exec(id);
      if (m?.[1] !== undefined && m[2] !== undefined) {
        return {
          raw,
          kind: 'book_line',
          resolved: false,
          label: `书里 ${m[1]} 第 ${m[2]} 行`,
          file: m[1],
          line: Number(m[2]),
        };
      }
      return unknownSource(raw);
    }
    if (at.sessionId !== undefined && at.line !== undefined) {
      // 会话不存在时 locate 已标 ok: false，这里不再读
      const recs = at.ok ? await this.d.hub.records(at.sessionId) : [];
      const hit = recs.find((r) => r.line === at.line);
      const text =
        hit?.record.type === 'user_message' || hit?.record.type === 'assistant_message'
          ? hit.record.text
          : undefined;
      return {
        raw,
        kind: 'loop_line',
        resolved: at.ok,
        label: `对话 ${at.sessionId} 第 ${String(at.line)} 行`,
        ...(text !== undefined ? { detail: text } : {}),
        sessionId: at.sessionId,
        line: at.line,
      };
    }
    return unknownSource(raw);
  }

  private async bookSource(raw: string): Promise<SourceView | undefined> {
    const cited = await this.d.sources.materialLine(raw);
    if (cited === undefined) return undefined;
    if (!cited.resolved || cited.lines === undefined) {
      return {
        raw,
        kind: 'book_line',
        resolved: false,
        label: `书里 ${cited.book}/${cited.file} 第 ${lineSpan(cited.from, cited.to)} 行${cited.problem !== undefined ? `（${cited.problem}）` : ''}`,
        file: cited.file,
        line: cited.from,
        book: cited.book,
        from: cited.from,
        to: cited.to,
      };
    }
    const where = [cited.section, cited.pages].filter((x) => x !== undefined).join(' ');
    return {
      raw,
      kind: 'book_line',
      resolved: true,
      label: `书里《${cited.bookTitle ?? cited.book}》${where !== '' ? ` ${where}` : ''} 第 ${lineSpan(cited.from, cited.to)} 行`,
      detail: cited.lines.map((l) => l.text).join('\n'),
      file: cited.file,
      line: cited.from,
      book: cited.book,
      from: cited.from,
      to: cited.to,
      lines: cited.lines,
    };
  }

  // ───────────── 项目页 ─────────────

  async overview(mainId: string): Promise<ProjectOverview> {
    const main = await this.d.hub.opened(mainId);
    if (main.kind !== 'main') throw new BadRequestError('这不是一个项目。');
    const mainRecs = await this.d.hub.records(mainId);
    const goal = currentGoal(mainRecs);
    const title = mainRecs
      .map((r) => r.record)
      .filter((r) => r.type === 'project_title')
      .at(-1);
    const mainLog = mainRecs.map((r) => r.record);
    const dl = foldDeadline(mainLog);
    const groups: ProjectOverview['groups'] = {
      inProgress: [],
      closed: [],
      unclosed: [],
    };
    for (const l of this.d.hub
      .listSessions()
      .filter((s) => s.kind === 'loop' && s.parent === mainId)) {
      const brief = await this.brief(l.sessionId);
      if (brief.status === 'in_progress') {
        // 搁置的单列一组，不混在“进行中”里；没有就不出现这一项
        if (brief.shelved !== undefined) (groups.shelved ??= []).push(brief);
        else groups.inProgress.push(brief);
      } else if (brief.status === 'closed') groups.closed.push(brief);
      else groups.unclosed.push(brief);
    }
    // 积压（停车场）：没合上、还没补上的那些次（学过的记录同一套取数）
    const parked = (await this.d.learned.parked(mainId)).length;
    const load: LoopLoad = {
      inProgress: groups.inProgress.length,
      shelved: groups.shelved?.length ?? 0,
      parked,
      unfinished: groups.inProgress.length + (groups.shelved?.length ?? 0),
      heavy: groups.inProgress.length + (groups.shelved?.length ?? 0) >= LOAD_HEAVY,
      parkingPile: parked >= PARKING_PILE,
    };
    return {
      mainSessionId: mainId,
      title: title?.type === 'project_title' ? title.title : main.title,
      ...(goal !== undefined ? { goal: goal.goal.text, goalView: goalViewOf(goal) } : {}),
      ...(dl.deadline !== undefined ? { deadline: dl.deadline } : {}),
      ...(dl.note !== undefined ? { deadlineNote: dl.note } : {}),
      materialCount: foldMaterials(mainLog).length,
      groups,
      load,
    };
  }

  private async brief(loopId: string): Promise<LoopBrief> {
    const opened = await this.d.hub.opened(loopId);
    const recs = await this.d.hub.records(loopId);
    const ended = recs.find((r) => r.record.type === 'loop_ended');
    const verdict = recs.filter((r) => r.record.type === 'guard_verdict').at(-1);
    const flags = foldLoop(recs);
    return {
      sessionId: loopId,
      title: opened.title,
      openedAt: opened.at,
      ...(flags.shelved !== undefined
        ? { shelved: { at: flags.shelved.at, note: flags.shelved.note } }
        : {}),
      ...(opened.resumeOf !== undefined
        ? {
            resumeOf: {
              loopSessionId: opened.resumeOf.fromLoop,
              ...(await this.titleOf(opened.resumeOf.fromLoop).then((t) =>
                t !== undefined ? { title: t } : {},
              )),
            },
          }
        : {}),
      ...(opened.ticket?.revisit !== undefined ? { revisit: opened.ticket.revisit.kind } : {}),
      ...(opened.ticket?.stageCheck === true ? { stageCheck: true } : {}),
      ...(ended !== undefined ? { endedAt: ended.record.at } : {}),
      status: statusOf(recs),
      ...(opened.ticket !== undefined ? { newPoint: this.pointRef(opened.ticket.newPoint) } : {}),
      ...(verdict?.record.type === 'guard_verdict'
        ? { lastVerdict: { closed: verdict.record.closed, line: verdict.line } }
        : {}),
    };
  }

  // ───────────── 教法记录 / 状态记录 ─────────────

  async strategies(loopId?: string): Promise<StrategyView[]> {
    const out: StrategyView[] = [];
    for (const r of this.d.pedagogy
      .all()
      .filter((x) => loopId === undefined || x.loopSessionId === loopId)) {
      out.push({
        id: r.id,
        at: r.at,
        loopSessionId: r.loopSessionId,
        conditions: r.conditions,
        strategies: r.strategies,
        followedBy: r.followedBy,
        evidenceLines: r.evidenceLines,
        quotes: await this.quotes(r.loopSessionId, r.evidenceLines),
        toolsUsed: r.toolsUsed,
        ...(r.toolUses ? { toolUses: r.toolUses } : {}),
        ...(r.selfCheck ? { selfCheck: r.selfCheck } : {}),
        model: modelInfoOf(r.model),
        objections: this.d.objections.forRecord('pedagogy', r.id).map(storedView),
      });
    }
    return out;
  }

  async state(): Promise<{ current?: CurrentStateView; records: StateRecordView[] }> {
    const records: StateRecordView[] = [];
    for (const r of this.d.state.allRecords()) {
      const refs: StateRecordView['refs'] = [];
      for (const x of r.refs) {
        refs.push({
          sessionId: x.sessionId,
          lines: x.lines,
          quotes: await this.quotes(x.sessionId, x.lines),
        });
      }
      const verdict = this.d.state.verdictOf(r.id);
      records.push({
        id: r.id,
        at: r.at,
        text: r.text,
        source: r.source,
        sourceLevel: this.d.state.sourceLevel(r),
        output: r.output,
        timeRange: r.timeRange,
        refs,
        ...(r.afterTeaching ? { afterTeaching: r.afterTeaching } : {}),
        confirmations: this.d.state.confirmationsFor(r.id),
        ...(verdict ? { learnerVerdict: verdict.verdict } : {}),
        stateSessionId: r.stateSessionId,
        model: modelInfoOf(r.model),
        objections: this.d.objections.forRecord('state', r.id).map(storedView),
      });
    }
    const cur = this.d.state.current();
    return {
      ...(cur !== undefined
        ? {
            current: {
              at: cur.at,
              text: cur.text,
              stage: cur.stage,
              basisSpan: cur.basisSpan,
              stateSessionId: cur.stateSessionId,
              model: modelInfoOf(cur.model),
            },
          }
        : {}),
      records,
    };
  }

  // ───────────── 教学工具 ─────────────

  async teachingTools(): Promise<TeachingToolsResponse> {
    const { tools, problems } = await this.d.teaching.list();
    return {
      tools: tools.map(({ name, applies, origin, source, status }) => ({
        name,
        applies,
        origin,
        source,
        status,
      })),
      problems,
    };
  }

  async teachingTool(name: string): Promise<TeachingToolResponse> {
    const t = await this.d.teaching.get(name);
    if (!t) throw new NotFoundError(`没有叫「${name}」的教学工具`);
    return {
      tool: {
        name: t.name,
        applies: t.applies,
        origin: t.origin,
        source: t.source,
        status: t.status,
        text: t.text,
      },
    };
  }

  /** 异议存放处里的全部异议（可按种类、记录 id 过滤）。 */
  objections(kind?: string, recordId?: string): ObjectionView[] {
    return this.d.objections
      .all()
      .filter((o) => kind === undefined || o.target.kind === kind)
      .filter(
        (o) => recordId === undefined || ('recordId' in o.target && o.target.recordId === recordId),
      )
      .map(storedView);
  }

  /** 单子里的一个点：不再查知识点库，名字就等于它自己（工单 §4.5）。 */
  private pointRef(id: string): PointRef {
    return { id, name: id };
  }

  // ───────────── 外发披露 ─────────────

  disclosure(): DisclosureResponse {
    const d = this.d.hub.disclosure;
    const kinds = Object.keys(CONVERSATION_KIND_LABELS) as ConversationKind[];
    const sessionRow = (kind: ConversationKind) => ({
      kind,
      label: CONVERSATION_KIND_LABELS[kind],
      model: d?.profiles[kind]?.model ?? d?.defaultModel ?? null,
      effort: d?.profiles[kind]?.effort ?? null,
    });
    return {
      service: d?.service ?? '未声明（这个模型适配器没有说明内容送往哪里）',
      route: d?.route ?? '未声明',
      adapter: this.d.hub.modelName,
      sends: [
        '你在对话里说的话和发的文字',
        '对话里用到的教材原文片段（模型读到的小节）',
        '你的学习记录：我会什么、我的状态、教法记录（相关的对话会读到）',
        '你对这些记录提的异议',
        '你的产出物（笔记、推导、论文、方法比较）的当前版本和你的修改（在“写产出”对话里会读到）',
        '你加的图片（只在转写时送去；对话里只送转写出的文字）',
        '畅谈和导航对话里模型拟的联网搜索词与要打开的网址',
      ],
      webSearch: {
        sessions: this.d.webSearchKinds().map((kind) => ({
          kind,
          label: CONVERSATION_KIND_LABELS[kind],
        })),
        note: '这些对话里模型可以自己联网搜索、打开网页：搜索词和网址由模型从对话与记录里拟出，经上面的模型服务发出；搜到的内容回到对话里。',
      },
      sessions: kinds.filter((k) => !LATER_KINDS.includes(k)).map(sessionRow),
      // 批 8 起新增的会话类单列（早先的验收测试规定 sessions 就是原来那八类，不能往里加）
      laterSessions: kinds.filter((k) => LATER_KINDS.includes(k)).map(sessionRow),
      note: '没单独指定模型的会话用服务的默认模型；每条记录里的“模型”是实际执行的那个，取不到时会写明只是适配器名。',
      inputs: this.d.inputs?.disclosure(d) ?? [],
    };
  }

  // ───────────── 共用 ─────────────

  private async quotes(sessionId: string, lines: number[]): Promise<QuoteView[]> {
    try {
      return quotesOf(await this.d.hub.records(sessionId), lines);
    } catch (e) {
      if (e instanceof NotFoundError) return lines.map((line) => ({ line, at: '' }));
      throw e;
    }
  }
}

function quotesOf(recs: NumberedRecord[], lines: number[]): QuoteView[] {
  return lines.map((line) => {
    const r = recs.find((x) => x.line === line)?.record;
    if (r?.type === 'user_message' || r?.type === 'assistant_message') {
      return { line, at: r.at, text: r.text };
    }
    return { line, at: r?.at ?? '' };
  });
}

function statusOf(recs: NumberedRecord[]): LoopStatus {
  const ended = recs.map((r) => r.record).find((r) => r.type === 'loop_ended');
  if (ended?.type !== 'loop_ended') return 'in_progress';
  return ended.closed ? 'closed' : 'unclosed';
}

function storedView(o: LearnerObjection): ObjectionView {
  return { ...o, inLoop: false };
}

/** 方向目标记录 → 完整形状（旧记录只有一句话时就只有 line / at / text）。 */
function goalViewOf(x: { line: number; goal: ProjectGoal }): GoalView {
  const g = x.goal;
  return {
    line: x.line,
    at: g.at,
    text: g.text,
    ...(g.title !== undefined ? { title: g.title } : {}),
    ...(g.abilities !== undefined ? { abilities: g.abilities } : {}),
    ...(g.orderHint !== undefined ? { orderHint: g.orderHint } : {}),
    ...(g.deadline !== undefined ? { deadline: g.deadline } : {}),
    ...(g.provisional === true ? { provisional: true as const } : {}),
  };
}

function unknownSource(raw: string): SourceView {
  return { raw, kind: 'unknown', resolved: false, label: raw };
}

function lineSpan(from: number, to: number): string {
  return from === to ? String(from) : `${String(from)}–${String(to)}`;
}
