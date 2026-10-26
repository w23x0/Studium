// Studium：按事件跑清单（`docs/设计/01-流程.md`；一次学习之外的流程见 `docs/设计/会话/` 各页，收口与守卫见 `会话/守卫.md`）。
// 每种会话的系统提示与工具在这里给；写权限靠给什么工具来卡（`docs/设计/记录/读写权限.md`）。
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { z } from 'zod';
import { formatCitation } from '../shared/citation.ts';
import { CONVERSATION_KIND_LABELS } from '../shared/protocol.ts';
import type {
  AddMaterialRequest,
  MaterialSource,
  ProjectDeadlineResponse,
  ProjectInstructionsResponse,
  ProjectMaterialsResponse,
  ProjectMaterialView,
  RouteDeviationView,
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
  type FindCandidate,
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
import { MaterialError, type Materials } from './knowledge/materials.ts';
import type { Sources } from './sources.ts';
import type { PedagogyStore } from './knowledge/pedagogy.ts';
import type { Objections } from './knowledge/objections.ts';
import { STAGES, type StateStore, type StateConfirmation } from './knowledge/state.ts';
import { toolUsesOf, type TeachingTools } from './teaching-tools.ts';
import { locate, type LocateDeps } from './locate.ts';
import type { SandboxSpec, ToolResult, ToolSpec } from './model/port.ts';
import type { Outputs } from './outputs.ts';
import { describeSandbox, Sandboxes } from './sandbox.ts';
import { currentTicket } from './ticket.ts';
import { guardView, learnerLines, renderTranscript } from './transcript.ts';
import { Uploads, type RouteJudge } from './uploads.ts';
import { localMinute } from '../shared/time.ts';

export class BadRequestError extends Error {}

/** 定下一步的结果：导航定了、已开学习对话；或导航要先问学习者一件事。 */
export type PlanResult = (
  | { kind: 'opened'; loopSessionId: string; title: string; reason: string; navSessionId: string }
  | { kind: 'question'; question: string; navSessionId: string }
) & {
  /** 导航发现资料缺的那段，经主对话提议去找（会话/找资料.md「何时开」）。 */
  materialGap?: string;
};

/** 出发点的来源（学过的记录 / 自述 / 假定）。 */
type StartSource = (typeof START_SOURCES)[number];

/** 学习者离开多久算“隔了一阵回来”，回来时程序追加离开多久。 */
const AWAY_MS = 30 * 60 * 1000;
/** 隔多久回来算“隔很久”，状态整理顺带跑一次（`docs/设计/会话/后台整理.md`；阈值属实现细节，先定 12 小时）。 */
const LONG_AWAY_MS = 12 * 3600 * 1000;
/** 状态整理开场里教学行只放开头一段（作紧邻前序事件），全文用 read_session 查。 */
const TEACHING_EXCERPT = 160;
/** 项目说明上限（字；参照 Claude，`docs/设计/记录/项目说明.md`）。 */
export const INSTRUCTIONS_LIMIT = 16000;
/** 找资料一次最多交回几份候选（`docs/设计/会话/找资料.md`）。 */
const MAX_CANDIDATES = 10;

export interface StudiumOptions {
  prompts: Record<ConversationKind, string>;
  /** 项目资料区（工单 W8）：读原文、建资料、角色、正文目录。 */
  materials: Materials;
  /** 数据目录（学过的记录的导入存放处在其下）。 */
  dataDir: string;
  pedagogy: PedagogyStore;
  state: StateStore;
  /** 学习者异议存放处。 */
  objections: Objections;
  /** 原文与出处（资料检索、教材出处核对）。 */
  sources: Sources;
  /** 教学工具（官方 + 学习者自己的）。 */
  teaching: TeachingTools;
  /** 知识产出物（批 8）。 */
  outputs: Outputs;
  /** 跨资料的重复线索 / 来源说明 / 跨领域核对（批 10b）。 */
  cross: Crosslinks;
  /** 上传分流里拿不准的交模型判一次（工单 W9 §4.2）；不给 = 按扩展名默认。 */
  judge?: RouteJudge;
  now?: () => Date;
}

export class Studium {
  private hubRef: Hub | undefined;
  private readonly now: () => Date;
  /** 后台跑着的清单（合上之后、状态整理、教法记录整理……），回放与测试用来等它们跑完。 */
  private readonly tasks = new Set<Promise<unknown>>();
  /** 状态整理一次只跑一个，后到的排在后面。 */
  private stateChain: Promise<void> = Promise.resolve();
  /** 每个主对话一条：路线决定与卡排队写。 */
  private readonly routeChains = new Map<string, Promise<unknown>>();

  /** 长期功能：复习 / 复检、阶段复盘、提醒与今天该做的。 */
  readonly longterm: LongTerm;

  /** 学过的记录（按层读每次学习）与外部导入存放处。 */
  readonly learned: Learned;

  /** 学习对话与检索子代理的沙盒（只读的资料与记录、可写的工作区）。 */
  private readonly sandboxes: Sandboxes;

  /** 上传与分流（工单 W9）。 */
  private readonly uploads: Uploads;

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
      materials: o.materials,
      pedagogy: o.pedagogy,
      state: o.state,
      objections: o.objections,
      teaching: o.teaching,
      dataDir: o.dataDir,
      scopeOf: (id) => this.scopeOf(id),
      materialLines: (ids) => this.materialLines(ids),
      instructionsOf: async (id) => {
        const main = await this.projectOf(id);
        return main === undefined ? '' : (await this.instructions(main)).text;
      },
    });
    this.uploads = new Uploads({
      root: join(o.dataDir, 'projects'),
      newId: (prefix) => this.newId(prefix),
      iso: () => this.iso(),
      ...(o.judge !== undefined ? { judge: o.judge } : {}),
      addMaterial: async (mainId, req) => (await this.newMaterial(mainId, req)).id,
      removeMaterial: (mainId, id) => this.removeMaterial(mainId, id),
      importLearned: async (mainId, x) =>
        (await this.learned.importFile({ ...x, project: mainId })).id,
      removeImport: (id) => this.learned.removeImport(id),
      record: async (mainId, r) => {
        await this.hub.record(mainId, { type: 'upload_routed', at: this.iso(), ...r });
      },
      records: async (mainId) => (await this.hub.records(mainId)).map((r) => r.record),
    });
    this.longterm = new LongTerm({
      hub: () => this.hub,
      learned: this.learned,
      state: o.state,
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

  /** 程序生成的编号（选择卡、状态记录 / 教法记录等）；录带按生成顺序给它们稳定记号。 */
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
          preface: (sessionId: string, inputLine: number, fresh: boolean) =>
            this.mainPreface(sessionId, inputLine, fresh),
        }
      : {}),
    // 畅谈、导航、找资料可联网搜索；其余会话不放开（工单 W5 §4.6、W9 §4.5）
    ...(kind === 'talk' || kind === 'nav' || kind === 'find' ? { webSearch: true } : {}),
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
            this.listLearnedTool(sessionId, true),
            this.readImportTool(),
            this.settleGoalTool(sessionId),
            ...this.longterm.reviewTools(sessionId),
          ];
        case 'loop':
          // 学习对话在沙盒里跑（只读资料与记录、可写工作区），工具只剩两个命令
          return this.loopTools(sessionId);
        case 'guard':
          return [...this.readTools(sessionId), this.verdictTool(sessionId)];
        case 'nav':
          // 导航：定下一次学什么（会话/导航.md「能读什么 · 工具」）
          return [
            ...this.readTools(sessionId),
            this.readSessionTool(),
            this.stateQueryTool(),
            this.retrieveTool(sessionId),
            this.cardTool(sessionId),
            this.askLearnerTool(sessionId),
            this.materialGapTool(sessionId),
            ...this.longterm.reminderTools(sessionId),
            this.o.cross.addNoteTool(sessionId),
          ];
        case 'retrieve':
          // 检索子代理：在只读沙盒里自己读，只挂交回结果这一个工具（工单 README §2.7）
          return [this.findingsTool(sessionId)];
        case 'state':
          return this.stateTools(sessionId);
        case 'pedagogy':
          return [this.stateQueryTool(), this.strategyTool(sessionId)];
        case 'output':
          // 写产出对话只读资料；写产出新版本的工具由 Outputs 给
          return [...this.readTools(sessionId), ...this.o.outputs.sessionTools(sessionId)];
        case 'find':
          // 找资料：联网搜（模型服务自带），只挂交回候选这一个工具（会话/找资料.md）
          return [this.candidatesTool(sessionId)];
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

  // ───────────── 项目资料与期限（`docs/设计/记录/资料.md`、`docs/设计/记录/方向目标.md`）─────────────

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

  /** 项目当前的资料 id（按加入顺序）：把 project_material 记录从头折叠。 */
  async selectedBooks(mainId: string): Promise<{ book: string; addedAt: string }[]> {
    return foldMaterials(await this.requireProject(mainId));
  }

  /** 项目资料的视图：每份带种类 / 版本 / 日期 / 处理状态 / 模型判断的角色；资料目录里找不到的标 missing。 */
  async materials(mainId: string): Promise<ProjectMaterialsResponse> {
    const recs = await this.requireProject(mainId);
    const chosen = foldMaterials(recs);
    const views: ProjectMaterialView[] = [];
    for (const c of chosen) {
      const src = await this.o.materials.source(c.book);
      if (src !== undefined) {
        views.push({
          book: c.book,
          title: src.title,
          kind: src.kind,
          addedAt: c.addedAt,
          origin: src.origin,
          ...(src.version !== '' ? { version: src.version } : {}),
          fetchedAt: src.fetchedAt,
          status: src.status,
          ...(src.problems !== undefined ? { problems: src.problems } : {}),
          ...(src.role !== undefined ? { role: src.role } : {}),
          ...(src.copiedFrom !== undefined ? { copiedFrom: src.copiedFrom } : {}),
        });
        continue;
      }
      views.push({ book: c.book, title: c.book, addedAt: c.addedAt, missing: true });
    }
    const d = foldDeadline(recs);
    return {
      mainSessionId: mainId,
      materials: views,
      restricted: true,
      ...(d.deadline !== undefined ? { deadline: d.deadline } : {}),
      ...(d.note !== undefined ? { deadlineNote: d.note } : {}),
    };
  }

  /**
   * 加一份资料（工单 W8 §4.2；入口归 W9）：在项目资料区里建好、记 project_material，转换在后台跑，
   * 状态随处理更新。
   */
  async addMaterial(
    mainId: string,
    req: Partial<AddMaterialRequest>,
  ): Promise<ProjectMaterialsResponse> {
    if (typeof req.kind !== 'string' || typeof req.origin !== 'string') {
      throw new BadRequestError('kind 与 origin 要是字符串');
    }
    await this.newMaterial(mainId, {
      kind: req.kind,
      origin: req.origin,
      ...(typeof req.title === 'string' ? { title: req.title } : {}),
      ...(typeof req.commit === 'string' ? { commit: req.commit } : {}),
    });
    return this.materials(mainId);
  }

  /** 在项目资料区建一份、记 project_material；返回建好时的 source.json。 */
  private async newMaterial(mainId: string, req: AddMaterialRequest): Promise<MaterialSource> {
    await this.requireProject(mainId);
    let src: MaterialSource;
    try {
      src = await this.o.materials.add(mainId, req);
    } catch (err) {
      if (err instanceof MaterialError) throw new BadRequestError(err.message);
      throw err;
    }
    await this.hub.record(mainId, {
      type: 'project_material',
      at: this.iso(),
      op: 'add',
      material: src.id,
    });
    return src;
  }

  /** 删掉本项目的一份资料（工单 W9 §4.4）：只追加 remove；已有引用照旧能定位，依据面板标“资料已删”。 */
  async removeMaterial(mainId: string, id: string): Promise<void> {
    const have = foldMaterials(await this.requireProject(mainId)).map((m) => m.book);
    if (!have.includes(id)) throw new BadRequestError(`本项目没有这份资料：${id}`);
    await this.hub.record(mainId, {
      type: 'project_material',
      at: this.iso(),
      op: 'remove',
      material: id,
    });
  }

  /** 重试一份失败 / 有问题的资料。 */
  async retryMaterial(mainId: string, id: string): Promise<ProjectMaterialsResponse> {
    const have = foldMaterials(await this.requireProject(mainId)).map((m) => m.book);
    if (!have.includes(id)) throw new BadRequestError(`本项目没有这份资料：${id}`);
    try {
      await this.o.materials.retry(id);
    } catch (err) {
      if (err instanceof MaterialError) throw new BadRequestError(err.message);
      throw err;
    }
    return this.materials(mainId);
  }

  /** 从别的项目拿一份（工单 W9 §4.1）：复制进本项目，各算一份。 */
  async copyMaterial(
    mainId: string,
    fromProject: string,
    material: string,
  ): Promise<ProjectMaterialsResponse> {
    await this.requireProject(mainId);
    if (fromProject === mainId) throw new BadRequestError('这份已经在本项目里了');
    const there = foldMaterials(await this.requireProject(fromProject)).map((m) => m.book);
    if (!there.includes(material)) throw new BadRequestError(`那个项目里没有这份资料：${material}`);
    let src: MaterialSource;
    try {
      src = await this.o.materials.copy(material, mainId);
    } catch (err) {
      if (err instanceof MaterialError) throw new BadRequestError(err.message);
      throw err;
    }
    await this.hub.record(mainId, {
      type: 'project_material',
      at: this.iso(),
      op: 'add',
      material: src.id,
    });
    return this.materials(mainId);
  }

  // ───────────── 上传与分流（工单 W9 §4.1 §4.2） ─────────────

  /** 收下一批上传的文件，一份份分到资料或学过的。 */
  async upload(mainId: string, files: { path: string; data: Buffer }[]) {
    await this.requireProject(mainId);
    return this.uploads.save(mainId, files);
  }

  /** 本项目上传过的每一份现在分在哪（新的在前）。 */
  async uploadsOf(mainId: string) {
    await this.requireProject(mainId);
    return this.uploads.list(mainId);
  }

  /** 学习者改判一份上传。 */
  async reroute(mainId: string, upload: string, file: string, to: '资料' | '学过的') {
    await this.requireProject(mainId);
    return this.uploads.reroute(mainId, upload, file, to);
  }

  /** 删一条外部导入（项目页“我导入的学过的”）：只能删本项目导入的。 */
  async removeImport(mainId: string, id: string): Promise<void> {
    await this.requireProject(mainId);
    const one = (await this.learned.imports()).find((x) => x.id === id);
    if (one?.project !== mainId) throw new BadRequestError(`本项目没有导入过这一份：${id}`);
    await this.learned.removeImport(id);
  }

  // ───────────── 项目说明（`docs/设计/记录/项目说明.md`；工单 W9 §4.6） ─────────────

  /** 项目说明：当前值（最后一条）+ 全部历史。 */
  async instructions(mainId: string): Promise<ProjectInstructionsResponse> {
    await this.requireProject(mainId);
    const history: ProjectInstructionsResponse['history'] = [];
    for (const { line, record } of await this.hub.records(mainId)) {
      if (record.type === 'project_instructions') {
        history.push({ at: record.at, by: record.by, text: record.text, line });
      }
    }
    return { text: history.at(-1)?.text ?? '', history, limit: INSTRUCTIONS_LIMIT };
  }

  /** 改项目说明（学习者在项目页改，或主对话代写）：存一版，从下一个开场起生效。 */
  async setInstructions(
    mainId: string,
    text: string,
    by: 'learner' | 'main' = 'learner',
    forLine?: number,
  ): Promise<ProjectInstructionsResponse> {
    await this.requireProject(mainId);
    const t = text.trim();
    if (t.length > INSTRUCTIONS_LIMIT) {
      throw new BadRequestError(
        `项目说明最多 ${String(INSTRUCTIONS_LIMIT)} 字，现在是 ${String(t.length)} 字；删掉一些再存`,
      );
    }
    if (t === (await this.instructions(mainId)).text) return this.instructions(mainId);
    await this.hub.record(mainId, {
      type: 'project_instructions',
      at: this.iso(),
      text: t,
      by,
      ...(forLine !== undefined ? { forLine } : {}),
    });
    return this.instructions(mainId);
  }

  /** 开场里的项目说明一段（主对话、畅谈、导航、找资料用；守卫、后台整理不给）。 */
  private async instructionsBlock(mainId: string): Promise<string> {
    const t = (await this.instructions(mainId)).text;
    return `项目说明（学习者明确的长期要求；与学习者当场说的冲突时以当场为准）：${t !== '' ? `\n${t}` : '还没写'}`;
  }

  // ───────────── 找资料（`docs/设计/会话/找资料.md`；工单 W9 §4.5） ─────────────

  /** 找资料对话的开场：学习者那句话、方向说明、项目说明、本项目已有资料。 */
  private async findOpening(mainId: string, request: string, line: number): Promise<string> {
    const records = await this.hub.records(mainId);
    const goal = currentGoal(records);
    const have = foldMaterials(records.map((r) => r.record));
    const rows: string[] = [];
    for (const m of have) {
      const src = await this.o.materials.source(m.book);
      if (src === undefined) continue;
      rows.push(
        `- ${src.id}｜${src.title}｜${src.kind}｜${src.origin.startsWith('/') ? '本机文件' : src.origin}`,
      );
    }
    return [
      `学习者在主对话里说（主对话第 ${String(line)} 行）：${request}`,
      '',
      goal !== undefined ? describeGoal(goal.goal) : '方向目标：还没有',
      '',
      await this.instructionsBlock(mainId),
      '',
      `本项目已有的资料（id｜标题｜种类｜来源）：\n${rows.join('\n') || '（还没有）'}`,
    ].join('\n');
  }

  /** 找资料对话交回候选：程序核网址、去重、标出已在本项目的，存成 find_candidates 给界面勾。 */
  private candidatesTool(findId: string): ToolSpec {
    return {
      name: 'submit_candidates',
      description: `候选找好了时调用：交回至多 ${String(MAX_CANDIDATES)} 份（标题、网址、为什么选——对着方向说明说），学习者在界面上勾了才存。可以再调，以最后一次为准。`,
      input: {
        candidates: z
          .array(
            z.object({
              title: z.string(),
              url: z.string().describe('http(s) 网址'),
              why: z.string().describe('为什么选，对着方向说明说，一两句'),
            }),
          )
          .describe(`至多 ${String(MAX_CANDIDATES)} 份`),
      },
      run: async (a) => {
        const mainId = await this.projectOf(findId);
        if (mainId === undefined) return err('找不到这个对话所属的项目');
        const given = a.candidates as { title: string; url: string; why: string }[];
        if (given.length === 0) return err('一份候选都没有；没找到合适的就直接跟学习者说');
        if (given.length > MAX_CANDIDATES) {
          return err(`至多 ${String(MAX_CANDIDATES)} 份，这次交了 ${String(given.length)} 份`);
        }
        const origins = new Map<string, string>();
        for (const m of foldMaterials(await this.requireProject(mainId))) {
          const src = await this.o.materials.source(m.book);
          if (src !== undefined) origins.set(normalUrl(src.origin), src.id);
        }
        const out: FindCandidate[] = [];
        const dropped: string[] = [];
        for (const c of given) {
          let u: URL;
          try {
            u = new URL(c.url.trim());
          } catch {
            dropped.push(`${c.title}（网址不对）`);
            continue;
          }
          if (u.protocol !== 'http:' && u.protocol !== 'https:') {
            dropped.push(`${c.title}（不是 http(s) 网址）`);
            continue;
          }
          if (out.some((x) => normalUrl(x.url) === normalUrl(u.href))) {
            dropped.push(`${c.title}（和前面的重复）`);
            continue;
          }
          const already = origins.get(normalUrl(u.href));
          out.push({
            title: c.title.trim() || u.hostname,
            url: u.href,
            why: c.why.trim(),
            ...(already !== undefined ? { alreadyIn: already } : {}),
          });
        }
        if (out.length === 0) return err(`没有能用的候选：${dropped.join('；')}`);
        await this.hub.record(findId, { type: 'find_candidates', at: this.iso(), candidates: out });
        return ok(
          `已列给学习者 ${String(out.length)} 份${dropped.length > 0 ? `；去掉了：${dropped.join('；')}` : ''}${out.some((x) => x.alreadyIn !== undefined) ? '；标了已在本项目的' : ''}。等学习者勾，不用再把清单说一遍。`,
        );
      },
    };
  }

  /** 学习者在候选清单上勾了、点“存所选”：勾中的存成本项目资料（联网查来），告诉主对话存了几份。 */
  async pickCandidates(findId: string, forLine: number, picked: number[]): Promise<void> {
    const opened = await this.hub.opened(findId);
    if (opened.kind !== 'find') throw new BadRequestError('这不是找资料的对话');
    const mainId = await this.projectOf(findId);
    if (mainId === undefined) throw new BadRequestError('找不到这个对话所属的项目');
    const records = await this.hub.records(findId);
    const list = records.find((r) => r.line === forLine)?.record;
    if (list?.type !== 'find_candidates')
      throw new BadRequestError(`第 ${String(forLine)} 行不是候选清单`);
    if (
      records.some((r) => r.record.type === 'candidates_picked' && r.record.forLine === forLine)
    ) {
      throw new BadRequestError('这份清单已经存过了');
    }
    const chosen = [...new Set(picked)].sort((x, y) => x - y);
    if (chosen.some((i) => !Number.isInteger(i) || i < 0 || i >= list.candidates.length)) {
      throw new BadRequestError('勾的序号不对');
    }
    const materials: string[] = [];
    const saved: string[] = [];
    for (const i of chosen) {
      const c = list.candidates[i];
      if (c === undefined) continue;
      if (c.alreadyIn !== undefined) {
        materials.push(c.alreadyIn);
        continue;
      }
      try {
        const src = await this.newMaterial(mainId, {
          kind: 'search',
          origin: c.url,
          title: c.title,
        });
        materials.push(src.id);
        saved.push(`《${c.title}》`);
      } catch (e) {
        if (!(e instanceof BadRequestError)) throw e;
        materials.push('');
      }
    }
    await this.hub.record(findId, {
      type: 'candidates_picked',
      at: this.iso(),
      forLine,
      picked: chosen,
      materials,
    });
    await this.hub.send(mainId, {
      role: 'program',
      text:
        saved.length > 0
          ? `学习者在找资料对话里勾了 ${String(saved.length)} 份存进本项目资料（联网查来，正在抓取转换）：${saved.join('、')}；${String(list.candidates.length - chosen.length)} 份没勾，没存。跟学习者说一句存了几份。`
          : '学习者在找资料对话里一份都没存。跟学习者说一句即可。',
    });
  }

  /** 去掉资料：只追加记录；本项目没有的名字跳过。 */
  async changeMaterials(
    mainId: string,
    change: { remove?: string[] },
  ): Promise<ProjectMaterialsResponse> {
    const recs = await this.requireProject(mainId);
    const have = foldMaterials(recs).map((m) => m.book);
    const removes: string[] = [];
    for (const name of change.remove ?? []) {
      const id = have.find((b) => b === name || b.trim() === name.trim());
      if (id !== undefined && !removes.includes(id)) removes.push(id);
    }
    for (const id of removes) {
      await this.hub.record(mainId, {
        type: 'project_material',
        at: this.iso(),
        op: 'remove',
        material: id,
      });
    }
    return this.materials(mainId);
  }

  /**
   * 这个会话能读的资料：它所属项目的资料（处理好了的）。资料归项目：没有就是空（缺资料依据），
   * 不查全库，也不跨项目读（工单 W8 §4.2）。
   */
  async scopeOf(sessionId: string): Promise<string[]> {
    const main = await this.projectOf(sessionId);
    if (main === undefined) return [];
    const out: string[] = [];
    for (const c of await this.selectedBooks(main)) {
      const src = await this.o.materials.source(c.book);
      if (src?.status === '可用' || src?.status === '部分可用') out.push(c.book);
    }
    return out;
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

  /** 学习者在某个对话里发话。隔了一阵回来，先追加离开多久（`docs/设计/01-流程.md`「暂停」）。images = 附图的来历（批 4，文字已并进 text）。 */
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

  /**
   * 定下一次学什么（会话/导航.md）：开导航会话、全自动跑完；导航定了就存单子与路线决定、直接开学习对话，
   * 要问学习者就交回问题（由主对话顺口问）。导航会话挂在主对话下，学习者可点进去看它怎么想的。
   */
  async planNext(trigger: string, mainId: string): Promise<PlanResult> {
    const title = '想下一步学什么';
    const nav = await this.hub.createSession('nav', { title, parent: mainId });
    const mainRecs = await this.hub.records(mainId);
    await this.hub.record(mainId, {
      type: 'task_opened',
      at: this.iso(),
      sessionId: nav.sessionId,
      kind: 'nav',
      title,
      anchorLine: mainRecs.filter((r) => r.record.type === 'user_message').at(-1)?.line ?? 0,
    });
    await this.hub.send(nav.sessionId, {
      role: 'program',
      text: await this.navOpening(trigger, mainId),
    });
    await this.hub.idle(nav.sessionId);
    const gap = this.navGaps.get(nav.sessionId);
    const withGap = gap !== undefined ? { materialGap: gap } : {};
    const question = this.navQuestions.get(nav.sessionId);
    if (question !== undefined)
      return { kind: 'question', question, navSessionId: nav.sessionId, ...withGap };
    const card = this.cards.get(nav.sessionId);
    if (!card) throw new Error('导航没有交回下一步（见该会话记录）');
    // 先写路线决定，紧接着写导航定的单子（记录/单子与路线.md「路线决定与理由」）；
    // 同一主对话的几次排队写，决定与单子才相邻、取代链不断
    const record = await this.inRouteOrder(mainId, async () => {
      const before = await this.hub.records(mainId);
      const last = [...before].reverse().find((r) => r.record.type === 'route_decision');
      const decision: RouteDecision = {
        type: 'route_decision',
        at: this.iso(),
        navSessionId: nav.sessionId,
        trigger,
        decision: card.routeDecision.decision,
        reason: card.routeDecision.reason,
        basis: card.routeDecision.basis,
        ...(last !== undefined ? { supersedes: last.line } : {}),
      };
      await this.hub.record(mainId, decision);
      const planned: ChoiceCard = {
        type: 'choice_card',
        at: this.iso(),
        cardId: this.newId('card'),
        navSessionId: nav.sessionId,
        options: card.options,
        recommended: 0,
        trigger,
      };
      await this.hub.record(mainId, planned);
      return planned;
    });
    const picked = card.options[0];
    const loopSessionId = await this.openPlanned(record.cardId);
    await this.withdrawUntouched(mainId, loopSessionId);
    return {
      kind: 'opened',
      loopSessionId,
      title: picked?.title ?? '',
      reason: picked?.reason ?? '',
      navSessionId: nav.sessionId,
      ...withGap,
    };
  }

  /**
   * 学习者要换一个时：之前定下、学习者还没开口的学习对话直接收掉（不算搁着、不进停车场）；
   * 学习者在里面说过话的不动，照常算一次学习。
   */
  private async withdrawUntouched(mainId: string, keep: string): Promise<void> {
    for (const s of this.hub.listSessions()) {
      if (s.kind !== 'loop' || s.parent !== mainId || s.sessionId === keep) continue;
      const recs = await this.hub.records(s.sessionId);
      if (recs.some((r) => r.record.type === 'user_message' || r.record.type === 'loop_ended'))
        continue;
      await this.hub.record(s.sessionId, {
        type: 'session_withdrawn',
        at: this.iso(),
        reason: '学习者还没开始就换了一个',
      });
    }
  }

  private inRouteOrder<T>(mainId: string, f: () => Promise<T>): Promise<T> {
    const run = (this.routeChains.get(mainId) ?? Promise.resolve()).then(f);
    this.routeChains.set(
      mainId,
      run.catch(() => undefined),
    );
    return run;
  }

  /** 导航定下之后：存路线事实，开学习对话，交开场。 */
  private async openPlanned(cardId: string): Promise<string> {
    const option = 0;
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
    if (card?.type !== 'choice_card') throw new Error(`找不到导航定的单子：${cardId}`);
    if (recs.some((r) => r.type === 'choice_made' && r.cardId === cardId)) {
      throw new Error(`这张单子已经开过学习了：${cardId}`);
    }
    const picked = card.options[option];
    if (!picked) throw new Error(`导航定的单子是空的：${cardId}`);

    // 接着学：带上原学习（原学习正本不改）
    let resumeOf: { fromLoop: string; endedAt: string } | undefined;
    if (picked.ticket.resumeOf !== undefined) {
      const origId = picked.ticket.resumeOf;
      // 导航定下后可能已经从别处接着学了
      const bad = await this.resumeProblem(origId, mainId);
      if (bad !== undefined) throw new Error(bad);
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
    raw: { newPoint?: unknown; clause?: unknown; startPoints?: unknown } | null | undefined,
  ): Promise<{ line: number; ticket: Ticket }> {
    const body = raw ?? {};
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
        `学习者改了这次的单子（第 ${String(line)} 行），之后按改后的来。`,
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
      const where = `第 ${String(i + 1)} 个出发点`;
      if (typeof one !== 'object' || one === null)
        throw new BadRequestError(`${where}没写清是什么。`);
      const x = one as { point?: unknown; source?: unknown; ref?: unknown };
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

  /** 申请收口：开守卫写收尾记录、核对引用行、记下。学习者申请时把记录作为事实追加回学习对话。 */
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

  /** 守卫写好收尾记录后，学习者确认结束 → 合上之后的清单。 */
  async confirmClose(loopId: string, note: string): Promise<void> {
    await this.assertActiveLoop(loopId);
    const recs = (await this.hub.records(loopId)).map((r) => r.record);
    const verdict = recs.filter((r) => r.type === 'guard_verdict').at(-1);
    if (verdict?.type !== 'guard_verdict' || !verdict.closed) {
      // 收尾记录还没写好，不能确认结束；没学完要结束走“搁着，以后再学”
      throw new BadRequestError(
        '这次学到了什么还没整理：先点“我觉得懂了”；想先停下就点“…”里的“搁着，以后再学”。',
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
   * 对守卫的一次判定提异议。这次学习还开着：作为学习者原话（带标记）追加进那次学习，之后学习者可再申请收口；
   * 那次已结束：记进异议存放处，不改正本里的判定。
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

  /** 对一条教法记录 / 状态记录提异议：只追加一条异议记录，不改原记录；下次整理 / 出卡时被读到。 */
  async objectToRecord(
    kind: 'pedagogy' | 'state',
    recordId: string,
    text: string,
  ): Promise<LearnerObjection> {
    const body = text.trim();
    if (body === '') throw new BadRequestError('异议不能是空的。');
    const exists =
      kind === 'pedagogy' ? this.o.pedagogy.record(recordId) : this.o.state.record(recordId);
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

  /** 学习者对一条状态记录确认 / 否认（界面上点的）：只追加一条，不改原记录；下次整理时被读到。 */
  async confirmRecord(
    recordId: string,
    verdict: 'confirm' | 'deny',
    note?: string,
  ): Promise<StateConfirmation> {
    if (this.o.state.record(recordId) === undefined) {
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
    await this.o.state.addConfirmation(c);
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

  /** 附在一条教法记录 / 状态记录描述后面的学习者异议（交给模型读；没有就是空串）。 */
  private objectionNotes(kind: 'pedagogy' | 'state', recordId: string): string {
    const rows = this.o.objections.forRecord(kind, recordId);
    return rows.map((o) => `\n  学习者异议（自述，原记录没改）：${o.text}`).join('');
  }

  // ───────────── 清单 ─────────────

  /**
   * 一次学习结束（01-流程.md §3）：① 存盘（已在 loop_ended）② 主对话里说一句，不自动开下一次
   * （开新学习由学习者主动，主对话只提醒）③ 后台：状态整理与教法记录整理，不等它们。
   */
  private async afterLoop(loopId: string, closed: boolean): Promise<void> {
    const opened = await this.hub.opened(loopId);
    const mainId = opened.parent;
    // 学习对话总挂在项目的主对话下；没有就是坏数据，不替它新建项目
    if (mainId === undefined) throw new Error(`学习对话 ${loopId} 没有挂在项目下`);
    try {
      await this.hub.send(mainId, {
        role: 'program',
        text: closed
          ? `“${opened.title}”学完了（学习者已确认结束）。`
          : `“${opened.title}”没学完就结束了，先搁着。`,
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

  // ───────────── 守卫 ─────────────

  private readonly verdicts = new Map<string, Omit<GuardVerdict, 'type' | 'at'>>();

  private async runGuard(loopId: string): Promise<GuardVerdict> {
    const records = await this.hub.records(loopId);
    const guard = await this.hub.createSession('guard', {
      title: '整理这次学到了什么',
      parent: loopId,
    });
    this.guardTarget.set(guard.sessionId, records);
    // 守卫按收口那一刻的单子写：学习者改过就用改后的（工单 W6 §9）
    const ticket = currentTicket(records);
    await this.hub.send(guard.sessionId, {
      role: 'program',
      text: [
        '这次学习的单子：',
        ticket ? this.describeTicket(ticket) : '（缺单子）',
        '',
        '这次学习的对话（L 后是行号；只放双方对话；程序事实、模型一侧的沙盒动作不给）：',
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
        basis: '守卫没有交回收尾记录',
        lines: [],
        problem: '守卫没有交回收尾记录',
      }),
      model,
    };
  }

  private readonly guardTarget = new Map<string, NumberedRecord[]>();

  private verdictTool(guardId: string): ToolSpec {
    return {
      name: 'submit_verdict',
      description:
        '交回这次学习的收尾记录：学习者实际表现出的理解，每条指回他的行；证据薄的如实写薄。引用的行只能是学习者的行。',
      input: {
        basis: z.string().describe('一段话总述这次实际学到了什么、哪里还薄，引用写行号'),
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
          .describe('学习者实际表现出的理解；对话里看不出来就交空数组并在总述里说明'),
      },
      run: (a) => {
        const basis = a.basis as string;
        const lines = a.evidence_lines as number[];
        const raw = a.understanding as Understanding[];
        if (this.verdicts.has(guardId)) return err('已经提交过收尾记录');
        const target = this.guardTarget.get(guardId) ?? [];
        const learner = learnerLines(target);
        const bad = lines.filter((l) => !learner.has(l));
        // 程序核对：引用的行须落在学习者的行上（00 原则 7）；不对就退回让守卫重交
        if (bad.length > 0) {
          return err(
            `第 ${bad.join('、')} 行不是学习者说的话，不能当证据；只引学习者的行，重新提交`,
          );
        }
        // 实际理解：行号核对同证据行；一条不过整次退回，什么都不收
        for (const u of raw) {
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
          // 守卫不再把关（10-23）：学到没有由学习对话与学习者定，这里只写收尾记录
          closed: true,
          basis,
          lines,
          understanding: raw,
        });
        return ok('收尾记录已收到');
      },
    };
  }

  // ───────────── 导航 ─────────────

  private readonly cards = new Map<
    string,
    {
      options: ChoiceOption[];
      routeDecision: { decision: string; reason: string; basis: string[] };
    }
  >();

  /** 导航交回的、要问学习者的问题（导航会话 id → 问题）。 */
  private readonly navQuestions = new Map<string, string>();

  /** 导航交回的资料缺口（导航会话 id → 缺什么、为什么要）。 */
  private readonly navGaps = new Map<string, string>();

  /**
   * 导航开场（会话/导航.md「开场给什么」）：触发原因、方向目标、期限、资料范围、各次学习现在的样子、
   * 主对话原文、路线事实（最近 5 次定下的与路线决定）、停车场、学过的记录上 / 中层、其他。
   * 用时现算，读当时最新的记录，不提前备好。
   */
  private async navOpening(trigger: string, mainId: string): Promise<string> {
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

    // ── 路线事实：最近 5 次定下的（路线决定、单子、开了哪次学习）──
    const cardLines: string[] = [];
    for (const { line, record } of records
      .filter((r) => r.record.type === 'choice_card')
      .slice(-5)) {
      if (record.type !== 'choice_card') continue;
      const rd = records.find(
        (r) => r.record.type === 'route_decision' && r.record.navSessionId === record.navSessionId,
      );
      const made = records.find(
        (r) => r.record.type === 'choice_made' && r.record.cardId === record.cardId,
      );
      const o = record.options[made?.record.type === 'choice_made' ? made.record.option : 0];
      cardLines.push(
        `- ${record.at.slice(0, 10)}（主对话 L${String(line)}）触发：${record.trigger}；定下「${o?.title ?? ''}」${o?.ticket.newPoint ?? ''}${made?.record.type === 'choice_made' ? ` → 学习 ${made.record.loopSessionId}` : ''}`,
      );
      if (rd?.record.type === 'route_decision') {
        cardLines.push(
          `  路线决定 L${String(rd.line)}：${rd.record.decision}（理由：${rd.record.reason}；依据：${rd.record.basis.join('、')}）`,
        );
      }
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

    return [
      `触发原因：${trigger}`,
      '',
      goal !== undefined
        ? describeGoal(goal.goal)
        : '方向目标：（还没有；按默认先验——高中以上、脱离应试——出临时选项，标“临时”）',
      '',
      `期限：${deadline !== undefined ? this.deadlineText(foldDeadline(main)) : '没有记'}`,
      '',
      await this.instructionsBlock(mainId),
      '',
      scope.length > 0
        ? `本项目的资料（资料定范围：这个人要学会什么；每份 id｜标题｜种类｜版本｜日期｜状态｜角色）：\n${(await this.materialLines(scope)).join('\n')}`
        : '本项目还没有能用的资料（缺资料依据）：按方向说明与学过的记录推，候选里资料核不了的标“模型补的”。',
      '',
      '── 各次学习现在的样子 ──',
      ...(await this.learningsNow(mainId)),
      '',
      '── 主对话原文（学习者在主对话里说过的，最近的）──',
      this.recentMessages(records, Number.POSITIVE_INFINITY, 60, 600) || '（还没有）',
      '',
      '── 路线事实（最近 5 次定下的）──',
      cardLines.join('\n') || '（还没有）',
      '',
      '── 停车场（没合上的学习，上层；完整对话用 read_session 读）──',
      parked.map((p) => `- ${this.learned.parkedLine(p)}`).join('\n') || '空',
      '',
      '── 学过的记录（上层 / 中层）──',
      ...learnedLines,
      totalLine,
      ...elseLine,
      '',
      ...(learned.imports.length > 0
        ? [
            `外部导入（学习者在系统之外学到的：畅谈里说的 / 笔记里写的 / 别处跟 AI 学的对话；未验证，可信度低于学习记录，学习里的证据永远优先，可以怀疑，不算“已合上过”；笔记与对话记录的全文用 retrieve 查）：\n${learned.imports.map((x) => `- ${this.learned.importLine(x)}（未验证）`).join('\n')}`,
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
            at: z.string().optional().describe('教材出处“资料id/文件:行号”'),
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
      name: 'submit_next',
      description:
        '交回定下的下一次学习（一张单子）与这次的路线决定；交回后程序直接开这次学习。只提交一次。',
      input: {
        next: ticketShape,
        route_decision: z.object({
          decision: z.string().describe('这次走哪条路（含“维持”），一句话'),
          reason: z.string().describe('为什么这样定'),
          basis: z
            .array(z.string())
            .min(1)
            .describe('理由的依据，每条“会话 id:行号”或“资料id/文件:行号”'),
        }),
        roles: z
          .array(
            z.object({
              material: z.string().describe('资料 id'),
              value: z.enum(['主资料', '参考资料']),
            }),
          )
          .optional()
          .describe(
            '可选：你读过的资料在这个项目里是主资料（目标所在、定范围）还是参考资料（补讲法与细节）；界面会显示',
          ),
      },
      run: async (a) => {
        if (this.cards.has(sessionId)) return err('已经交回过了');
        if (this.navQuestions.has(sessionId)) return err('已经交回了要问学习者的问题');
        // 假模型直接调 run、不经 zod（工单 README §4.2）：这里按“字段可能缺”的宽松形状收，逐条核
        const raw = [a.next] as {
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
        if (a.next === undefined || a.next === null) return err('缺 next（定下的那张单子）');

        // 路线决定：必有，决定与理由非空，依据至少一条且每条都能定位
        const basis = Array.isArray(decision?.basis) ? decision.basis : [];
        if (blank(decision?.decision)) problems.push('路线决定缺 decision（这次走哪条路）');
        if (blank(decision?.reason)) problems.push('路线决定的 reason 不能是空的');
        if (basis.length === 0) problems.push('路线决定的 basis 至少给一条依据');
        for (const b of basis) {
          const at = await locate(b, this.locateDeps(sessionId));
          if (!at.ok) problems.push(`路线决定的依据 ${b} 定位不了`);
        }

        const options: ChoiceOption[] = [];
        for (const [i, o] of raw.entries()) {
          const n = i === 0 ? '单子' : `第 ${String(i + 1)} 项`;
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
              const at = await locate(sp.ref, this.locateDeps(sessionId));
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
              const at = await locate(c.at, this.locateDeps(sessionId));
              if (at.kind !== 'book')
                problems.push(`${n}的出处 ${c.at} 不是资料里的一行（要写 资料id/文件:行号）`);
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
        const roles = (a.roles ?? []) as { material?: string; value?: string }[];
        const scope = await this.scopeOf(sessionId);
        for (const r of roles) {
          if (r.material === undefined || !scope.includes(r.material)) {
            problems.push(`roles 里的 ${r.material ?? '（空）'} 不是本项目的资料`);
          } else if (r.value !== '主资料' && r.value !== '参考资料') {
            problems.push(`roles 里 ${r.material} 的 value 要是 主资料 / 参考资料`);
          }
        }
        if (problems.length > 0) return err(`${problems.join('；')}。改好后重新提交`);
        for (const r of roles) {
          await this.o.materials.setRole(
            r.material ?? '',
            r.value as '主资料' | '参考资料',
            sessionId,
          );
        }
        this.cards.set(sessionId, {
          options,
          routeDecision: {
            decision: decision?.decision ?? '',
            reason: decision?.reason ?? '',
            basis: [...basis],
          },
        });
        return ok('收到，程序这就开这次学习');
      },
    };
  }

  /** 导航缺一个只有学习者知道的事实时：交回一个问题，由主对话顺口问（会话/导航.md「交回什么」）。 */
  private askLearnerTool(sessionId: string): ToolSpec {
    return {
      name: 'ask_learner',
      description:
        '缺一个只有学习者知道、又会改变下一步的事实时（比如应用外最近学到哪）调用：交回一个问题，主对话会顺口问，问到后再开一次导航。和 submit_next 二选一，只调一次。',
      input: { question: z.string().describe('要问学习者的事，一句日常话') },
      run: (a) => {
        if (this.cards.has(sessionId)) return err('已经交回过下一步了');
        const q = (a.question as string | undefined)?.trim() ?? '';
        if (q === '') return err('问题不能是空的');
        this.navQuestions.set(sessionId, q);
        return ok('问题已交回主对话');
      },
    };
  }

  /** 导航发现资料缺一段时：交回缺什么，由主对话向学习者提议去找（会话/找资料.md「何时开」）。 */
  private materialGapTool(sessionId: string): ToolSpec {
    return {
      name: 'propose_find_materials',
      description:
        '本项目资料缺了路线上要用的一段（如讲某块的原文、代码仓库里没有的配置或论文）时调用：交回缺什么、为什么要，主对话会向学习者提议去找资料。不自己去找、不代替 submit_next / ask_learner，照常交下一步；以最后一次为准。',
      input: {
        gap: z.string().describe('缺什么资料、路线上哪一段要用它，一两句日常话'),
      },
      run: (a) => {
        const g = (a.gap as string | undefined)?.trim() ?? '';
        if (g === '') return err('缺什么不能是空的');
        this.navGaps.set(sessionId, g);
        return ok('收到，主对话会向学习者提议去找；你照常交下一步');
      },
    };
  }

  /** 定位依据串；给了 sessionId 时资料须属于这个会话所在的项目（工单 W8 §4.4）。 */
  private locateDeps(sessionId?: string): LocateDeps {
    return {
      hub: this.hub,
      sources: this.o.sources,
      ...(sessionId !== undefined ? { scope: () => this.scopeOf(sessionId) } : {}),
      importText: (id) => this.importText(id),
    };
  }

  /** 一条外部导入的正文（依据定位用）；没有这条导入或它没有正文给 undefined。 */
  private async importText(id: string): Promise<string | undefined> {
    const one = (await this.learned.imports()).find((x) => x.id === id);
    return one !== undefined ? this.learned.importText(one) : undefined;
  }

  /** 学习者给一本书 / 笔记补一句来源说明（只追加）。 */
  async addSourceNote(book: string, field: string, text: string): Promise<SourceNoteView> {
    await this.o.cross.addNote({ book, field, text, by: '学习者' });
    return this.o.cross.sourceNote(book);
  }

  /** 学习者给一条状态记录补“我的解释”：只追加，不改原记录；下次整理时当自述读到。 */
  async addStateExplanation(recordId: string, text: string): Promise<StateExplanationView> {
    if (this.o.state.record(recordId) === undefined) {
      throw new BadRequestError(`找不到这条状态记录：${recordId}。`);
    }
    const t = text.trim();
    if (t === '') throw new BadRequestError('解释不能是空的。');
    const e = { id: this.newId('ex'), at: this.iso(), recordId, text: t };
    await this.o.state.addExplanation(e);
    return e;
  }

  /** 读一次会话的对话原文（带行号）；状态整理、导航、检索子代理三处共用（工单 §4.6）。 */
  private readSessionTool(): ToolSpec {
    return {
      name: 'read_session',
      description:
        '读某个会话（项目主对话 / 谈方向 / 一次学习）里学习者与教学的对话原文，带行号与时间；不含沙盒动作与判定。',
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

  /**
   * 读一条外部导入（笔记 / 别处 AI 对话记录）的正文，带行号；畅谈没有沙盒，看学习者已储备什么要靠它
   * （会话/畅谈.md「能读什么」）。给 query 只列含它的行。
   */
  private readImportTool(): ToolSpec {
    const page = 400;
    return {
      name: 'read_import',
      description: `读一条外部导入（学习者的笔记、在别处跟 AI 学的对话记录）的正文，带行号；一次最多 ${String(page)} 行，用 from_line 往下翻；给 query 只列含它的行。内容是学习者自述的经历，未验证、不算学会。`,
      input: {
        id: z.string().describe('导入 id（list_learned 里有，形如 imp-…）'),
        from_line: z.number().int().optional(),
        query: z.string().optional(),
      },
      run: async (a) => {
        const one = (await this.learned.imports()).find((x) => x.id === a.id);
        if (one === undefined) return err(`没有这条导入：${a.id as string}`);
        const text = await this.learned.importText(one);
        if (text === undefined)
          return err('这条导入没有正文（畅谈里说的，用 read_session 读那一行）');
        const lines = text.split('\n');
        const numbered = lines.map((l, i) => `${String(i + 1)}\t${l}`);
        const q = a.query as string | undefined;
        if (q !== undefined && q !== '') {
          const hits = numbered.filter((_, i) => lines[i]?.includes(q) === true);
          return ok(
            `共 ${String(hits.length)} 行含“${q}”（全文 ${String(lines.length)} 行）：\n${hits.slice(0, 80).join('\n')}`,
          );
        }
        const from = Math.max(1, (a.from_line as number | undefined) ?? 1);
        const slice = numbered.slice(from - 1, from - 1 + page);
        const end = from - 1 + slice.length;
        return ok(
          `《${one.title ?? one.id}》第 ${String(from)}–${String(end)} 行，共 ${String(lines.length)} 行${end < lines.length ? `；往下读 from_line=${String(end + 1)}` : ''}：\n${slice.join('\n')}`,
        );
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
      '用 submit_findings 交回至多 5 条，每条一句话 + 能定位的 ref（会话 id:行号 / 资料id/文件:行号）；没找到交空数组；只交一次。不下结论、不出路线。',
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
        '交回找到的几条（至多 5 条）：每条一句话 + 能定位的 ref（会话 id:行号 / 资料id/文件:行号 / 外部导入/<导入 id>.md:行号）；没找到交空数组。只交一次。',
      input: {
        findings: z.array(
          z.object({
            text: z.string().describe('一句话：找到了什么'),
            ref: z
              .string()
              .describe('会话 id:行号、资料id/文件:行号 或 外部导入/<导入 id>.md:行号'),
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
          const at = await locate(f.ref ?? '', this.locateDeps(sessionId));
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
  private listLearnedTool(sessionId: string, importText = false): ToolSpec {
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
            `- ${this.learned.importLine(x)}（未验证，不算学会${importText && 'file' in x.ref ? '；正文用 read_import 读' : ''}）`,
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
   * 主对话每轮附上的当前事实（会话/主对话.md「每轮附上的事实」）：方向说明、期限、各次学习现在的样子、
   * 最新路线决定。主对话上下文是连续的；只有新开模型对话（没有可续接的）时才从记录补上最近的消息。
   */
  private async mainPreface(mainId: string, inputLine: number, fresh: boolean): Promise<string> {
    const records = await this.hub.records(mainId);
    const goal = currentGoal(records);
    const deadline = foldDeadline(records.map((r) => r.record));
    const decision = records.filter((r) => r.record.type === 'route_decision').at(-1);
    const out = [
      '程序附上的当前事实（每轮刷新，以这里为准）',
      goal !== undefined ? describeGoal(goal.goal) : '方向目标：还没有',
      `期限：${deadline.deadline !== undefined ? this.deadlineText(deadline) : '没有记'}`,
      await this.instructionsBlock(mainId),
      '── 各次学习现在的样子 ──',
      ...(await this.learningsNow(mainId)),
      decision?.record.type === 'route_decision'
        ? `最新路线决定 L${String(decision.line)}：${decision.record.decision}（理由：${decision.record.reason}）`
        : '还没有路线决定',
    ];
    if (fresh) {
      out.push(
        '── 前面说过的（这次是新接上的对话，从记录补上最近的）──',
        this.recentMessages(records, inputLine, 30, 300) || '（还没有）',
      );
    }
    return out.join('\n');
  }

  /** 本项目各次学习现在的样子：在学 / 搁着 / 学完（记录/单子与路线.md「全局」）。 */
  private async learningsNow(mainId: string): Promise<string[]> {
    const { learnings } = await this.learned.list(mainId);
    const parked = new Set((await this.learned.parked(mainId)).map((p) => p.learning.loopId));
    const shelved = new Set<string>();
    for (const l of learnings) {
      if (l.status === '进行中' && foldLoop(await this.hub.records(l.loopId)).shelved !== undefined)
        shelved.add(l.loopId);
    }
    const row = (l: (typeof learnings)[number]): string =>
      `- ${l.loopId}「${l.title}」${l.openedAt.slice(0, 10)}：${l.ticket.newPoint}`;
    const inProgress = learnings.filter((l) => l.status === '进行中' && !shelved.has(l.loopId));
    const waiting = learnings.filter((l) => shelved.has(l.loopId) || parked.has(l.loopId));
    const done = learnings.filter((l) => l.status === '合上').slice(-8);
    if (learnings.length === 0) return ['还没有开过学习'];
    return [
      `在学（${String(inProgress.length)}）：`,
      ...inProgress.map(row),
      `搁着（${String(waiting.length)}）：`,
      ...waiting.map(
        (l) => `${row(l)}${l.endNote !== undefined ? `；停下时说：${l.endNote}` : ''}`,
      ),
      `学完（共 ${String(learnings.filter((l) => l.status === '合上').length)}，最近的）：`,
      ...done.map(row),
    ];
  }

  /** 主对话里 inputLine 之前的学习者 / 主对话 / 程序消息，取最后 n 条。 */
  private recentMessages(
    records: NumberedRecord[],
    inputLine: number,
    n: number,
    cut: number,
  ): string {
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
            ? '主对话'
            : '程序';
      const text = record.text.length > cut ? `${record.text.slice(0, cut)}…` : record.text;
      messages.push(`L${String(line)} ${who}：${text}`);
    }
    return messages.slice(-n).join('\n');
  }

  private mainTools(mainId: string): ToolSpec[] {
    return [
      ...this.longterm.mainTools(mainId),
      {
        name: 'open_goal_talk',
        description:
          '学习者说出新的学习方向、想改方向，或学了几次之后远处能看清一层、要把方向往远推时调用：在他刚才这条消息下开一个单独谈方向的对话。主对话自己不谈方向。',
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
              await this.instructionsBlock(mainId),
              ...(goal !== undefined
                ? [
                    `已有方向（主对话 L${String(goal.line)}，${goal.goal.at.slice(0, 10)}）：`,
                    describeGoal(goal.goal),
                    ...(deadline !== undefined ? [`期限：${deadline}`] : []),
                    '── 各次学习现在的样子 ──',
                    ...(await this.learningsNow(mainId)),
                  ]
                : []),
              '',
              goal !== undefined
                ? '接着学习者这句话谈：在已有方向上接着推，不推倒重来。'
                : '接着学习者这句话谈。',
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
        name: 'plan_next',
        description:
          '学习者要下一步时调用：另开一个会话把下一次学什么想清楚、定下来并直接开这次学习（要几分钟，学习者可点进去看它怎么想的）；它也可能先要问学习者一件事。学习者不想学上次定的那个时，同样调用，把他的话写进 reason。',
        input: { reason: z.string().describe('学习者怎么说的、为什么现在要下一步，一两句') },
        run: async (a) => {
          const r = await this.planNext(`学习者在主对话里要下一步：${a.reason as string}`, mainId);
          const said =
            r.kind === 'opened'
              ? `定下了，学习对话已开：「${r.title}」。为什么是它：${r.reason}。跟学习者说一句学什么、为什么，入口已经放在主对话里。`
              : `想下一步之前要先问学习者一件事：${r.question}。顺口问他；他答了再调用 plan_next，把他的回答写进 reason。`;
          return ok(
            r.materialGap !== undefined
              ? `${said}\n另外，项目资料里缺一段：${r.materialGap}。顺带问学习者要不要去找；他说要，再调用 find_materials，request 里写上缺什么。`
              : said,
          );
        },
      },
      this.listLearnedTool(mainId),
      {
        name: 'find_materials',
        description:
          '学习者要找资料时调用（如“帮我找讲 SVD 的好资料”）：在他这条消息下开一个找资料的对话，联网搜、列候选，学习者勾了才存进本项目资料。主对话自己不搜。',
        input: {
          request: z
            .string()
            .describe('学习者的原话；是答应了去补之前提的资料缺口时，连同缺什么一起写'),
        },
        run: async (a) => {
          const recs = await this.hub.records(mainId);
          const asked = recs.filter((r) => r.record.type === 'user_message').at(-1);
          if (asked?.record.type !== 'user_message') return err('主对话里还没有学习者的话');
          const title = '找资料';
          const find = await this.hub.createSession('find', {
            title,
            parent: mainId,
            anchorLine: asked.line,
          });
          await this.hub.send(find.sessionId, {
            role: 'program',
            text: await this.findOpening(mainId, a.request as string, asked.line),
          });
          await this.hub.record(mainId, {
            type: 'task_opened',
            at: this.iso(),
            sessionId: find.sessionId,
            kind: 'find',
            title,
            anchorLine: asked.line,
          });
          return ok(
            '已在学习者这条消息下开了找资料的对话；候选列出来后学习者在那里勾，存了几份程序会告诉你。',
          );
        },
      },
      {
        name: 'remember',
        description:
          '学习者明确要你记住一件长期的事（“记住我用 Linux”“以后别先给答案”）时调用：给出改后的项目说明全文（在现有的上面增删改，其余照留）。只记学习者明确要求记的；随口说的、你自己推断的不记。写完跟学习者说一句改了什么。',
        input: { text: z.string().describe('改后的项目说明全文') },
        run: async (a) => {
          const recs = await this.hub.records(mainId);
          const asked = recs.filter((r) => r.record.type === 'user_message').at(-1);
          try {
            const now = await this.setInstructions(mainId, a.text as string, 'main', asked?.line);
            return await ok(`已存。现在的项目说明：\n${now.text || '（空）'}`);
          } catch (e) {
            if (e instanceof BadRequestError) return await err(e.message);
            throw e;
          }
        },
      },
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
            (opened.kind !== 'loop' &&
              opened.kind !== 'talk' &&
              opened.kind !== 'output' &&
              opened.kind !== 'find')
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

  // ───────────── 学习对话 ─────────────

  /**
   * 学习对话的工具：只有两个命令（工单 W4 §5.5）。资料、学过的记录、状态、教法记录与教学工具
   * 都在沙盒里当只读文件读，不再各挂一个工具；工作区是模型自己的草稿（沙盒动作，程序当场记）。
   */
  private loopTools(loopId: string): ToolSpec[] {
    return [
      {
        name: 'request_close',
        description:
          '你和学习者都觉得这次学完了时调用：程序另开一个独立会话，只按学习者实际说的、做的写下这次学到了什么；写好后请学习者确认结束。',
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

  // ───────────── 状态记录（存放处 + 后台整理）─────────────

  /** 排一次状态整理（`docs/设计/会话/后台整理.md`）；force = 守卫重新确认请求，没有新记录也跑。 */
  organizeStateLater(trigger: string, from?: string, force = false): void {
    const run = this.stateChain.then(() => this.organizeState(trigger, from, force));
    // 链上只管排队：这次失败不挡下一次；失败本身由 background 写进核心日志
    this.stateChain = run.catch(() => undefined);
    this.background('状态整理', () => run);
  }

  private async organizeState(trigger: string, from: string | undefined, force: boolean) {
    const covered = this.o.state.covered();
    const facts = await this.stateFacts(covered);
    // 学习者对状态记录提的异议，上次整理之后新来的也算新记录
    const lastRun = this.o.state.lastRunAt();
    const fresh = this.o.objections
      .all()
      .filter((o) => o.target.kind === 'state' && (lastRun === undefined || o.at > lastRun));
    // 学习者在界面上对状态记录的确认 / 否认，也算上次整理之后的新记录
    const freshConfirmations = this.o.state
      .allConfirmations()
      .filter((c) => lastRun === undefined || c.at > lastRun);
    // 学习者给状态记录补的“我的解释”，同样算上次整理之后的新记录
    const freshExplanations = this.o.state
      .allExplanations()
      .filter((e) => lastRun === undefined || e.at > lastRun);
    // 没有新记录不整理
    if (
      facts.newLearnerLines === 0 &&
      fresh.length === 0 &&
      freshConfirmations.length === 0 &&
      freshExplanations.length === 0 &&
      !force
    ) {
      return;
    }
    const objections = this.o.objections.all().filter((o) => o.target.kind === 'state');
    const s = await this.hub.createSession('state', {
      title: '整理学习者状态',
      ...(from !== undefined ? { parent: from } : {}),
    });
    await this.hub.send(s.sessionId, {
      role: 'program',
      text: [
        `触发原因：${trigger}`,
        '',
        this.o.state.describeCurrent(),
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
      await this.o.state.addRun({
        at: this.iso(),
        trigger,
        stateSessionId: s.sessionId,
        covered: facts.covered,
      });
    }
  }

  /**
   * 交给状态整理的事实（与守卫取不同的字段，`docs/设计/会话/后台整理.md`）——时间、间隔、停顿、中断与停下的地方、
   * 学习者的话（含紧邻的前一句教学作前序事件）。不给模型一侧的沙盒动作、守卫判定，也不给“合上没有”。
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
          `${localMinute(firstLearner.record.at)}（${label[x.kind as keyof typeof label]}）`,
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
          ? `学习者选择先停下（${localMinute(ended.record.at)}）`
          : ended
            ? `已结束（${localMinute(ended.record.at)}）`
            : '还开着';
      out.push(
        [
          `### ${kindLabel} ${x.sessionId}「${x.title}」`,
          `开始 ${localMinute(x.openedAt)}；最近一条 ${localMinute(recs.at(-1)?.record.at ?? '')}；${stopped}；这次新增学习者的话 ${String(freshLearner.length)} 条`,
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
        const rows = this.o.state.allRecords();
        if (rows.length === 0 && !this.o.state.current()) {
          return ok('还没有状态记录（按无状态约束）');
        }
        const parts = [this.o.state.describeCurrent()];
        if (a.detail === true || !this.o.state.current()) {
          parts.push(
            '',
            '状态记录：',
            ...rows.map((r) => this.o.state.describeRecord(r) + this.objectionNotes('state', r.id)),
          );
        }
        return ok(parts.join('\n'));
      },
    };
  }

  /** 状态整理会话的工具：读学习对话（不含沙盒动作与判定）、读自己的底层，只写自己的两层。 */
  private stateTools(stateId: string): ToolSpec[] {
    return [
      this.readSessionTool(),
      {
        name: 'read_state_records',
        description: '读状态记录自己的底层记录（全部）与当前状态页。',
        input: {},
        run: () =>
          ok(
            [
              this.o.state.describeCurrent(),
              '',
              ...this.o.state
                .allRecords()
                .map((r) => this.o.state.describeRecord(r) + this.objectionNotes('state', r.id)),
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
          await this.o.state.addRecord({
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
            stateSessionId: stateId,
            model: await this.hub.executedModel(stateId),
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
          await this.o.state.setCurrent({
            at: this.iso(),
            text: a.text as string,
            stage: a.stage as (typeof STAGES)[number],
            basisSpan: a.basis_span as string,
            stateSessionId: stateId,
            model: await this.hub.executedModel(stateId),
          });
          return ok('当前状态页已更新');
        },
      },
    ];
  }

  // ───────────── 教法记录（后台记录）─────────────

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

  /** 一次学习结束后记“这次教法管不管用”：对话原文 + 守卫判定 + 教学工具使用记录 + 单子。 */
  private async recordStrategy(loopId: string): Promise<void> {
    const opened = await this.hub.opened(loopId);
    const records = await this.hub.records(loopId);
    // 学习者改过单子就按改后的记（工单 W6 §4.1：凡“现在的单子”都走 currentTicket）
    const now = currentTicket(records);
    const verdicts = records.flatMap((r) =>
      r.record.type === 'guard_verdict'
        ? [
            `L${String(r.line)} ${r.record.closed ? '合上' : '未合上'}：${r.record.problem ?? r.record.basis}（证据行 ${r.record.lines.join('、') || '无'}）`,
          ]
        : [],
    );
    const ended = records.find((r) => r.record.type === 'loop_ended');
    // 用了哪份教学工具由程序从工具调用里读（`docs/设计/记录/教法记录与教学工具.md`），不靠模型自报
    const toolUses = toolUsesOf(records);
    const toolsUsed = [...new Set(toolUses.map((u) => u.name))];
    // 教法记录整理对状态成因的自查：状态记录里有“出现在某段教学之后”标注的，先查自己的教法是不是成因
    const annotated = this.o.state
      .allRecords()
      .filter((r) => r.afterTeaching !== undefined)
      .slice(-5);
    const s = await this.hub.createSession('pedagogy', { title: '记教法效果', parent: loopId });
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
        `单子：${now !== undefined ? this.describeTicket(now) : '（缺）'}`,
        `结束：${ended?.record.type === 'loop_ended' ? (ended.record.closed ? '合上（学习者已确认）' : '没合上就结束') : '（缺）'}`,
        '',
        `守卫判定：\n${verdicts.join('\n') || '（没申请过收口）'}`,
        '',
        `教学工具使用记录（程序从沙盒动作里记的）：${toolUses.map((u) => `L${String(u.line)} 教学工具:${u.name}`).join('、') || '这次学习没读教学工具，只能从对话原文看用了什么做法'}`,
        '',
        ...(annotated.length > 0
          ? [
              `状态记录里带“出现在 X 之后”标注的（先自查：自己的教法是不是这些状态的成因，不要直接当作学习者固有的状态；提交时 self_check 里写自查）：\n${annotated.map((r) => this.o.state.describeRecord(r)).join('\n')}`,
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

  private strategyTool(pedagogyId: string): ToolSpec {
    return {
      name: 'write_strategy_record',
      description:
        '写一条个人策略过程记录（这份记录不属于学过的记录）：当时学习者的表现与状态条件、用了哪些做法、之后表现怎么变；引用写这次学习的行号。单次记录不证明因果。',
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
        const target = this.strategyTargets.get(pedagogyId);
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
        await this.o.pedagogy.add({
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
          pedagogySessionId: pedagogyId,
          model: await this.hub.executedModel(pedagogyId),
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

  /** 这次学习还开着、且不是搁置着（要收口 / 确认合上）。 */
  private async assertActiveLoop(loopId: string): Promise<void> {
    await this.assertOpenLoop(loopId);
    await this.assertNotShelved(loopId);
  }

  /** 搁置着的那次不能收口 / 确认合上：先恢复。 */
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

  /** 资料范围的说明，接在工具结果后面。 */
  private scopeHint(scope: string[]): string {
    return `\n（只在本项目的 ${String(scope.length)} 份资料里查）`;
  }

  /** 资料清单：每份一行（id、标题、种类、版本、日期、状态、角色），给工具与沙盒目录共用。 */
  async materialLines(ids: string[]): Promise<string[]> {
    const out: string[] = [];
    for (const id of ids) {
      const s = await this.o.materials.source(id);
      if (s === undefined) continue;
      out.push(
        `- ${id}｜${s.title}｜${s.kind}｜版本 ${s.version || '—'}｜${s.fetchedAt.slice(0, 10)}｜${s.status}${s.role !== undefined ? `｜${s.role.value}` : ''}${s.problems !== undefined ? `｜有问题：${s.problems.join('；')}` : ''}`,
      );
    }
    return out;
  }

  /** 只读查询工具：本项目资料的原文与出处（按记录/读写权限.md）；资料归项目，不查别处。 */
  private readTools(sessionId: string): ToolSpec[] {
    const inScope = async (book: string): Promise<string | undefined> => {
      const scope = await this.scopeOf(sessionId);
      return scope.includes(book)
        ? undefined
        : `本项目没有这份资料：${book}（资料归项目，不读别处）`;
    };
    const tools: ToolSpec[] = [];
    tools.push(
      {
        name: 'textbook_index',
        description:
          '不给资料 id：列出本项目的资料（PDF、网页、代码仓库、字幕、文字等，每份一行：id、标题、种类、版本、日期、状态、角色）；给资料 id：读这份资料的文件清单。',
        input: { book: z.string().optional().describe('资料 id') },
        run: async (a) => {
          const book = a.book as string | undefined;
          if (book === undefined || book === '') {
            const scope = await this.scopeOf(sessionId);
            if (scope.length === 0) return ok('本项目还没有能用的资料（缺资料依据）');
            return ok((await this.materialLines(scope)).join('\n'));
          }
          const bad = await inScope(book);
          if (bad !== undefined) return err(bad);
          return ok((await this.o.materials.index(book)) + (await this.o.cross.noteLines([book])));
        },
      },
      {
        name: 'read_source',
        description:
          '读资料里一个文件的原文，每行前印行号；可只读一段。末尾给出引用这段时要附的出处标记。',
        input: {
          book: z.string().describe('资料 id'),
          file: z.string().describe('文件清单里的路径，如 p1-200.md 或 src/main.py'),
          from_line: z.number().int().optional(),
          to_line: z.number().int().optional(),
        },
        run: async (a) => {
          const book = a.book as string;
          const file = a.file as string;
          const bad = await inScope(book);
          if (bad !== undefined) return err(bad);
          const r = await this.o.materials.lines(
            book,
            file,
            (a.from_line as number | undefined) ?? 1,
            (a.to_line as number | undefined) ?? Number.MAX_SAFE_INTEGER,
          );
          const body = r.lines.map((l) => `${String(l.n)}\t${l.text}`).join('\n');
          return ok(
            (r.lines.length === 0
              ? `（这个文件共 ${String(r.total)} 行，没有第 ${String((a.from_line as number | undefined) ?? 1)} 行起的内容）`
              : `${body}\n\n（引用上面的话时，在那句话后附：${formatCitation({ book, file, from: r.from, to: r.to })}；依据串写 ${book}/${file}:${String(r.from)}，行段按你实际引用的缩小）`) +
              (await this.o.cross.noteLines([book])),
          );
        },
      },
      {
        name: 'search_textbook',
        description:
          '在本项目资料的原文里全文检索（词用空白隔开，要同时出现在同一段里）。返回资料、文件、行号、片段和可直接用的出处标记。想引用原文、核对资料怎么说时用；搜不到就是资料里没有。',
        input: {
          query: z.string(),
          book: z.string().optional().describe('只搜这一份（资料 id）'),
          limit: z.number().int().optional().describe('最多几条，默认 10'),
        },
        run: async (a) => {
          const book = (a.book as string | undefined) || undefined;
          if (book !== undefined) {
            const bad = await inScope(book);
            if (bad !== undefined) return err(bad);
          }
          const scope = await this.scopeOf(sessionId);
          if (scope.length === 0) return ok('本项目还没有能用的资料（缺资料依据）');
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

/** 教学行只取开头一段（状态整理用作紧邻前序事件）。 */
function excerpt(r: NumberedRecord): string {
  const t = renderTranscript([r]);
  return t.length > TEACHING_EXCERPT ? `${t.slice(0, TEACHING_EXCERPT)}…` : t;
}

function verdictFact(v: GuardVerdict): string {
  if (v.problem !== undefined) return `收尾记录没写成（${v.problem}）。可以再申请一次。`;
  return `收尾记录：${v.basis}\n请学习者确认结束；学习者在界面上确认后这次学习结束。`;
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

/** 把 project_material 记录折叠成项目当前的资料（按加入顺序）。 */
export function foldMaterials(recs: LogRecord[]): { book: string; addedAt: string }[] {
  const out = new Map<string, string>();
  for (const r of recs) {
    if (r.type !== 'project_material') continue;
    const id = r.material;
    if (id === undefined) continue;
    if (r.op === 'add') {
      if (!out.has(id)) out.set(id, r.at);
    } else {
      out.delete(id);
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

/** 比对网址是否同一份：去掉结尾斜杠与 #片段，主机名小写。 */
function normalUrl(u: string): string {
  try {
    const x = new URL(u.trim());
    x.hash = '';
    return x.href.replace(/\/+$/, '');
  } catch {
    return u.trim();
  }
}
