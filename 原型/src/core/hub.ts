// 会话管理：每个会话一个正本（只追加）+ 一个模型侧对话；一个会话一次只跑一轮，后到的输入排队。
// 不认识具体会话的职责：系统提示与工具由 kinds 按会话种类给出（studium.ts 组装）。
// 事件（新记录、流式增量、进行中状态）推给订阅者（SSE）。
import { randomBytes } from 'node:crypto';
import {
  MODEL_FALLBACK_MARK,
  modelInfoOf,
  type ModelInfo,
  type SessionSummary,
  type ServerEvent,
} from '../shared/protocol.ts';
import {
  TEACHING_TOOL_TAG,
  type ConversationKind,
  type ImageInput,
  type LogRecord,
  type NumberedRecord,
  type ResumeOrigin,
  type ReviewWindow,
  type SessionOpened,
  type Ticket,
} from '../shared/records.ts';
import { localMinute } from '../shared/time.ts';
import type { DerivedIndex } from './index/derived-index.ts';
import { isSessionId, type DataDir } from './log/data-dir.ts';
import { readRecords, SessionLog } from './log/session-log.ts';
import type {
  ModelAdapter,
  ModelConversation,
  ModelDisclosure,
  ModelEvent,
  SandboxActionEvent,
  SandboxSpec,
  SubagentSpec,
  ToolSpec,
  TurnInput,
} from './model/port.ts';

export interface KindConfig {
  systemPrompt: string;
  /** 本会话的工具；sessionId 让工具知道自己属于哪个会话。 */
  tools(sessionId: string): ToolSpec[];
  /** 这个会话在沙盒里跑时给它的沙盒（没有 = 不给通用执行）；开模型对话时算一次。 */
  sandbox?(sessionId: string): Promise<SandboxSpec | undefined>;
  /** 每轮发给模型之前调用（插话不调）：刷新沙盒里那些每轮重渲染的只读文件。 */
  beforeTurn?(sessionId: string): Promise<void>;
  /**
   * 每轮附在输入前的当前事实（主对话用）：先记一条 turn_context 再发；模型对话照常续接、靠压缩变长。
   * fresh = 这一轮是新开的模型对话（没有可续接的），这时开场还要从记录补上前面说过的（重建只作后备）。
   * inputLine = 这条输入在正本里的行号。
   */
  preface?(sessionId: string, inputLine: number, fresh: boolean): Promise<string>;
  /** 为真时放开模型服务自带的联网搜索与网页抓取（畅谈、导航）。 */
  webSearch?: boolean;
  /** 主模型能派的子代理（学习对话的页面子代理）；开模型对话时算一次。 */
  subagents?(sessionId: string): Promise<SubagentSpec[]>;
  /**
   * 为真时按时间线交给模型：每条前面带行号与时间，不包“程序事实”标记，每条自己说清是什么
   * （学习对话，会话/学习对话.md §3「上下文里的身份与时间线」）。
   */
  timeline?: boolean;
  /**
   * 模型一轮输出完之后调（学习对话：框架照这一轮的输出摆一屏，会话/学习对话.md §11.1）。fromLine = 这一轮从正本
   * 哪一行之后开始。在下一轮开始前跑完；出错只写日志，不算这一轮失败。
   */
  afterTurn?(sessionId: string, fromLine: number): Promise<void>;
}

export interface HubOptions {
  dataDir: DataDir;
  index: DerivedIndex;
  model: ModelAdapter;
  kinds: (kind: ConversationKind) => KindConfig;
  now?: () => Date;
}

interface Live {
  log: SessionLog;
  kind: ConversationKind;
  conversation: ModelConversation | undefined;
  /** 排着的轮：一条输入，或模型自己起的一轮（子代理做完后，事件已在流里）。 */
  queue: (
    | { input: TurnInput; line: number; resolve: () => void }
    | { events: AsyncIterable<ModelEvent>; resolve: () => void }
  )[];
  running: boolean;
  idle: (() => void)[];
  /** 本轮收下的中途插话，在本轮跑完时兑现。 */
  turnWaiters: (() => void)[];
  /** 模型侧最近报告的实际执行模型。 */
  model?: string;
}

export class NotFoundError extends Error {}

export class Hub {
  private readonly live = new Map<string, Live>();
  private readonly loading = new Map<string, Promise<Live>>();
  private readonly listeners = new Set<(e: ServerEvent) => void>();
  private readonly now: () => Date;

  constructor(private readonly opts: HubOptions) {
    this.now = opts.now ?? (() => new Date());
  }

  get modelName(): string {
    return this.opts.model.name;
  }

