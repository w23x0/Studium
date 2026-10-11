// M08 候选区与通用结构更正（批 10a；M08 审查单「候选隔离、审计与晋升」「通用结构的更正与版本」，M04-02:18,29，M09:33）。
//
// 候选区：三种来源的候选放在一起看——M14 产出物标的通用候选、M09 去个人化候选（写 M09 的会话提交）、学习者在知识点上提的
// “这里该补 / 该改”。每条标“候选、未审”，记来源、模型、时间。候选不进 M08、不给教学用（“候选能否用于教学”产品还没定），
// 这里没有任何把候选交给教学会话的路径。候选可被审（学习者或模型审计）：记看过、意见、建议晋升 / 不晋升 / 待定，只追加；
// 晋升规则没定，这里不实现晋升。
//
// 更正：对 M08 点 / 子句的纠错，记在自己的更正层（只追加），读侧把更正叠在 M08 上显示，资料线产出文件不动。
// 更正要有依据——一条审计过、建议采纳的学习者建议，或一条涉及这个点 / 子句原文锚点的资料报错。
// 教学侧读到的是更正后的版本（更正 = 修正错误；补位清单 74）。
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import {
  AUDITORS,
  AUDIT_VERDICTS,
  CANDIDATE_STATUS,
  type AuditRequest,
  type CandidateAudit,
  type CandidateDraft,
  type CandidateView,
  type CorrectRequest,
  type CorrectionBasis,
  type CorrectionFields,
  type CorrectionMark,
  type CorrectionView,
  type StoredCandidate,
  type StoredCorrection,
  type SuggestRequest,
  type TargetNameRef,
  type TargetRef,
  type TargetReviewResponse,
} from '../shared/m08-review.ts';
import type { GeneralCandidate } from '../shared/m14.ts';
import type { QuoteView } from '../shared/protocol.ts';
import type { SourceReport } from '../shared/records.ts';
import { NotFoundError, type Hub } from './hub.ts';
import type { Clause, M08, Point } from './knowledge/m08.ts';
import type { ReviewStore } from './knowledge/m08-review.ts';
import type { ToolResult, ToolSpec } from './model/port.ts';
import type { Sources } from './sources.ts';
import { BadRequestError } from './studium.ts';

/** 一个 M09 写记录的会话最多提交几条候选（防止模型一口气塞一堆）。 */
export const MAX_M09_CANDIDATES_PER_SESSION = 5;

export interface M14CandidateSource {
  /** M14 标的全部通用候选。 */
  candidates(): GeneralCandidate[];
  /** 产出物的名字。 */
  outputTitle(output: string): string | undefined;
}

export interface M08ReviewDeps {
  store: ReviewStore;
  m08: M08;
  sources: Sources;
  m14: M14CandidateSource;
  now?: () => Date;
}

/** M09 会话里提交候选所需的上下文（来自 Studium）。 */
export interface M09CandidateContext {
  loopId: string;
  /** 这个闭环里学习者说的话的行号。 */
  learnerLines: ReadonlySet<number>;
  model: () => Promise<string>;
}

const ok = (text: string): ToolResult => ({ text });
const err = (text: string): ToolResult => ({ text, isError: true });

const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

export class M08Review {
  private hubRef: Hub | undefined;
  private readonly now: () => Date;
  /** 写入排队：更正要拿“更正前”的值，同时写的两条不能串。 */
  private chain: Promise<unknown> = Promise.resolve();
  private readonly idListeners = new Set<(prefix: string, id: string) => void>();
  /** 每个 M09 会话已提交了几条。 */
  private readonly perSession = new Map<string, number>();

  private constructor(private readonly d: M08ReviewDeps) {
    this.now = d.now ?? (() => new Date());
  }

  /** 读存放处里已有的更正，叠到 M08 上，再返回。 */
  static create(d: M08ReviewDeps): M08Review {
    const r = new M08Review(d);
    for (const c of d.store.corrections) r.apply(c);
    return r;
  }

  attach(hub: Hub): void {
    this.hubRef = hub;
  }

  private get hub(): Hub {
    if (!this.hubRef) throw new Error('M08Review 还没接上 Hub');
    return this.hubRef;
  }

  private iso(): string {
    return this.now().toISOString();
  }

  private id(prefix: string): string {
    const id = `${prefix}-${randomBytes(4).toString('hex')}`;
    for (const fn of this.idListeners) fn(prefix, id);
    return id;
  }

