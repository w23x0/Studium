// 依据可见（批 1a）：把守卫判定、诊断、单子与出处、M09 / M10 / M15 记录整理成界面能直接读的只读视图。
// 只读：不写任何记录；异议的写入在 studium.ts。
import {
  CONVERSATION_KIND_LABELS,
  modelInfoOf,
  type CardOptionView,
  type CardView,
  type CurrentStateView,
  type DetourCardView,
  type DisclosureResponse,
  type ForkLinkView,
  type ForkOriginView,
  type LoopLoad,
  type LoopRelationView,
  type ParkingView,
  type RouteSignalView,
  type ExternalRecordView,
  type FormationView,
  type GuardVerdictView,
  type LoopBrief,
  type LoopEvidence,
  type LoopStatus,
  type ObjectionView,
  type PointRef,
  type ProjectOverview,
  type QuoteView,
  type SourceView,
  type StateRecordView,
  type StrategyView,
  type TeachingToolResponse,
  type TeachingToolsResponse,
  type TicketView,
} from '../shared/protocol.ts';
import type {
  ChoiceCard,
  ChoiceMade,
  ConversationKind,
  ForkOrigin,
  LearnerObjection,
  NumberedRecord,
  ParkingNote,
  Ticket,
} from '../shared/records.ts';
import { NotFoundError, type Hub } from './hub.ts';
import { locate } from './locate.ts';

/** 批 8 起新增的会话类：外发披露里单列在 laterSessions。 */
const LATER_KINDS: ConversationKind[] = ['output'];
import { foldLoop, LOAD_HEAVY, PARKING_PILE, type LoopFlags } from './loop-state.ts';
import type { M09 } from './knowledge/m09.ts';
import type { M10 } from './knowledge/m10.ts';
import type { M15 } from './knowledge/m15.ts';
import type { Objections } from './knowledge/objections.ts';
import type { Inputs } from './inputs.ts';
import type { Sources } from './sources.ts';
import { toolUsesOf, type TeachingTools } from './teaching-tools.ts';
import { BadRequestError, foldDeadline, foldMaterials } from './studium.ts';

export interface EvidenceDeps {
  hub: Hub;
  m09: M09;
  m10: M10;
  m15: M15;
  objections: Objections;
  /** 回查书里的出处（批 2a）。 */
  sources: Sources;
  /** 图片转写、语音送往哪里（批 4）；不给就不列。 */
  inputs?: Inputs;
  /** 教学工具（批 7）。 */
  teaching: TeachingTools;
}

export class Evidence {
  constructor(private readonly d: EvidenceDeps) {}

  // ───────────── 闭环：守卫判定、诊断、单子 ─────────────

