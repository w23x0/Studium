// Studium 的闭环外：按事件跑清单（03「闭环外：事件与清单」「收口与闭环守卫」）。
// 每种会话的系统提示与工具在这里给；写权限靠给什么工具来卡（03「读写权限」）。
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { formatCitation } from '../shared/citation.ts';
import type {
  ProjectDeadlineResponse,
  ProjectMaterialsResponse,
  ProjectMaterialView,
} from '../shared/protocol.ts';
import type {
  ChoiceCard,
  ChoiceOption,
  ConversationKind,
  GuardVerdict,
  ImageInput,
  LearnerObjection,
  LogRecord,
  NumberedRecord,
  Ticket,
} from '../shared/records.ts';
import { Detours } from './detour.ts';
import { NotFoundError, type Hub, type KindConfig } from './hub.ts';
import { foldLoop, LOAD_HEAVY, PARKING_PILE, stateLabel } from './loop-state.ts';
import type { Library } from './knowledge/m07.ts';
import type { Sources } from './sources.ts';
import type { M08 } from './knowledge/m08.ts';
import {
  EVIDENCE_INDEPENDENCE,
  EVIDENCE_TIMES,
  NOTE_GRADES,
  describeEvidence,
  type EvidenceStrength,
  type FormationEvidence,
  type M09,
} from './knowledge/m09.ts';
import type { M10 } from './knowledge/m10.ts';
import type { Objections } from './knowledge/objections.ts';
import { STAGES, type M15 } from './knowledge/m15.ts';
import { isNotFound } from './log/session-log.ts';
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
  /** 学习者异议存放处。 */
  objections: Objections;
  /** 原文与出处（M07 检索、教材出处核对）。 */
  sources: Sources;
  now?: () => Date;
}

export class Studium {
  private hubRef: Hub | undefined;
  private readonly now: () => Date;
  /** 后台跑着的清单（合上之后、M15 整理、M10 记录……），回放与测试用来等它们跑完。 */
  private readonly tasks = new Set<Promise<unknown>>();
  /** M15 整理一次只跑一个，后到的排在后面。 */
  private stateChain: Promise<void> = Promise.resolve();

  /** 闭环中途：通知 M05 → 小卡 → 分叉 / 搁置 / 停车记录（批 5）。 */
  private readonly detours: Detours;