  /** 生成的编号报给录带，给它们稳定记号（Studium 转发）。 */
  onNewId(fn: (prefix: string, id: string) => void): () => void {
    this.idListeners.add(fn);
    return () => this.idListeners.delete(fn);
  }

  private exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(fn);
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  // ───────────── 目标（M08 的点 / 子句） ─────────────

  private targetRef(t: TargetRef): TargetNameRef {
    if (t.kind === 'point') {
      const p = this.d.m08.points.get(t.id);
      return { ...t, name: p?.name ?? t.id, found: p !== undefined };
    }
    const c = this.d.m08.clauses.get(t.id);
    if (c === undefined) return { ...t, name: t.id, found: false };
    const from = c.from.map((f) => this.d.m08.name(f)).join(' + ');
    return { ...t, name: `${from} → ${this.d.m08.name(c.to)}`, found: true };
  }

  private requireTarget(raw: unknown): TargetRef {
    const t = raw as Partial<TargetRef> | null | undefined;
    if ((t?.kind !== 'point' && t?.kind !== 'clause') || !nonEmpty(t.id)) {
      throw new BadRequestError('target 要写明是点还是子句（kind: point / clause）和 id');
    }
    const ref: TargetRef = { kind: t.kind, id: t.id };
    if (!this.targetRef(ref).found) {
      throw new NotFoundError(`M08 里没有这个${ref.kind === 'point' ? '点' : '子句'}：${ref.id}`);
    }
    return ref;
  }

  // ───────────── 候选 ─────────────

  /** 学习者在知识点 / 子句上提“这里该补 / 该改”。 */
  async suggest(req: Partial<SuggestRequest>): Promise<CandidateView> {
    const target = this.requireTarget(req.target);
    if (req.kind !== 'supplement' && req.kind !== 'fix') {
      throw new BadRequestError('kind 要是 supplement（这里该补）或 fix（这里该改）');
    }
    if (!nonEmpty(req.text)) throw new BadRequestError('text 不能为空：说一下哪里该补 / 该改');
    const c: StoredCandidate = {
      id: this.id('m8c'),
      at: this.iso(),
      source: 'learner',
      kind: req.kind,
      status: CANDIDATE_STATUS,
      text: req.text.trim(),
      target,
    };
    await this.exclusive(() => this.d.store.addCandidate(c));
    return this.candidateView(c);
  }

  /**
   * M09 去个人化候选：写 M09 的会话提交。程序只收点 / 子句草稿和理由，不收（也不存）学习者的个人信息字段；
   * 指回闭环里学习者的原话行（只存指针，原话读时从闭环正本取）。
   */
  async proposeFromM09(
    sessionId: string,
    ctx: M09CandidateContext,
    input: {
      kind: 'point' | 'clause';
      point?: { name?: string | undefined; sentence?: string | undefined };
      clause?: { from?: string[] | undefined; to?: string | undefined; text?: string | undefined };
      reason: string;
      evidenceLines: number[];
    },
  ): Promise<StoredCandidate> {
    if ((this.perSession.get(sessionId) ?? 0) >= MAX_M09_CANDIDATES_PER_SESSION) {
      throw new BadRequestError(`一次最多提 ${String(MAX_M09_CANDIDATES_PER_SESSION)} 条`);
    }
    if (!nonEmpty(input.reason)) {
      throw new BadRequestError(
        'reason 不能为空：说清这条为什么去掉个人色彩后仍成立、可作通用知识',
      );
    }
    if (input.evidenceLines.length === 0) {
      throw new BadRequestError('evidence_lines 不能为空：指回闭环里学习者说的话');
    }
    const bad = input.evidenceLines.filter((l) => !ctx.learnerLines.has(l));
    if (bad.length > 0) {
      throw new BadRequestError(`第 ${bad.join('、')} 行不是学习者说的话；证据只引学习者的行`);
    }
    const draft = this.checkDraft(input.kind, input.point, input.clause);
    const c: StoredCandidate = {
      id: this.id('m8c'),
      at: this.iso(),
      source: 'm09',
      kind: input.kind === 'point' ? 'new_point' : 'new_clause',
      status: CANDIDATE_STATUS,
      text: input.reason.trim(),
      draft,
      origin: { loopSessionId: ctx.loopId, lines: [...input.evidenceLines] },
      model: await ctx.model(),
    };
    await this.exclusive(() => this.d.store.addCandidate(c));
    this.perSession.set(sessionId, (this.perSession.get(sessionId) ?? 0) + 1);
    return c;
  }