  /**
   * 这个会话实际执行的模型名（模型侧自报）。拿不到时退回适配器名并写明是兜底，不编。
   */
  async executedModel(sessionId: string): Promise<string> {
    const used = (await this.records(sessionId))
      .map((r) => r.record)
      .filter((r) => r.type === 'model_used')
      .at(-1);
    if (used?.type === 'model_used') return used.model;
    return `${this.modelName}（适配器名；${MODEL_FALLBACK_MARK}）`;
  }

  /** 同上，给界面用：拿不到实际模型时 known 为假并带兜底说明。 */
  async modelInfo(sessionId: string): Promise<ModelInfo> {
    return modelInfoOf(await this.executedModel(sessionId));
  }

  /** 内容送往哪个服务（外发披露）；适配器没声明就是 undefined。 */
  get disclosure(): ModelDisclosure | undefined {
    return this.opts.model.disclosure;
  }

  subscribe(fn: (e: ServerEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  async createSession(
    kind: ConversationKind,
    meta: {
      title: string;
      parent?: string;
      ticket?: Ticket;
      anchorLine?: number;
      resumeOf?: ResumeOrigin;
      review?: ReviewWindow;
      /** 学习对话按屏幕跑（W10）。 */
      screens?: true;
    },
  ): Promise<SessionSummary> {
    const at = this.now();
    const sessionId = `${stamp(at)}-${kind}-${randomBytes(3).toString('hex')}`;
    const log = await SessionLog.open(this.opts.dataDir.sessionPath(sessionId));
    this.live.set(sessionId, newLive(log, kind));
    const opened: SessionOpened = {
      type: 'session_opened',
      at: at.toISOString(),
      sessionId,
      kind,
      title: meta.title,
      ...(meta.parent !== undefined ? { parent: meta.parent } : {}),
      ...(meta.ticket !== undefined ? { ticket: meta.ticket } : {}),
      ...(meta.anchorLine !== undefined ? { anchorLine: meta.anchorLine } : {}),
      ...(meta.resumeOf !== undefined ? { resumeOf: meta.resumeOf } : {}),
      ...(meta.review !== undefined ? { review: meta.review } : {}),
      ...(meta.screens === true ? { screens: true as const } : {}),
    };
    await this.append(sessionId, opened);
    return summary(opened);
  }

  listSessions(): SessionSummary[] {
    return this.opts.index.listSessions();
  }

  search(text: string): ReturnType<DerivedIndex['search']> {
    return this.opts.index.search(text);
  }

  async records(sessionId: string): Promise<NumberedRecord[]> {
    if (!isSessionId(sessionId)) throw new NotFoundError(`没有这个会话：${sessionId}`);
    try {
      return await readRecords(this.opts.dataDir.sessionPath(sessionId));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new NotFoundError(`没有这个会话：${sessionId}`);
      }
      throw err;
    }
  }

  async opened(sessionId: string): Promise<SessionOpened> {
    const first = (await this.records(sessionId))[0]?.record;
    if (first?.type !== 'session_opened') throw new Error(`${sessionId} 正本缺开头记录`);
    return first;
  }

  isRunning(sessionId: string): boolean {
    const l = this.live.get(sessionId);
    return l !== undefined && (l.running || l.queue.length > 0);
  }

  /**
   * 记下一条输入（学习者的话或程序事实），排进这个会话的队列。
   * 返回时输入已落盘；done 在这条输入那一轮跑完时兑现。
   */
  async send(
    sessionId: string,
    input: TurnInput,
    meta: {
      objection?: { toLine: number };
      images?: ImageInput[];
      /** 这条输入已经记在正本这一行（如学习者在组件上的操作）：不再另记，只交给模型。 */
      recorded?: number;
      /** 学习者在屏幕上某一块下面回的（会话/学习对话.md §11.3）：记成和那块有关；交给模型时写那块的一句话。 */
      replyTo?: { key: string; pointer: string };
    } = {},
  ): Promise<{ line: number; done: Promise<void> }> {
    const live = await this.ensureLive(sessionId);
    const objection = input.role === 'learner' ? meta.objection : undefined;
    const images = input.role === 'learner' ? meta.images : undefined;
    const replyTo = input.role === 'learner' ? meta.replyTo : undefined;
    const line =
      meta.recorded ??
      (await this.append(
        sessionId,
        input.role === 'learner'
          ? {
              type: 'user_message',
              at: this.iso(),
              text: input.text,
              ...(objection !== undefined ? { objection } : {}),
              ...(images !== undefined && images.length > 0 ? { images } : {}),
              ...(replyTo !== undefined ? { replyTo } : {}),
            }
          : { type: 'program_fact', at: this.iso(), text: input.text },
      ));
    // 证据引用照模型最顺手的方式：交给模型的每条消息前印它在正本里的行号（00 原则 8）；
    // 按时间线的会话再带上时间、不包标记
    const timeline = this.opts.kinds(live.kind).timeline === true;
    const delivered: TurnInput = {
      role: input.role,
      ...(timeline ? { plain: true } : {}),
      text: `[第 ${String(line)} 行${timeline ? ` · ${localMinute(this.iso())}` : ''}] ${
        objection !== undefined
          ? `（学习者对第 ${String(objection.toLine)} 行的守卫判定提出异议）`
          : ''
      }${replyTo !== undefined ? `（回在「${replyTo.pointer}」下面）` : ''}${input.text}`,
    };
    let resolve!: () => void;
    const done = new Promise<void>((r) => (resolve = r));
    // 中途插话：本轮还在跑就交给正在跑的模型对话，它在下一个停顿处看到；
    // 适配器不支持或本轮已在收尾时，退回排队成新一轮（04「实现时要守的」流式输入）
    if (live.running && live.conversation?.interject?.(delivered) === true) {
      live.turnWaiters.push(resolve);
      return { line, done };
    }
    live.queue.push({ input: delivered, line, resolve });
    if (!live.running) void this.drain(sessionId, live);
    return { line, done };
  }

  /** 追加一条程序记录（不发给模型）。 */
  async record(sessionId: string, record: LogRecord): Promise<number> {
    await this.ensureLive(sessionId);
    return this.append(sessionId, record);
  }

  /** 等这个会话的队列跑空。 */
  async idle(sessionId: string): Promise<void> {
    const live = await this.ensureLive(sessionId);
    if (!live.running && live.queue.length === 0) return;
    await new Promise<void>((r) => live.idle.push(r));
  }

  /** 有没有会话还在跑或排着队。 */
  anyRunning(): boolean {
    return [...this.live.values()].some((l) => l.running || l.queue.length > 0);
  }

  /** 等所有已打开的会话都跑空。 */
  async idleAll(): Promise<void> {
    await Promise.all([...this.live.keys()].map((id) => this.idle(id)));
  }

  async close(): Promise<void> {
    for (const [id, live] of this.live) {
      await this.idle(id);
      await live.conversation?.close();
      await live.log.close();
    }
    this.live.clear();
  }

  private async drain(sessionId: string, live: Live): Promise<void> {
    live.running = true;
    this.emit({ type: 'running', sessionId, running: true });
    const cfg = this.opts.kinds(live.kind);
    for (let item = live.queue.shift(); item; item = live.queue.shift()) {
      let fromLine: number;
      if ('events' in item) {
        fromLine = live.log.lines;
        await this.consume(sessionId, live, item.events).catch(async (err: unknown) => {
          const reason = err instanceof Error ? err.message : String(err);
          await this.append(sessionId, { type: 'turn_failed', at: this.iso(), reason });
        });
      } else {
        fromLine = item.line;
        await this.runTurn(sessionId, live, item.input, item.line);
      }
      if (cfg.afterTurn !== undefined) {
        await cfg.afterTurn(sessionId, fromLine).catch((err: unknown) => {
          console.error(`会话 ${sessionId} 一轮之后的收尾失败：`, err);
        });
      }
      item.resolve();
      for (const r of live.turnWaiters.splice(0)) r();
    }
    live.running = false;
    this.emit({ type: 'running', sessionId, running: false });
    for (const r of live.idle.splice(0)) r();
  }

  private async runTurn(
    sessionId: string,
    live: Live,
    input: TurnInput,
    inputLine: number,
  ): Promise<void> {
    const cfg = this.opts.kinds(live.kind);
    try {
      // 沙盒里每轮重渲染的只读文件（如本次对话）在这里刷新；插话不走这里（工单 W4 §5.3）
      await cfg.beforeTurn?.(sessionId);
      let delivered = input;
      const fresh = live.conversation === undefined && !(await this.resumable(sessionId));
      live.conversation ??= await this.openConversation(sessionId, live.kind, cfg);
      const text = await cfg.preface?.(sessionId, inputLine, fresh);
      if (text !== undefined && text !== '') {
        // 主对话：连续上下文，每轮附上当前事实（会话/主对话.md「每轮附上的事实」）；
        // 学习对话：攒着的页面事实（会话/学习对话.md §11）
        await this.append(sessionId, {
          type: 'turn_context',
          at: this.iso(),
          forLine: inputLine,
          text,
        });
        delivered = { ...input, preface: text };
      }
      await this.consume(sessionId, live, live.conversation.send(delivered));
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.error(`会话 ${sessionId} 本轮失败：`, err);
      await this.append(sessionId, { type: 'turn_failed', at: this.iso(), reason });
      // 模型侧对话可能已坏：丢掉，下一轮按正本里的续接凭据重开
      await live.conversation?.close();
      live.conversation = undefined;
    }
  }

  /** 一轮的事件逐条记进正本（send() 的一轮与模型自己起的一轮都经这里）。 */
  private async consume(
    sessionId: string,
    live: Live,
    events: AsyncIterable<ModelEvent>,
  ): Promise<void> {
    for await (const ev of events) await this.onEvent(sessionId, live, ev);
  }

  private async onEvent(sessionId: string, live: Live, ev: ModelEvent): Promise<void> {
    const adapter = this.opts.model.name;
    switch (ev.kind) {
      case 'text_delta':
        this.emit({ type: 'delta', sessionId, text: ev.text });
        break;
      case 'assistant_text':
        await this.append(sessionId, {
          type: 'assistant_message',
          at: this.iso(),
          text: ev.text,
        });
        break;
      case 'raw':
        await this.append(sessionId, {
          type: 'model_raw',
          at: this.iso(),
          adapter,
          payload: ev.payload,
        });
        break;
      case 'session':
        await this.append(sessionId, {
          type: 'model_session',
          at: this.iso(),
          adapter,
          token: ev.token,
        });
        break;
      case 'sandbox_action': {
        const tag = sandboxTag(ev.action);
        await this.append(sessionId, {
          type: 'sandbox_action',
          at: this.iso(),
          actor: 'model',
          ...(ev.agent !== undefined ? { agent: ev.agent } : {}),
          ...(ev.task !== undefined ? { task: ev.task } : {}),
          op: ev.action.op,
          ...(ev.action.path !== undefined ? { path: ev.action.path } : {}),
          ...(ev.action.command !== undefined ? { command: ev.action.command } : {}),
          summary: ev.action.summary,
          ok: ev.action.ok,
          ...(ev.action.content !== undefined ? { content: ev.action.content } : {}),
          ...(tag !== undefined ? { tag } : {}),
        });
        break;
      }
      case 'model':
        if (live.model !== ev.name) {
          live.model = ev.name;
          await this.append(sessionId, {
            type: 'model_used',
            at: this.iso(),
            adapter,
            model: ev.name,
          });
        }
        break;
      case 'turn_error':
        await this.append(sessionId, {
          type: 'turn_failed',
          at: this.iso(),
          reason: ev.reason,
        });
        break;
      case 'subagent':
        await this.append(
          sessionId,
          ev.phase === 'started'
            ? {
                type: 'subagent_started',
                at: this.iso(),
                agent: ev.agent,
                taskId: ev.taskId,
                ...(ev.description !== undefined ? { description: ev.description } : {}),
                ...(ev.brief !== undefined ? { brief: ev.brief } : {}),
              }
            : {
                type: 'subagent_result',
                at: this.iso(),
                agent: ev.agent,
                taskId: ev.taskId,
                status: ev.status ?? 'completed',
                text: ev.text ?? '',
              },
        );
        break;
      case 'turn_end':
        break;
    }
  }

  /** 正本里有没有这个模型服务的续接凭据。 */
  private async resumable(sessionId: string): Promise<boolean> {
    const adapter = this.opts.model.name;
    return (await this.records(sessionId)).some(
      (r) => r.record.type === 'model_session' && r.record.adapter === adapter,
    );
  }

  private async openConversation(
    sessionId: string,
    kind: ConversationKind,
    cfg: KindConfig,
  ): Promise<ModelConversation> {
    const sandbox = await cfg.sandbox?.(sessionId);
    const subagents = sandbox !== undefined ? await cfg.subagents?.(sessionId) : undefined;
    const conv = this.opts.model.open({
      systemPrompt: cfg.systemPrompt,
      tools: cfg.tools(sessionId).map((t) => this.logged(sessionId, t)),
      session: { id: sessionId, kind },
      ...(sandbox !== undefined ? { sandbox } : {}),
      ...(subagents !== undefined && subagents.length > 0 ? { subagents } : {}),
      ...(cfg.webSearch === true ? { webSearch: true } : {}),
      ...(await this.resumeFrom(sessionId)),
    });
    // 子代理在后台跑：它的动作当场记；主模型空着时它做完、模型自己起的一轮排进队列当一轮记
    conv.listen?.({
      side: (ev) => {
        const live = this.live.get(sessionId);
        if (live === undefined) return;
        this.onEvent(sessionId, live, ev).catch((e: unknown) => {
          console.error(`会话 ${sessionId} 记子代理的事失败：`, e);
        });
      },
      unprompted: (events) => {
        const live = this.live.get(sessionId);
        if (live === undefined) return;
        live.queue.unshift({ events, resolve: () => undefined });
        if (!live.running) void this.drain(sessionId, live);
      },
    });
    return conv;
  }

  /** 从哪接上：最近一条续接凭据（旧数据里截回过的记录不再理会：10-26 起上下文只追加）。 */
  private async resumeFrom(sessionId: string): Promise<{ resumeToken?: string }> {
    const records = await this.records(sessionId);
    const adapter = this.opts.model.name;
    const resume = records
      .map((r) => r.record)
      .filter((r) => r.type === 'model_session' && r.adapter === adapter)
      .at(-1);
    return resume?.type === 'model_session' ? { resumeToken: resume.token } : {};
  }

  /** 推一条不来自正本的事件（活页面试跑）。 */
  broadcast(e: ServerEvent): void {
    this.emit(e);
  }

  /** 工具调用由程序记进正本（用了哪份资料、查了什么），不靠模型自报。 */
  private logged(sessionId: string, t: ToolSpec): ToolSpec {
    return {
      ...t,
      run: async (args) => {
        let r: Awaited<ReturnType<ToolSpec['run']>>;
        try {
          r = await t.run(args);
        } catch (err) {
          r = {
            text: `工具出错：${err instanceof Error ? err.message : String(err)}`,
            isError: true,
          };
        }
        await this.append(sessionId, {
          type: 'tool_call',
          at: this.iso(),
          name: t.name,
          args,
          result: r.text,
          isError: r.isError === true,
        });
        return r;
      },
    };
  }

  private ensureLive(sessionId: string): Promise<Live> {
    const existing = this.live.get(sessionId);
    if (existing) return Promise.resolve(existing);
    let loading = this.loading.get(sessionId);
    if (!loading) {
      loading = (async () => {
        const opened = await this.opened(sessionId); // 不存在就报 NotFound
        const log = await SessionLog.open(this.opts.dataDir.sessionPath(sessionId));
        const live = newLive(log, opened.kind);
        this.live.set(sessionId, live);
        return live;
      })().finally(() => this.loading.delete(sessionId));
      this.loading.set(sessionId, loading);
    }
    return loading;
  }

  private async append(sessionId: string, record: LogRecord): Promise<number> {
    const live = this.live.get(sessionId);
    if (!live) throw new Error(`会话未打开：${sessionId}`);
    const line = await live.log.append(record);
    this.opts.index.add(sessionId, line, record);
    this.emit({ type: 'record', sessionId, line, record });
    return line;
  }

  private emit(e: ServerEvent): void {
    for (const fn of this.listeners) fn(e);
  }

  private iso(): string {
    return this.now().toISOString();
  }
}

/** 教学工具在只读区里的虚拟路径前缀。 */
const TEACHING_TOOLS_PREFIX = '只读/教学工具/';

/**
 * 程序按路径给沙盒动作打的标签（工单 W4 §5.3）：读 `只读/教学工具/<文件>` → `教学工具:<文件名>`。其余不打（Bash 里 cat 的拿不准，先不打）。
 */
function sandboxTag(action: SandboxActionEvent['action']): string | undefined {
  const path = action.path;
  if (path === undefined) return undefined;
  if (action.op === 'read' && path.startsWith(TEACHING_TOOLS_PREFIX)) {
    return `${TEACHING_TOOL_TAG}${path.slice(TEACHING_TOOLS_PREFIX.length)}`;
  }
  return undefined;
}

function newLive(log: SessionLog, kind: ConversationKind): Live {
  return {
    log,
    kind,
    conversation: undefined,
    queue: [],
    running: false,
    idle: [],
    turnWaiters: [],
  };
}

function summary(o: SessionOpened): SessionSummary {
  const from = sessionFrom(o);
  return {
    sessionId: o.sessionId,
    kind: o.kind,
    title: o.title,
    openedAt: o.at,
    ...(o.parent !== undefined ? { parent: o.parent } : {}),
    ...(from !== undefined ? { from } : {}),
  };
}

/** 学习对话的来历：接着哪段没学完的学的；不是返回空。 */
export function sessionFrom(o: SessionOpened): SessionSummary['from'] {
  if (o.resumeOf !== undefined) return { kind: 'resume', loop: o.resumeOf.fromLoop };
  return undefined;
}

function stamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${String(d.getUTCFullYear())}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}
