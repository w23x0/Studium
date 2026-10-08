// 会话管理：每个会话一个正本（只追加）+ 一个模型侧对话；一个会话一次只跑一轮，后到的输入排队。
// 不认识具体会话的职责：系统提示与工具由 kinds 按会话种类给出（studium.ts 组装）。
// 事件（新记录、流式增量、进行中状态）推给订阅者（SSE）。
import { randomBytes } from 'node:crypto';
import type { SessionSummary, ServerEvent } from '../shared/protocol.ts';
import type {
  ConversationKind,
  LogRecord,
  NumberedRecord,
  SessionOpened,
  Ticket,
} from '../shared/records.ts';
import type { DerivedIndex } from './index/derived-index.ts';
import type { DataDir } from './log/data-dir.ts';
import { readRecords, SessionLog } from './log/session-log.ts';
import type { ModelAdapter, ModelConversation, ToolSpec, TurnInput } from './model/port.ts';

export interface KindConfig {
  systemPrompt: string;
  /** 本会话的工具；sessionId 让工具知道自己属于哪个会话。 */
  tools(sessionId: string): ToolSpec[];
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
  queue: { input: TurnInput; resolve: () => void }[];
  running: boolean;
  idle: (() => void)[];
  /** 本轮收下的中途插话，在本轮跑完时兑现。 */
  turnWaiters: (() => void)[];
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

  subscribe(fn: (e: ServerEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  async createSession(
    kind: ConversationKind,
    meta: { title: string; parent?: string; ticket?: Ticket; anchorLine?: number },
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
  async send(sessionId: string, input: TurnInput): Promise<{ line: number; done: Promise<void> }> {
    const live = await this.ensureLive(sessionId);
    const line = await this.append(
      sessionId,
      input.role === 'learner'
        ? { type: 'user_message', at: this.iso(), text: input.text }
        : { type: 'program_fact', at: this.iso(), text: input.text },
    );
    // 证据引用照模型最顺手的方式：交给模型的每条消息前印它在正本里的行号（00 原则 8）
    const delivered: TurnInput = {
      role: input.role,
      text: `[第 ${String(line)} 行] ${input.text}`,
    };
    let resolve!: () => void;
    const done = new Promise<void>((r) => (resolve = r));
    // 中途插话：本轮还在跑就交给正在跑的模型对话，它在下一个停顿处看到；
    // 适配器不支持或本轮已在收尾时，退回排队成新一轮（04「实现时要守的」流式输入）
    if (live.running && live.conversation?.interject?.(delivered) === true) {
      live.turnWaiters.push(resolve);
      return { line, done };
    }
    live.queue.push({ input: delivered, resolve });
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
    for (let item = live.queue.shift(); item; item = live.queue.shift()) {
      await this.runTurn(sessionId, live, item.input);
      item.resolve();
      for (const r of live.turnWaiters.splice(0)) r();
    }
    live.running = false;
    this.emit({ type: 'running', sessionId, running: false });
    for (const r of live.idle.splice(0)) r();
  }

  private async runTurn(sessionId: string, live: Live, input: TurnInput): Promise<void> {
    const adapter = this.opts.model.name;
    try {
      live.conversation ??= await this.openConversation(sessionId, live.kind);
      for await (const ev of live.conversation.send(input)) {
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
          case 'turn_error':
            await this.append(sessionId, {
              type: 'turn_failed',
              at: this.iso(),
              reason: ev.reason,
            });
            break;
          case 'turn_end':
            break;
        }
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.error(`会话 ${sessionId} 本轮失败：`, err);
      await this.append(sessionId, { type: 'turn_failed', at: this.iso(), reason });
      // 模型侧对话可能已坏：丢掉，下一轮按正本里的续接凭据重开
      await live.conversation?.close();
      live.conversation = undefined;
    }
  }

  private async openConversation(
    sessionId: string,
    kind: ConversationKind,
  ): Promise<ModelConversation> {
    const records = await this.records(sessionId);
    const adapter = this.opts.model.name;
    const resume = records
      .map((r) => r.record)
      .filter((r) => r.type === 'model_session' && r.adapter === adapter)
      .at(-1);
    const cfg = this.opts.kinds(kind);
    return this.opts.model.open({
      systemPrompt: cfg.systemPrompt,
      tools: cfg.tools(sessionId).map((t) => this.logged(sessionId, t)),
      session: { id: sessionId, kind },
      ...(resume?.type === 'model_session' ? { resumeToken: resume.token } : {}),
    });
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
  return {
    sessionId: o.sessionId,
    kind: o.kind,
    title: o.title,
    openedAt: o.at,
    ...(o.parent !== undefined ? { parent: o.parent } : {}),
  };
}

function stamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${String(d.getUTCFullYear())}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}