  private checkDraft(
    kind: 'point' | 'clause',
    point: { name?: string | undefined; sentence?: string | undefined } | undefined,
    clause:
      | { from?: string[] | undefined; to?: string | undefined; text?: string | undefined }
      | undefined,
  ): CandidateDraft {
    if (kind === 'point') {
      if (!nonEmpty(point?.name) || !nonEmpty(point.sentence)) {
        throw new BadRequestError('点的草稿要有 name 和 sentence（一句话说这个点是什么）');
      }
      return { point: { name: point.name.trim(), sentence: point.sentence.trim() } };
    }
    const from = clause?.from ?? [];
    if (from.length === 0 || !nonEmpty(clause?.to) || !nonEmpty(clause.text)) {
      throw new BadRequestError('子句的草稿要有 from（出发点 id）、to（新点 id）和 text');
    }
    const missing = [...from, clause.to].filter((id) => !this.d.m08.points.has(id));
    if (missing.length > 0) {
      throw new BadRequestError(
        `M08 里查不到这些点：${missing.join('、')}（出发点和新点都要是 M08 里已有的点）`,
      );
    }
    return { clause: { from: [...from], to: clause.to, text: clause.text.trim() } };
  }

  /** 全部候选（三种来源），新的在后；可按来源、按对着的点 / 子句筛。 */
  async candidates(filter: { source?: string; target?: TargetRef } = {}): Promise<CandidateView[]> {
    const stored = await Promise.all(this.d.store.candidates.map((c) => this.candidateView(c)));
    const m14 = this.d.m14.candidates().map((c) => this.m14View(c));
    return [...stored, ...m14]
      .filter((c) => filter.source === undefined || c.source === filter.source)
      .filter(
        (c) =>
          filter.target === undefined ||
          this.touches(c).some((t) => t.kind === filter.target?.kind && t.id === filter.target.id),
      )
      .sort((a, b) => a.at.localeCompare(b.at));
  }

  async candidate(id: string): Promise<CandidateView> {
    const found = (await this.candidates()).find((c) => c.id === id);
    if (found === undefined) throw new NotFoundError(`没有这条候选：${id}`);
    return found;
  }

  /** 候选涉及哪些点 / 子句（做“有候选”标记和按对象筛）。 */
  private touches(c: { target?: TargetRef; draft?: CandidateDraft }): TargetRef[] {
    const out: TargetRef[] = [];
    if (c.target !== undefined) out.push({ kind: c.target.kind, id: c.target.id });
    const cl = c.draft?.clause;
    if (cl !== undefined) for (const id of [...cl.from, cl.to]) out.push({ kind: 'point', id });
    return out;
  }

  private auditsOf(id: string): CandidateAudit[] {
    return this.d.store.audits.filter((a) => a.candidate === id);
  }

  private base(id: string): Pick<CandidateView, 'audits' | 'verdict' | 'correctedBy' | 'status'> {
    const audits = this.auditsOf(id);
    const verdict = audits.at(-1)?.verdict;
    return {
      status: CANDIDATE_STATUS,
      audits,
      ...(verdict !== undefined ? { verdict } : {}),
      correctedBy: this.d.store.corrections
        .filter((c) => c.basis.kind === 'candidate' && c.basis.id === id)
        .map((c) => c.id),
    };
  }

  private async candidateView(c: StoredCandidate): Promise<CandidateView> {
    return {
      id: c.id,
      source: c.source,
      kind: c.kind,
      at: c.at,
      text: c.text,
      ...(c.model !== undefined ? { model: c.model } : {}),
      ...(c.draft !== undefined ? { draft: c.draft } : {}),
      ...(c.target !== undefined ? { target: this.targetRef(c.target) } : {}),
      ...(c.origin !== undefined
        ? {
            origin: {
              loopSessionId: c.origin.loopSessionId,
              quotes: await this.quotes(c.origin.loopSessionId, c.origin.lines),
            },
          }
        : {}),
      ...this.base(c.id),
    };
  }

  private m14View(c: GeneralCandidate): CandidateView {
    const title = this.d.m14.outputTitle(c.output);
    return {
      id: c.id,
      source: 'm14',
      kind: 'general_note',
      at: c.at,
      text: c.text,
      m14: { output: c.output, ...(title !== undefined ? { title } : {}), version: c.version },
      ...this.base(c.id),
    };
  }

