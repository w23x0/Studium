// 依据可见（批 1a）：把守卫判定、诊断、单子与出处、M09 / M10 / M15 记录、M08 点与子句整理成界面能直接读的只读视图。
// 只读：不写任何记录；异议的写入在 studium.ts。
import {
  CONVERSATION_KIND_LABELS,
  M08_SOURCE_NOTES,
  modelInfoOf,
  type AnchorView,
  type CardOptionView,
  type CardView,
  type ClauseView,
  type CurrentStateView,
  type DisclosureResponse,
  type ExternalRecordView,
  type M08OverviewResponse,
  type FormationView,
  type GuardVerdictView,
  type LoopBrief,
  type LoopEvidence,
  type LoopStatus,
  type ObjectionView,
  type Point08Response,
  type PointRef,
  type PointView,
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
  LearnerObjection,
  NumberedRecord,
  Ticket,
} from '../shared/records.ts';
import { NotFoundError, type Hub } from './hub.ts';
import type { M08, Anchor, Clause, Point } from './knowledge/m08.ts';
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
  m08: M08;
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
                ...(r.record.intensity ? { intensity: r.record.intensity } : {}),
              },
            ]
          : [],
      ),
      teachingToolsUsed: toolUsesOf(recs),
      objections,
    };
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
    const c = this.d.m08.clauses.get(t.clause);
    return {
      newPoint: this.pointRef(t.newPoint),
      ...(c !== undefined ? { clause: this.clauseView(c) } : {}),
      clauseId: t.clause,
      startPoints: t.startPoints.map((s) => ({ point: this.pointRef(s.point), source: s.source })),
      routeAction: t.routeAction,
    };
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
    return {
      cardId: card.cardId,
      mainSessionId: mainId,
      line,
      at: card.at,
      trigger: card.trigger,
      recommended: card.recommended,
      m05SessionId: card.m05SessionId,
      model: await this.d.hub.modelInfo(card.m05SessionId),
      ...(made !== undefined
        ? { chosen: { option: made.option, loopSessionId: made.loopSessionId } }
        : {}),
      options,
    };
  }

  /** 把选项的一条出处回查成能给学习者看的内容；查不到原样给出。 */
  private async source(raw: string): Promise<SourceView> {
    const id = raw.trim();
    const p = this.d.m08.points.get(id);
    if (p !== undefined) {
      return {
        raw,
        kind: 'm08_point',
        resolved: true,
        label: `点 ${p.id}「${p.name}」`,
        detail: p.sentence,
      };
    }
    const c = this.d.m08.clauses.get(id);
    if (c !== undefined) {
      const from = c.from.map((f) => this.d.m08.name(f)).join(' + ');
      return {
        raw,
        kind: 'm08_clause',
        resolved: true,
        label: `子句 ${c.id}：${from} → ${this.d.m08.name(c.to)}`,
        detail: c.text,
      };
    }
    const f = this.d.m09.record(id);
    if (f !== undefined) {
      return {
        raw,
        kind: 'm09_record',
        resolved: true,
        label: `形成记录 ${f.id}（闭环 ${f.loopSessionId}）`,
        detail: f.understanding,
        sessionId: f.loopSessionId,
      };
    }
    const m = /^(.+):(\d+)(?:-\d+)?$/.exec(id);
    if (m?.[1] !== undefined && m[2] !== undefined) {
      const line = Number(m[2]);
      if (this.d.hub.listSessions().some((s) => s.sessionId === m[1])) {
        const recs = await this.d.hub.records(m[1]);
        const hit = recs.find((r) => r.line === line);
        const text =
          hit?.record.type === 'user_message' || hit?.record.type === 'assistant_message'
            ? hit.record.text
            : undefined;
        return {
          raw,
          kind: 'loop_line',
          resolved: text !== undefined,
          label: `对话 ${m[1]} 第 ${String(line)} 行`,
          ...(text !== undefined ? { detail: text } : {}),
          sessionId: m[1],
          line,
        };
      }
      // 书里的出处：“书名/文件:行号”回查成那几行原文；没有书名的“文件:行号”认不出是哪一本，只给定位
      const cited = await this.bookSource(raw);
      if (cited !== undefined) return cited;
      return {
        raw,
        kind: 'book_line',
        resolved: false,
        label: `书里 ${m[1]} 第 ${String(line)} 行`,
        file: m[1],
        line,
      };
    }
    // 整条就是一个教材出处标记
    const marked = await this.bookSource(raw);
    if (marked !== undefined) return marked;
    return { raw, kind: 'unknown', resolved: false, label: raw };
  }

  /** 书里的一条出处（“书名/文件:行号”或教材出处标记）；认不出是书里的出处返回空。 */
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
      if (brief.status === 'in_progress') groups.inProgress.push(brief);
      else if (brief.status === 'closed') groups.closed.push(brief);
      else groups.unclosed.push(brief);
    }
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
    };
  }

  private async brief(loopId: string): Promise<LoopBrief> {
    const opened = await this.d.hub.opened(loopId);
    const recs = await this.d.hub.records(loopId);
    const ended = recs.find((r) => r.record.type === 'loop_ended');
    const verdict = recs.filter((r) => r.record.type === 'guard_verdict').at(-1);
    return {
      sessionId: loopId,
      title: opened.title,
      openedAt: opened.at,
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

  // ───────────── M08 ─────────────

  /** book / chapter 给了就只列那一本那一章的点（多本书、多套 M08 合并后按章浏览）。 */
  points(q?: string, book?: string, chapter?: string): { points: PointView[]; empty: boolean } {
    const m08 = this.d.m08;
    let found = q === undefined || q.trim() === '' ? [...m08.points.values()] : m08.search(q);
    if (book !== undefined && book !== '') {
      const inBook = new Set(m08.inChapter(book, chapter).points.map((p) => p.id));
      found = found.filter((p) => inBook.has(p.id));
    }
    return { points: found.map((p) => this.pointView(p)), empty: m08.empty };
  }

  /** M08 概要：每一套产出、按书按章的点 / 子句数；scope 给了只算这几本书。 */
  m08Overview(scope?: string[]): M08OverviewResponse {
    const m08 = this.d.m08;
    return {
      sources: m08.origins,
      books: m08.counts(scope ? new Set(scope) : undefined),
      restricted: scope !== undefined,
    };
  }

  /** 外部导入进 M09 的记录（自述 / 笔记，未验证），新的在后。 */
  externals(): ExternalRecordView[] {
    return this.d.m09.externals().map((r) => ({
      id: r.id,
      at: r.at,
      source: r.source,
      status: r.status,
      claim: r.claim,
      ...(r.point !== undefined
        ? {
            point: {
              id: r.point,
              name: this.d.m08.name(r.point),
              found: this.d.m08.points.has(r.point),
            },
          }
        : {}),
      basis: r.basis,
      ...(r.grade !== undefined ? { grade: r.grade } : {}),
      ...(r.talk !== undefined ? { talk: r.talk } : {}),
      ...(r.note !== undefined ? { note: r.note } : {}),
      model: r.model,
    }));
  }

  point(id: string): Point08Response {
    const p = this.d.m08.points.get(id);
    if (p === undefined) throw new NotFoundError(`没有这个点：${id}`);
    return {
      point: this.pointView(p),
      into: this.d.m08.clausesInto(id).map((c) => this.clauseView(c)),
      from: this.d.m08.clausesFrom(id).map((c) => this.clauseView(c)),
    };
  }

  clause(id: string): ClauseView {
    const c = this.d.m08.clauses.get(id);
    if (c === undefined) throw new NotFoundError(`没有这条子句：${id}`);
    return this.clauseView(c);
  }

  private pointRef(id: string): PointRef {
    const p = this.d.m08.points.get(id);
    if (p === undefined) return { id, name: id, found: false };
    return { id, name: p.name, found: true, sentence: p.sentence, source: p.source };
  }

  private pointView(p: Point): PointView {
    return {
      id: p.id,
      name: p.name,
      sentence: p.sentence,
      anchors: p.anchors.map(anchorView),
      source: p.source,
      sourceNote: M08_SOURCE_NOTES[p.source],
      ...(p.threshold !== undefined ? { threshold: p.threshold } : {}),
      ...(p.scope !== undefined ? { scope: p.scope } : {}),
      ...(p.split_of !== undefined
        ? { splitOf: { id: p.split_of, name: this.d.m08.name(p.split_of) } }
        : {}),
      cautions: (p.cautions ?? []).map((c) => ({
        text: c.text,
        anchors: c.anchors.map(anchorView),
      })),
      ...(p.origin !== undefined ? { origin: p.origin } : {}),
      ...(p.originalId !== undefined ? { originalId: p.originalId } : {}),
    };
  }

  private clauseView(c: Clause): ClauseView {
    return {
      id: c.id,
      from: c.from.map((f) => ({ id: f, name: this.d.m08.name(f) })),
      to: { id: c.to, name: this.d.m08.name(c.to) },
      text: c.text,
      anchors: c.anchors.map(anchorView),
      source: c.source,
      sourceNote: M08_SOURCE_NOTES[c.source],
      notes: c.notes ?? [],
      ...(c.origin !== undefined ? { origin: c.origin } : {}),
      ...(c.originalId !== undefined ? { originalId: c.originalId } : {}),
    };
  }

  // ───────────── 外发披露 ─────────────

  disclosure(): DisclosureResponse {
    const d = this.d.hub.disclosure;
    return {
      service: d?.service ?? '未声明（这个模型适配器没有说明内容送往哪里）',
      route: d?.route ?? '未声明',
      adapter: this.d.hub.modelName,
      sends: [
        '你在对话里说的话和发的文字',
        '对话里用到的教材原文片段（模型读到的小节）',
        '你的学习记录：我会什么、我的状态、教法记录（相关的对话会读到）',
        '你对这些记录提的异议',
        '你加的图片（只在转写时送去；对话里只送转写出的文字）',
      ],
      sessions: (
        Object.keys(CONVERSATION_KIND_LABELS) as (keyof typeof CONVERSATION_KIND_LABELS)[]
      ).map((kind) => ({
        kind,
        label: CONVERSATION_KIND_LABELS[kind],
        model: d?.profiles[kind]?.model ?? d?.defaultModel ?? null,
        effort: d?.profiles[kind]?.effort ?? null,
      })),
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

function anchorView(a: Anchor): AnchorView {
  return {
    book: a.book,
    file: a.file,
    quote: a.quote,
    ...(a.page !== undefined ? { page: a.page } : {}),
    ...(a.bbox !== undefined ? { bbox: a.bbox } : {}),
    ...(a.line !== undefined ? { line: a.line } : {}),
  };
}

function lineSpan(from: number, to: number): string {
  return from === to ? String(from) : `${String(from)}–${String(to)}`;
}