  constructor(private readonly o: StudiumOptions) {
    this.now = o.now ?? (() => new Date());
    this.detours = new Detours({
      hub: () => this.hub,
      m08: o.m08,
      iso: () => this.iso(),
      newId: (prefix) => this.newId(prefix),
      describeTicket: (t) => this.describeTicket(t),
      ticketProblem: (t) => this.ticketProblem(t),
      m05Opening: (trigger, mainId) => this.m05Opening(trigger, mainId),
      loopOpening: (t) => this.loopOpening(t),
      m05ReadTools: (id) => [
        ...this.readTools(id),
        this.loopTranscriptTool(),
        this.stateQueryTool(),
      ],
    });
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
          return [...this.readTools(sessionId), this.settleGoalTool(sessionId)];
        case 'loop':
          return [...this.readTools(sessionId), ...this.loopTools(sessionId)];
        case 'guard':
          return [...this.readTools(sessionId, { m09: false }), this.verdictTool(sessionId)];
        case 'm09':
          // 同一类会话两种活：闭环合上后写形成记录；从学习者的笔记里提点（外部导入，未验证）
          return this.noteTargets.has(sessionId)
            ? [...this.readTools(sessionId, { m09: false }), this.notePointsTool(sessionId)]
            : [
                ...this.readTools(sessionId, { m07: false, m09: false }),
                this.formationTool(sessionId),
              ];
        case 'm05':
          // 同一类会话三种活：出下一闭环的选择卡；闭环中途的小卡；给没合上 / 搁置的闭环记停车记录
          return (
            this.detours.m05Tools(sessionId) ?? [
              ...this.readTools(sessionId),
              this.loopTranscriptTool(),
              this.stateQueryTool(),
              this.cardTool(sessionId),
            ]
          );
        case 'm15':
          return this.stateTools(sessionId);
        case 'm10':
          return [
            ...this.readTools(sessionId, { m07: false, m09: false }),
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
  async listProjects(): Promise<
    { mainSessionId: string; title: string; goal?: string; deadline?: string }[]
  > {
    const out: { mainSessionId: string; title: string; goal?: string; deadline?: string }[] = [];
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
        ...(foldDeadline(recs).deadline !== undefined
          ? { deadline: foldDeadline(recs).deadline }
          : {}),
      });
    }
    return out;
  }

  // ───────────── 项目资料与期限（M01:15,36 · M07:13）─────────────

  /** 会话所属的项目（主对话 id）：沿 parent 往上找到 main；不属于任何项目返回空。 */
  async projectOf(sessionId: string): Promise<string | undefined> {
    let cur = sessionId;
    for (let i = 0; i < 8; i++) {
      let opened;
      try {
        opened = await this.hub.opened(cur);
      } catch (e) {
        if (e instanceof NotFoundError) return undefined;
        throw e;
      }
      if (opened.kind === 'main') return opened.sessionId;
      if (opened.parent === undefined) return undefined;
      cur = opened.parent;
    }
    return undefined;
  }

  private async requireProject(mainId: string): Promise<LogRecord[]> {
    const opened = await this.hub.opened(mainId);
    if (opened.kind !== 'main') throw new BadRequestError('这不是一个项目。');
    return (await this.hub.records(mainId)).map((r) => r.record);
  }

  /** 项目当前选用的资料（按选用顺序）：把 project_material 记录从头折叠。 */
  async selectedBooks(mainId: string): Promise<{ book: string; addedAt: string }[]> {
    return foldMaterials(await this.requireProject(mainId));
  }

  /** 项目资料的视图：每份带书名 / 类型 / 学科；书库里现在找不到的标 missing。 */
  async materials(mainId: string): Promise<ProjectMaterialsResponse> {
    const recs = await this.requireProject(mainId);
    const chosen = foldMaterials(recs);
    const views: ProjectMaterialView[] = [];
    for (const c of chosen) {
      const info = await this.o.m07.info(c.book);
      views.push({
        book: c.book,
        title: info !== undefined ? await this.o.m07.title(c.book) : c.book,
        kind: info?.kind ?? 'book',
        ...(info !== undefined && info.subject !== '' ? { subject: info.subject } : {}),
        addedAt: c.addedAt,
        ...(info === undefined ? { missing: true } : {}),
      });
    }
    const d = foldDeadline(recs);
    return {
      mainSessionId: mainId,
      materials: views,
      restricted: views.some((v) => v.missing !== true),
      ...(d.deadline !== undefined ? { deadline: d.deadline } : {}),
      ...(d.note !== undefined ? { deadlineNote: d.note } : {}),
    };
  }

  /** 加 / 去项目资料：只追加记录；已选的再加、没选的去，当作没发生。书库里没有的书整批拒绝。 */
  async changeMaterials(
    mainId: string,
    change: { add?: string[]; remove?: string[] },
  ): Promise<ProjectMaterialsResponse> {
    const recs = await this.requireProject(mainId);
    const have = new Set(foldMaterials(recs).map((m) => m.book));
    const lib = await this.o.m07.books();
    const resolve = (name: string): string | undefined =>
      lib.includes(name) ? name : lib.find((b) => b.trim() === name.trim());
    const adds: string[] = [];
    for (const name of change.add ?? []) {
      const id = resolve(name);
      if (id === undefined) throw new BadRequestError(`书库里没有这份资料：${name}`);
      if (!have.has(id) && !adds.includes(id)) adds.push(id);
    }
    const removes: string[] = [];
    for (const name of change.remove ?? []) {
      // 去掉的可以是已经从书库里消失的（missing），所以不查书库
      const id = [...have].find((b) => b === name || b.trim() === name.trim());
      if (id !== undefined && !removes.includes(id)) removes.push(id);
    }
    const at = this.iso();
    for (const book of removes) {
      await this.hub.record(mainId, { type: 'project_material', at, op: 'remove', book });
    }
    for (const book of adds) {
      await this.hub.record(mainId, { type: 'project_material', at, op: 'add', book });
    }
    return this.materials(mainId);
  }

  /**
   * 资料工具默认查哪些书：项目选用的（书库里还在的）；没选 / 选的都不在了 / 会话不属于任何项目 = 不限（全库）。
   * all = true 是学习者或模型明确要全库。
   */
  async scopeOf(sessionId: string, all = false): Promise<string[] | undefined> {
    if (all) return undefined;
    const main = await this.projectOf(sessionId);
    if (main === undefined) return undefined;
    const chosen = await this.selectedBooks(main);
    if (chosen.length === 0) return undefined;
    const lib = new Set(await this.o.m07.books());
    const still = chosen.map((c) => c.book).filter((b) => lib.has(b));
    return still.length > 0 ? still : undefined;
  }

  /** 记 / 清项目期限（可不填）。 */
  async setDeadline(
    mainId: string,
    deadline: string | null,
    note?: string,
  ): Promise<ProjectDeadlineResponse> {
    await this.requireProject(mainId);
    if (deadline !== null && !validDate(deadline)) {
      throw new BadRequestError('期限要写成 YYYY-MM-DD 的真实日期，或传 null 清掉。');
    }
    await this.hub.record(mainId, {
      type: 'project_deadline',
      at: this.iso(),
      deadline,
      ...(note !== undefined && note.trim() !== '' ? { note: note.trim() } : {}),
    });
    return this.deadlineView(mainId);
  }

  async deadlineView(mainId: string): Promise<ProjectDeadlineResponse> {
    const d = foldDeadline(await this.requireProject(mainId));
    return {
      mainSessionId: mainId,
      ...(d.deadline !== undefined ? { deadline: d.deadline } : {}),
      ...(d.note !== undefined ? { deadlineNote: d.note } : {}),
      ...(d.deadline !== undefined ? { daysLeft: this.daysUntil(d.deadline) } : {}),
    };
  }

  private daysUntil(date: string): number {
    const today = this.now().toISOString().slice(0, 10);
    return Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000);
  }

  /** 学习者在某个对话里发话。隔了一阵回来，先追加离开多久（03「闭环外」暂停）。images = 附图的来历（批 4，文字已并进 text）。 */
  async learnerSays(sessionId: string, text: string, images?: ImageInput[]): Promise<void> {
    const meta = images !== undefined && images.length > 0 ? { images } : {};
    const recs = await this.hub.records(sessionId);
    if (recs.some((r) => r.record.type === 'loop_ended' || r.record.type === 'talk_ended')) {
      throw new BadRequestError('这段对话已经结束了，回到项目里接着聊。');
    }
    // 搁置着的闭环里学习者又说话 = 接着学（先恢复，再交这句话）
    if (foldLoop(recs).shelved !== undefined) await this.detours.resume(sessionId, 'message');
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
      await this.hub.send(sessionId, { role: 'learner', text }, meta);
      if (away > LONG_AWAY_MS) {
        this.organizeStateLater(`学习者隔了约 ${formatDuration(away)} 回来`, sessionId);
      }
      return;
    }
    await this.hub.send(sessionId, { role: 'learner', text }, meta);
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
    await this.assertActiveLoop(loopId);
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
    await this.assertActiveLoop(loopId);
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

  // ───────────── 闭环中途：小卡、分叉、搁置（批 5）─────────────

  /** 学习者在闭环里的小卡上选定：先补 / 先去学（开分叉闭环）· 先不管接着学 · 先搁置。 */
  chooseDetour(
    loopId: string,
    cardId: string,
    option: number,
  ): Promise<{ choice: 'fork' | 'continue' | 'shelve'; forkLoopSessionId?: string }> {
    return this.detours.choose(loopId, cardId, option);
  }

  /** 学习者把闭环搁置（可恢复）；后台让 M05 记停车记录（恢复计划）。 */
  async shelveLoop(loopId: string, note: string): Promise<void> {
    await this.detours.shelve(loopId, note);
    this.background('搁置的停车记录', () => this.detours.parkShelved(loopId));
  }

  /** 学习者点“接着学”，恢复搁置的闭环。 */
  resumeLoop(loopId: string): Promise<void> {
    return this.detours.resume(loopId, 'button');
  }

  // ───────────── 异议（学习者纠正系统的判断；只追加，不改原记录）─────────────

  /**
   * 对守卫的一次判定提异议。闭环还开着：作为学习者原话（带标记）追加进该闭环，之后学习者可再申请收口；
   * 闭环已结束：记进异议存放处，不改闭环正本里的判定。
   */
  async objectToVerdict(
    loopId: string,
    line: number,
    text: string,
  ): Promise<{ objection: LearnerObjection; inLoop: boolean; line?: number }> {
    const opened = await this.hub.opened(loopId);
    if (opened.kind !== 'loop') throw new BadRequestError('这段对话不是一次学习任务。');
    const body = text.trim();
    if (body === '') throw new BadRequestError('异议不能是空的。');
    const recs = await this.hub.records(loopId);
    if (recs.find((r) => r.line === line)?.record.type !== 'guard_verdict') {
      throw new BadRequestError(`第 ${String(line)} 行不是一次判定，找不到要提异议的地方。`);
    }
    const target = { kind: 'guard_verdict', loopSessionId: loopId, line } as const;
    if (recs.some((r) => r.record.type === 'loop_ended')) {
      const objection: LearnerObjection = {
        id: this.newId('obj'),
        at: this.iso(),
        text: body,
        target,
      };
      await this.o.objections.add(objection);
      return { objection, inLoop: false };
    }
    const sent = await this.hub.send(
      loopId,
      { role: 'learner', text: body },
      { objection: { toLine: line } },
    );
    return {
      objection: { id: `${loopId}:${String(sent.line)}`, at: this.iso(), text: body, target },
      inLoop: true,
      line: sent.line,
    };
  }

  /** 对 M09 / M10 / M15 的一条记录提异议：只追加一条异议记录，不改原记录；下次整理 / 出卡时被读到。 */
  async objectToRecord(
    kind: 'm09' | 'm10' | 'm15',
    recordId: string,
    text: string,
  ): Promise<LearnerObjection> {
    const body = text.trim();
    if (body === '') throw new BadRequestError('异议不能是空的。');
    const exists =
      kind === 'm09'
        ? this.o.m09.record(recordId)
        : kind === 'm10'
          ? this.o.m10.record(recordId)
          : this.o.m15.record(recordId);
    if (exists === undefined) throw new BadRequestError(`找不到这条记录：${recordId}。`);
    const objection: LearnerObjection = {
      id: this.newId('obj'),
      at: this.iso(),
      text: body,
      target: { kind, recordId },
    };
    await this.o.objections.add(objection);
    return objection;
  }

  /** 附在一条 M09 / M10 / M15 记录描述后面的学习者异议（交给模型读；没有就是空串）。 */
  private objectionNotes(kind: 'm09' | 'm10' | 'm15', recordId: string): string {
    const rows = this.o.objections.forRecord(kind, recordId);
    return rows.map((o) => `\n  学习者异议（自述，原记录没改）：${o.text}`).join('');
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
    const isFork = opened.fork !== undefined;
    try {
      // 分叉闭环结束后回到父闭环，不在主对话里出下一张卡
      if (!isFork) {
        await this.hub.send(mainId, {
          role: 'program',
          text: closed
            ? `闭环“${opened.title}”合上了（学习者已确认）。下一张选择卡正在出，出好会贴在这里。`
            : `闭环“${opened.title}”没合上就结束了。下一张选择卡正在出，出好会贴在这里。`,
        });
      }
      if (closed) {
        await this.writeM09(loopId);
        await this.hub.record(loopId, {
          type: 'after_loop_step',
          at: this.iso(),
          step: 'm09_written',
          detail: '形成记录已写入 M09',
        });
      } else {
        // 没合上：先记停车记录（缺在哪个出发点 + 恢复计划），出卡时 M05 读得到
        try {
          await this.detours.park(loopId, 'ended_unclosed');
          await this.hub.record(loopId, {
            type: 'after_loop_step',
            at: this.iso(),
            step: 'parked',
            detail: '停车记录已写入',
          });
        } catch (err) {
          console.error(`闭环 ${loopId} 的停车记录失败：`, err);
          await this.hub.record(loopId, {
            type: 'after_loop_step',
            at: this.iso(),
            step: 'failed',
            detail: `停车记录：${err instanceof Error ? err.message : String(err)}`,
          });
        }
      }
      if (!isFork) {
        const card = await this.requestCard(
          closed
            ? `闭环“${opened.title}”（${loopId}）合上了`
            : `闭环“${opened.title}”（${loopId}）没合上就结束了；可读它的原文和停车记录`,
          mainId,
        );
        await this.hub.record(loopId, {
          type: 'after_loop_step',
          at: this.iso(),
          step: 'card_ready',
          detail: card.cardId,
        });
      }
    } catch (err) {
      console.error(`闭环 ${loopId} 结束后的清单失败：`, err);
      await this.hub.record(loopId, {
        type: 'after_loop_step',
        at: this.iso(),
        step: 'failed',
        detail: err instanceof Error ? err.message : String(err),
      });
    }
    // 分叉闭环：不管前面的步骤成没成，都要回到父闭环（否则父闭环一直在等）
    if (opened.fork !== undefined) {
      try {
        await this.detours.returnToParent(loopId, closed);
        await this.hub.record(loopId, {
          type: 'after_loop_step',
          at: this.iso(),
          step: 'returned',
          detail: opened.fork.fromLoop,
        });
      } catch (err) {
        console.error(`分叉闭环 ${loopId} 回父闭环失败：`, err);
        await this.hub.record(loopId, {
          type: 'after_loop_step',
          at: this.iso(),
          step: 'failed',
          detail: `回父闭环：${err instanceof Error ? err.message : String(err)}`,
        });
      }
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
    const strengthShape = z.object({
      time: z.enum(EVIDENCE_TIMES),
      independence: z.enum(EVIDENCE_INDEPENDENCE),
    });
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
        new_point_evidence: strengthShape.optional(),
        start_point_evidence: z.array(strengthShape.extend({ point: z.string() })).optional(),
        evidence_strength: z.string().optional().describe('旧形态，不再使用；请填上面两项'),
        evidence_lines: z.array(z.number().int()),
      },
      run: async (a) => {
        if (this.formations.has(sessionId)) return err('已经写过了');
        const target = this.m09Target.get(sessionId);
        if (!target) return err('找不到要写的闭环');
        const startPoints = a.start_points as string[];
        const newEv = a.new_point_evidence as EvidenceStrength | undefined;
        const startEv = a.start_point_evidence as
          (EvidenceStrength & { point: string })[] | undefined;
        let evidence: FormationEvidence | undefined;
        if (newEv !== undefined || startEv !== undefined) {
          if (newEv === undefined || startEv === undefined)
            return err('证据强度要同时给新点一项、每个出发点各一项');
          const got = startEv.map((s) => s.point);
          const missing = startPoints.filter((p) => !got.includes(p));
          const extra = got.filter((p) => !startPoints.includes(p));
          if (missing.length > 0 || extra.length > 0 || new Set(got).size !== got.length)
            return err(
              `出发点的证据强度要与 start_points 一一对应（缺 ${missing.join('、') || '无'}；多 ${extra.join('、') || '无'}）`,
            );
          evidence = { newPoint: newEv, startPoints: startEv };
        } else if (a.evidence_strength === undefined) {
          return err('缺证据强度：给 new_point_evidence 与 start_point_evidence');
        }
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
          startPoints,
          understanding: a.understanding as string,
          process: a.process as string,
          unmet: a.unmet as string,
          evidenceStrength: evidence ? describeEvidence(evidence) : (a.evidence_strength as string),
          ...(evidence ? { evidence } : {}),
          evidenceLines: lines,
          model: await this.hub.executedModel(sessionId),
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
    const known = this.o.m09.knownPoints();
    const { lines: loopStates, load } = await this.loopStatesText(loops, known);
    const objections = this.o.objections.all().slice(-20);
    const scope = await this.scopeOf(mainId);
    const external = this.o.m09.externals().slice(-30);
    const deadline = foldDeadline(main).deadline;
    return [
      `触发原因：${trigger}`,
      '',
      `方向目标：${goal?.type === 'project_goal' ? goal.text : '（还没有；按默认先验——高中以上、脱离应试——出临时选项，标“临时”）'}`,
      '',
      `期限：${deadline !== undefined ? this.deadlineText(foldDeadline(main)) : '没有记'}`,
      '',
      `资料范围：${scope !== undefined ? `项目选用了 ${String(scope.length)} 份资料：${scope.join('、')}。教材查询工具和 M08 工具默认只在这些里查；学习者或你明确要时，传 all=true 查全库。` : '项目没选资料：查全库。'}`,
      '',
      `已合上过的新点（M09）：${known.length > 0 ? known.map((p) => `${p}「${this.o.m08.name(p)}」`).join('、') : '（空：冷启动，第一个闭环选小的）'}`,
      '',
      ...(external.length > 0
        ? [
            `外部导入（学习者在系统之外学到的：自述 / 笔记里写过；未验证，可信度低于闭环记录，闭环证据永远优先，可以怀疑，不算“已合上过”）：\n${external.map((r) => this.o.m09.describeExternal(r, (id) => this.o.m08.name(id))).join('\n')}`,
            '',
          ]
        : []),
      `闭环（路线事实）：\n${loopStates.length > 0 ? loopStates.join('\n') : '（还没有）'}`,
      '',
      ...load,
      '',
      ...(objections.length > 0
        ? [
            `学习者提过的异议（自述；没有改原记录，选单子时参考）：\n${objections.map((o) => `- ${this.o.objections.describe(o)}`).join('\n')}`,
            '',
          ]
        : []),
      this.m08Summary(scope, await this.recentSpot(loops)),
      '',
      '学习者状态（M15）：要用时用 query_state 查；没有记录按无状态约束。',
    ].join('\n');
  }

  /**
   * 各闭环的状态行（含分叉来历、等分叉、停车记录），和“同时进行的闭环数 / 停车场”提示。
   * 只提示、不硬拦（M05:28 负荷预算与任务限流）；阈值属实现细节：没收尾的 ≥3 个算多，停车场 ≥3 条算堆积。
   */
  private async loopStatesText(
    loops: { sessionId: string; title: string }[],
    known: string[],
  ): Promise<{ lines: string[]; load: string[] }> {
    const lines: string[] = [];
    const count = { active: 0, shelved: 0, waiting: 0 };
    const parked: string[] = [];
    for (const l of loops) {
      const recs = await this.hub.records(l.sessionId);
      const opened = await this.hub.opened(l.sessionId);
      const flags = foldLoop(recs);
      const label = stateLabel(flags);
      if (flags.ended === undefined) {
        if (flags.shelved !== undefined) count.shelved++;
        else if (flags.waitingFork !== undefined) count.waiting++;
        else count.active++;
      }
      const extra: string[] = [];
      if (opened.fork !== undefined) {
        extra.push(`分叉自 ${opened.fork.fromLoop}，原因：${opened.fork.reason}`);
      }
      if (flags.waitingFork !== undefined) extra.push(`等分叉 ${flags.waitingFork} 回来`);
      const parking = flags.parking;
      const unresolved =
        flags.ended?.closed === false &&
        (opened.ticket === undefined || !known.includes(opened.ticket.newPoint));
      if (parking !== undefined && (unresolved || flags.shelved !== undefined)) {
        const text = `缺：${parking.missing
          .map((m) =>
            m.point !== undefined ? `${m.point}「${this.o.m08.name(m.point)}」` : m.text,
          )
          .join('、')}；恢复计划：${parking.when}，从${parking.resumeFrom}接上`;
        extra.push(`停车记录：${text}`);
        if (unresolved) parked.push(`- ${l.sessionId}「${l.title}」：${text}`);
      } else if (unresolved) {
        parked.push(
          `- ${l.sessionId}「${l.title}」：没合上就结束（没有停车记录，读它的原文看缺在哪）`,
        );
      }
      lines.push(
        `- ${l.sessionId}「${l.title}」：${label}${extra.length > 0 ? `（${extra.join('；')}）` : ''}`,
      );
    }
    const open = count.active + count.shelved + count.waiting;
    const load = [
      `同时没收尾的闭环：进行中 ${String(count.active)} 个、搁置 ${String(count.shelved)} 个、等分叉回来 ${String(count.waiting)} 个（共 ${String(open)} 个）。${open >= LOAD_HEAVY ? '已经不少了：这次别再开新的点，优先让学习者接着学搁置的、等分叉的或收尾进行中的（只是提示，最终由学习者选）。' : ''}`,
      `停车场（没合上就结束、缺口还没补上）：${parked.length > 0 ? `${String(parked.length)} 条\n${parked.join('\n')}` : '空'}${parked.length >= PARKING_PILE ? '\n停车场堆积了：降载——这张卡优先“接着学没合上的 / 先补它们缺的出发点”，少开全新的点；缺的出发点相同的几条可以合并成一个先补。' : ''}`,
    ];
    return { lines, load };
  }

  private deadlineText(d: { deadline?: string; note?: string }): string {
    if (d.deadline === undefined) return '没有记';
    const days = this.daysUntil(d.deadline);
    const left = days >= 0 ? `还有 ${String(days)} 天` : `已过 ${String(-days)} 天`;
    return `${d.deadline}（${left}）${d.note !== undefined ? `；${d.note}` : ''}`;
  }

  /** M08 概要（给 M05 开场用）：各书各章有多少点 / 子句；全部点按需用工具查（m08_overview / list_chapter_points / search_points）。 */
  private m08Summary(scope: string[] | undefined, recent: string): string {
    const m08 = this.o.m08;
    if (m08.empty) return 'M08：空（缺通用知识依据）';
    const set = scope !== undefined ? new Set(scope) : undefined;
    const counts = m08.counts(set);
    const shown = counts.slice(0, 20);
    const lines = shown.map(
      (b) =>
        `- 《${b.book}》${String(b.points)} 点 / ${String(b.clauses)} 子句：${b.chapters
          .slice(0, 40)
          .map((c) => `${c.chapter} ${String(c.points)}/${String(c.clauses)}`)
          .join('，')}${b.chapters.length > 40 ? '……' : ''}`,
    );
    const total = [...m08.points.values()].filter(
      (p) => set === undefined || m08.pointInBooks(p, set),
    ).length;
    const hidden = m08.points.size - total;
    return [
      `M08 概要（共 ${String(total)} 个点${m08.origins.length > 1 ? `，合并自 ${String(m08.origins.length)} 套产出` : ''}；章后是 点数/子句数）：`,
      lines.join('\n') || '（项目选的资料里还没有 M08 点）',
      ...(counts.length > shown.length
        ? [`……另有 ${String(counts.length - shown.length)} 本`]
        : []),
      ...(hidden > 0
        ? [`（另有 ${String(hidden)} 个点属于没选进项目的资料，要看用 all=true）`]
        : []),
      recent,
      '要看某一章的点：list_chapter_points（书名、章名）；按关键词找：search_points；一个点的细节与前后子句：get_point。点只在需要时再查，开场不列。',
    ].join('\n');
  }

  /** 学习者最近在哪一章：本项目最近开的带单子的闭环，它的新点所在的书与章。 */
  private async recentSpot(
    loops: { sessionId: string; title: string; openedAt: string }[],
  ): Promise<string> {
    const sorted = [...loops].sort((a, b) => b.openedAt.localeCompare(a.openedAt));
    for (const l of sorted) {
      const opened = await this.hub.opened(l.sessionId);
      const p = opened.ticket ? this.o.m08.points.get(opened.ticket.newPoint) : undefined;
      if (p === undefined) continue;
      const state = stateLabel(foldLoop(await this.hub.records(l.sessionId)));
      const book = this.o.m08.bookOf(p);
      return `学习者最近在：${book !== undefined ? `《${book.trim()}》 ` : ''}${this.o.m08.chapterOf(p)}（闭环 ${l.sessionId}「${l.title}」，新点 ${p.id}「${p.name}」，${state}）`;
    }
    return '学习者最近在：还没有开过闭环';
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
      sources: z
        .array(z.string().min(1))
        .min(1)
        .describe(
          '这个选项从哪来，每条可回查：M08 点 / 子句 id、M09 记录 id、闭环原文“会话 id:行号”、书里“书名/文件:行号”（书名、文件照教材查询工具给的写）',
        ),
    });
    return {
      name: 'submit_choice_card',
      description: '交回 2–4 个候选单子，推荐其中一个（从 0 数）。只提交一次。',
      input: { options: z.array(ticketShape).min(2).max(4), recommended: z.number().int().min(0) },
      run: (a) => {
        if (this.cards.has(sessionId)) return err('已经提交过选择卡');
        // 出处在模型参数里是必填（上面的校验）；这里对旧调用形态（没有 sources）宽容，不编
        const raw = a.options as (Omit<z.infer<typeof ticketShape>, 'sources'> & {
          sources?: string[];
        })[];
        const options: ChoiceOption[] = raw.map((o) => ({
          title: o.title,
          reason: o.reason,
          ...(o.sources !== undefined ? { sources: o.sources } : {}),
          ticket: {
            newPoint: o.new_point,
            clause: o.clause,
            startPoints: o.start_points.map((s) => ({ point: s.point, source: s.source })),
            routeAction: o.route_action,
          },
        }));
        const blank = raw.flatMap((o, i) =>
          o.sources?.some((s) => s.trim() === '') === true
            ? [`第 ${String(i)} 项的出处有空白条目`]
            : [],
        );
        if (blank.length > 0) return err(`${blank.join('；')}。改好后重新提交`);
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
            const state = stateLabel(foldLoop(await this.hub.records(l.sessionId)));
            loops.push(`- ${l.sessionId}「${l.title}」：${state}`);
          }
          const ext = this.o.m09
            .externals()
            .map((r) => this.o.m09.describeExternal(r, (id) => this.o.m08.name(id)));
          return ok(
            `闭环：\n${loops.join('\n') || '（还没有）'}\n\nM09 形成记录（闭环证据）：\n${rows.join('\n') || '（还没有）'}${ext.length > 0 ? `\n\n外部导入（学习者自述 / 笔记，未验证，不算学会）：\n${ext.join('\n')}` : ''}`,
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
        known: z
          .array(
            z.object({
              claim: z.string().describe('学习者自己说他已经会 / 学过的是什么，一句话'),
              point: z.string().optional().describe('对得上 M08 的点就填点 id，对不上不填'),
              basis: z.string().optional().describe('判读依据：他怎么说的、说到什么程度'),
              lines: z.array(z.number().int()).min(1).describe('学习者说这话的行号（本对话里）'),
            }),
          )
          .optional()
          .describe('学习者在畅谈里亲口说自己已经会的东西（自述，未验证）；没说就不填，不要猜'),
        deadline: z.string().optional().describe('学习者说了期限才填，YYYY-MM-DD；没说不填'),
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
        const deadline = (a.deadline as string | undefined)?.trim();
        if (deadline !== undefined && deadline !== '' && !validDate(deadline)) {
          return err('deadline 要写成 YYYY-MM-DD 的真实日期；学习者没说期限就不填');
        }
        // 自述要引学习者自己的话（和 M15 的自述同一条规矩）；先全部核对，不过就什么都不写
        const known =
          (a.known as
            { claim: string; point?: string; basis?: string; lines: number[] }[] | undefined) ?? [];
        const learner = learnerLines(recs);
        for (const k of known) {
          if (k.claim.trim() === '') return err('known 里有空的 claim');
          const bad = k.lines.filter((l) => !learner.has(l));
          if (bad.length > 0) {
            return err(`known 里引的第 ${bad.join('、')} 行不是学习者说的话；自述只引学习者的行`);
          }
          if (k.point !== undefined && k.point !== '' && !this.o.m08.points.has(k.point)) {
            return err(`known 里的点 ${k.point} 在 M08 里查不到；对不上就不填 point`);
          }
        }
        const at = this.iso();
        await this.hub.record(mainId, { type: 'project_goal', at, text: goal });
        await this.hub.record(mainId, { type: 'project_title', at, title, source: 'goal' });
        if (deadline !== undefined && deadline !== '') {
          await this.hub.record(mainId, { type: 'project_deadline', at, deadline });
        }
        if (known.length > 0) {
          const model = await this.hub.executedModel(talkId);
          for (const k of known) {
            await this.o.m09.addExternal({
              id: this.newId('x'),
              at,
              source: '自述',
              status: '未验证',
              claim: k.claim.trim(),
              ...(k.point !== undefined && k.point !== '' ? { point: k.point } : {}),
              basis: k.basis?.trim() || '学习者在畅谈里自己说会，没有验证',
              talk: {
                sessionId: talkId,
                lines: k.lines,
                quotes: k.lines.map((l) => {
                  const r = recs.find((x) => x.line === l)?.record;
                  return r?.type === 'user_message' ? r.text.slice(0, 200) : '';
                }),
              },
              model,
            });
          }
        }
        await this.hub.record(talkId, { type: 'talk_ended', at, goal, title });
        await this.hub.send(mainId, {
          role: 'program',
          text: `谈方向的对话（${talkId}）交回了：方向目标是“${goal}”，项目名改为“${title}”。`,
        });
        this.organizeStateLater(`畅谈对话（${talkId}）结束了`, talkId);
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
      {
        name: 'request_detour',
        description:
          '发现前置缺口（含学习者自述 / 假定的出发点其实不牢），或学习者想岔开去学别的时调用：通知 M05，由它在这个闭环里出一张小卡（先补 X，开分叉，补完回来 / 先不管接着学），学习者选。必须指回学习者的原话行。小卡出了之后你先别替学习者选，也别继续往下讲。',
        input: {
          kind: z.enum(['gap', 'branch']).describe('gap = 前置缺口；branch = 学习者想分叉去学别的'),
          missing_point: z
            .string()
            .optional()
            .describe('缺的出发点 / 想去的点（M08 点 id），对不上不填'),
          missing_text: z.string().describe('缺什么 / 想去哪，用日常话一句'),
          basis_lines: z.array(z.number().int()).describe('指回学习者原话的行号'),
          note: z.string().optional(),
        },
        run: (a) =>
          this.detours.raise(loopId, {
            kind: a.kind as 'gap' | 'branch',
            ...(a.missing_point !== undefined ? { missingPoint: a.missing_point as string } : {}),
            missingText: a.missing_text as string,
            basisLines: a.basis_lines as number[],
            ...(a.note !== undefined ? { note: a.note as string } : {}),
          }),
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
            rows.length > 0
              ? rows
                  .map((r) => this.o.m10.describe(r) + this.objectionNotes('m10', r.id))
                  .join('\n')
              : '还没有记录',
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
    const external = t.startPoints
      .flatMap((s) => this.o.m09.externalsForPoint(s.point))
      .map((r) => this.o.m09.describeExternal(r, (id) => this.o.m08.name(id)));
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
      ...(external.length > 0
        ? [
            `外部导入记录（学习者在系统之外学到的：自述 / 笔记；未验证，可信度低于闭环记录，教学中可以怀疑它）：\n${external.join('\n')}`,
          ]
        : []),
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
    // 学习者对状态记录提的异议，上次整理之后新来的也算新记录
    const lastRun = this.o.m15.lastRunAt();
    const fresh = this.o.objections
      .all()
      .filter((o) => o.target.kind === 'm15' && (lastRun === undefined || o.at > lastRun));
    // 没有新记录不整理（03「M15」）
    if (facts.newLearnerLines === 0 && fresh.length === 0 && !force) return;
    const objections = this.o.objections.all().filter((o) => o.target.kind === 'm15');
    const s = await this.hub.createSession('m15', {
      title: '整理学习者状态',
      ...(from !== undefined ? { parent: from } : {}),
    });
    await this.hub.send(s.sessionId, {
      role: 'program',
      text: [
        `触发原因：${trigger}`,
        '',
        this.o.m15.describeCurrent(),
        '',
        ...(objections.length > 0
          ? [
              `学习者对状态记录的异议（自述；不覆盖可观察事实，对不上的两条都留、标冲突）：\n${objections.map((o) => `- ${this.o.objections.describe(o)}`).join('\n')}`,
              '',
            ]
          : []),
        facts.text,
      ].join('\n'),
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
          parts.push(
            '',
            '状态记录：',
            ...rows.map((r) => this.o.m15.describeRecord(r) + this.objectionNotes('m15', r.id)),
          );
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
              ...this.o.m15
                .allRecords()
                .map((r) => this.o.m15.describeRecord(r) + this.objectionNotes('m15', r.id)),
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
            model: await this.hub.executedModel(m15Id),
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
            model: await this.hub.executedModel(m15Id),
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
          model: await this.hub.executedModel(m10Id),
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

  /** 闭环还开着、且不是搁置着（要收口 / 确认合上）。 */
  private async assertActiveLoop(loopId: string): Promise<void> {
    await this.assertOpenLoop(loopId);
    await this.assertNotShelved(loopId);
  }

  /** 搁置着的闭环不能收口 / 确认合上：先恢复。 */
  async assertNotShelved(loopId: string): Promise<void> {
    if (foldLoop(await this.hub.records(loopId)).shelved !== undefined) {
      throw new BadRequestError('这部分搁置着，先点“接着学”再往下。');
    }
  }

  private async assertOpenLoop(loopId: string): Promise<void> {
    const opened = await this.hub.opened(loopId);
    if (opened.kind !== 'loop') throw new BadRequestError('这段对话不是一次学习任务。');
    const ended = (await this.hub.records(loopId)).some((r) => r.record.type === 'loop_ended');
    if (ended) throw new BadRequestError('这部分已经结束了。');
  }

  /** 笔记提取的会话 → 要提的笔记（书库 id）。 */
  private readonly noteTargets = new Map<string, { book: string; done: boolean }>();

  /**
   * 笔记导入后可选：让模型从学习者的笔记里提“他写过的点”，作为“笔记、未验证”档写进 M09（M09:26,47）。
   * 开一个 M09 会话（和写形成记录同一类，另一种活），后台跑；结果在 GET /api/m09/external。
   */
  async extractNotePoints(book: string, projectId?: string): Promise<string> {
    const info = await this.o.m07.info(book);
    if (info?.kind !== 'note')
      throw new BadRequestError('只能从个人笔记里提：这不是一份导入的笔记。');
    if (projectId !== undefined) await this.requireProject(projectId);
    const toc = await this.o.m07.toc(book);
    const parts: string[] = [];
    let budget = NOTE_EXTRACT_CHARS;
    for (const e of toc) {
      if (e.file === undefined) {
        parts.push(`## ${e.num} ${e.title}`);
        continue;
      }
      const r = await this.o.m07.lines(book, e.file);
      let body = r.lines.map((l) => `${String(l.n)}\t${l.text}`).join('\n');
      if (body.length > budget)
        body = `${body.slice(0, Math.max(budget, 0))}\n（后面截断了，用 read_source 读全）`;
      budget -= body.length;
      parts.push(`## ${e.num} ${e.title}（文件 ${e.file}，共 ${String(r.total)} 行）\n${body}`);
    }
    const s = await this.hub.createSession('m09', {
      title: '提取笔记里的点',
      ...(projectId !== undefined ? { parent: projectId } : {}),
    });
    this.noteTargets.set(s.sessionId, { book, done: false });
    await this.hub.send(s.sessionId, {
      role: 'program',
      text: [
        '这一次不是写闭环形成记录，而是从学习者的个人笔记里提“他写过的点”（外部导入，未验证）。',
        `笔记：《${book}》（作者：学习者；来源：个人笔记；原路径：${info.meta?.originalPath ?? '未知'}）。每个小节前是文件名，行前是行号。`,
        '',
        parts.join('\n\n'),
      ].join('\n'),
    });
    await this.hub.idle(s.sessionId);
    return s.sessionId;
  }

  private notePointsTool(sessionId: string): ToolSpec {
    return {
      name: 'write_note_points',
      description:
        '把从学习者笔记里提到的点写进 M09 的“笔记、未验证”档。每个点：学习者写过的是什么、对得上 M08 就填点 id、笔记里写到什么程度、依据的笔记行段。只提交一次；笔记里没有的不要编。',
      input: {
        points: z
          .array(
            z.object({
              claim: z.string().describe('学习者在笔记里写过的是什么，一句话'),
              point: z.string().optional().describe('对得上 M08 的点就填点 id，对不上不填'),
              grade: z.enum(NOTE_GRADES).describe('笔记里写到什么程度'),
              basis: z.string().describe('判读依据：笔记里看到了什么才这样分'),
              file: z.string().describe('笔记小节文件，如 ch01/sec-1.1.md'),
              from_line: z.number().int(),
              to_line: z.number().int(),
            }),
          )
          .min(1),
      },
      run: async (a) => {
        const target = this.noteTargets.get(sessionId);
        if (!target) return err('找不到要提的笔记');
        if (target.done) return err('已经提交过了');
        const points = a.points as {
          claim: string;
          point?: string;
          grade: (typeof NOTE_GRADES)[number];
          basis: string;
          file: string;
          from_line: number;
          to_line: number;
        }[];
        for (const p of points) {
          if (p.claim.trim() === '' || p.basis.trim() === '') return err('claim 和 basis 都不能空');
          if (p.point !== undefined && p.point !== '' && !this.o.m08.points.has(p.point)) {
            return err(`点 ${p.point} 在 M08 里查不到；对不上就不填 point`);
          }
          let r;
          try {
            r = await this.o.m07.lines(target.book, p.file, p.from_line, p.to_line);
          } catch (e) {
            if (isNotFound(e)) return err(`笔记里没有这个文件：${p.file}`);
            throw e;
          }
          if (p.from_line < 1 || p.to_line < p.from_line || r.lines.length === 0) {
            return err(
              `${p.file} 第 ${String(p.from_line)}–${String(p.to_line)} 行不在笔记里（共 ${String(r.total)} 行）`,
            );
          }
        }
        const at = this.iso();
        const model = await this.hub.executedModel(sessionId);
        for (const p of points) {
          await this.o.m09.addExternal({
            id: this.newId('x'),
            at,
            source: '笔记',
            status: '未验证',
            claim: p.claim.trim(),
            ...(p.point !== undefined && p.point !== '' ? { point: p.point } : {}),
            basis: p.basis.trim(),
            grade: p.grade,
            note: { book: target.book, file: p.file, from: p.from_line, to: p.to_line },
            model,
          });
        }
        target.done = true;
        return ok(`已写入 ${String(points.length)} 条（笔记、未验证）`);
      },
    };
  }

  /** 资料范围的说明，接在工具结果后面：只搜了项目选用的，要全库传 all。 */
  private scopeHint(scope: string[] | undefined): string {
    return scope !== undefined
      ? `\n（只在项目选用的 ${String(scope.length)} 份资料里查；要查全库传 all=true）`
      : '';
  }

  /** 只读查询工具：M08、M07、M09（按 03「读写权限」）；资料类工具默认只查项目选的资料（没选 = 全库）。 */
  private readTools(sessionId: string, opt: { m07?: boolean; m09?: boolean } = {}): ToolSpec[] {
    const m08 = this.o.m08;
    const allParam = z
      .boolean()
      .optional()
      .describe('true = 查整个书库，不限项目选用的资料（学习者或你明确要时才用）');
    const tools: ToolSpec[] = [
      {
        name: 'search_points',
        description:
          '在 M08 里按关键词找点（名字或一句话里含这个词）。默认只找项目选用的资料里的点。',
        input: { keyword: z.string(), all: allParam },
        run: async (a) => {
          const scope = await this.scopeOf(sessionId, a.all === true);
          const hits = m08.search(a.keyword as string, scope ? new Set(scope) : undefined);
          return ok(
            hits.length > 0
              ? hits.map((p) => m08.describePoint(p)).join('\n')
              : `没找到${this.scopeHint(scope)}`,
          );
        },
      },
      {
        name: 'm08_overview',
        description:
          '看 M08 的概要：每本书每一章有多少点、多少子句（章名可用于 list_chapter_points）。默认只算项目选用的资料。',
        input: { all: allParam },
        run: async (a) => {
          const scope = await this.scopeOf(sessionId, a.all === true);
          if (m08.empty) return ok('M08 是空的（缺通用知识依据）');
          const counts = m08.counts(scope ? new Set(scope) : undefined);
          return ok(
            counts.length > 0
              ? counts
                  .map(
                    (b) =>
                      `《${b.book}》${String(b.points)} 点 / ${String(b.clauses)} 子句\n${b.chapters.map((c) => `  ${c.chapter}：${String(c.points)} 点 / ${String(c.clauses)} 子句`).join('\n')}`,
                  )
                  .join('\n') + this.scopeHint(scope)
              : `项目选用的资料里还没有 M08 点${this.scopeHint(scope)}`,
          );
        },
      },
      {
        name: 'list_chapter_points',
        description:
          '按章列出 M08 的点（id、名字、一句话）和进入这些点的子句。book 照 m08_overview 的书名写；chapter 如 ch03（不给 = 整本）。',
        input: { book: z.string(), chapter: z.string().optional() },
        run: (a) => {
          const want = (a.book as string).trim();
          const books = m08.counts().map((b) => b.book);
          const book =
            books.find((b) => b === want) ??
            (() => {
              const near = books.filter((b) => b.toLowerCase().includes(want.toLowerCase()));
              return near.length === 1 ? near[0] : undefined;
            })();
          if (book === undefined) {
            return err(`M08 里没有这本书：${want}。有：${books.join('；') || '（无）'}`);
          }
          const r = m08.inChapter(book, a.chapter as string | undefined);
          if (r.points.length === 0) {
            const chapters = m08.counts().find((b) => b.book === book)?.chapters ?? [];
            return err(
              `《${book}》没有这一章的点：${(a.chapter as string | undefined) ?? ''}。有：${chapters.map((c) => c.chapter).join('、')}`,
            );
          }
          const tag = (x: string): string => (x === '书给的' ? '' : `（${x}）`);
          return ok(
            [
              `《${book}》${typeof a.chapter === 'string' ? ` ${a.chapter}` : ''}：${String(r.points.length)} 个点，${String(r.clauses.length)} 条进入这些点的子句`,
              '点：',
              ...r.points.map((p) => `- ${p.id}「${p.name}」${tag(p.source)}：${p.sentence}`),
              '子句（出发点 → 新点）：',
              ...r.clauses.map(
                (c) =>
                  `- ${c.id}：${c.from.map((f) => `${f}「${m08.name(f)}」`).join(' + ')} → ${c.to}「${m08.name(c.to)}」${tag(c.source)}`,
              ),
            ].join('\n'),
          );
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
          description:
            '不给书名：列出项目选用的资料（书和个人笔记，按学科分组；项目没选就是整个书库），all=true 列整个书库；给书名：读这本书的 M07 目录。',
          input: { book: z.string().optional(), all: allParam },
          run: async (a) => {
            const book = a.book as string | undefined;
            if (book === undefined || book === '') {
              const lib = await this.o.m07.books();
              if (lib.length === 0) return ok('书库是空的（缺资料依据）');
              const scope = await this.scopeOf(sessionId, a.all === true);
              const shown = scope ?? lib;
              const groups = new Map<string, string[]>();
              for (const id of shown) {
                const subject = (await this.o.m07.info(id))?.subject ?? '';
                groups.set(subject, [...(groups.get(subject) ?? []), id]);
              }
              const lines: string[] = [];
              for (const [subject, ids] of [...groups.entries()].sort((x, y) =>
                x[0].localeCompare(y[0], 'zh-CN'),
              )) {
                if (subject !== '') lines.push(`【${subject}】`);
                lines.push(...ids);
              }
              const rest = lib.length - shown.length;
              return ok(
                lines.join('\n') +
                  (scope !== undefined
                    ? `\n\n（这是项目选用的资料；书库里另有 ${String(rest)} 份没选，要看全库传 all=true）`
                    : ''),
              );
            }
            return ok(await this.o.m07.index(book));
          },
        },
        {
          name: 'read_source',
          description:
            '读 M07 一个小节文件的原文，每行前印行号；可只读一段。末尾给出引用这段时要附的出处标记。',
          input: {
            book: z.string(),
            file: z.string().describe('目录里的文件路径，如 ch01/sec-1.2.md'),
            from_line: z.number().int().optional(),
            to_line: z.number().int().optional(),
          },
          run: async (a) => {
            const book = a.book as string;
            const file = a.file as string;
            const r = await this.o.m07.lines(
              book,
              file,
              (a.from_line as number | undefined) ?? 1,
              (a.to_line as number | undefined) ?? Number.MAX_SAFE_INTEGER,
            );
            const body = r.lines.map((l) => `${String(l.n)}\t${l.text}`).join('\n');
            return ok(
              r.lines.length === 0
                ? `（这个文件共 ${String(r.total)} 行，没有第 ${String((a.from_line as number | undefined) ?? 1)} 行起的内容）`
                : `${body}\n\n（引用上面的话时，在那句话后附：${formatCitation({ book, file, from: r.from, to: r.to })}，行段按你实际引用的缩小）`,
            );
          },
        },
        {
          name: 'search_textbook',
          description:
            '在教材原文里全文检索（词用空白隔开，要同时出现在同一段里），默认只搜项目选用的资料。返回书、小节、行号、片段和可直接用的出处标记。想引用教材原文、核对教材怎么说时用。',
          input: {
            query: z.string(),
            book: z.string().optional().describe('只搜这一本（明确指定的书不受项目资料限制）'),
            limit: z.number().int().optional().describe('最多几条，默认 10'),
            all: allParam,
          },
          run: async (a) => {
            const book = (a.book as string | undefined) || undefined;
            const scope =
              book !== undefined ? undefined : await this.scopeOf(sessionId, a.all === true);
            const r = await this.o.sources.search(
              a.query as string,
              book,
              (a.limit as number | undefined) ?? 10,
              scope,
            );
            if (r.hits.length === 0) {
              return ok(`没找到（原文里没有同时含这些词的一段）${this.scopeHint(scope)}`);
            }
            const rows = r.hits.map(
              (h) =>
                `《${h.bookTitle || h.book}》${h.num} ${h.title}｜${h.file} 第 ${String(h.line)} 行\n  ${h.snippet}\n  出处标记：${formatCitation({ book: h.book, file: h.file, from: h.line })}`,
            );
            return ok(
              `共 ${String(r.total)} 段命中，列出前 ${String(r.hits.length)}：\n${rows.join('\n')}${this.scopeHint(scope)}`,
            );
          },
        },
      );
    }
    if (opt.m09 !== false) {
      tools.push({
        name: 'query_m09',
        description:
          '查学习者的 M09 记录，分两档：已结束闭环的形成记录（闭环证据，已验证）；外部导入（学习者自述 / 笔记里写过的，未验证，可信度低、闭环证据优先）。给点 id 只看与这个点有关的。',
        input: { point: z.string().optional() },
        run: (a) => {
          const p = a.point as string | undefined;
          const rows = p ? this.o.m09.forPoint(p) : this.o.m09.all();
          const ext = p ? this.o.m09.externalsForPoint(p) : this.o.m09.externals();
          const closed = rows
            .map((r) => this.o.m09.describe(r) + this.objectionNotes('m09', r.id))
            .join('\n');
          if (ext.length === 0) return ok(rows.length > 0 ? closed : '没有记录');
          const outside = ext
            .map((r) => this.o.m09.describeExternal(r, (id) => this.o.m08.name(id)))
            .join('\n');
          return ok(
            `闭环形成记录（已验证）：\n${closed || '没有'}\n\n外部导入（未验证，自述 / 笔记；不算学会，闭环证据优先，可以怀疑）：\n${outside}`,
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

/** 笔记提取：开场里最多放多少字笔记原文，超出的让模型用 read_source 读。 */
const NOTE_EXTRACT_CHARS = 30_000;

/** 把 project_material 记录折叠成当前选用的资料（按选用顺序）。 */
export function foldMaterials(recs: LogRecord[]): { book: string; addedAt: string }[] {
  const out = new Map<string, string>();
  for (const r of recs) {
    if (r.type !== 'project_material') continue;
    if (r.op === 'add') {
      if (!out.has(r.book)) out.set(r.book, r.at);
    } else {
      out.delete(r.book);
    }
  }
  return [...out.entries()].map(([book, addedAt]) => ({ book, addedAt }));
}

/** 取最新一条 project_deadline；null = 已清掉。 */
export function foldDeadline(recs: LogRecord[]): { deadline?: string; note?: string } {
  const last = recs.filter((r) => r.type === 'project_deadline').at(-1);
  if (last?.type !== 'project_deadline' || last.deadline === null) return {};
  return { deadline: last.deadline, ...(last.note !== undefined ? { note: last.note } : {}) };
}

function validDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = Date.parse(`${s}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
}