  private async quotes(loopId: string, lines: number[]): Promise<QuoteView[]> {
    try {
      const recs = await this.hub.records(loopId);
      return lines.map((line) => {
        const r = recs.find((x) => x.line === line)?.record;
        if (r?.type === 'user_message' || r?.type === 'assistant_message')
          return { line, at: r.at, text: r.text };
        return { line, at: r?.at ?? '' };
      });
    } catch (e) {
      if (e instanceof NotFoundError) return lines.map((line) => ({ line, at: '' }));
      throw e;
    }
  }

  // ───────────── 审计 ─────────────

  /** 对一条候选记一次审计（看过、意见、建议）。不改候选的状态；晋升规则没定。 */
  async audit(candidateId: string, req: Partial<AuditRequest>): Promise<CandidateAudit> {
    await this.candidate(candidateId);
    const by = req.by ?? '学习者';
    if (!(AUDITORS as readonly string[]).includes(by))
      throw new BadRequestError('by 要是 学习者 或 模型审计');
    if (req.verdict === undefined || !(AUDIT_VERDICTS as readonly string[]).includes(req.verdict)) {
      throw new BadRequestError(`verdict 要是 ${AUDIT_VERDICTS.join(' / ')}`);
    }
    if (by === '模型审计' && !nonEmpty(req.model)) {
      throw new BadRequestError('模型审计要写明实际执行的模型（model）');
    }
    const a: CandidateAudit = {
      id: this.id('m8a'),
      at: this.iso(),
      candidate: candidateId,
      by,
      ...(by === '模型审计' && nonEmpty(req.model) ? { model: req.model.trim() } : {}),
      opinion: typeof req.opinion === 'string' ? req.opinion.trim() : '',
      verdict: req.verdict,
    };
    await this.exclusive(() => this.d.store.addAudit(a));
    return a;
  }

  // ───────────── 更正 ─────────────

  /** 对 M08 点 / 子句的更正：要有依据；只追加；叠到 M08 读侧上，不改资料线产出文件。 */
  correct(req: Partial<CorrectRequest>): Promise<CorrectionView> {
    return this.exclusive(async () => {
      const target = this.requireTarget(req.target);
      if (!nonEmpty(req.reason)) throw new BadRequestError('reason 不能为空：说一下为什么这样改');
      const fields = this.checkFields(target, req.fields);
      const basis = this.checkBasis(target, req.basis);
      const cur = this.current(target);
      const before: CorrectionFields = {};
      for (const k of Object.keys(fields) as (keyof CorrectionFields)[]) {
        (before as Record<string, unknown>)[k] = cur[k];
      }
      const c: StoredCorrection = {
        id: this.id('m8x'),
        at: this.iso(),
        target,
        fields,
        before,
        reason: req.reason.trim(),
        basis,
      };
      await this.d.store.addCorrection(c);
      this.apply(c);
      return this.correctionView(c);
    });
  }

  private apply(c: StoredCorrection): void {
    const exists =
      c.target.kind === 'point'
        ? this.d.m08.points.has(c.target.id)
        : this.d.m08.clauses.has(c.target.id);
    // 资料线重新生成后目标可能没了：更正留在记录里，读侧没处可叠
    if (exists) this.d.m08.applyCorrection(c.target.kind, c.target.id, c.fields);
  }

  /** 现在（含已叠上的更正）的值，按字段名取。 */
  private current(t: TargetRef): CorrectionFields {
    if (t.kind === 'point') {
      const p = this.d.m08.points.get(t.id);
      return p === undefined
        ? {}
        : {
            name: p.name,
            sentence: p.sentence,
            ...(p.threshold !== undefined ? { threshold: p.threshold } : {}),
          };
    }
    const c = this.d.m08.clauses.get(t.id);
    return c === undefined ? {} : { text: c.text, from: c.from, to: c.to };
  }

