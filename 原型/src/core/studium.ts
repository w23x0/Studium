// Studium 的闭环外：按事件跑清单（03「闭环外：事件与清单」「收口与闭环守卫」）。
// 每种会话的系统提示与工具在这里给；写权限靠给什么工具来卡（03「读写权限」）。
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { formatCitation } from '../shared/citation.ts';
import { CONVERSATION_KIND_LABELS } from '../shared/protocol.ts';
import type {
  ProjectDeadlineResponse,
  ProjectMaterialsResponse,
  ProjectMaterialView,
  RouteDeviationView,
  SourceNoteView,
  StateExplanationView,
} from '../shared/protocol.ts';
import { CROSS_KINDS } from '../shared/records-cross.ts';
import {
  DIAGNOSIS_TAG,
  DURABILITY,
  INDEPENDENCE,
  START_SOURCES,
  type ChoiceCard,
  type ChoiceOption,
  type ConversationKind,
  type GoalAbility,
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
import { currentGoal, describeGoal, goalText } from './goal.ts';
import { Learned } from './learned.ts';
import type { Learning } from '../shared/protocol-learned.ts';
import { LongTerm } from './longterm.ts';
import { routeDeviations } from './route-deviations.ts';
import { REVISIT_KINDS } from '../shared/records-longterm.ts';
import { NotFoundError, type Hub, type KindConfig } from './hub.ts';
import { foldLoop } from './loop-state.ts';
import type { Library } from './knowledge/m07.ts';
import type { Sources } from './sources.ts';
import type { M10 } from './knowledge/m10.ts';
import type { Objections } from './knowledge/objections.ts';
import { STAGES, type M15, type StateConfirmation } from './knowledge/m15.ts';
import { toolUsesOf, type TeachingTools } from './teaching-tools.ts';
import { locate, type LocateDeps } from './locate.ts';
import type { SandboxSpec, ToolResult, ToolSpec } from './model/port.ts';
import type { Outputs } from './outputs.ts';
import { describeSandbox, Sandboxes } from './sandbox.ts';
import { currentTicket } from './ticket.ts';
import { guardView, learnerLines, renderTranscript } from './transcript.ts';

export class BadRequestError extends Error {}

/** 学习者离开多久算“隔了一阵回来”，回来时程序追加离开多久。 */
/** 出发点的来源（学过的记录 / 自述 / 假定）。 */
type StartSource = (typeof START_SOURCES)[number];

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
  /** 每个主对话一条：路线决定与卡排队写。 */
  private readonly routeChains = new Map<string, Promise<unknown>>();

  /** 长期功能：复习 / 复检、阶段复盘、提醒与今天该做的。 */
  readonly longterm: LongTerm;

  /** 学过的记录（按层读每次学习）与外部导入存放处。 */
  readonly learned: Learned;

  /** 学习对话与检索子代理的沙盒（只读的资料与记录、可写的工作区）。 */
  private readonly sandboxes: Sandboxes;

  constructor(private readonly o: StudiumOptions) {
    this.now = o.now ?? (() => new Date());
    this.learned = new Learned({
      hub: () => this.hub,
      dir: o.dataDir,
      newId: (prefix) => this.newId(prefix),
      iso: () => this.iso(),
    });
    this.sandboxes = new Sandboxes({
      hub: () => this.hub,
      learned: this.learned,
      m07: o.m07,
      m10: o.m10,
      m15: o.m15,
      objections: o.objections,
      teaching: o.teaching,
      dataDir: o.dataDir,
      scopeOf: (id) => this.scopeOf(id),
    });
    this.longterm = new LongTerm({
      hub: () => this.hub,
      learned: this.learned,
      m15: o.m15,
      now: () => this.now(),
      iso: () => this.iso(),
      newId: (prefix) => this.newId(prefix),
      projectOf: (id) => this.projectOf(id),
      stateQueryTool: () => this.stateQueryTool(),
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

  /** 程序生成的编号（选择卡、M15 / M10 记录等）；录带按生成顺序给它们稳定记号。 */
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
    ...(kind === 'main'
      ? {
          rebuild: (sessionId: string, inputLine: number) => this.mainPreface(sessionId, inputLine),
        }
      : {}),
    // 畅谈与导航可联网搜索；其余会话不放开（工单 W5 §4.6）
    ...(kind === 'talk' || kind === 'm05' ? { webSearch: true } : {}),
    ...(kind === 'loop'
      ? {
          sandbox: (sessionId: string) => this.sandboxes.forLoop(sessionId),
          beforeTurn: (sessionId: string) => this.sandboxes.refreshLoop(sessionId),
        }
      : {}),
    ...(kind === 'retrieve'
      ? { sandbox: (sessionId: string) => this.retrieveSandbox(sessionId) }
      : {}),
    tools: (sessionId) => {
      switch (kind) {
        case 'main':
          return this.mainTools(sessionId);
        case 'talk':
          // 同一类会话两种活：谈方向；阶段复盘（finish_review 只在复盘会话里可用）
          return [
            ...this.readTools(sessionId),
            this.listLearnedTool(sessionId),
            this.settleGoalTool(sessionId),
            ...this.longterm.reviewTools(sessionId),
          ];
        case 'loop':
          // 学习对话在沙盒里跑（只读资料与记录、可写工作区），工具只剩两个命令
          return this.loopTools(sessionId);
        case 'guard':
          return [...this.readTools(sessionId), this.verdictTool(sessionId)];
        case 'm05':
          // 导航：出下一次学习的选择卡（会话/导航.md「能读什么 · 工具」）
          return [
            ...this.readTools(sessionId),
            this.readSessionTool(),
            this.stateQueryTool(),
            this.retrieveTool(sessionId),
            this.cardTool(sessionId),
            ...this.longterm.reminderTools(sessionId),
            this.o.cross.addNoteTool(sessionId),
          ];
        case 'retrieve':
          // 检索子代理：在只读沙盒里自己读，只挂交回结果这一个工具（工单 README §2.7）
          return [this.findingsTool(sessionId)];
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

  /** 会联网搜索的会话种类；外发披露只从这里取，不另写一份名单（工单 W5 §4.6）。 */
  webSearchKinds(): ConversationKind[] {
    return (Object.keys(CONVERSATION_KIND_LABELS) as ConversationKind[]).filter(
      (k) => this.kind(k).webSearch === true,
    );
  }

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
      const numbered = await this.hub.records(m.sessionId);
      const recs = numbered.map((r) => r.record);
      const goal = currentGoal(numbered);
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
        ...(goal !== undefined ? { goal: goal.goal.text } : {}),
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

  /** 路线偏差（现算，不另存）；项目不存在 / 不是项目 → 404。 */
  async routeDeviations(mainId: string): Promise<RouteDeviationView[]> {
    const opened = await this.hub.opened(mainId).catch((e: unknown) => {
      if (e instanceof NotFoundError) return undefined;
      throw e;
    });
    if (opened?.kind !== 'main') throw new NotFoundError(`没有这个项目：${mainId}`);
    return routeDeviations(this.hub, mainId);
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
    const meta = { ...(images !== undefined && images.length > 0 ? { images } : {}) };
    const recs = await this.hub.records(sessionId);
    if (recs.some((r) => r.record.type === 'loop_ended' || r.record.type === 'talk_ended')) {
      throw new BadRequestError('这段对话已经结束了，回到项目里接着聊。');
    }
    // 搁置着的一次学习里学习者又说话 = 接着学（先恢复，再交这句话）
    if (foldLoop(recs).shelved !== undefined) await this.resumeShelved(sessionId, 'message');
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
    if (!card) throw new Error('导航没有提交选择卡（见该会话记录）');
    // 每次出卡先写一条路线决定，紧接着写卡（记录/单子与路线.md「路线决定与理由」）；
    // 同一主对话的几次出卡排队写，决定与卡才相邻、取代链不断
    return this.inRouteOrder(mainId, async () => {
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
    });
  }

  private inRouteOrder<T>(mainId: string, f: () => Promise<T>): Promise<T> {
    const run = (this.routeChains.get(mainId) ?? Promise.resolve()).then(f);
    this.routeChains.set(
      mainId,
      run.catch(() => undefined),
    );
    return run;
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

    // 接着学：带上原学习（原学习正本不改）
    let resumeOf: { fromLoop: string; endedAt: string } | undefined;
    if (picked.ticket.resumeOf !== undefined) {
      const origId = picked.ticket.resumeOf;
      const ended = (await this.hub.records(origId)).find((r) => r.record.type === 'loop_ended');
      const at =
        ended?.record.type === 'loop_ended' ? ended.record.at : (await this.hub.opened(origId)).at;
      resumeOf = { fromLoop: origId, endedAt: at };
    }
    const loop = await this.hub.createSession('loop', {
      title: picked.title,
      parent: mainId,
      ticket: picked.ticket,
      ...(resumeOf !== undefined ? { resumeOf } : {}),
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
      text: await this.loopOpening(picked.ticket, loop.sessionId),
    });
    return loop.sessionId;
  }

  // ───────────── 改单子（学习者侧）─────────────

  /**
   * 学习者改这次学习的单子（工单 W6 §4.1；记录/单子与路线.md「单子」规矩“可见可改”）：
   * 合格就追加一条 `ticket_edited`（改前、改后、时间），把改动告诉学习对话，回改后的整张单子；
   * 不合格什么都不写。开学习那行与卡上那张都不改（只追加）。
   */
  async editTicket(
    loopId: string,
    body: { newPoint?: unknown; clause?: unknown; startPoints?: unknown },
  ): Promise<{ line: number; ticket: Ticket }> {
    const opened = await this.hub.opened(loopId).catch((err: unknown) => {
      if (err instanceof NotFoundError) throw new NotFoundError(`没有这个会话：${loopId}`);
      throw err;
    });
    if (opened.kind !== 'loop') throw new BadRequestError('只能改一次学习的单子。');
    const records = await this.hub.records(loopId);
    if (records.some((r) => r.record.type === 'loop_ended')) {
      throw new BadRequestError('这次学习已经结束了，单子不能再改。');
    }
    const before = currentTicket(records);
    if (before === undefined) throw new BadRequestError('这次学习没有单子，改不了。');
    const after: Ticket = { ...before };
    let given = 0;
    if (body.newPoint !== undefined) {
      after.newPoint = ticketText('要学的', body.newPoint);
      given += 1;
    }
    if (body.clause !== undefined) {
      after.clause = ticketText('学完应该能', body.clause);
      given += 1;
    }
    if (body.startPoints !== undefined) {
      after.startPoints = await this.checkedStartPoints(body.startPoints);
      given += 1;
    }
    if (given === 0)
      throw new BadRequestError('没有给要改的项：可以改要学的、学完应该能、从哪些已有的出发。');
    if (JSON.stringify(before) === JSON.stringify(after)) {
      throw new BadRequestError('和现在的单子一样，没有改动。');
    }
    const line = await this.hub.record(loopId, {
      type: 'ticket_edited',
      at: this.iso(),
      by: 'learner',
      before,
      after,
    });
    await this.hub.send(loopId, {
      role: 'program',
      text: [
        `学习者改了这次要学的内容（第 ${String(line)} 行），之后按改后的来。`,
        `改前：${this.describeTicket(before)}`,
        `改后：${this.describeTicket(after)}`,
      ].join('\n'),
    });
    return { line, ticket: after };
  }

  /** 出发点数组的核对：至少一项；每项写清是什么、从哪来；给了依据要能定位（同选择卡的规则）。 */
  private async checkedStartPoints(v: unknown): Promise<Ticket['startPoints']> {
    if (!Array.isArray(v) || v.length === 0) {
      throw new BadRequestError('从哪些已有的出发要给一项以上，每项写清是什么、从哪来。');
    }
    const out: Ticket['startPoints'] = [];
    for (const [i, one] of v.entries()) {
      const x = one as { point?: unknown; source?: unknown; ref?: unknown };
      const where = `第 ${String(i + 1)} 个出发点`;
      if (typeof x.point !== 'string' || x.point.trim() === '') {
        throw new BadRequestError(`${where}没写清是什么。`);
      }
      const source = x.source as StartSource | undefined;
      if (typeof source !== 'string' || !START_SOURCES.includes(source)) {
        throw new BadRequestError(
          `${where}的“从哪来”只能是 ${START_SOURCES.join(' / ')} 里的一个。`,
        );
      }
      if (x.ref !== undefined && typeof x.ref !== 'string') {
        throw new BadRequestError(`${where}的依据要写成文字。`);
      }
      if (typeof x.ref === 'string') {
        const at = await locate(x.ref, this.locateDeps());
        if (!at.ok) throw new BadRequestError(`${where}的依据「${x.ref}」查不到，改一下或去掉。`);
      }
      out.push({
        point: x.point.trim(),
        source: source,
        ...(typeof x.ref === 'string' ? { ref: x.ref } : {}),
      });
    }
    return out;
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

  /** 学习者要结束、没合上：不开守卫，导航读那次完整对话出下一张卡（01-流程.md §3）。 */
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

  // ───────────── 搁置与恢复（一次学习自己的状态）─────────────

  /** 学习者把一次学习搁置（可恢复；与“结束（没合上）”不同）。 */
  async shelveLoop(loopId: string, note: string): Promise<void> {
    const opened = await this.hub.opened(loopId);
    if (opened.kind !== 'loop') throw new BadRequestError('这段对话不是一次学习任务。');
    const flags = foldLoop(await this.hub.records(loopId));
    if (flags.ended !== undefined) throw new BadRequestError('这次学习已经结束了。');
    if (flags.shelved !== undefined) throw new BadRequestError('这次学习已经搁置着了。');
    await this.hub.record(loopId, { type: 'loop_shelved', at: this.iso(), note });
  }

  /** 学习者点“接着学”，恢复搁置的那次学习。 */
  resumeLoop(loopId: string): Promise<void> {
    return this.resumeShelved(loopId, 'button');
  }

  /** 恢复搁置的那次学习（by = message 时是学习者在里面又说话了）；先把“恢复了”交给学习对话。 */
  private async resumeShelved(loopId: string, by: 'button' | 'message'): Promise<void> {
    const opened = await this.hub.opened(loopId);
    if (opened.kind !== 'loop') throw new BadRequestError('这段对话不是一次学习任务。');
    const flags = foldLoop(await this.hub.records(loopId));
    if (flags.ended !== undefined) throw new BadRequestError('这次学习已经结束了。');
    if (flags.shelved === undefined) throw new BadRequestError('这次学习没有搁置。');
    await this.hub.record(loopId, { type: 'loop_resumed', at: this.iso(), by });
    await this.hub.send(loopId, {
      role: 'program',
      text: `学习者回来接着学（它在 ${flags.shelved.at} 被搁置：${flags.shelved.note}）。先简短接上：回到哪里、接着做什么。`,
    });
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

  /**
   * “这条状态出现在某段学习里某句教学之后”的核对（工单 W4 §5.11）：会话须是一次学习，
   * 行须是那次学习里的一句教学（assistant_message）；不然退回。
   */
  private async checkAfterTeaching(a: {
    session?: string;
    line?: number;
    note?: string;
  }): Promise<{ loopSessionId: string; line: number; text: string } | { problem: string }> {
    const id = (a.session ?? '').trim();
    const note = (a.note ?? '').trim();
    if (id === '') return { problem: 'after_teaching.session 不能是空的' };
    if (note === '') return { problem: 'after_teaching.note 要写清这条状态出现在什么之后' };
    const opened = await this.hub.opened(id).catch((e: unknown) => {
      if (e instanceof NotFoundError) return undefined;
      throw e;
    });
    if (opened?.kind !== 'loop')
      return { problem: `after_teaching.session 指的 ${id} 不是一次学习` };
    const line = a.line;
    if (typeof line !== 'number') return { problem: 'after_teaching.line 要填那句教学的行号' };
    const rec = (await this.hub.records(id)).find((r) => r.line === line)?.record;
    if (rec?.type !== 'assistant_message') {
      return { problem: `第 ${String(line)} 行不是那次学习里的一句教学；只引教学行` };
    }
    return { loopSessionId: id, line, text: note };
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
    const trigger = this.loopEndTrigger(opened.title, loopId, closed, opened.ticket?.returnTo);
    try {
      await this.hub.send(mainId, {
        role: 'program',
        text: closed
          ? `“${opened.title}”合上了（学习者已确认）。下一张卡正在出，出好会贴在这里。`
          : `“${opened.title}”没合上就结束了。下一张卡正在出，出好会贴在这里。`,
      });
      const card = await this.requestCard(trigger, mainId);
      await this.hub.record(loopId, {
        type: 'after_loop_step',
        at: this.iso(),
        step: 'card_ready',
        detail: card.cardId,
      });
    } catch (err) {
      console.error(`一次学习（${loopId}）结束后的清单失败：`, err);
      await this.hub.record(loopId, {
        type: 'after_loop_step',
        at: this.iso(),
        step: 'failed',
        detail: err instanceof Error ? err.message : String(err),
      });
    }
    this.organizeStateLater(`一段学习（${loopId}）结束了`, loopId);
    this.background('教法记录整理', () => this.recordStrategy(loopId));
  }

  /** 触发原因（工单 §4.4）：补前置合上 / 合上 / 没合上，各带那次学习的标题与 id。 */
  private loopEndTrigger(
    title: string,
    loopId: string,
    closed: boolean,
    returnTo: string | undefined,
  ): string {
    if (!closed) return `没合上：${title}（${loopId}）`;
    return returnTo !== undefined
      ? `补前置合上：${title}（${loopId}）`
      : `合上：${title}（${loopId}）`;
  }

  // ───────────── 守卫 ─────────────

  private readonly verdicts = new Map<string, Omit<GuardVerdict, 'type' | 'at'>>();

  private async runGuard(loopId: string): Promise<GuardVerdict> {
    const records = await this.hub.records(loopId);
    const guard = await this.hub.createSession('guard', { title: '守卫', parent: loopId });
    this.guardTarget.set(guard.sessionId, records);
    // 守卫按收口那一刻的单子判：学习者改过就用改后的（工单 W6 §9）
    const ticket = currentTicket(records);
    await this.hub.send(guard.sessionId, {
      role: 'program',
      text: [
        '要判的这次学习的单子：',
        ticket ? this.describeTicket(ticket) : '（缺单子）',
        '',
        '这次学习的对话（L 后是行号；只放学习者看得到的与程序事实，模型一侧的诊断与沙盒动作不给）：',
        guardView(records),
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

  /**
   * 导航开场（会话/导航.md「开场给什么」；工单 §4.3）：触发原因、方向目标、期限、资料范围、
   * 路线事实（最近 5 张卡与路线决定）、停车场、学过的记录上 / 中层、其他。
   * 没合上触发时附那次完整对话；补前置合上触发时附原学习的上层。
   */
  private async m05Opening(trigger: string, mainId: string): Promise<string> {
    const records = await this.hub.records(mainId);
    const main = records.map((r) => r.record);
    const goal = currentGoal(records);
    const learned = await this.learned.list(mainId);
    const parked = await this.learned.parked(mainId);
    const devs = (await routeDeviations(this.hub, mainId)).slice(-5);
    const objections = this.o.objections.all().slice(-20);
    const scope = await this.scopeOf(mainId);
    const deadline = foldDeadline(main).deadline;
    const elsewhere = (await this.learned.all()).length - learned.learnings.length;

    // ── 路线事实：最近 5 张卡（卡、它的路线决定、各选项、学习者选了哪项）──
    const cardLines: string[] = [];
    for (const { line, record } of records
      .filter((r) => r.record.type === 'choice_card')
      .slice(-5)) {
      if (record.type !== 'choice_card') continue;
      const rd = records.find(
        (r) => r.record.type === 'route_decision' && r.record.navSessionId === record.m05SessionId,
      );
      const made = records.find(
        (r) => r.record.type === 'choice_made' && r.record.cardId === record.cardId,
      );
      cardLines.push(
        `- 卡 ${record.cardId}（主对话 L${String(line)}，${record.at.slice(0, 10)}）触发：${record.trigger}`,
      );
      if (rd?.record.type === 'route_decision') {
        cardLines.push(
          `  路线决定 L${String(rd.line)}：${rd.record.decision}（理由：${rd.record.reason}；依据：${rd.record.basis.join('、')}）`,
        );
      }
      record.options.forEach((o, i) => {
        const chosen =
          made?.record.type === 'choice_made' && made.record.option === i
            ? `；学习者选了 → 学习 ${made.record.loopSessionId}`
            : '';
        cardLines.push(
          `  ${String(i)}「${o.title}」${o.ticket.newPoint}${i === record.recommended ? '（推荐）' : ''}${chosen}`,
        );
      });
      if (made?.record.type !== 'choice_made') cardLines.push('  还没选');
    }

    // ── 学过的记录：最近 20 次 + 总数；别的项目里的学习也要能看到（不按项目划界）──
    const recent = learned.learnings.slice(-20).reverse();
    const learnedLines =
      recent.length > 0
        ? recent.map((l) => `- ${this.learned.line(l)}`)
        : ['（空：冷启动，第一次学习选小的）'];
    const total = learned.learnings.length;
    const totalLine =
      total > 20
        ? `共 ${String(total)} 次，这里只列最近 20 次；更早的用 retrieve 查`
        : `共 ${String(total)} 次`;
    const elseLine =
      elsewhere > 0 ? [`别的项目里还有 ${String(elsewhere)} 次学习，要用时用 retrieve 查`] : [];

    const appended: string[] = [];
    const unclosedId = /^没合上：.*（([A-Za-z0-9_-]+)）\s*$/.exec(trigger)?.[1];
    if (unclosedId !== undefined) {
      appended.push(
        '',
        `── 那次学习的完整对话（${unclosedId}，带行号）──`,
        renderTranscript(await this.hub.records(unclosedId)),
      );
    }
    const returnedId = /^补前置合上：.*（([A-Za-z0-9_-]+)）\s*$/.exec(trigger)?.[1];
    if (returnedId !== undefined) {
      const returnTo = (await this.hub.opened(returnedId)).ticket?.returnTo;
      if (returnTo !== undefined) {
        const endLine = (await this.hub.records(returnTo)).find(
          (r) => r.record.type === 'loop_ended',
        )?.line;
        const orig = await this.learned.one(returnTo);
        appended.push(
          '',
          `── 原来那次学习（${returnTo}）的上层 ──`,
          `- ${this.learned.parkedLine({ learning: orig, ...(endLine !== undefined ? { endLine } : {}) })}`,
        );
      }
    }

    return [
      `触发原因：${trigger}`,
      '',
      goal !== undefined
        ? describeGoal(goal.goal)
        : '方向目标：（还没有；按默认先验——高中以上、脱离应试——出临时选项，标“临时”）',
      '',
      `期限：${deadline !== undefined ? this.deadlineText(foldDeadline(main)) : '没有记'}`,
      '',
      `资料范围：${scope !== undefined ? `项目选用了 ${String(scope.length)} 份资料：${scope.join('、')}。教材查询工具默认只在这些里查；学习者或你明确要时，传 all=true 查全库。` : '项目没选资料：查全库。'}`,
      '',
      '── 路线事实（最近 5 张卡）──',
      cardLines.join('\n') || '（还没有）',
      '',
      '── 停车场（没合上的学习，上层）──',
      parked.map((p) => `- ${this.learned.parkedLine(p)}`).join('\n') || '空',
      '',
      '── 学过的记录（上层 / 中层）──',
      ...learnedLines,
      totalLine,
      ...elseLine,
      '',
      ...(learned.imports.length > 0
        ? [
            `外部导入（学习者在系统之外学到的：畅谈里说的 / 笔记里写的；未验证，可信度低于学习记录，学习里的证据永远优先，可以怀疑，不算“已合上过”）：\n${learned.imports.map((x) => `- ${x.channel}：${'session' in x.ref ? `${x.ref.session} 第 ${x.ref.lines.join('、')} 行` : `笔记 ${x.ref.note}`}（未验证）`).join('\n')}`,
            '',
          ]
        : []),
      '── 其他 ──',
      `提醒（还没办的）：${
        (await this.longterm.reminderViews(mainId)).filter((r) => r.closed === undefined).length > 0
          ? '\n' +
            (await this.longterm.reminderViews(mainId))
              .filter((r) => r.closed === undefined)
              .map(
                (r) =>
                  `- ${r.id} ${r.due}${r.isDue ? '（已到期）' : `（还有 ${String(daysBetween(this.today(), r.due))} 天）`} ${r.text}`,
              )
              .join('\n')
          : '没有'
      }`,
      `最近的路线偏差（事实，不是结论）：${
        devs.length > 0
          ? '\n' + devs.map((d) => `- ${d.at.slice(0, 10)} ${d.kind}：${d.text}`).join('\n')
          : '（没有）'
      }`,
      ...(objections.length > 0
        ? [
            `学习者提过的异议（自述；没有改原记录，选单子时参考）：\n${objections.map((o) => `- ${this.o.objections.describe(o)}`).join('\n')}`,
          ]
        : []),
      '学习者状态：要用时用 query_state 查；没有记录按无状态约束。',
      ...appended,
    ].join('\n');
  }

  private today(): string {
    return this.iso().slice(0, 10);
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
          '阶段验收：这次学习是一次阶段验收（练习都按验收算、默认不给提示），不是学新内容或日常练习时填真；守卫照常判',
        ),
      return_to: z
        .string()
        .optional()
        .describe('补前置：合上后回到哪次学习（学习会话 id）；不是补前置不填'),
      resume_of: z
        .string()
        .optional()
        .describe('接着学：接着哪次没合上的学习（学习会话 id）；不是接着学不填'),
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
          '这个选项从哪来，每条可回查：学习对话原文“会话 id:行号”、书里“书名/文件:行号”（书名、文件照教材查询工具给的写）',
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
          return_to?: string;
          resume_of?: string;
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
          const navMain = await this.projectOf(sessionId);
          let returnTo: string | undefined;
          if (o.return_to !== undefined && o.return_to.trim() !== '') {
            const bad = await this.returnProblem(o.return_to, navMain);
            if (bad !== undefined) problems.push(`${n}：${bad}`);
            else returnTo = o.return_to;
          }
          let resumeOf: string | undefined;
          if (o.resume_of !== undefined && o.resume_of.trim() !== '') {
            const bad = await this.resumeProblem(o.resume_of, navMain);
            if (bad !== undefined) problems.push(`${n}：${bad}`);
            else resumeOf = o.resume_of;
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
            ...(returnTo !== undefined ? { returnTo } : {}),
            ...(resumeOf !== undefined ? { resumeOf } : {}),
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

  /** 读一次会话的对话原文（带行号）；状态整理、导航、检索子代理三处共用（工单 §4.6）。 */
  private readSessionTool(): ToolSpec {
    return {
      name: 'read_session',
      description:
        '读某个会话（项目主对话 / 谈方向 / 一次学习）里学习者与教学的对话原文，带行号与时间；不含诊断记录与判定。',
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
    };
  }

  // ───────────── 检索子代理（工单 README §2.7、W4 §5.9）─────────────

  private readonly findings = new Map<string, { text: string; ref: string }[]>();

  /** 检索子代理的沙盒：只读的学过的记录与导航所属项目范围内的资料（它不写）。 */
  private async retrieveSandbox(sessionId: string): Promise<SandboxSpec | undefined> {
    const navId = (await this.hub.opened(sessionId)).parent;
    if (navId === undefined) return undefined;
    return this.sandboxes.forRetrieve(sessionId, navId);
  }

  /** 导航派检索子代理：另开一个会话去找底层证据，只拿回核过的几条。 */
  private retrieveTool(navId: string): ToolSpec {
    return {
      name: 'retrieve',
      description:
        '上层（学过的记录：单子与判定）答不了细节时派检索子代理：说清要找什么，可点名先看哪几次学习。它只交回至多 5 条、每条指回行号的结果。',
      input: {
        question: z.string().describe('要找什么，一句话'),
        loops: z
          .array(z.string())
          .optional()
          .describe('先看哪几次学习（学习会话 id）；不限于本项目'),
      },
      run: async (a) => {
        const question = (a.question as string).trim();
        if (question === '') return err('question 不能是空的');
        const loops = (a.loops as string[] | undefined) ?? [];
        for (const id of loops) {
          const opened = await this.hub.opened(id).catch((e: unknown) => {
            if (e instanceof NotFoundError) return undefined;
            throw e;
          });
          if (opened?.kind !== 'loop') return err(`点名的 ${id} 不是一次学习`);
        }
        const sub = await this.hub.createSession('retrieve', {
          title: `检索：${question.slice(0, 20)}`,
          parent: navId,
        });
        await this.hub.send(sub.sessionId, {
          role: 'program',
          text: await this.retrieveOpening(question, loops, navId, sub.sessionId),
        });
        await this.hub.idle(sub.sessionId);
        const found = this.findings.get(sub.sessionId);
        this.findings.delete(sub.sessionId);
        if (found === undefined) return err(`检索子代理没有交回（见会话 ${sub.sessionId}）`);
        if (found.length === 0) return ok(`检索结果（见会话 ${sub.sessionId}）：没找到`);
        return ok(
          `检索结果（出处已核对，见会话 ${sub.sessionId}）：\n${found.map((f) => `- ${f.text}（${f.ref}）`).join('\n')}`,
        );
      },
    };
  }

  /** 检索子会话的开场：问题、点名的学习、本项目与别的项目的学习上层、沙盒说明、交回规矩。 */
  private async retrieveOpening(
    question: string,
    loops: string[],
    navId: string,
    sessionId: string,
  ): Promise<string> {
    const mainId = (await this.hub.opened(navId)).parent;
    const here =
      mainId !== undefined ? (await this.learned.list(mainId)).learnings : await this.learned.all();
    const everything = await this.learned.all();
    const elsewhere = everything.filter((l) => !here.some((x) => x.loopId === l.loopId));
    const first: string[] = [];
    for (const id of loops) {
      first.push(`- ${await this.upperLine(await this.learned.one(id))}`);
    }
    const lines: string[] = [`问题：${question}`];
    if (loops.length > 0) lines.push('先看这几次：', ...first);
    lines.push(
      '学过的记录（上层 / 中层）：',
      ...(here.length > 0 ? here.map((l) => `- ${this.learned.line(l)}`) : ['（没有）']),
    );
    if (elsewhere.length > 0) {
      lines.push(
        '别的项目里的学习：',
        ...(await Promise.all(elsewhere.map((l) => this.upperLine(l)))),
      );
    }
    const sb = await this.sandboxes.forRetrieve(sessionId, navId);
    lines.push(
      '',
      '只为导航的一个问题找底层证据：从上面的上层（单子、判定）出发，到沙盒里读——每次学习的对话原文在 只读/学过的记录/<学习 id>-对话.md（带行号），教材在 只读/资料/<书 id>/，定位到原文行。',
      describeSandbox(sb),
      '',
      '用 submit_findings 交回至多 5 条，每条一句话 + 能定位的 ref（会话 id:行号 / 书/文件:行号）；没找到交空数组；只交一次。不下结论、不出路线。',
    );
    return lines.join('\n');
  }

  /** 一次学习的上层一行（检索子代理开场用）。 */
  private async upperLine(l: Learning): Promise<string> {
    if (l.status !== '没合上') return this.learned.line(l);
    const endLine = (await this.hub.records(l.loopId)).find(
      (r) => r.record.type === 'loop_ended',
    )?.line;
    return this.learned.parkedLine({
      learning: l,
      ...(endLine !== undefined ? { endLine } : {}),
    });
  }

  /** 检索子代理交回：至多 5 条，每条 ref 能定位；只交一次。 */
  private findingsTool(sessionId: string): ToolSpec {
    return {
      name: 'submit_findings',
      description:
        '交回找到的几条（至多 5 条）：每条一句话 + 能定位的 ref（会话 id:行号 / 书/文件:行号）；没找到交空数组。只交一次。',
      input: {
        findings: z.array(
          z.object({
            text: z.string().describe('一句话：找到了什么'),
            ref: z.string().describe('会话 id:行号 或 书/文件:行号'),
          }),
        ),
      },
      run: async (a) => {
        if (this.findings.has(sessionId)) return err('已经交回过了');
        const raw = a.findings as { text?: string; ref?: string }[];
        if (raw.length > 5) return err(`至多 5 条，给了 ${String(raw.length)} 条`);
        const problems: string[] = [];
        const out: { text: string; ref: string }[] = [];
        for (const f of raw) {
          if ((f.text ?? '').trim() === '') problems.push('有一条没写 text');
          const at = await locate(f.ref ?? '', this.locateDeps());
          if (!at.ok) problems.push(`ref ${f.ref ?? ''} 定位不了`);
          out.push({ text: (f.text ?? '').trim(), ref: f.ref ?? '' });
        }
        if (problems.length > 0) return err(`${problems.join('；')}。改好后重新提交`);
        this.findings.set(sessionId, out);
        return ok('已交回。');
      },
    };
  }

  // ───────────── 主对话 ─────────────

  /**
   * 主对话与畅谈共用的只读工具（工单 W5 §4.5）：方向目标一段，学过的记录每次一行（上层单子 +
   * 中层判定里的实际理解），外部导入单列标未验证。主对话问进度、畅谈看已储备什么都用它。
   */
  private listLearnedTool(sessionId: string): ToolSpec {
    return {
      name: 'list_learned',
      description:
        '列出这个项目里学过的记录：方向目标；每次学习一行（合上的带守卫写下的实际理解与证据强度，没合上的带结束原话与当时的路线决定），以及外部导入（未验证）。',
      input: {},
      run: async () => {
        const mainId = await this.projectOf(sessionId);
        if (mainId === undefined) return err('找不到这个对话所属的项目');
        const goal = currentGoal(await this.hub.records(mainId));
        const body = await this.learned.list(mainId);
        const rows = body.learnings.map((l) => `- ${this.learned.line(l)}`);
        const imports = body.imports.map(
          (x) =>
            `- ${x.channel}：${'session' in x.ref ? `${x.ref.session} 第 ${x.ref.lines.join('、')} 行` : `笔记 ${x.ref.note}`}（未验证，不算学会）`,
        );
        return ok(
          [
            goal !== undefined ? describeGoal(goal.goal) : '方向目标：还没有',
            '',
            `学过的记录（每次学习一行）：\n${rows.join('\n') || '（还没有）'}`,
            ...(imports.length > 0
              ? ['', `外部导入（学习者自述 / 笔记，未验证，不算学会）：\n${imports.join('\n')}`]
              : []),
          ].join('\n'),
        );
      },
    };
  }

  /**
   * 主对话每轮的开场（工单 W5 §4.4）：从记录重建，不靠长上下文。方向目标、期限、最近 12 条消息、
   * 最新路线决定与最近 3 张卡；这一轮需要的就这些，其余经 list_learned 按需读。
   */
  private async mainPreface(mainId: string, inputLine: number): Promise<string> {
    const records = await this.hub.records(mainId);
    const goal = currentGoal(records);
    const deadline = foldDeadline(records.map((r) => r.record));
    const messages: string[] = [];
    for (const { line, record } of records) {
      if (line >= inputLine) continue;
      if (
        record.type !== 'user_message' &&
        record.type !== 'assistant_message' &&
        record.type !== 'program_fact'
      ) {
        continue;
      }
      const who =
        record.type === 'user_message'
          ? '学习者'
          : record.type === 'assistant_message'
            ? '你'
            : '程序';
      const text = record.text.length > 300 ? `${record.text.slice(0, 300)}…` : record.text;
      messages.push(`L${String(line)} ${who}：${text}`);
    }
    const recent = messages.slice(-12);
    const decision = records.filter((r) => r.record.type === 'route_decision').at(-1);
    const cards = records.filter((r) => r.record.type === 'choice_card').slice(-3);
    const cardLines = cards.map(({ line, record }) => {
      if (record.type !== 'choice_card') return '';
      const made = records.find(
        (r) => r.record.type === 'choice_made' && r.record.cardId === record.cardId,
      );
      const chosen =
        made?.record.type === 'choice_made'
          ? `学习者选了第 ${String(made.record.option + 1)} 项 → 学习 ${made.record.loopSessionId}`
          : '还没选';
      const options = record.options.map((o, i) => `${String(i + 1)}「${o.title}」`).join('、');
      return `- 卡 ${record.cardId}（L${String(line)}）：${options}，推荐第 ${String(record.recommended + 1)} 项；${chosen}`;
    });
    return [
      '主对话开场（程序每轮从记录重给；以这里为准，前面的轮次你看不到）',
      goal !== undefined ? describeGoal(goal.goal) : '方向目标：还没有',
      `期限：${deadline.deadline !== undefined ? this.deadlineText(deadline) : '没有记'}`,
      '── 最近的消息 ──',
      recent.join('\n') || '（还没有）',
      '── 路线记录 ──',
      decision?.record.type === 'route_decision'
        ? `最新路线决定 L${String(decision.line)}：${decision.record.decision}（理由：${decision.record.reason}）`
        : '还没有路线决定',
      ...cardLines,
    ].join('\n');
  }

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
          const goal = currentGoal(recs);
          const deadline = foldDeadline(recs.map((r) => r.record)).deadline;
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
              ...(goal !== undefined
                ? [
                    `已有方向目标（主对话 L${String(goal.line)}）：`,
                    describeGoal(goal.goal),
                    ...(deadline !== undefined ? [`期限：${deadline}`] : []),
                  ]
                : []),
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
        description: '请导航出下一次学习的选择卡；出好后贴在主对话里，由学习者选。',
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
      this.listLearnedTool(mainId),
      {
        name: 'point_to_conversation',
        description:
          '学习者要接着某个已有的对话（比如一次还在进行的学习）时调用：在主对话里放一个回到那里的入口。',
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
        '方向谈清了（学成后能做什么、每块为什么学、学习者认可的理由）时调用：把方向目标交回项目，本对话随之结束。只调一次。',
      input: {
        title: z.string().describe('方向目标短名：几个字，同时作项目名'),
        abilities: z
          .array(
            z.object({
              ability: z.string().describe('学成后能做什么，一句话'),
              reason: z.string().describe('这块为什么学，一句话'),
              confirmed_reason: z
                .string()
                .optional()
                .describe('学习者自己说了认可这个方向的理由才填；不替他编'),
            }),
          )
          .min(1)
          .describe('目标能力与每块理由，至少一块；可以先粗、逐步补齐'),
        order_hint: z.string().optional().describe('谈到的先后，只作参考；没谈不填'),
        deadline: z.string().optional().describe('学习者说了期限才填，YYYY-MM-DD；没说不填'),
        provisional: z
          .boolean()
          .optional()
          .describe('没有已有方向目标、学习者一时说不清时的冷启动临时版，填 true'),
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
      },
      run: async (a) => {
        const recs = await this.hub.records(talkId);
        if (recs.some((r) => r.record.type === 'talk_ended')) return err('已经交回过了');
        const opened = await this.hub.opened(talkId);
        const mainId = opened.parent;
        if (mainId === undefined) return err('找不到这个对话所属的项目');

        // 参数核对：假模型不过 zod，这里再做一遍；全部先核再写，任何一条不过整次退回、什么都不写
        const title = typeof a.title === 'string' ? a.title.trim() : '';
        if (title === '') {
          return err(
            '要给 title（方向目标的短名，几个字，同时作项目名）。参数形状是 { title, abilities: [{ ability, reason }] }；旧的“一句话方向 + 项目名”两个参数不再用。',
          );
        }
        const rawAbilities = a.abilities;
        if (!Array.isArray(rawAbilities) || rawAbilities.length === 0) {
          return err('abilities 要给至少一块目标能力，每块写 { ability, reason }。');
        }
        const list: unknown[] = rawAbilities;
        const abilities: GoalAbility[] = [];
        for (let i = 0; i < list.length; i++) {
          const raw = list[i];
          if (raw === null || typeof raw !== 'object') {
            return err(`第 ${String(i + 1)} 块要写成 { ability, reason }。`);
          }
          const x = raw as Record<string, unknown>;
          const ability = typeof x.ability === 'string' ? x.ability.trim() : '';
          if (ability === '') return err(`第 ${String(i + 1)} 块缺 ability：学成后能做什么。`);
          const reason = typeof x.reason === 'string' ? x.reason.trim() : '';
          if (reason === '') return err(`第 ${String(i + 1)} 块缺 reason：这块为什么学。`);
          const confirmed = x.confirmed_reason;
          if (confirmed !== undefined && typeof confirmed !== 'string') {
            return err(`第 ${String(i + 1)} 块的 confirmed_reason 要写成字符串。`);
          }
          const confirmedReason = typeof confirmed === 'string' ? confirmed.trim() : '';
          abilities.push({
            ability,
            reason,
            ...(confirmedReason !== '' ? { confirmedReason } : {}),
          });
        }
        const orderRaw = a.order_hint;
        if (orderRaw !== undefined && typeof orderRaw !== 'string') {
          return err('order_hint 要写成字符串；没谈先后就不填。');
        }
        const orderHint = typeof orderRaw === 'string' ? orderRaw.trim() : '';
        if (a.provisional !== undefined && typeof a.provisional !== 'boolean') {
          return err('provisional 要写成布尔值；只在冷启动临时版填 true。');
        }
        const provisional = a.provisional === true;
        const deadlineRaw = a.deadline;
        if (deadlineRaw !== undefined && typeof deadlineRaw !== 'string') {
          return err('deadline 要写成 YYYY-MM-DD 的真实日期；学习者没说期限就不填');
        }
        const deadline = deadlineRaw?.trim();
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

        const text = goalText(abilities);
        const at = this.iso();
        const previous = currentGoal(await this.hub.records(mainId));
        await this.hub.record(mainId, {
          type: 'project_goal',
          at,
          text,
          title,
          abilities,
          ...(orderHint !== '' ? { orderHint } : {}),
          ...(deadline !== undefined && deadline !== '' ? { deadline } : {}),
          ...(provisional ? { provisional: true } : {}),
          talkSessionId: talkId,
          ...(previous !== undefined ? { supersedes: previous.line } : {}),
        });
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
        await this.hub.record(talkId, { type: 'talk_ended', at, goal: text, title });
        await this.hub.send(mainId, {
          role: 'program',
          text: `谈方向的对话（${talkId}）交回了：方向目标是“${text}”，项目名改为“${title}”。`,
        });
        this.organizeStateLater(`畅谈对话（${talkId}）结束了`, talkId);
        return ok('方向已交回项目，本对话结束。和学习者简短说一句就好。');
      },
    };
  }

  // ───────────── 闭环对话 ─────────────

  /**
   * 学习对话的工具：只有两个命令（工单 W4 §5.5）。资料、学过的记录、状态、教法记录与教学工具
   * 都在沙盒里当只读文件读，不再各挂一个工具；诊断写在工作区的 `诊断.md`（沙盒动作，程序当场记）。
   */
  private loopTools(loopId: string): ToolSpec[] {
    return [
      {
        name: 'request_close',
        description: '判断新点已沿预期理解合上时调用：程序开独立守卫判，返回守卫结论。',
        input: { reason: z.string() },
        run: async (a) => {
          const v = await this.requestClose(loopId, 'model', a.reason as string);
          return ok(verdictFact(v));
        },
      },
      {
        name: 'end_loop_unclosed',
        description:
          '学习者明确要结束而这次学习没合上时调用；学习者想先去学别的（另开一次学习）也走它——之后导航会读整段对话出下一张卡。',
        input: { note: z.string().describe('学习者要结束的话在哪一行、为什么') },
        run: async (a) => {
          await this.endUnclosed(loopId, a.note as string);
          return ok(
            '这次学习已按“没合上就结束”处理；下一张选择卡会在主对话里出。和学习者道别即可。',
          );
        },
      },
    ];
  }

  /** 学习对话的开场：目标 + 单子（+ 阶段验收 / 复习复检 / 接着学）+ 沙盒说明（工单 W4 §5.5）。 */
  private async loopOpening(t: Ticket, loopId: string): Promise<string> {
    const revisit = await this.revisitOpening(t);
    const resume = await this.resumeOpening(t);
    const sb = await this.sandboxes.forLoop(loopId);
    return [
      '这次学习的目标：靠单子里的出发点、沿预期理解把新点合上（把新点接进学习者已有的认识）。该讲就成段讲，质量不低于教材。',
      '',
      ...revisit,
      ...resume,
      '单子：',
      this.describeTicket(t),
      '',
      '对资料核的结果：',
      t.sourceCheck.length > 0
        ? t.sourceCheck
            .map(
              (c) =>
                `- ${c.claim}${c.at !== undefined ? `（出处：${c.at}）` : ''}${c.modelAdded === true ? '（资料里没有，模型补的）' : ''}`,
            )
            .join('\n')
        : '（没核过）',
      '',
      ...(t.stageCheck === true
        ? [
            '这是一次阶段验收：看独立表现，默认不给提示，措辞照常平和；做完不等于合上，仍由守卫判。',
            '',
          ]
        : []),
      describeSandbox(sb),
    ].join('\n');
  }

  /**
   * 接着学的开场（工单 §4.8）：原来那次没合上的学习与它的上层三样；原话行不能当本次证据。
   * 不是接着学时为空。
   */
  private async resumeOpening(t: Ticket): Promise<string[]> {
    const id = t.resumeOf;
    if (id === undefined) return [];
    const orig = await this.learned.one(id);
    const endLine = (await this.hub.records(id)).find((r) => r.record.type === 'loop_ended')?.line;
    return [
      `这是接着以前没合上的那次学习学（原来那次：「${orig.title}」${id}，${orig.openedAt.slice(0, 10)}–${orig.endedAt?.slice(0, 10) ?? ''}）。原来那次的上层：`,
      `- ${this.learned.parkedLine({ learning: orig, ...(endLine !== undefined ? { endLine } : {}) })}`,
      `原来那次的行号不能当本次的证据；要看原来那次的对话，读 只读/学过的记录/${id}-对话.md。`,
      '',
    ];
  }

  /**
   * 复习 / 复检那次学习的开场：回看的是哪次学习（附它的单子与通过的判定：理解 + 证据强度）。
   * 不是复习 / 复检时为空。核对（revisitProblem）在交卡时已做，这里只写事实。
   */
  private async revisitOpening(t: Ticket): Promise<string[]> {
    const r = t.revisit;
    if (r === undefined) return [];
    // 交卡时 revisitProblem 已核过这次学习存在；读不到就是真出错，照抛
    const one = await this.learned.one(r.ofLoop);
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

  /** 补前置的 return_to 站不站得住（工单 §4.8）：本项目的一次学习、不是合上的。站不住返回一句话。 */
  async returnProblem(id: string, mainId: string | undefined): Promise<string | undefined> {
    const opened = await this.hub.opened(id).catch((e: unknown) => {
      if (e instanceof NotFoundError) return undefined;
      throw e;
    });
    if (opened === undefined || opened.kind !== 'loop') return `return_to 指的 ${id} 不是一次学习`;
    if (mainId !== undefined && opened.parent !== mainId) {
      return `return_to 指的 ${id} 不是本项目里的学习`;
    }
    const ended = (await this.hub.records(id)).find((r) => r.record.type === 'loop_ended');
    if (ended?.record.type === 'loop_ended' && ended.record.closed) {
      return `return_to 指的 ${id} 已经合上了（补前置要回到一次还没合上的学习）`;
    }
    return undefined;
  }

  /** 接着学的 resume_of 站不站得住（工单 §4.8）：本项目、没合上、没有以它 resumeOf 的学习正在进行或已合上。 */
  async resumeProblem(id: string, mainId: string | undefined): Promise<string | undefined> {
    const opened = await this.hub.opened(id).catch((e: unknown) => {
      if (e instanceof NotFoundError) return undefined;
      throw e;
    });
    if (opened === undefined || opened.kind !== 'loop') return `resume_of 指的 ${id} 不是一次学习`;
    if (mainId !== undefined && opened.parent !== mainId) {
      return `resume_of 指的 ${id} 不是本项目里的学习`;
    }
    const ended = (await this.hub.records(id)).find((r) => r.record.type === 'loop_ended');
    if (ended?.record.type !== 'loop_ended' || ended.record.closed) {
      return `resume_of 指的 ${id} 不是“没合上”的学习`;
    }
    for (const s of this.hub.listSessions().filter((x) => x.kind === 'loop')) {
      const o = await this.hub.opened(s.sessionId);
      if (o.resumeOf?.fromLoop !== id) continue;
      const e = (await this.hub.records(s.sessionId)).find((r) => r.record.type === 'loop_ended');
      if (e === undefined) return `已经在接着学 ${id} 了（${s.sessionId} 进行中）`;
      if (e.record.type === 'loop_ended' && e.record.closed) {
        return `${id} 已经被接着学并合上了（${s.sessionId}）`;
      }
    }
    return undefined;
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
    this.background('状态整理', () => run);
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
   * 学习者的话（含紧邻的前一句教学作前序事件）。不给诊断记录、守卫判定，也不给“合上没有”。
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
        '查学习者的非知识状态与条件（状态记录）：先看“当前状态”页；detail 为真时列出全部状态记录（每条标承载读数 / 解释候选、来源、时间范围、依据行号）。解释候选须经一次独立判断才能当行动依据。',
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
      this.readSessionTool(),
      {
        name: 'read_state_records',
        description: '读状态记录自己的底层记录（全部）与当前状态页。',
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
          after_teaching: z
            .object({
              session: z.string().describe('一次学习的会话 id'),
              line: z.number().int().describe('那次学习里一句教学（assistant_message）的行号'),
              note: z.string().describe('这条状态出现在那段教学之后'),
            })
            .optional()
            .describe('这条状态出现在某段学习里某句教学之后时填；不确定就不填'),
        },
        run: async (a) => {
          const raw = a.after_teaching as
            { session?: string; line?: number; note?: string } | undefined;
          const after = raw === undefined ? undefined : await this.checkAfterTeaching(raw);
          if (after !== undefined && 'problem' in after) return err(after.problem);
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
            ...(after !== undefined && !('problem' in after)
              ? {
                  afterTeaching: {
                    loopSessionId: after.loopSessionId,
                    line: after.line,
                    text: after.text,
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
      /** 开场列出的“带标注”状态记录；有就必须写自查。 */
      annotatedStateIds: string[];
    }
  >();

  /** 一次学习结束后记“这次教法管不管用”：对话原文 + 诊断（沙盒动作）+ 守卫判定 + 教学工具使用记录 + 单子。 */
  private async recordStrategy(loopId: string): Promise<void> {
    const opened = await this.hub.opened(loopId);
    const records = await this.hub.records(loopId);
    const notes = records.flatMap((r) =>
      r.record.type === 'sandbox_action' && r.record.tag === DIAGNOSIS_TAG
        ? [`L${String(r.line)} ${r.record.content ?? ''}`]
        : [],
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
    // 教法记录整理对状态成因的自查：状态记录里有“出现在某段教学之后”标注的，先查自己的教法是不是成因
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
      annotatedStateIds: annotated.map((r) => r.id),
    });
    await this.hub.send(s.sessionId, {
      role: 'program',
      text: [
        `一次学习：${loopId}「${opened.title}」`,
        `单子：${opened.ticket ? this.describeTicket(opened.ticket) : '（缺）'}`,
        `结束：${ended?.record.type === 'loop_ended' ? (ended.record.closed ? '合上（学习者已确认）' : '没合上就结束') : '（缺）'}`,
        '',
        `守卫判定：\n${verdicts.join('\n') || '（没申请过收口）'}`,
        '',
        `诊断记录（模型在工作区里写的 诊断.md，未经守卫）：\n${notes.join('\n') || '（无）'}`,
        '',
        `教学工具使用记录（程序从沙盒动作里记的）：${toolUses.map((u) => `L${String(u.line)} 教学工具:${u.name}`).join('、') || '这次学习没读教学工具，只能从对话原文看用了什么做法'}`,
        '',
        ...(annotated.length > 0
          ? [
              `状态记录里带“出现在 X 之后”标注的（先自查：自己的教法是不是这些状态的成因，不要直接当作学习者固有的状态；提交时 self_check 里写自查）：\n${annotated.map((r) => this.o.m15.describeRecord(r)).join('\n')}`,
              '',
            ]
          : []),
        '这次学习的对话原文：',
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
        '写一条个人策略过程记录（这份记录不属于学过的记录）：当时的诊断与状态条件、用了哪些做法、之后诊断怎么变；引用写这次学习的行号。单次记录不证明因果。',
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
        if (!target) return err('找不到要记的那次学习');
        const selfCheck = typeof a.self_check === 'string' ? a.self_check.trim() : '';
        if (target.annotatedStateIds.length > 0 && selfCheck === '') {
          return err(
            '开场列了带“出现在 X 之后”标注的状态记录：先自查自己的教法是不是成因，写进 self_check 再提交',
          );
        }
        const lines = a.evidence_lines as number[];
        const bad = lines.filter((l) => !target.lines.has(l));
        if (bad.length > 0) return err(`第 ${bad.join('、')} 行不在这次学习的记录里`);
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
            '不给书名：列出项目选用的资料（书和个人笔记，按学科分组；项目没选就是整个书库），all=true 列整个书库；给书名：读这本书的目录。',
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
            '读资料里一个小节文件的原文，每行前印行号；可只读一段。末尾给出引用这段时要附的出处标记。',
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

/** 单子里的一栏：要是文字、去掉空白后不能是空的（改单子的核对）。 */
function ticketText(label: string, v: unknown): string {
  if (typeof v !== 'string') throw new BadRequestError(`${label}要写成文字。`);
  const t = v.trim();
  if (t === '') throw new BadRequestError(`${label}不能是空的。`);
  return t;
}

/** 教学行只取开头一段（M15 用作紧邻前序事件）。 */
function excerpt(r: NumberedRecord): string {
  const t = renderTranscript([r]);
  return t.length > TEACHING_EXCERPT ? `${t.slice(0, TEACHING_EXCERPT)}…` : t;
}

function verdictFact(v: GuardVerdict): string {
  if (v.problem !== undefined) return `守卫判定：未合上（${v.problem}）。接着教。`;
  return v.closed
    ? `守卫判定：合上。依据：${v.basis}\n请学习者确认结束；学习者在界面上确认后这次学习结束。`
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

/** b 比 a 晚几天（YYYY-MM-DD；b 在 a 之前为负）。 */
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}