  async loop(loopId: string): Promise<LoopEvidence> {
    const opened = await this.d.hub.opened(loopId);
    if (opened.kind !== 'loop') throw new BadRequestError('这段对话不是一次学习任务。');
    const recs = await this.d.hub.records(loopId);
    const flags = foldLoop(recs);
    const ended = recs.find((r) => r.record.type === 'loop_ended');
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
        model: await this.d.hub.modelInfo(v.guardSessionId),
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
      ...(opened.ticket !== undefined ? { ticket: this.ticket(opened.ticket) } : {}),
      model: await this.d.hub.modelInfo(loopId),
      verdicts,
      diagnoses: recs.flatMap((r) =>
        r.record.type === 'loop_note'
          ? [
              {
                line: r.line,
                at: r.record.at,
                text: r.record.text,
                ...(r.record.regression !== undefined
                  ? {
                      regression: {
                        line: r.line,
                        at: r.record.at,
                        point: { id: r.record.regression.point, name: r.record.regression.point },
                        basisLines: r.record.regression.basisLines,
                        suspicion: r.record.regression.suspicion,
                        against: r.record.regression.against,
                        text: r.record.text,
                      },
                    }
                  : {}),
                ...(r.record.intensity ? { intensity: r.record.intensity } : {}),
              },
            ]
          : [],
      ),
      teachingToolsUsed: toolUsesOf(recs),
      objections,
      ...(flags.shelved !== undefined
        ? { shelved: { at: flags.shelved.at, note: flags.shelved.note } }
        : {}),
      ...(flags.waitingFork !== undefined ? { waitingFork: flags.waitingFork } : {}),
      ...(opened.fork !== undefined ? { fork: await this.forkView(opened.fork) } : {}),
      forks: await this.forkLinks(flags),
      signals: recs.flatMap((r) =>
        r.record.type === 'route_signal'
          ? [
              {
                line: r.line,
                at: r.record.at,
                kind: r.record.kind,
                ...(r.record.missingPoint !== undefined
                  ? { missingPoint: this.pointRef(r.record.missingPoint) }
                  : {}),
                missingText: r.record.missingText,
                basisLines: r.record.basisLines,
                quotes: quotesOf(recs, r.record.basisLines),
                ...(r.record.note !== undefined ? { note: r.record.note } : {}),
              } satisfies RouteSignalView,
            ]
          : [],
      ),
      detours: await this.detourViews(recs),
      ...(flags.parking !== undefined ? { parking: this.parkingView(flags.parking) } : {}),
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

  private async forkView(f: ForkOrigin): Promise<ForkOriginView> {
    const title = await this.titleOf(f.fromLoop);
    return {
      fromLoop: f.fromLoop,
      ...(title !== undefined ? { fromTitle: title } : {}),
      kind: f.kind,
      reason: f.reason,
      ...(f.missingPoint !== undefined ? { missingPoint: this.pointRef(f.missingPoint) } : {}),
      basisLines: f.basisLines,
      signalLine: f.signalLine,
      returnCondition: f.returnCondition,
      ...(f.scope !== undefined ? { scope: f.scope } : {}),
    };
  }

  private async forkLinks(flags: LoopFlags): Promise<ForkLinkView[]> {
    const out: ForkLinkView[] = [];
    for (const f of flags.forks) {
      const o = await this.d.hub.opened(f.forkLoopSessionId);
      out.push({
        forkLoopSessionId: f.forkLoopSessionId,
        title: o.title,
        openedAt: o.at,
        ...(f.returned !== undefined
          ? {
              returned: {
                at: f.returned.at,
                closed: f.returned.closed,
                delivered: f.returned.delivered,
              },
            }
          : {}),
      });
    }
    return out;
  }

  private parkingView(p: ParkingNote & { line: number }): ParkingView {
    return {
      line: p.line,
      at: p.at,
      reason: p.reason,
      missing: p.missing.map((m) => ({
        ...(m.point !== undefined ? { point: this.pointRef(m.point) } : {}),
        text: m.text,
      })),
      when: p.when,
      resumeFrom: p.resumeFrom,
      basisLines: p.basisLines,
      m05SessionId: p.m05SessionId,
    };
  }

  private async detourViews(recs: NumberedRecord[]): Promise<DetourCardView[]> {
    const out: DetourCardView[] = [];
    for (const r of recs) {
      if (r.record.type !== 'detour_card') continue;
      const c = r.record;
      const made = recs.find(
        (x) => x.record.type === 'detour_made' && x.record.cardId === c.cardId,
      )?.record;
      out.push({
        cardId: c.cardId,
        line: r.line,
        at: c.at,
        signalLine: c.signalLine,
        options: c.options.map((o) => ({
          kind: o.kind,
          title: o.title,
          reason: o.reason,
          ...(o.ticket !== undefined ? { ticket: this.ticket(o.ticket) } : {}),
          ...(o.scope !== undefined ? { scope: o.scope } : {}),
        })),
        recommended: c.recommended,
        m05SessionId: c.m05SessionId,
        model: await this.d.hub.modelInfo(c.m05SessionId),
        ...(made?.type === 'detour_made'
          ? {
              chosen: {
                option: made.option,
                choice: made.choice,
                at: made.at,
                ...(made.forkLoopSessionId !== undefined
                  ? { forkLoopSessionId: made.forkLoopSessionId }
                  : {}),
              },
            }
          : {}),
      });
    }
    return out;
  }

  /** 项目下闭环之间的关系：每个闭环从哪来（选择卡 / 分叉）、开出去哪些分叉、回来没有。 */
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
          opened.fork !== undefined
            ? { kind: 'fork', fork: await this.forkView(opened.fork) }
            : opened.resumeOf !== undefined
              ? { kind: 'resume', fromLoop: opened.resumeOf.fromLoop }
              : made?.type === 'choice_made'
                ? { kind: 'card', cardId: made.cardId }
                : { kind: 'unknown' },
        status: statusOf(recs),
        ...(flags.shelved !== undefined ? { shelved: true } : {}),
        ...(flags.waitingFork !== undefined ? { waitingFork: flags.waitingFork } : {}),
        forks: await this.forkLinks(flags),
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

  ticket(t: Ticket): TicketView {
    return t;
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
        ticket: this.ticket(o.ticket),
        ...(o.sources !== undefined
          ? { sources: await Promise.all(o.sources.map((s) => this.source(s))) }
          : {}),
      });
    }
    const decisionAt = recs.find(
      (r) => r.record.type === 'route_decision' && r.record.navSessionId === card.m05SessionId,
    );
    const decision = decisionAt?.record.type === 'route_decision' ? decisionAt.record : undefined;
    return {
      cardId: card.cardId,
      mainSessionId: mainId,
      line,
      at: card.at,
      trigger: card.trigger,
      ...(decision !== undefined && decisionAt !== undefined
        ? {
            routeDecision: {
              line: decisionAt.line,
              decision: decision.decision,
              reason: decision.reason,
              basis: await Promise.all(decision.basis.map((b) => this.source(b))),
            },
          }
        : {}),
      recommended: card.recommended,
      m05SessionId: card.m05SessionId,
      model: await this.d.hub.modelInfo(card.m05SessionId),
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
    const f = this.d.m09.record(id);
    if (f !== undefined) {
      return {
        raw,
        kind: 'm09_record',
        resolved: true,
        label: `形成记录 ${f.id}（学习 ${f.loopSessionId}）`,
        detail: f.understanding,
        sessionId: f.loopSessionId,
      };
    }
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
    const cited = await this.d.sources.bookLine(raw);
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
    const goal = mainRecs
      .map((r) => r.record)
      .filter((r) => r.type === 'project_goal')
      .at(-1);
    const title = mainRecs
      .map((r) => r.record)
      .filter((r) => r.type === 'project_title')
      .at(-1);
    const mainLog = mainRecs.map((r) => r.record);
    const dl = foldDeadline(mainLog);
    const groups: ProjectOverview['groups'] = {
      inProgress: [],
      awaitingChoice: [],
      closed: [],
      unclosed: [],
    };
    for (const l of this.d.hub
      .listSessions()
      .filter((s) => s.kind === 'loop' && s.parent === mainId)) {
      const brief = await this.brief(l.sessionId);
      if (brief.status === 'in_progress') {
        // 搁置、等分叉回来各自成组，不混在“进行中”里；没有就不出现这一项
        if (brief.shelved !== undefined) (groups.shelved ??= []).push(brief);
        else if (brief.waitingFork !== undefined) (groups.waitingFork ??= []).push(brief);
        else groups.inProgress.push(brief);
      } else if (brief.status === 'closed') groups.closed.push(brief);
      else groups.unclosed.push(brief);
    }
    const knownPoints = new Set(this.d.m09.knownPoints());
    const parked = groups.unclosed.filter(
      (b) => b.newPoint === undefined || !knownPoints.has(b.newPoint.id),
    ).length;
    const counts = {
      inProgress: groups.inProgress.length,
      shelved: groups.shelved?.length ?? 0,
      waitingFork: groups.waitingFork?.length ?? 0,
    };
    const unfinished = counts.inProgress + counts.shelved + counts.waitingFork;
    const load: LoopLoad = {
      ...counts,
      parked,
      unfinished,
      heavy: unfinished >= LOAD_HEAVY,
      parkingPile: parked >= PARKING_PILE,
    };
    const chosen = new Set(
      mainRecs.flatMap((r) => (r.record.type === 'choice_made' ? [r.record.cardId] : [])),
    );
    for (const r of [...mainRecs].reverse()) {
      if (r.record.type === 'choice_card' && !chosen.has(r.record.cardId)) {
        groups.awaitingChoice.push(await this.cardView(mainId, r.line, r.record, mainRecs));
      }
    }
    return {
      mainSessionId: mainId,
      title: title?.type === 'project_title' ? title.title : main.title,
      ...(goal?.type === 'project_goal' ? { goal: goal.text } : {}),
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
    const waitTitle =
      flags.waitingFork !== undefined ? await this.titleOf(flags.waitingFork) : undefined;
    return {
      sessionId: loopId,
      title: opened.title,
      openedAt: opened.at,
      ...(flags.shelved !== undefined
        ? { shelved: { at: flags.shelved.at, note: flags.shelved.note } }
        : {}),
      ...(flags.waitingFork !== undefined
        ? {
            waitingFork: {
              forkLoopSessionId: flags.waitingFork,
              ...(waitTitle !== undefined ? { title: waitTitle } : {}),
            },
          }
        : {}),
      ...(opened.fork !== undefined
        ? { forkOf: { loopSessionId: opened.fork.fromLoop, reason: opened.fork.reason } }
        : {}),
      ...(flags.parking !== undefined ? { parking: this.parkingView(flags.parking) } : {}),
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

  // ───────────── M09 / M10 / M15 ─────────────

  async formations(loopId?: string): Promise<FormationView[]> {
    const out: FormationView[] = [];
    for (const r of this.d.m09
      .all()
      .filter((x) => loopId === undefined || x.loopSessionId === loopId)) {
      out.push({
        id: r.id,
        at: r.at,
        loopSessionId: r.loopSessionId,
        newPoint: this.pointRef(r.newPoint),
        clause: r.clause,
        startPoints: r.startPoints.map((p) => this.pointRef(p)),
        understanding: r.understanding,
        process: r.process,
        unmet: r.unmet,
        evidenceStrength: r.evidenceStrength,
        ...(r.evidence !== undefined
          ? {
              evidence: {
                newPoint: { ...r.evidence.newPoint },
                startPoints: r.evidence.startPoints.map((s) => ({ ...s })),
              },
            }
          : {}),
        evidenceLines: r.evidenceLines,
        quotes: await this.quotes(r.loopSessionId, r.evidenceLines),
        model: modelInfoOf(r.model),
        objections: this.d.objections.forRecord('m09', r.id).map(storedView),
        version: r.version ?? 1,
        latest: this.d.m09.forLoop(r.loopSessionId).at(-1) === r,
        ...(r.level !== undefined ? { level: r.level } : {}),
        ...(r.summary !== undefined ? { summary: r.summary } : {}),
        ...(r.keywords !== undefined ? { keywords: r.keywords } : {}),
        ...(r.revisit !== undefined
          ? { revisit: { kind: r.revisit.kind, formationIds: r.revisit.formationIds } }
          : {}),
      });
    }
    return out;
  }

  async strategies(loopId?: string): Promise<StrategyView[]> {
    const out: StrategyView[] = [];
    for (const r of this.d.m10
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
        ...(r.intensityTrend ? { intensityTrend: r.intensityTrend } : {}),
        ...(r.selfCheck ? { selfCheck: r.selfCheck } : {}),
        model: modelInfoOf(r.model),
        objections: this.d.objections.forRecord('m10', r.id).map(storedView),
      });
    }
    return out;
  }

  async state(): Promise<{ current?: CurrentStateView; records: StateRecordView[] }> {
    const records: StateRecordView[] = [];
    for (const r of this.d.m15.allRecords()) {
      const refs: StateRecordView['refs'] = [];
      for (const x of r.refs) {
        refs.push({
          sessionId: x.sessionId,
          lines: x.lines,
          quotes: await this.quotes(x.sessionId, x.lines),
        });
      }
      const verdict = this.d.m15.verdictOf(r.id);
      records.push({
        id: r.id,
        at: r.at,
        text: r.text,
        source: r.source,
        sourceLevel: this.d.m15.sourceLevel(r),
        output: r.output,
        timeRange: r.timeRange,
        refs,
        ...(r.afterTeaching ? { afterTeaching: r.afterTeaching } : {}),
        confirmations: this.d.m15.confirmationsFor(r.id),
        ...(verdict ? { learnerVerdict: verdict.verdict } : {}),
        m15SessionId: r.m15SessionId,
        model: modelInfoOf(r.model),
        objections: this.d.objections.forRecord('m15', r.id).map(storedView),
      });
    }
    const cur = this.d.m15.current();
    return {
      ...(cur !== undefined
        ? {
            current: {
              at: cur.at,
              text: cur.text,
              stage: cur.stage,
              basisSpan: cur.basisSpan,
              m15SessionId: cur.m15SessionId,
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

  /** 外部导入进 M09 的记录（自述 / 笔记，未验证），新的在后。 */
  externals(): ExternalRecordView[] {
    return this.d.m09.externals().map((r) => ({
      id: r.id,
      at: r.at,
      source: r.source,
      status: r.status,
      claim: r.claim,
      ...(r.point !== undefined ? { point: { id: r.point, name: r.point } } : {}),
      basis: r.basis,
      ...(r.grade !== undefined ? { grade: r.grade } : {}),
      ...(r.talk !== undefined ? { talk: r.talk } : {}),
      ...(r.note !== undefined ? { note: r.note } : {}),
      model: r.model,
    }));
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
      ],
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

function unknownSource(raw: string): SourceView {
  return { raw, kind: 'unknown', resolved: false, label: raw };
}

function lineSpan(from: number, to: number): string {
  return from === to ? String(from) : `${String(from)}–${String(to)}`;
}