  private checkFields(t: TargetRef, raw: unknown): CorrectionFields {
    const allowed =
      t.kind === 'point'
        ? (['name', 'sentence', 'threshold'] as const)
        : (['text', 'from', 'to'] as const);
    const src = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
    const unknown = Object.keys(src).filter((k) => !(allowed as readonly string[]).includes(k));
    if (unknown.length > 0) {
      throw new BadRequestError(
        `${t.kind === 'point' ? '点' : '子句'}只能更正：${allowed.join('、')}（不认识：${unknown.join('、')}；来源和锚点不由更正改）`,
      );
    }
    const cur = this.current(t) as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of allowed) {
      const v = src[k];
      if (v === undefined) continue;
      if (k === 'threshold') {
        if (typeof v !== 'boolean') throw new BadRequestError('threshold 要是 true / false');
      } else if (k === 'from') {
        if (!Array.isArray(v) || v.length === 0 || !v.every((x) => nonEmpty(x))) {
          throw new BadRequestError('from 要是出发点 id 的数组');
        }
        const missing = v.filter((id: string) => !this.d.m08.points.has(id));
        if (missing.length > 0)
          throw new BadRequestError(`M08 里查不到这些点：${missing.join('、')}`);
      } else if (k === 'to') {
        if (!nonEmpty(v) || !this.d.m08.points.has(v)) {
          throw new BadRequestError(`M08 里查不到新点：${typeof v === 'string' ? v : ''}`);
        }
      } else if (!nonEmpty(v)) {
        throw new BadRequestError(`${k} 不能为空`);
      }
      const next = typeof v === 'string' ? v.trim() : v;
      if (JSON.stringify(next) !== JSON.stringify(cur[k])) out[k] = next;
    }
    if (Object.keys(out).length === 0) throw new BadRequestError('没有要改的内容（和现在的一样）');
    return out;
  }

  private checkBasis(t: TargetRef, raw: unknown): CorrectionBasis {
    const b = raw as { kind?: string; id?: string } | undefined;
    if (b?.kind === 'candidate' && nonEmpty(b.id)) {
      const c = this.d.store.candidates.find((x) => x.id === b.id);
      if (c === undefined || c.source !== 'learner') {
        throw new BadRequestError('依据的候选要是学习者对这个点 / 子句提的建议');
      }
      if (c.kind !== 'fix' || c.target?.kind !== t.kind || c.target.id !== t.id) {
        throw new BadRequestError('依据的建议不是对这个点 / 子句提的“这里该改”');
      }
      if (this.auditsOf(c.id).at(-1)?.verdict !== '建议晋升') {
        throw new BadRequestError('这条建议还没经复核：先给它记一次审计，建议采纳，再据此更正');
      }
      return { kind: 'candidate', id: c.id };
    }
    if (b?.kind === 'source_report' && nonEmpty(b.id)) {
      const r = this.d.sources.reports().find((x) => x.id === b.id);
      if (r === undefined) throw new NotFoundError(`没有这条资料报错：${b.id}`);
      if (!this.reportTouches(r, t)) {
        throw new BadRequestError('这条资料报错没有涉及这个点 / 子句的原文锚点');
      }
      return { kind: 'source_report', id: r.id };
    }
    throw new BadRequestError(
      'basis 要写明依据：candidate（经复核的建议）或 source_report（涉及锚点的资料报错）',
    );
  }

  /** 资料报错涉及这个点 / 子句的锚点：同一本书同一个小节文件，且报错的行段盖到锚点（按行号提示或引文对得上）。 */
  private reportTouches(r: SourceReport, t: TargetRef): boolean {
    const anchors =
      t.kind === 'point'
        ? (this.d.m08.points.get(t.id)?.anchors ?? [])
        : (this.d.m08.clauses.get(t.id)?.anchors ?? []);
    return anchors.some((a) => {
      if (a.book.trim() !== r.book.trim() || a.file !== r.file) return false;
      if (a.line !== undefined && a.line >= r.from && a.line <= r.to) return true;
      const q = a.quote.trim();
      return (
        q !== '' && r.quote.trim() !== '' && (r.quote.includes(q) || q.includes(r.quote.trim()))
      );
    });
  }

  private correctionView(c: StoredCorrection): CorrectionView {
    // 这条更正之前最后一次叠上的值应该等于它的“更正前”；对不上 = 资料后来变过
    const all = this.d.store.corrections;
    const prior = all
      .slice(0, all.indexOf(c))
      .filter((x) => x.target.kind === c.target.kind && x.target.id === c.target.id);
    const base = this.d.m08.original(c.target.kind, c.target.id) as
      (Partial<Point> & Partial<Clause>) | undefined;
    const stale = (Object.keys(c.before) as (keyof CorrectionFields)[]).some((k) => {
      const lastPrior = [...prior].reverse().find((x) => k in x.fields);
      const expected = lastPrior !== undefined ? lastPrior.fields[k] : undefined;
      if (lastPrior !== undefined) return JSON.stringify(expected) !== JSON.stringify(c.before[k]);
      return base !== undefined && JSON.stringify(base[k]) !== JSON.stringify(c.before[k]);
    });
    return { ...c, targetName: this.targetRef(c.target).name, stale };
  }

  /** 更正历史，新的在后；可按对象筛。 */
  corrections(filter: { target?: TargetRef } = {}): CorrectionView[] {
    return this.d.store.corrections
      .filter(
        (c) =>
          filter.target === undefined ||
          (c.target.kind === filter.target.kind && c.target.id === filter.target.id),
      )
      .map((c) => this.correctionView(c));
  }

  /** 点 / 子句上的更正标记：更正过几次、资料原本是什么；没更正过为空。 */
  correctionMark(t: TargetRef): CorrectionMark | undefined {
    const cs = this.d.store.corrections.filter(
      (c) => c.target.kind === t.kind && c.target.id === t.id,
    );
    const last = cs.at(-1);
    if (last === undefined) return undefined;
    // 资料里原本是什么：优先取叠加前 M08 里的样子（资料线重新生成后以新的为准），取不到才用第一次更正时记下的
    const base = this.d.m08.original(t.kind, t.id) as Record<string, unknown> | undefined;
    const original: CorrectionFields = {};
    for (const c of cs) {
      for (const [k, v] of Object.entries(c.before)) {
        if (!(k in original))
          (original as Record<string, unknown>)[k] = base !== undefined ? base[k] : v;
      }
    }
    return { count: cs.length, at: last.at, original };
  }

  /** 有多少条候选涉及这个点 / 子句（做“有候选”标记）。 */
  candidateCount(t: TargetRef): number {
    return this.d.store.candidates.filter((c) =>
      this.touches(c).some((x) => x.kind === t.kind && x.id === t.id),
    ).length;
  }

  /** 一个点 / 子句上的候选、更正历史、涉及它原文锚点的资料报错（知识点面板用）。 */
  async targetReview(raw: unknown): Promise<TargetReviewResponse> {
    const target = this.requireTarget(raw);
    return {
      candidates: await this.candidates({ target }),
      corrections: this.corrections({ target }),
      reports: this.d.sources.reports().filter((r) => this.reportTouches(r, target)),
    };
  }

  // ───────────── 写 M09 的会话里的工具 ─────────────

  /** 可选工具：把闭环里出现、M08 没有的细节 / 理解路径去个人化后提成候选。不进 M08、不给教学用。 */
  m09Tools(sessionId: string, ctx: () => M09CandidateContext | undefined): ToolSpec[] {
    return [
      {
        name: 'propose_general_candidate',
        description:
          '可选。这个闭环里出现了 M08 没有的细节、点或子句，并且去掉个人色彩后仍然成立、对别人也有用，就提成通用知识的候选（点草稿或子句草稿）。' +
          '只写通用的内容，不写这位学习者怎么学、会不会、哪里卡；必须指回闭环里学习者说的话（evidence_lines）。' +
          '候选进候选区等审计，不进 M08，也不会被教学用。没有就不提。',
        input: {
          kind: z.enum(['point', 'clause']).describe('point = 一个新点；clause = 一条新子句'),
          point_name: z.string().optional().describe('kind=point：点的名字'),
          point_sentence: z.string().optional().describe('kind=point：一句话说这个点是什么'),
          clause_from: z.array(z.string()).optional().describe('kind=clause：出发点（M08 点 id）'),
          clause_to: z.string().optional().describe('kind=clause：新点（M08 点 id）'),
          clause_text: z
            .string()
            .optional()
            .describe('kind=clause：一两句，从哪出发、学出什么理解（对谁都成立的说法）'),
          reason: z.string().describe('为什么这条去掉个人色彩后仍成立、可作通用知识'),
          evidence_lines: z.array(z.number().int()).describe('闭环里学习者说的话的行号'),
        },
        run: async (a) => {
          const c = ctx();
          if (c === undefined) return err('找不到要写的闭环');
          try {
            const made = await this.proposeFromM09(sessionId, c, {
              kind: a.kind as 'point' | 'clause',
              point: {
                name: a.point_name as string | undefined,
                sentence: a.point_sentence as string | undefined,
              },
              clause: {
                from: a.clause_from as string[] | undefined,
                to: a.clause_to as string | undefined,
                text: a.clause_text as string | undefined,
              },
              reason: a.reason as string,
              evidenceLines: a.evidence_lines as number[],
            });
            return ok(`已提交候选 ${made.id}（候选、未审；不进 M08）`);
          } catch (e) {
            if (e instanceof BadRequestError) return err(e.message);
            throw e;
          }
        },
      },
    ];
  }
}
