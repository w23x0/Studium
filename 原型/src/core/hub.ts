// 核心：管所有会话。每个会话一个正本（只追加）+ 一个模型侧对话；一次只跑一轮。
// 事件（新记录、流式增量、进行中状态）推给订阅者（SSE）。
import { randomBytes } from 'node:crypto';
import type { SessionSummary, ServerEvent } from '../shared/protocol.ts';
import type { ConversationKind, LogRecord, NumberedRecord } from '../shared/records.ts';
import type { DerivedIndex } from './index/derived-index.ts';
import type { DataDir } from './log/data-dir.ts';
import { readRecords, SessionLog } from './log/session-log.ts';
import type { ModelAdapter, ModelConversation } from './model/port.ts';

export interface HubOptions {
  dataDir: DataDir;
  index: DerivedIndex;
  model: ModelAdapter;
  systemPrompts: Record<ConversationKind, string>;
  now?: () => Date;
}

interface Live {
  log: SessionLog;
  conversation: ModelConversation | undefined;
  running: Promise<void> | undefined;
}

export class BusyError extends Error {}
export class NotFoundError extends Error {}

export class Hub {
  private readonly live = new Map<string, Live>();
  private readonly loading = new Map<string, Promise<Live>>();
  private readonly listeners = new Set<(e: ServerEvent) => void>();
  private readonly now: () => Date;

  constructor(private readonly opts: HubOptions) {
    this.now = opts.now ?? (() => new Date());
  }

  subscribe(fn: (e: ServerEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  async createSession(kind: ConversationKind, title = '主对话'): Promise<SessionSummary> {
    const at = this.now();
    const sessionId = `${stamp(at)}-${randomBytes(3).toString('hex')}`;
    const log = await SessionLog.open(this.opts.dataDir.sessionPath(sessionId));
    this.live.set(sessionId, { log, conversation: undefined, running: undefined });
    await this.append(sessionId, {
      type: 'session_opened',
      at: at.toISOString(),
      sessionId,
      kind,
      title,
    });
    return { sessionId, kind, title, openedAt: at.toISOString() };
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

  isRunning(sessionId: string): boolean {
    return this.live.get(sessionId)?.running !== undefined;
  }

  /** 记下学习者的话并开始一轮；返回时学习者的话已落盘，模型回复在后台继续。 */
  async send(sessionId: string, text: string): Promise<{ done: Promise<void> }> {
    const live = await this.ensureLive(sessionId);
    if (live.running) throw new BusyError('上一轮还没结束');
    let release!: () => void;
    live.running = new Promise<void>((r) => (release = r));
    this.emit({ type: 'running', sessionId, running: true });
    try {
      await this.append(sessionId, { type: 'user_message', at: this.iso(), text });
    } catch (err) {
      live.running = undefined;
      release();
      this.emit({ type: 'running', sessionId, running: false });
      throw err;
    }
    const done = this.runTurn(sessionId, live, text).finally(() => {
      live.running = undefined;
      release();
      this.emit({ type: 'running', sessionId, running: false });
    });
    return { done };
  }

  async close(): Promise<void> {
    for (const live of this.live.values()) {
      await live.running;
      await live.conversation?.close();
      await live.log.close();
    }
    this.live.clear();
  }

  private async runTurn(sessionId: string, live: Live, text: string): Promise<void> {
    const adapter = this.opts.model.name;
    try {
      live.conversation ??= await this.openConversation(sessionId);
      for await (const ev of live.conversation.send(text)) {
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
      await this.append(sessionId, { type: 'turn_failed', at: this.iso(), reason });
      // 模型侧对话可能已坏：丢掉，下一轮按正本里的续接凭据重开
      await live.conversation?.close();
      live.conversation = undefined;
    }
  }

  private async openConversation(sessionId: string): Promise<ModelConversation> {
    const records = await this.records(sessionId);
    const first = records[0]?.record;
    if (first?.type !== 'session_opened') throw new Error(`${sessionId} 正本缺开头记录`);
    const adapter = this.opts.model.name;
    const resumeToken = records
      .map((r) => r.record)
      .filter((r) => r.type === 'model_session' && r.adapter === adapter)
      .at(-1);
    return this.opts.model.open({
      systemPrompt: this.opts.systemPrompts[first.kind],
      ...(resumeToken?.type === 'model_session' ? { resumeToken: resumeToken.token } : {}),
    });
  }

  private ensureLive(sessionId: string): Promise<Live> {
    const existing = this.live.get(sessionId);
    if (existing) return Promise.resolve(existing);
    let loading = this.loading.get(sessionId);
    if (!loading) {
      loading = (async () => {
        await this.records(sessionId); // 不存在就报 NotFound
        const log = await SessionLog.open(this.opts.dataDir.sessionPath(sessionId));
        const live: Live = { log, conversation: undefined, running: undefined };
        this.live.set(sessionId, live);
        return live;
      })().finally(() => this.loading.delete(sessionId));
      this.loading.set(sessionId, loading);
    }
    return loading;
  }

  private async append(sessionId: string, record: LogRecord): Promise<void> {
    const live = this.live.get(sessionId);
    if (!live) throw new Error(`会话未打开：${sessionId}`);
    const line = await live.log.append(record);
    this.opts.index.add(sessionId, line, record);
    this.emit({ type: 'record', sessionId, line, record });
  }

  private emit(e: ServerEvent): void {
    for (const fn of this.listeners) fn(e);
  }

  private iso(): string {
    return this.now().toISOString();
  }
}

function stamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${String(d.getUTCFullYear())}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}
