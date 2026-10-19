// Studium 的闭环外：按事件跑清单（03「闭环外：事件与清单」「收口与闭环守卫」）。
// 每种会话的系统提示与工具在这里给；写权限靠给什么工具来卡（03「读写权限」）。
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { formatCitation } from '../shared/citation.ts';
import type {
  ProjectDeadlineResponse,
  ProjectMaterialsResponse,
  ProjectMaterialView,
  SourceNoteView,
  StateExplanationView,
} from '../shared/protocol.ts';
import { CROSS_KINDS } from '../shared/records-cross.ts';
import {
  DURABILITY,
  INDEPENDENCE,
  START_SOURCES,
  type ChoiceCard,
  type ChoiceOption,
  type ConversationKind,
  type GuardVerdict,
  type ImageInput,
  type LearnerObjection,
  type LogRecord,
  type NumberedRecord,
  type RouteDecision,
  type Ticket,
  type Understanding,
} from '../shared/records.ts';
import type { Crosslinks } from './crosslinks.ts';
import { Detours } from './detour.ts';
import { Learned } from './learned.ts';
import { LongTerm } from './longterm.ts';
import { Practice } from './practice.ts';
import { REVISIT_KINDS } from '../shared/records-longterm.ts';
import type { Deviations } from './knowledge/m05-deviations.ts';
import { NotFoundError, type Hub, type KindConfig } from './hub.ts';
import { foldLoop, LOAD_HEAVY, PARKING_PILE, stateLabel } from './loop-state.ts';
import type { Library } from './knowledge/m07.ts';
import type { Sources } from './sources.ts';
import type { Learning } from '../shared/protocol-learned.ts';
import type { M10 } from './knowledge/m10.ts';
import type { Objections } from './knowledge/objections.ts';
import { STAGES, type M15, type StateConfirmation } from './knowledge/m15.ts';
import {
  changesOf,
  describeTrend,
  intensityInput,
  notesOf,
  parseIntensity,
  trendOf,
  type IntensityChange,
} from './intensity.ts';
import { teachingToolSpecs, toolUsesOf, type TeachingTools } from './teaching-tools.ts';
import { locate, type LocateDeps } from './locate.ts';
import type { ToolResult, ToolSpec } from './model/port.ts';
import type { Outputs } from './outputs.ts';
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
  /** 数据目录（学过的记录的导入存放处在其下）。 */
  dataDir: string;
  m10: M10;
  m15: M15;
  /** 学习者异议存放处。 */
  objections: Objections;
  /** M05 自有的路线偏差记录（批 6）。 */
  deviations: Deviations;
  /** 原文与出处（M07 检索、教材出处核对）。 */
  sources: Sources;
  /** 教学工具（官方 + 学习者自己的）。 */
  teaching: TeachingTools;
  /** M14 知识产出物（批 8）。 */
  outputs: Outputs;
  /** 跨资料的重复线索 / 来源说明 / 跨领域核对（批 10b）。 */
  cross: Crosslinks;
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

  /** 跨闭环的长期功能（批 6）：复习 / 复检、降档、当前视图、接着学、复盘、提醒、路线偏差。 */
  readonly longterm: LongTerm;

  /** 练习任务（批 9，M03）：布置 → 作答 → 反馈 → 完成 / 放弃，习题清单，重复错误成模式，题型归纳，阶段验收。 */
  readonly practice: Practice;

  /** 学过的记录（按层读每次学习）与外部导入存放处。 */
  readonly learned: Learned;

  constructor(private readonly o: StudiumOptions) {
    this.now = o.now ?? (() => new Date());
    this.learned = new Learned({
      hub: () => this.hub,
      dir: o.dataDir,
      newId: (prefix) => this.newId(prefix),
      iso: () => this.iso(),
    });
    this.practice = new Practice({
      hub: () => this.hub,
      m07: o.m07,
      iso: () => this.iso(),
      newId: (prefix) => this.newId(prefix),
      scopeOf: (id, all) => this.scopeOf(id, all),
      assertActiveLoop: (id) => this.assertActiveLoop(id),
      assertOpenLoop: (id) => this.assertOpenLoop(id),
      learnerSays: (id, text, practice) => this.learnerSays(id, text, undefined, practice),
    });
    this.longterm = new LongTerm({
      hub: () => this.hub,
      learned: this.learned,
      m15: o.m15,
      deviations: o.deviations,
      now: () => this.now(),
      iso: () => this.iso(),
      newId: (prefix) => this.newId(prefix),
      loopOpening: (t) => this.loopOpening(t),
      projectOf: (id) => this.projectOf(id),
      stateQueryTool: () => this.stateQueryTool(),
    });
    this.detours = new Detours({
      hub: () => this.hub,
      iso: () => this.iso(),
      newId: (prefix) => this.newId(prefix),
      describeTicket: (t) => this.describeTicket(t),
      m05Opening: (trigger, mainId) => this.m05Opening(trigger, mainId),
      loopOpening: (t) => this.loopOpening(t),
      m05ReadTools: (id) => [
        ...this.readTools(id),
        this.loopTranscriptTool(),
        this.stateQueryTool(),
      ],
    });
    // 产出物那边生成的编号也经这里报给录带
    o.outputs.onNewId((prefix, id) => {
      for (const fn of this.idListeners) fn(prefix, id);
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

  /** 启动时调（开服务之前）：重建 M05 会话的活；被重启打断的小卡 / 停车记录放后台重做一次。 */
  async recover(): Promise<void> {
    for (const id of await this.detours.restore()) {
      this.background(`重启后补做 ${id}`, () => this.detours.finishInterrupted(id));
    }
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
          // 同一类会话两种活：谈方向；阶段复盘（finish_review 只在复盘会话里可用）
          return [
            ...this.readTools(sessionId),
            this.settleGoalTool(sessionId),
            ...this.longterm.reviewTools(sessionId),
          ];
        case 'loop':
          return [
            ...this.readTools(sessionId),
            this.loopTranscriptTool(),
            ...this.loopTools(sessionId),
            this.o.cross.addNoteTool(sessionId),
            ...this.practice.loopTools(sessionId),
          ];
        case 'guard':
          return [...this.readTools(sessionId), this.verdictTool(sessionId)];
        case 'm05':
          // 同一类会话三种活：出下一闭环的选择卡；闭环中途的小卡；给没合上 / 搁置的闭环记停车记录
          return (
            this.detours.m05Tools(sessionId) ?? [
              ...this.readTools(sessionId),
              this.loopTranscriptTool(),
              this.stateQueryTool(),
              this.cardTool(sessionId),
              ...this.longterm.m05Tools(sessionId),
              this.o.cross.addNoteTool(sessionId),
            ]
          );
        case 'm15':
          return this.stateTools(sessionId);
        case 'm10':
          return [
            ...this.readTools(sessionId, { m07: false }),
            this.stateQueryTool(),
            this.strategyTool(sessionId),
          ];
        case 'output':
          // M14 只读 M07；写产出新版本的工具由 Outputs 给
          return [...this.readTools(sessionId), ...this.o.outputs.sessionTools(sessionId)];
      }
    },
  });

  // ───────────── 事件 ─────────────

  /** 一个项目一条主对话；没有就开一条。 */
  async ensureMain(): Promise<string> {
    await this.practice.warm();
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

  /** 学习者给项目改名（左栏“重命名”）：主对话里追加一条 project_title，开头那行不改。 */
  async renameProject(mainId: string, title: string): Promise<void> {
    await this.requireProject(mainId);
    const t = title.trim();
    if (t === '') throw new BadRequestError('新名字不能为空');
    await this.hub.record(mainId, {
      type: 'project_title',
      at: this.iso(),
      title: t,
      source: 'learner',
    });
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
  async learnerSays(
    sessionId: string,
    text: string,
    images?: ImageInput[],
    practice?: { taskId: string },
  ): Promise<void> {
    const meta = {
      ...(images !== undefined && images.length > 0 ? { images } : {}),
      ...(practice !== undefined ? { practice } : {}),
    };
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
    // 每次出卡先写一条路线决定，紧接着写卡（记录/单子与路线.md「路线决定与理由」）
    const before = await this.hub.records(mainId);
    const last = [...before].reverse().find((r) => r.record.type === 'route_decision');
    const decision: RouteDecision = {
      type: 'route_decision',
      at: this.iso(),
      navSessionId: m05.sessionId,
      trigger,
      decision: card.routeDecision.decision,
      reason: card.routeDecision.reason,
      basis: card.routeDecision.basis,
      ...(last !== undefined ? { supersedes: last.line } : {}),
    };
    await this.hub.record(mainId, decision);
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
    await this.longterm.onChosen(mainId, card, option, loop.sessionId);
    await this.hub.send(loop.sessionId, {
      role: 'program',
      text: await this.loopOpening(picked.ticket),
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

  /** 学习者要结束、没合上：不开守卫，导航读原文出下一张卡。 */
  async endUnclosed(loopId: string, note: string): Promise<void> {
    await this.assertOpenLoop(loopId);
    await this.hub.record(loopId, {
      type: 'loop_ended',
      at: this.iso(),
      closed: false,
      note,
    });
    await this.longterm.onUnclosed(loopId);
    this.background('没合上之后的清单', () => this.afterLoop(loopId, false));
  }

  // ───────────── 闭环中途：小卡、分叉、搁置（批 5）─────────────

  /** 学习者在闭环里的小卡上选定：先补 / 先去学（开分叉闭环）· 先不管接着学 · 先搁置。 */
  async chooseDetour(
    loopId: string,
    cardId: string,
    option: number,
  ): Promise<{ choice: 'fork' | 'continue' | 'shelve'; forkLoopSessionId?: string }> {
    const r = await this.detours.choose(loopId, cardId, option);
    await this.longterm.onDetourChosen(loopId, cardId, option, r.choice);
    return r;
  }

  // ───────────── 跨闭环的长期功能（批 6）─────────────

  /** 没合上就结束的闭环，学习者点“接着学”：开新闭环续接它。 */
  continueLoop(loopId: string): Promise<string> {
    return this.longterm.continueLoop(loopId);
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

  /** 对 M10 / M15 的一条记录提异议：只追加一条异议记录，不改原记录；下次整理 / 出卡时被读到。 */
  async objectToRecord(
    kind: 'm10' | 'm15',
    recordId: string,
    text: string,
  ): Promise<LearnerObjection> {
    const body = text.trim();
    if (body === '') throw new BadRequestError('异议不能是空的。');
    const exists = kind === 'm10' ? this.o.m10.record(recordId) : this.o.m15.record(recordId);
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

  /** 学习者对一条 M15 状态记录确认 / 否认（界面上点的）：只追加一条，不改原记录；下次整理时被读到。 */
  async confirmRecord(
    recordId: string,
    verdict: 'confirm' | 'deny',
    note?: string,
  ): Promise<StateConfirmation> {
    if (this.o.m15.record(recordId) === undefined) {
      throw new BadRequestError(`找不到这条状态记录：${recordId}。`);
    }
    const text = note?.trim();
    const c: StateConfirmation = {
      id: this.newId('cf'),
      at: this.iso(),
      recordId,
      verdict: verdict === 'confirm' ? '确认' : '否认',
      ...(text ? { note: text } : {}),
    };
    await this.o.m15.addConfirmation(c);
    return c;
  }

  /** 所有闭环里教法强度的明显变化（程序算）。 */
  private async allIntensityChanges(): Promise<IntensityChange[]> {
    const out: IntensityChange[] = [];
    for (const x of this.hub.listSessions().filter((y) => y.kind === 'loop')) {
      out.push(...changesOf(x.sessionId, notesOf(await this.hub.records(x.sessionId))));
    }
    return out;
  }

  /** 附在一条 M10 / M15 记录描述后面的学习者异议（交给模型读；没有就是空串）。 */
  private objectionNotes(kind: 'm10' | 'm15', recordId: string): string {
    const rows = this.o.objections.forRecord(kind, recordId);
    return rows.map((o) => `\n  学习者异议（自述，原记录没改）：${o.text}`).join('');
  }

  // ───────────── 清单 ─────────────

  /**
   * 一次学习结束（01-流程.md §3）：① 存盘（已在 loop_ended）② 主对话里说一句 ③ 导航出选择卡
   * ④ ③ 之后（成或败）再起后台：状态整理与教法记录整理，不等它们。合上与没合上走同一条，只是触发原因不同。
   */
  private async afterLoop(loopId: string, closed: boolean): Promise<void> {
    const opened = await this.hub.opened(loopId);
    const mainId = opened.parent ?? (await this.ensureMain());
    const isFork = opened.fork !== undefined;
    try {
      // 分叉学习结束后回到父学习，不在主对话里出下一张卡
      if (!isFork) {
        await this.hub.send(mainId, {
          role: 'program',
          text: closed
            ? `“${opened.title}”合上了（学习者已确认）。下一张选择卡正在出，出好会贴在这里。`
            : `“${opened.title}”没合上就结束了。下一张选择卡正在出，出好会贴在这里。`,
        });
        const card = await this.requestCard(
          closed ? `合上：${opened.title}（${loopId}）` : `没合上：${opened.title}（${loopId}）`,
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
      console.error(`一次学习（${loopId}）结束后的清单失败：`, err);
      await this.hub.record(loopId, {
        type: 'after_loop_step',
        at: this.iso(),
        step: 'failed',
        detail: err instanceof Error ? err.message : String(err),
      });
    }
    // 分叉学习：不管前面的步骤成没成，都要回到父学习（否则父学习一直在等）；W3 删分叉时一并去掉
    if (isFork) {
      try {
        await this.detours.returnToParent(loopId, closed);
      } catch (err) {
        console.error(`分叉学习 ${loopId} 回父学习失败：`, err);
        await this.hub.record(loopId, {
          type: 'after_loop_step',
          at: this.iso(),
          step: 'failed',
          detail: `回父学习：${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }
    this.organizeStateLater(`一段学习（${loopId}）结束了`, loopId);
    this.background('M10 记录', () => this.recordStrategy(loopId));
  }

  // ───────────── 守卫 ─────────────

  private readonly verdicts = new Map<string, Omit<GuardVerdict, 'type' | 'at'>>();

  private async runGuard(loopId: string): Promise<GuardVerdict> {
    const opened = await this.hub.opened(loopId);
    const records = await this.hub.records(loopId);
    const guard = await this.hub.createSession('guard', { title: '守卫', parent: loopId });
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
    // 记守卫这一轮实际执行的模型（不是别名、不是适配器名；取不到时是它给的兜底串）
    const model = await this.hub.executedModel(guard.sessionId);
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
      model,
    };
  }

  private readonly guardTarget = new Map<string, NumberedRecord[]>();

  private verdictTool(guardId: string): ToolSpec {
    return {
      name: 'submit_verdict',
      description: '交回这次学习是否合上，并写下学习者实际表现出的理解。引用的行只能是学习者的行。',
      input: {
        closed: z.boolean(),
        basis: z.string().describe('一段话，引用写行号'),
        evidence_lines: z.array(z.number().int()).describe('学习者的行号'),
        understanding: z
          .array(
            z.object({
              text: z.string().describe('学习者实际表现出的理解，一句到几句'),
              lines: z.array(z.number().int()).describe('学习者的行号'),
              independence: z.enum(INDEPENDENCE),
              durability: z.enum(DURABILITY),
            }),
          )
          .optional()
          .describe('判合上时至少一条；判没合上时可写可不写'),
      },
      run: (a) => {
        const closed = a.closed as boolean;
        const basis = a.basis as string;
        const lines = a.evidence_lines as number[];
        const raw = a.understanding as Understanding[] | undefined;
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
        // 实际理解：行号核对同证据行；一条不过整次退回，什么都不收
        const understanding = raw ?? [];
        if (closed && understanding.length === 0) {
          return err('判合上必须写下学习者实际表现出的理解（understanding，至少一条）');
        }
        for (const u of understanding) {
          if (u.text.trim() === '') return err('每条理解都要写清学习者实际表现出的理解');
          if (u.lines.length === 0) return err('每条理解都要指回至少一行学习者的话');
          const notLearner = u.lines.filter((l) => !learner.has(l));
          if (notLearner.length > 0) {
            return err(
              `第 ${notLearner.join('、')} 行不是学习者说的话，理解只能指回学习者的行，重新提交`,
            );
          }
          if (!INDEPENDENCE.includes(u.independence)) {
            return err(`独立程度只能是 ${INDEPENDENCE.join(' / ')}，收到 ${u.independence}`);
          }
          if (!DURABILITY.includes(u.durability)) {
            return err(`持久程度只能是 ${DURABILITY.join(' / ')}，收到 ${u.durability}`);
          }
        }
        this.verdicts.set(guardId, {
          guardSessionId: guardId,
          closed,
          basis,
          lines,
          ...(raw === undefined ? {} : { understanding: raw }),
        });
        return ok('判定已收到');
      },
    };
  }

  // ───────────── M05 ─────────────

  private readonly cards = new Map<
    string,
    {
      options: ChoiceOption[];
      recommended: number;
      routeDecision: { decision: string; reason: string; basis: string[] };
    }
  >();

  private async m05Opening(trigger: string, mainId: string): Promise<string> {
    const main = (await this.hub.records(mainId)).map((r) => r.record);
    const goal = main.filter((r) => r.type === 'project_goal').at(-1);
    const loops = this.hub.listSessions().filter((s) => s.kind === 'loop' && s.parent === mainId);
    const learned = await this.learned.list(mainId);
    const { lines: loopStates, load } = await this.loopStatesText(loops, learned.learnings);
    const objections = this.o.objections.all().slice(-20);
    const scope = await this.scopeOf(mainId);
    const deadline = foldDeadline(main).deadline;
    return [
      `触发原因：${trigger}`,
      '',
      `方向目标：${goal?.type === 'project_goal' ? goal.text : '（还没有；按默认先验——高中以上、脱离应试——出临时选项，标“临时”）'}`,
      '',
      `期限：${deadline !== undefined ? this.deadlineText(foldDeadline(main)) : '没有记'}`,
      '',
      `资料范围：${scope !== undefined ? `项目选用了 ${String(scope.length)} 份资料：${scope.join('、')}。教材查询工具默认只在这些里查；学习者或你明确要时，传 all=true 查全库。` : '项目没选资料：查全库。'}`,
      '',
      `学过的记录（每次学习一行；合上的带守卫写下的实际理解，没合上的带结束原话与当时的路线决定）：\n${learned.learnings.length > 0 ? learned.learnings.map((l) => `- ${this.learned.describe(l)}`).join('\n') : '（空：冷启动，第一次学习选小的）'}`,
      '',
      ...(learned.imports.length > 0
        ? [
            `外部导入（学习者在系统之外学到的：畅谈里说的 / 笔记里写的；未验证，可信度低于学习记录，学习里的证据永远优先，可以怀疑，不算“已合上过”）：\n${learned.imports.map((x) => `- ${x.channel}：${'session' in x.ref ? `${x.ref.session} 第 ${x.ref.lines.join('、')} 行` : `笔记 ${x.ref.note}`}（未验证）`).join('\n')}`,
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
      ...(await this.longterm.m05Opening(mainId)),
      '学习者状态（M15）：要用时用 query_state 查；没有记录按无状态约束。',
    ].join('\n');
  }

  /**
   * 各闭环的状态行（含分叉来历、等分叉、停车记录），和“同时进行的闭环数 / 停车场”提示。
   * 只提示、不硬拦（M05:28 负荷预算与任务限流）；阈值属实现细节：没收尾的 ≥3 个算多，停车场 ≥3 条算堆积。
   */
  private async loopStatesText(
    loops: { sessionId: string; title: string }[],
    learnings: Learning[],
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
      // 没合上、且之后没有新点文字相同的一次合上的学习 = 缺口还没补上
      const unresolved =
        flags.ended?.closed === false &&
        (opened.ticket === undefined ||
          !learnings.some(
            (x) => x.status === '合上' && x.ticket.newPoint === opened.ticket?.newPoint,
          ));
      if (parking !== undefined && (unresolved || flags.shelved !== undefined)) {
        const text = `缺：${parking.missing
          .map((m) => (m.point !== undefined ? m.point : m.text))
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

  private cardTool(sessionId: string): ToolSpec {
    const ticketShape = z.object({
      new_point: z.string().describe('新点，一句话'),
      clause: z.string().describe('预期理解：出发点怎么接到新点，一两句'),
      start_points: z
        .array(
          z.object({
            point: z.string().describe('出发点，一句话'),
            source: z.enum(START_SOURCES).describe('来源：学过的记录 / 自述 / 假定'),
            ref: z.string().optional().describe('依据：学过的记录或自述写“会话 id:行号”'),
          }),
        )
        .describe('这次用的出发点（一个或几个）'),
      route_action: z.string().describe('继续主线 / 补前置 / 复习 / 复检 / 接着学 ……'),
      source_check: z
        .array(
          z.object({
            claim: z.string().describe('对资料核过的一条说法'),
            at: z.string().optional().describe('教材出处“书/文件:行号”'),
            model_added: z.boolean().optional().describe('资料里没有、模型补的'),
          }),
        )
        .optional()
        .describe('对资料核的结果；一条都没有就不填'),
      stage_check: z
        .boolean()
        .optional()
        .describe(
          '阶段验收：这个闭环是一次阶段验收（练习都按验收算、默认不给提示），不是学新内容或日常练习时填真；守卫照常判',
        ),
      revisit: z
        .object({
          kind: z.enum(REVISIT_KINDS),
          of_loop: z.string().describe('回看的是哪次学习（学习会话 id）'),
          verdict_line: z.number().int().optional().describe('那次学习里判定所在的行号'),
        })
        .optional()
        .describe(
          '复习 / 复检以前学过的东西时填：kind + 回看哪次学习（会话 id，可带判定行）；学新点不填',
        ),
      cross_domain: z
        .object({
          kind: z.enum(CROSS_KINDS),
          other_point: z.string().describe('另一边的点，一句话'),
          problem: z.string().describe('驱动这次学习的原问题，一句话'),
        })
        .optional()
        .describe(
          '跨领域选项才填：补习型（新点是学习者还没学过的那一边、原问题需要的前置）或对比链接型（另一边的点与学习者已经会了的那个结构相似）。只写这三项，领域自己判断、不用填',
        ),
      title: z.string().describe('给学习者看的一句话'),
      reason: z.string(),
      sources: z
        .array(z.string().min(1))
        .min(1)
        .describe(
          '这个选项从哪来，每条可回查：闭环原文“会话 id:行号”、书里“书名/文件:行号”（书名、文件照教材查询工具给的写）',
        ),
    });
    return {
      name: 'submit_choice_card',
      description: '交回 2–4 个候选单子与这次的路线决定，推荐其中一个（从 0 数）。只提交一次。',
      input: {
        options: z.array(ticketShape).min(2).max(4),
        recommended: z.number().int().min(0),
        route_decision: z.object({
          decision: z.string().describe('这次走哪条路（含“维持”），一句话'),
          reason: z.string().describe('为什么这样定'),
          basis: z
            .array(z.string())
            .min(1)
            .describe('理由的依据，每条“会话 id:行号”或“书/文件:行号”'),
        }),
      },
      run: async (a) => {
        if (this.cards.has(sessionId)) return err('已经提交过选择卡');
        // 假模型直接调 run、不经 zod（工单 README §4.2）：这里按“字段可能缺”的宽松形状收，逐条核
        const raw = a.options as {
          new_point?: string;
          clause?: string;
          start_points?: { point?: string; source?: string; ref?: string }[];
          route_action?: string;
          source_check?: { claim?: string; at?: string; model_added?: boolean }[];
          stage_check?: boolean;
          revisit?: { kind?: '复习' | '复检'; of_loop?: string; verdict_line?: number };
          cross_domain?: { kind?: string; other_point?: string; problem?: string };
          title?: string;
          reason?: string;
          sources?: string[];
        }[];
        const decision = a.route_decision as
          { decision?: string; reason?: string; basis?: string[] } | undefined;
        const problems: string[] = [];
        const blank = (s: unknown): boolean => typeof s !== 'string' || s.trim() === '';
        // 选项数 2–4 由上面的参数形状管（真模型经它）；这里只挡缺参数，免得下面读空
        if (!Array.isArray(raw)) return err('缺 options（2–4 个候选单子）');

        // 路线决定：必有，决定与理由非空，依据至少一条且每条都能定位
        const basis = Array.isArray(decision?.basis) ? decision.basis : [];
        if (blank(decision?.decision)) problems.push('路线决定缺 decision（这次走哪条路）');
        if (blank(decision?.reason)) problems.push('路线决定的 reason 不能是空的');
        if (basis.length === 0) problems.push('路线决定的 basis 至少给一条依据');
        for (const b of basis) {
          const at = await locate(b, this.locateDeps());
          if (!at.ok) problems.push(`路线决定的依据 ${b} 定位不了`);
        }

        const options: ChoiceOption[] = [];
        for (const [i, o] of raw.entries()) {
          const n = `第 ${String(i + 1)} 项`;
          const textFields: [string | undefined, string][] = [
            [o.new_point, 'new_point（新点）'],
            [o.clause, 'clause（预期理解）'],
            [o.route_action, 'route_action（路线动作）'],
            [o.title, 'title'],
            [o.reason, 'reason'],
          ];
          for (const [value, label] of textFields) {
            if (blank(value)) problems.push(`${n}的 ${label} 不能是空的`);
          }
          const sources = o.sources ?? [];
          if (sources.length === 0) problems.push(`${n}的 sources 至少给一条（这个选项从哪来）`);
          if (sources.some((x) => blank(x))) problems.push(`${n}的 sources 有空白条目`);
          const startPoints: Ticket['startPoints'] = [];
          for (const sp of o.start_points ?? []) {
            if (blank(sp.point)) problems.push(`${n}的出发点不能是空的`);
            if (
              sp.source === undefined ||
              !(START_SOURCES as readonly string[]).includes(sp.source)
            ) {
              problems.push(`${n}的出发点来源 ${sp.source} 不在 ${START_SOURCES.join(' / ')} 里`);
            }
            if (sp.ref !== undefined && sp.ref.trim() !== '') {
              const at = await locate(sp.ref, this.locateDeps());
              if (!at.ok) problems.push(`${n}的出发点依据 ${sp.ref} 定位不了`);
            }
            startPoints.push({
              point: sp.point ?? '',
              source: (sp.source ?? '假定') as (typeof START_SOURCES)[number],
              ...(sp.ref !== undefined && sp.ref.trim() !== '' ? { ref: sp.ref } : {}),
            });
          }
          const sourceCheck: Ticket['sourceCheck'] = [];
          for (const c of o.source_check ?? []) {
            if (blank(c.claim)) problems.push(`${n}的对资料核的结果缺 claim（核过的那条说法）`);
            if (c.at !== undefined && c.at.trim() !== '') {
              const at = await locate(c.at, this.locateDeps());
              if (at.kind !== 'book')
                problems.push(`${n}的出处 ${c.at} 不是书里的一行（要写 书/文件:行号）`);
              else if (!at.ok) problems.push(`${n}的出处 ${c.at} 定位不了`);
            }
            sourceCheck.push({
              claim: c.claim ?? '',
              ...(c.at !== undefined && c.at.trim() !== '' ? { at: c.at } : {}),
              ...(c.model_added === true ? { modelAdded: true } : {}),
            });
          }
          let crossDomain: Ticket['crossDomain'];
          if (o.cross_domain !== undefined) {
            if (
              o.cross_domain.kind === undefined ||
              !(CROSS_KINDS as readonly string[]).includes(o.cross_domain.kind)
            ) {
              problems.push(
                `${n}的跨领域类型 ${o.cross_domain.kind} 不在 ${CROSS_KINDS.join(' / ')} 里`,
              );
            }
            if (blank(o.cross_domain.other_point)) problems.push(`${n}的跨领域缺 other_point`);
            if (blank(o.cross_domain.problem)) problems.push(`${n}的跨领域缺 problem（原问题）`);
            crossDomain = {
              kind: (o.cross_domain.kind ?? '补习型') as (typeof CROSS_KINDS)[number],
              otherPoint: o.cross_domain.other_point ?? '',
              problem: o.cross_domain.problem ?? '',
            };
          }
          let revisit: Ticket['revisit'];
          if (o.revisit !== undefined) {
            if (blank(o.revisit.kind)) problems.push(`${n}的 revisit 缺 kind（复习 / 复检）`);
            if (blank(o.revisit.of_loop))
              problems.push(`${n}的 revisit 缺 of_loop（回看哪次学习）`);
            else {
              const bad = await this.revisitProblem(
                o.revisit.of_loop ?? '',
                o.revisit.verdict_line,
              );
              if (bad !== undefined) problems.push(`${n}：${bad}`);
            }
            revisit = {
              kind: o.revisit.kind ?? '复习',
              ofLoop: o.revisit.of_loop ?? '',
              ...(o.revisit.verdict_line === undefined
                ? {}
                : { verdictLine: o.revisit.verdict_line }),
            };
          }
          const ticket: Ticket = {
            newPoint: o.new_point ?? '',
            clause: o.clause ?? '',
            startPoints,
            routeAction: o.route_action ?? '',
            sourceCheck,
            ...(revisit !== undefined ? { revisit } : {}),
            ...(crossDomain !== undefined ? { crossDomain } : {}),
            ...(o.stage_check === true ? { stageCheck: true } : {}),
          };
          options.push({
            title: o.title ?? '',
            reason: o.reason ?? '',
            ...(o.sources !== undefined ? { sources: o.sources } : {}),
            ticket,
          });
        }
        const recommended = a.recommended as number;
        if (!Number.isInteger(recommended) || recommended < 0 || recommended >= raw.length) {
          problems.push('推荐的序号超出选项范围（从 0 数）');
        }
        if (problems.length > 0) return err(`${problems.join('；')}。改好后重新提交`);
        this.cards.set(sessionId, {
          options,
          recommended,
          routeDecision: {
            decision: decision?.decision ?? '',
            reason: decision?.reason ?? '',
            basis: [...basis],
          },
        });
        return ok('选择卡已收到');
      },
    };
  }

  private locateDeps(): LocateDeps {
    return { hub: this.hub, sources: this.o.sources };
  }

  /** 学习者给一本书 / 笔记补一句来源说明（只追加）。 */
  async addSourceNote(book: string, field: string, text: string): Promise<SourceNoteView> {
    await this.o.cross.addNote({ book, field, text, by: '学习者' });
    return this.o.cross.sourceNote(book);
  }

  /** 学习者给一条状态记录补“我的解释”：只追加，不改原记录；下次整理时当自述读到。 */
  async addStateExplanation(recordId: string, text: string): Promise<StateExplanationView> {
    if (this.o.m15.record(recordId) === undefined) {
      throw new BadRequestError(`找不到这条状态记录：${recordId}。`);
    }
    const t = text.trim();
    if (t === '') throw new BadRequestError('解释不能是空的。');
    const e = { id: this.newId('ex'), at: this.iso(), recordId, text: t };
    await this.o.m15.addExplanation(e);
    return e;
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
      ...this.longterm.mainTools(mainId),
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
        description:
          '列出这个项目里学过的记录：每次学习一行（合上的带守卫写下的实际理解与证据强度，没合上的带结束原话与当时的路线决定），以及外部导入（未验证）。',
        input: {},
        run: async () => {
          const body = await this.learned.list(mainId);
          const rows = body.learnings.map((l) => `- ${this.learned.describe(l)}`);
          const imports = body.imports.map(
            (x) =>
              `- ${x.channel}：${'session' in x.ref ? `${x.ref.session} 第 ${x.ref.lines.join('、')} 行` : `笔记 ${x.ref.note}`}（未验证，不算学会）`,
          );
          return ok(
            `学过的记录（每次学习一行）：\n${rows.join('\n') || '（还没有）'}${imports.length > 0 ? `\n\n外部导入（学习者自述 / 笔记，未验证，不算学会）：\n${imports.join('\n')}` : ''}`,
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
          if (
            opened?.parent !== mainId ||
            (opened.kind !== 'loop' && opened.kind !== 'talk' && opened.kind !== 'output')
          ) {
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
      this.o.outputs.mainTool(mainId),
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
              text: z.string().describe('学习者亲口说自己会 / 学过的是什么，一句话'),
              lines: z.array(z.number().int()).min(1).describe('学习者说这话的行号（本对话里）'),
            }),
          )
          .optional()
          .describe(
            '学习者亲口说自己已经会的东西（自述，未验证）：一句话 + 他说这话的行号；不猜、不对照知识点；没说就不填',
          ),
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
        // 学习者亲口说会的：写一句话 + 他说这话的行号；先全部核对，不过就整次退回、什么都不写
        const known = (a.known as { text: string; lines: number[] }[] | undefined) ?? [];
        const learner = learnerLines(recs);
        for (const k of known) {
          if (k.text.trim() === '') return err('known 里有一条没写学习者说会的是什么');
          if (k.lines.length === 0) return err('known 每条都要引学习者说这话的行号');
          const bad = k.lines.filter((l) => !learner.has(l));
          if (bad.length > 0) {
            return err(`known 里引的第 ${bad.join('、')} 行不是学习者说的话；只引学习者的行`);
          }
        }
        const at = this.iso();
        await this.hub.record(mainId, { type: 'project_goal', at, text: goal });
        await this.hub.record(mainId, { type: 'project_title', at, title, source: 'goal' });
        if (deadline !== undefined && deadline !== '') {
          await this.hub.record(mainId, { type: 'project_deadline', at, deadline });
        }
        // 外部导入：程序写原样指针（畅谈会话 + 学习者那几行），不经模型分析、不写“点亮了什么”
        for (const k of known) {
          await this.learned.addImport({
            channel: '畅谈',
            ref: { session: talkId, lines: k.lines },
          });
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
        description:
          '记这一轮的诊断（不给学习者看，守卫不读）。每轮先记诊断、再写给学习者的话；同时标这一轮打算用的教法强度（信息量 / 提示强度 / 挑战程度 / 节奏，各取一档，和偏输入还是偏练习），五项一起填。',
        input: { text: z.string().describe('观察、指回的行号、怀疑、还缺什么'), ...intensityInput },
        run: async (a) => {
          const parsed = parseIntensity(a);
          if (!parsed.ok) return err(`诊断没记：${parsed.error}`);
          await this.hub.record(loopId, {
            type: 'loop_note',
            at: this.iso(),
            text: a.text as string,
            ...(parsed.intensity ? { intensity: parsed.intensity } : {}),
          });
          return ok(
            parsed.intensity
              ? '已记'
              : '已记；这一轮没标教法强度（信息量 / 提示强度 / 挑战程度 / 节奏 / 偏向），下一轮请标上',
          );
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
            .describe('缺的出发点 / 想去的点（文字），不确定不填'),
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
      ...teachingToolSpecs(this.o.teaching),
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

  private async loopOpening(t: Ticket): Promise<string> {
    const revisit = await this.revisitOpening(t);
    const check = t.sourceCheck.map(
      (c) =>
        `- ${c.claim}${c.at !== undefined ? `（出处：${c.at}）` : ''}${c.modelAdded === true ? '（资料里没有，模型补的）' : ''}`,
    );
    return [
      ...revisit,
      '本闭环的单子：',
      this.describeTicket(t),
      '',
      '对资料核的结果：',
      check.length > 0 ? check.join('\n') : '（没核过）',
      '',
      ...this.practice.openingFacts(t),
      '学过的记录（以往的学习）、学习者状态（M15）与以前的教法记录（M10）：要用时查。',
      '',
      '现在开始这次学习：先简短说明这次学什么、从哪出发，然后开始。',
    ].join('\n');
  }

  /**
   * 复习 / 复检那次学习的开场：回看的是哪次学习（附它的单子与通过的判定：理解 + 证据强度）。
   * 不是复习 / 复检时为空。核对（revisitProblem）在交卡时已做，这里只写事实。
   */
  private async revisitOpening(t: Ticket): Promise<string[]> {
    const r = t.revisit;
    if (r === undefined) return [];
    const one = await this.learned.one(r.ofLoop).catch(() => undefined);
    if (one === undefined) return [];
    const verdict = one.verdict;
    const strengths = (verdict?.understanding ?? [])
      .map((u) => `${u.text}（${u.independence}、${u.durability}）`)
      .join('；');
    return [
      `这是一次${r.kind}，不是第一次学这个点：回看的是 ${r.ofLoop}「${one.title}」那次学习${r.verdictLine !== undefined ? `（判定在第 ${String(r.verdictLine)} 行）` : ''}。`,
      `那次的状态：${one.status}${one.endNote !== undefined ? `（学习者结束时的原话：${one.endNote}）` : ''}`,
      `那次的单子：新点 ${one.ticket.newPoint}；预期理解 ${one.ticket.clause}`,
      ...(verdict !== undefined
        ? [
            `那次通过的判定：${verdict.basis}${strengths !== '' ? `；实际表现出的理解：${strengths}` : ''}`,
          ]
        : ['那次没有判定。']),
      '',
    ];
  }

  /**
   * 复习 / 复检的单子指回的那次学习站不站得住（工单 §4.6）：`ofLoop` 是一次已结束的学习；
   * 给了 `verdictLine` 时那一行要是判定。站不住就返回一句话（交卡时整张卡退回）。
   */
  async revisitProblem(ofLoop: string, verdictLine?: number): Promise<string | undefined> {
    const opened = await this.hub.opened(ofLoop).catch((e: unknown) => {
      if (e instanceof NotFoundError) return undefined;
      throw e;
    });
    if (opened === undefined || opened.kind !== 'loop') {
      return `revisit 指的 ${ofLoop} 不是一次学习`;
    }
    const recs = await this.hub.records(ofLoop);
    if (!recs.some((r) => r.record.type === 'loop_ended')) {
      return `revisit 指的 ${ofLoop} 还没结束（复习 / 复检只看已经结束的那次）`;
    }
    if (verdictLine !== undefined) {
      const at = recs.find((r) => r.line === verdictLine)?.record;
      if (at?.type !== 'guard_verdict') {
        return `revisit 的 verdict_line ${String(verdictLine)} 不是 ${ofLoop} 里的一份判定`;
      }
    }
    return undefined;
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
    // 学习者在界面上对状态记录的确认 / 否认，也算上次整理之后的新记录
    const freshConfirmations = this.o.m15
      .allConfirmations()
      .filter((c) => lastRun === undefined || c.at > lastRun);
    // 学习者给状态记录补的“我的解释”，同样算上次整理之后的新记录
    const freshExplanations = this.o.m15
      .allExplanations()
      .filter((e) => lastRun === undefined || e.at > lastRun);
    // 没有新记录不整理（03「M15」）
    if (
      facts.newLearnerLines === 0 &&
      fresh.length === 0 &&
      freshConfirmations.length === 0 &&
      freshExplanations.length === 0 &&
      !force
    ) {
      return;
    }
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
        ...(freshConfirmations.length > 0
          ? [
              `学习者在界面上对状态记录的确认 / 否认（确认的来源档升为“已确认”，由程序记；否认的与原记录对不上，两边都留、标冲突）：\n${freshConfirmations.map((c) => `- ${c.recordId} ${c.verdict}${c.note ? `：${c.note}` : ''}`).join('\n')}`,
              '',
            ]
          : []),
        ...(freshExplanations.length > 0
          ? [
              `学习者给状态记录补的解释（自述；原记录没改，也不是对话原话，没有行号可引，所以不为它另写状态记录；体现在当前状态页里，明说“学习者自述”；与可观察事实对不上的两条都留、标冲突）：\n${freshExplanations.map((e) => `- ${e.recordId}：${e.text}`).join('\n')}`,
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
    const changes: IntensityChange[] = [];
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
      if (x.kind === 'loop') changes.push(...changesOf(x.sessionId, notesOf(recs)));
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
      ...(changes.length > 0
        ? [
            '',
            '教法强度明显变化（程序从教学侧每轮的强度标注算出，只给位置和哪一项怎么变，不含诊断内容）。某条状态出现在这之后时，写状态记录用 after_change 填变化编号，不确定就不填：',
            ...changes.map((c) => `- 变化编号：${c.id} · 一段学习 ${c.loopSessionId}：${c.text}`),
          ]
        : []),
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
          after_change: z
            .string()
            .optional()
            .describe(
              '这条状态出现在某次教法强度明显变化之后时，填开场列出的变化编号；不确定就不填',
            ),
        },
        run: async (a) => {
          const afterId = typeof a.after_change === 'string' ? a.after_change.trim() : '';
          const change =
            afterId === ''
              ? undefined
              : (await this.allIntensityChanges()).find((c) => c.id === afterId);
          if (afterId !== '' && change === undefined) {
            return err(`没有这个教法强度变化编号：${afterId}；只能填开场列出的变化编号`);
          }
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
            ...(change
              ? {
                  afterTeaching: {
                    changeId: change.id,
                    loopSessionId: change.loopSessionId,
                    line: change.line,
                    text: change.text,
                  },
                }
              : {}),
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
    {
      loopId: string;
      lines: Set<number>;
      toolsUsed: string[];
      toolUses: { name: string; line: number }[];
      trend: ReturnType<typeof trendOf>;
      /** 开场列出的“带标注”状态记录；有就必须写自查。 */
      annotatedStateIds: string[];
    }
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
    // 用了哪份教学工具由程序从工具调用里读（03「教学工具怎么落」），不靠模型自报
    const toolUses = toolUsesOf(records);
    const toolsUsed = [...new Set(toolUses.map((u) => u.name))];
    const trend = trendOf(notesOf(records));
    // M10 对状态成因的自查：状态记录里有“出现在某次教法强度变化之后”标注的，先查自己的教法是不是成因
    const annotated = this.o.m15
      .allRecords()
      .filter((r) => r.afterTeaching !== undefined)
      .slice(-5);
    const s = await this.hub.createSession('m10', { title: '记教法效果', parent: loopId });
    this.strategyTargets.set(s.sessionId, {
      loopId,
      lines: new Set(records.map((r) => r.line)),
      toolsUsed,
      toolUses,
      trend,
      annotatedStateIds: annotated.map((r) => r.id),
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
        `教学工具使用记录（程序从工具调用里记的）：${toolUses.map((u) => `L${String(u.line)} ${u.name}`).join('、') || '这个闭环没取用教学工具，只能从对话原文看用了什么做法'}`,
        '',
        `教法强度走向（程序汇总闭环里每轮诊断标的四项 + 偏向）：\n${trend ? describeTrend(trend) : '（诊断里没标强度）'}`,
        '',
        ...(annotated.length > 0
          ? [
              `状态记录里带“出现在 X 之后”标注的（先自查：自己的教法是不是这些状态的成因，不要直接当作学习者固有的状态；提交时 self_check 里写自查）：\n${annotated.map((r) => this.o.m15.describeRecord(r)).join('\n')}`,
              '',
            ]
          : []),
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
        self_check: z
          .string()
          .optional()
          .describe('开场列了带“出现在 X 之后”标注的状态记录时必填：自查自己的教法是不是成因'),
      },
      run: async (a) => {
        const target = this.strategyTargets.get(m10Id);
        if (!target) return err('找不到要记的闭环');
        const selfCheck = typeof a.self_check === 'string' ? a.self_check.trim() : '';
        if (target.annotatedStateIds.length > 0 && selfCheck === '') {
          return err(
            '开场列了带“出现在 X 之后”标注的状态记录：先自查自己的教法是不是成因，写进 self_check 再提交',
          );
        }
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
          ...(target.toolUses.length > 0 ? { toolUses: target.toolUses } : {}),
          ...(target.trend ? { intensityTrend: target.trend } : {}),
          ...(selfCheck !== ''
            ? { selfCheck: { stateIds: target.annotatedStateIds, note: selfCheck } }
            : {}),
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
      .map((s) => `${s.point}（来源：${s.source}${s.ref !== undefined ? `，依据 ${s.ref}` : ''}）`)
      .join('；');
    const cross =
      t.crossDomain !== undefined
        ? `；跨领域（${t.crossDomain.kind}）：另一边 ${t.crossDomain.otherPoint}；原问题：${t.crossDomain.problem}`
        : '';
    return `新点 ${t.newPoint}；预期理解 ${t.clause}；出发点 ${starts || '（无）'}；路线动作：${t.routeAction}${cross}`;
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

  /** 资料范围的说明，接在工具结果后面：只搜了项目选用的，要全库传 all。 */
  private scopeHint(scope: string[] | undefined): string {
    return scope !== undefined
      ? `\n（只在项目选用的 ${String(scope.length)} 份资料里查；要查全库传 all=true）`
      : '';
  }

  /** 只读查询工具：资料原文与出处（按记录/读写权限.md）；默认只查项目选的资料（没选 = 全库）。 */
  private readTools(sessionId: string, opt: { m07?: boolean } = {}): ToolSpec[] {
    const allParam = z
      .boolean()
      .optional()
      .describe('true = 查整个书库，不限项目选用的资料（学习者或你明确要时才用）');
    const tools: ToolSpec[] = [];
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
            return ok((await this.o.m07.index(book)) + (await this.o.cross.noteLines([book])));
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
              (r.lines.length === 0
                ? `（这个文件共 ${String(r.total)} 行，没有第 ${String((a.from_line as number | undefined) ?? 1)} 行起的内容）`
                : `${body}\n\n（引用上面的话时，在那句话后附：${formatCitation({ book, file, from: r.from, to: r.to })}，行段按你实际引用的缩小）`) +
                (await this.o.cross.noteLines([book])),
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
              `共 ${String(r.total)} 段命中，列出前 ${String(r.hits.length)}：\n${rows.join('\n')}${this.scopeHint(scope)}${await this.o.cross.noteLines(r.hits.map((h) => h.book))}`,
            );
          },
        },
      );
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
