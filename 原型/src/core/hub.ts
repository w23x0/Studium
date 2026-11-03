// 会话管理：每个会话一个正本（只追加）+ 一个模型侧对话；一个会话一次只跑一轮，后到的输入排队（W12 §3.1 起学习者
// 中途说的话、别的会话发来的话都排到这一轮之后，不再中途插话）。会话之间发话走 message：发出去马上返回，对方这一轮
// 跑完它回的话再按同样方式送回发话方。
// 不认识具体会话的职责：系统提示与工具由 kinds 按会话种类给出（studium.ts 组装）。
// 事件（新记录、流式增量、进行中状态、正在做什么）推给订阅者（SSE）。
import { randomBytes } from 'node:crypto';
import {
  CONVERSATION_KIND_LABELS,
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
  type MessageQuote,
  type ContextOpened,
  type LogRecord,
  type NumberedRecord,
  type ResumeOrigin,
  type ReviewWindow,
  type SessionOpened,
  type Ticket,
} from '../shared/records.ts';
import { quotePrefix } from '../shared/stream-page.ts';
import { localMinute } from '../shared/time.ts';
import type { DerivedIndex } from './index/derived-index.ts';
import { isSessionId, type DataDir } from './log/data-dir.ts';
import { readRecords, SessionLog } from './log/session-log.ts';
import type {
  ImageData,
  ModelAdapter,
  ModelConversation,
  ModelDisclosure,
  ModelEvent,
  SandboxActionEvent,
  SandboxSpec,
  ToolSpec,
  TurnInput,
} from './model/port.ts';

export interface KindConfig {
  systemPrompt: string;
  /** 按会话算系统提示；没有就用 systemPrompt。开模型对话时算一次。 */
  systemPromptFor?(sessionId: string): Promise<string>;
  /** 本会话的工具；sessionId 让工具知道自己属于哪个会话。 */
  tools(sessionId: string): ToolSpec[] | Promise<ToolSpec[]>;
  /** 这个会话在沙盒里跑时给它的沙盒（没有 = 不给通用执行）；开模型对话时算一次。 */
  sandbox?(sessionId: string): Promise<SandboxSpec | undefined>;
  /** 每轮发给模型之前调用：刷新沙盒里那些每轮重渲染的只读文件。 */
  beforeTurn?(sessionId: string): Promise<void>;
  /**
   * 每轮附在输入前的当前事实：先记一条 turn_context 再发；模型对话照常续接、靠压缩变长。
   * fresh = 这一轮是新开的模型对话（没有可续接的），这时开场还要从记录补上前面说过的（重建只作后备）。
   * inputLine = 这条输入在正本里的行号。
   */
  preface?(sessionId: string, inputLine: number, fresh: boolean): Promise<string>;
  /** 为真时放开模型服务自带的联网搜索与网页抓取（谈方向、找资料、学习对话）。 */
  webSearch?: boolean;
  /**
   * 为真时按时间线交给模型：每条前面带行号与时间，不包“程序事实”标记，每条自己说清是什么
   * （学习对话，会话/学习对话.md §3「上下文里的身份与时间线」）。
   */
  timeline?: boolean;
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
  /**
   * 排着的轮：一条输入（replyTo = 这条是别的会话发来的话，这一轮最后写的话要送回那个会话），
   * 或模型自己起的一轮（事件已在流里）。
   */
  queue: (
    | { input: TurnInput; line: number; resolve: () => void; replyTo?: string }
    | { events: AsyncIterable<ModelEvent>; resolve: () => void }
  )[];
  running: boolean;
  idle: (() => void)[];
  /** 模型侧最近报告的实际执行模型。 */
  model?: string;
  /** W12 §4.6：这一轮里最近一段还没定性的文字（后面又有动作就记成中途碎话，这一轮结束才是写给学习者的话）。 */
  pending?: string | undefined;
  /** 学习者点了停止：这一轮按停下处理（不记成失败）。 */
  stopping?: boolean;
}

/** 别的会话发来一句话（W12 §3.1）。 */
export interface PeerMessage {
  /** 发话的会话 id。 */
  from: string;
  text: string;
  /** 附上的学习者原话（程序照抄）。 */
  cited?: { session: string; line: number; at: string; text: string }[];
  /** 这是回它先前发来的话：收话方这一轮的话不再转回去。 */
  reply?: boolean;
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

  /** 模型接口本身：问别的项目的主对话（一次性的分叉对话）用。 */
  get adapter(): ModelAdapter {
    return this.opts.model;
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
      /** 学习页用竖流（10-29 #74 起；W12 起是唯一的学习页）。 */
      page?: 'stream';
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
      ...(meta.page !== undefined ? { page: meta.page } : {}),
    };
    await this.append(sessionId, opened);
    return summary(opened);
  }

  /** 会话列表（学习者删掉的讨论串不列）。 */
  listSessions(): SessionSummary[] {
    return this.opts.index.listSessions();
  }

  /** 学习者删掉的讨论串（W12 §4.3）。 */
  isDeleted(sessionId: string): boolean {
    return this.opts.index.isDeleted(sessionId);
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
   * 记下一条输入（学习者的话或程序事实），排进这个会话的队列（正在跑就等这一轮跑完）。
   * 返回时输入已落盘；done 在这条输入那一轮跑完时兑现。
   */
  async send(
    sessionId: string,
    input: TurnInput,
    meta: {
      objection?: { toLine: number };
      images?: ImageInput[];
      /** 这条输入已经记在正本这一行（如学习者在组件上的操作、改过的那句话）：不再另记，只交给模型。 */
      recorded?: number;
      /** 旧数据（区域图学习页）：学习者在某一块下面回的。 */
      replyTo?: { key: string; pointer: string };
      /** 学习页：学习者选中页面上一处再说的（交给模型时开头写明选中了哪段）。 */
      quote?: MessageQuote;
      /** 学习者附图的字节（W12 §5.6，原样送给模型）与给模型的一句（图在沙盒哪里）。 */
      attach?: { data: ImageData[]; note?: string };
    } = {},
  ): Promise<{ line: number; done: Promise<void> }> {
    if (this.opts.index.isDeleted(sessionId)) {
      throw new NotFoundError(`这个对话已经删了：${sessionId}`);
    }
    const live = await this.ensureLive(sessionId);
    const objection = input.role === 'learner' ? meta.objection : undefined;
    const images = input.role === 'learner' ? meta.images : undefined;
    const replyTo = input.role === 'learner' ? meta.replyTo : undefined;
    const quote = input.role === 'learner' ? meta.quote : undefined;
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
              ...(quote !== undefined ? { quote } : {}),
            }
          : { type: 'program_fact', at: this.iso(), text: input.text },
      ));
    // 证据引用照模型最顺手的方式：交给模型的每条消息前印它在正本里的行号（00 原则 8）、时间、谁说的、
    // 距学习者上次说话多久（W12 §3.1 来历标注）；按时间线的会话不包标记
    const timeline = this.opts.kinds(live.kind).timeline === true;
    const delivered: TurnInput = {
      role: input.role,
      ...(timeline ? { plain: true } : {}),
      text: `${await this.head(sessionId, line, input.role === 'learner' ? '学习者' : '程序')} ${
        objection !== undefined
          ? `（学习者对第 ${String(objection.toLine)} 行的守卫判定提出异议）`
          : ''
      }${replyTo !== undefined ? `（回在「${replyTo.pointer}」下面）` : ''}${
        quote !== undefined ? quotePrefix(quote) : ''
      }${input.text}${meta.attach?.note !== undefined ? `\n${meta.attach.note}` : ''}`,
      ...(meta.attach !== undefined && meta.attach.data.length > 0
        ? { images: meta.attach.data }
        : {}),
    };
    return { line, done: this.enqueue(sessionId, live, { input: delivered, line }) };
  }

  /** 排进这个会话的队列（空着就当场跑）；返回这一轮跑完时兑现的承诺。 */
  private enqueue(
    sessionId: string,
    live: Live,
    item: { input: TurnInput; line: number; replyTo?: string },
  ): Promise<void> {
    let resolve!: () => void;
    const done = new Promise<void>((r) => (resolve = r));
    live.queue.push({ ...item, resolve });
    if (!live.running) void this.drain(sessionId, live);
    return done;
  }

  /**
   * 别的会话给这个会话发一句话（W12 §3.1，照 Claude 讨论串的 wake）：记一条 thread_message，排进队列（空着就当场跑，
   * 正忙就等这一轮跑完），马上返回行号。这一轮它最后写的话再按同样方式送回发话方（回话不再转回）。
   */
  async message(to: string, m: PeerMessage): Promise<number> {
    if (this.opts.index.isDeleted(to)) throw new NotFoundError(`这个对话已经删了：${to}`);
    const live = await this.ensureLive(to);
    const line = await this.append(to, {
      type: 'thread_message',
      at: this.iso(),
      from: m.from,
      text: m.text,
      ...(m.cited !== undefined && m.cited.length > 0 ? { cited: m.cited } : {}),
      ...(m.reply === true ? { reply: true as const } : {}),
    });
    const who = `${this.labelOf(m.from)}${m.reply === true ? '回话' : '发来'}（${m.from}；学习者看不到这条）`;
    const cited = (m.cited ?? []).map(
      (c) =>
        `<cited author="learner" session="${this.labelOf(c.session)}" line="${String(c.line)}" at="${localMinute(c.at)}">\n${c.text}\n</cited>`,
    );
    const timeline = this.opts.kinds(live.kind).timeline === true;
    const input: TurnInput = {
      role: 'peer',
      ...(timeline ? { plain: true } : {}),
      text: [await this.head(to, line, who), m.text, ...cited].join('\n'),
    };
    void this.enqueue(to, live, { input, line, ...(m.reply === true ? {} : { replyTo: m.from }) });
    return line;
  }

  /** 会话怎么称呼：主对话 / 「标题」（种类）。 */
  labelOf(sessionId: string): string {
    const s = this.opts.index.listSessions().find((x) => x.sessionId === sessionId);
    if (s === undefined) return sessionId;
    return s.kind === 'main' ? '主对话' : `「${s.title}」（${CONVERSATION_KIND_LABELS[s.kind]}）`;
  }

  /** 交给模型的每条输入前那一头：行号 · 时间 · 谁 · 距学习者上次说话多久（同一项目里所有对话算在一起）。 */
  private async head(sessionId: string, line: number, who: string): Promise<string> {
    const now = this.iso();
    const at = (await this.records(sessionId)).find((r) => r.line === line)?.record.at ?? now;
    const last = this.opts.index.lastLearnerAt(this.family(sessionId), at);
    const since =
      last === undefined
        ? '学习者之前没说过话'
        : `距学习者上次说话 ${ago(Date.parse(at) - Date.parse(last))}`;
    return `[第 ${String(line)} 行 · ${localMinute(at)} · ${who} · ${since}]`;
  }

  /** 和这个会话同属一个项目的所有会话（沿 parent 找到最上面那条，再列它下面的全部）。 */
  private family(sessionId: string): string[] {
    const all = this.opts.index.listSessions();
    const parent = new Map(all.map((s) => [s.sessionId, s.parent]));
    const root = (id: string): string => {
      let cur = id;
      for (let i = 0; i < 8; i++) {
        const p = parent.get(cur);
        if (p === undefined) return cur;
        cur = p;
      }
      return cur;
    };
    const mine = root(sessionId);
    return all.filter((s) => root(s.sessionId) === mine).map((s) => s.sessionId);
  }

  /**
   * 学习者点了停止（W12 §4.4）：正在跑的这一轮断开（适配器能中断就中断，不能就关掉模型对话、下一轮按续接凭据接上）；
   * 记一条 turn_stopped，下一轮交给模型时前面接“学习者停止了生成”。排着的输入照旧。没在跑返回假。
   */
  async interrupt(sessionId: string): Promise<boolean> {
    const live = this.live.get(sessionId);
    if (live === undefined || !live.running) return false;
    live.stopping = true;
    await this.append(sessionId, { type: 'turn_stopped', at: this.iso() });
    const conv = live.conversation;
    if (conv?.interrupt !== undefined) await conv.interrupt();
    else {
      await conv?.close();
      live.conversation = undefined;
    }
    return true;
  }

  /** 追加一条程序记录（不发给模型）。 */
  async record(sessionId: string, record: LogRecord): Promise<number> {
    await this.ensureLive(sessionId);
    return this.append(sessionId, record);
  }

  /**
   * 停掉一个会话（导入会话超时、学习者删掉讨论串）：排着的轮丢掉，正在跑的模型对话关掉（这一轮记成没跑成）；
   * 正本照旧，之后不再自己跑，有新输入才按续接凭据重开。
   */
  async stop(sessionId: string): Promise<void> {
    const live = this.live.get(sessionId);
    if (live === undefined) return;
    for (const item of live.queue.splice(0)) item.resolve();
    await live.conversation?.close();
    live.conversation = undefined;
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
      if ('events' in item) {
        await this.consume(sessionId, live, item.events).catch(async (err: unknown) => {
          const reason = err instanceof Error ? err.message : String(err);
          await this.append(sessionId, { type: 'turn_failed', at: this.iso(), reason });
        });
        await this.flushPending(sessionId, live, false);
      } else {
        // 这一轮从正本哪一行之后开始写（发来的话可能在上一轮还在跑时就记下了，它后面还有上一轮的话）
        const from = live.log.lines;
        await this.runTurn(sessionId, live, item.input, item.line);
        if (item.replyTo !== undefined) await this.replyBack(sessionId, from, item.replyTo);
      }
      live.stopping = false;
      item.resolve();
    }
    live.running = false;
    this.emit({ type: 'running', sessionId, running: false });
    for (const r of live.idle.splice(0)) r();
  }

  /** 别的会话发来的那一轮跑完：这一轮里它最后写的话（不含中途碎话）送回发话方；没说话就不送。fromLine = 这一轮开始前正本的最后一行。 */
  private async replyBack(sessionId: string, fromLine: number, to: string): Promise<void> {
    const said = (await this.records(sessionId))
      .flatMap(({ line, record: r }) =>
        line > fromLine && r.type === 'assistant_message' && r.interim !== true ? [r.text] : [],
      )
      .join('\n\n')
      .trim();
    if (said === '' || this.opts.index.isDeleted(to) || this.opts.index.isDeleted(sessionId)) {
      return;
    }
    await this.message(to, { from: sessionId, text: said, reply: true }).catch((err: unknown) => {
      console.error(`会话 ${sessionId} 的回话送回 ${to} 失败：`, err);
    });
  }

  private async runTurn(
    sessionId: string,
    live: Live,
    input: TurnInput,
    inputLine: number,
  ): Promise<void> {
    const cfg = this.opts.kinds(live.kind);
    try {
      // 沙盒里每轮重渲染的只读文件（如本次对话）在这里刷新（工单 W4 §5.3）
      await cfg.beforeTurn?.(sessionId);
      let delivered = input;
      const fresh = live.conversation === undefined && !(await this.resumable(sessionId));
      live.conversation ??= await this.openConversation(sessionId, live.kind, cfg);
      // 上一轮之后发生、要接在上下文后面的事（学习者停止了生成、删了讨论串，W12 §4.3 §4.4）+ 各会话自己的当前事实
      const text = [
        await this.notesBefore(sessionId, inputLine),
        (await cfg.preface?.(sessionId, inputLine, fresh)) ?? '',
      ]
        .filter((x) => x !== '')
        .join('\n');
      if (text !== '') {
        await this.append(sessionId, {
          type: 'turn_context',
          at: this.iso(),
          forLine: inputLine,
          text,
        });
        delivered = { ...input, preface: text };
      }
      await this.consume(sessionId, live, live.conversation.send(delivered));
      await this.flushPending(sessionId, live, false);
    } catch (err) {
      await this.flushPending(sessionId, live, false);
      // 模型侧对话可能已坏：丢掉，下一轮按正本里的续接凭据重开
      await live.conversation?.close();
      live.conversation = undefined;
      // 学习者点了停止、适配器断开时抛出：不算这一轮失败（turn_stopped 已记）
      if (live.stopping === true) return;
      const reason = err instanceof Error ? err.message : String(err);
      console.error(`会话 ${sessionId} 本轮失败：`, err);
      await this.append(sessionId, { type: 'turn_failed', at: this.iso(), reason });
    }
  }

  /**
   * 上一条输入之后、这条输入之前发生的、要接在上下文后面的事（W12 §4.3 §4.4）：学习者停止了生成、删了讨论串。
   * 从正本现算，重启也不丢；附过的（在上一条输入或 turn_context 之前的）不再附。
   */
  private async notesBefore(sessionId: string, inputLine: number): Promise<string> {
    const recs = await this.records(sessionId);
    let from = 0;
    for (const { line, record: r } of recs) {
      if (line >= inputLine) break;
      if (
        r.type === 'turn_context' ||
        r.type === 'user_message' ||
        r.type === 'program_fact' ||
        r.type === 'thread_message'
      ) {
        from = line;
      }
    }
    return recs
      .flatMap(({ line, record: r }) => {
        if (line <= from || line >= inputLine) return [];
        if (r.type === 'turn_stopped') return [`[${localMinute(r.at)}] 学习者停止了生成。`];
        if (r.type === 'thread_deleted') {
          return [`[${localMinute(r.at)}] 学习者删了「${r.title}」（${r.session}）。`];
        }
        return [];
      })
      .join('\n');
  }

  /**
   * W12 §4.6：把这一轮里还没定性的那段文字记下。interim = 后面又有动作（工具调用、下一条消息）——它是中途碎话；
   * 不是 = 这一轮结束了，它是最后写给学习者的话。
   */
  private async flushPending(sessionId: string, live: Live, interim: boolean): Promise<void> {
    const text = live.pending;
    if (text === undefined) return;
    live.pending = undefined;
    await this.append(sessionId, {
      type: 'assistant_message',
      at: this.iso(),
      text,
      ...(interim ? { interim: true as const } : {}),
    });
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
        // 先不定性：后面还有动作就是中途碎话，这一轮就此结束才是写给学习者的话（W12 §4.6）
        await this.flushPending(sessionId, live, true);
        live.pending = ev.text;
        break;
      case 'activity':
        // 正在做什么（W12 §4.5）：由程序从工具调用得出，只推给界面，不记
        this.emit({ type: 'activity', sessionId, text: activityText(ev.tool, ev.input, this) });
        break;
      case 'raw':
        await this.flushPending(sessionId, live, true);
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
        await this.flushPending(sessionId, live, true);
        const tag = sandboxTag(ev.action);
        await this.append(sessionId, {
          type: 'sandbox_action',
          at: this.iso(),
          actor: 'model',
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
        // 学习者点了停止：断开时适配器报的错不算失败（turn_stopped 已记）
        if (live.stopping === true) break;
        await this.append(sessionId, {
          type: 'turn_failed',
          at: this.iso(),
          reason: ev.reason,
          ...(ev.notice !== undefined ? { notice: ev.notice } : {}),
        });
        break;
      case 'usage':
        await this.append(sessionId, {
          type: 'context_used',
          at: this.iso(),
          tokens: ev.context,
          output: ev.output,
        });
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
    const systemPrompt = (await cfg.systemPromptFor?.(sessionId)) ?? cfg.systemPrompt;
    const tools = await cfg.tools(sessionId);
    await this.recordContext(sessionId, {
      type: 'context_opened',
      at: this.iso(),
      systemPrompt,
      tools: tools.map((t) => ({ name: t.name, description: t.description })),
      // 内置工具的实际名单由适配器按这几项定（claude-agent-sdk.ts `sdkOptionsFor`），这里只记给了哪几类
      builtins: [
        ...(sandbox !== undefined
          ? [sandbox.commands === false ? '沙盒：读写搜索（无命令行）' : '沙盒：读写搜索 + 命令行']
          : []),
        ...(cfg.webSearch === true ? ['联网搜索 + 网页抓取'] : []),
      ],
      subagents: [],
    });
    const conv = this.opts.model.open({
      systemPrompt,
      tools: tools.map((t) => this.logged(sessionId, t)),
      session: { id: sessionId, kind },
      ...(sandbox !== undefined ? { sandbox } : {}),
      ...(cfg.webSearch === true ? { webSearch: true } : {}),
      ...(await this.resumeFrom(sessionId)),
    });
    // 不是 send() 引起的一轮（框架自己接着跑的）：动作当场记；模型自己起的一轮排进队列当一轮记
    conv.listen?.({
      side: (ev) => {
        const live = this.live.get(sessionId);
        if (live === undefined) return;
        this.onEvent(sessionId, live, ev).catch((e: unknown) => {
          console.error(`会话 ${sessionId} 记旁边的事失败：`, e);
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

  /** 记下这次给模型的系统提示词与工具（导出上下文用）；和上一条一模一样就不再记。 */
  private async recordContext(sessionId: string, rec: ContextOpened): Promise<void> {
    const last = (await this.records(sessionId))
      .map((r) => r.record)
      .filter((r): r is ContextOpened => r.type === 'context_opened')
      .at(-1);
    const same = (r: ContextOpened) => JSON.stringify({ ...r, at: '' });
    if (last !== undefined && same(last) === same(rec)) return;
    await this.append(sessionId, rec);
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

  /** 推一条不来自正本的事件（组件试跑）。 */
  broadcast(e: ServerEvent): void {
    this.emit(e);
  }

  /** 工具调用由程序记进正本（用了哪份资料、查了什么），不靠模型自报。 */
  private logged(sessionId: string, t: ToolSpec): ToolSpec {
    return {
      ...t,
      run: async (args) => {
        // 工具调用前说的话是中途碎话（W12 §4.6）：先记下，免得排在工具调用后面
        const live = this.live.get(sessionId);
        if (live !== undefined) await this.flushPending(sessionId, live, true);
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
  };
}

/** 多久之前（来历标注用）：分钟 / 小时 / 天。 */
function ago(ms: number): string {
  const m = Math.max(0, Math.round(ms / 60_000));
  if (m < 1) return '不到 1 分钟';
  if (m < 60) return `${String(m)} 分钟`;
  const h = ms / 3_600_000;
  if (h < 48) return `${String(Math.round(h))} 小时`;
  return `${String(Math.round(h / 24))} 天`;
}

/** 正在做什么的一行（W12 §4.5）：按工具认，不显示内容；转话时写转给谁。 */
export function activityText(
  tool: string,
  input: Record<string, unknown>,
  names: { labelOf(id: string): string },
): string {
  const ours = tool.startsWith('mcp__') ? tool.slice(tool.lastIndexOf('__') + 2) : tool;
  switch (ours) {
    case 'Read':
      return '正在读文件';
    case 'Glob':
    case 'Grep':
      return '正在搜索';
    case 'Bash':
      return '正在跑命令';
    case 'Write':
    case 'Edit':
      return '正在写草稿';
    case 'WebSearch':
      return '正在网上搜索';
    case 'WebFetch':
      return '正在读网页';
    case 'put_component':
      return '正在写组件';
    case 'edit_page':
    case 'move_on_page':
    case 'remove_from_page':
    case 'bring_back':
      return '正在改页面';
    case 'read_page':
      return '正在看页面';
    case 'message_thread':
      return typeof input.thread === 'string'
        ? `正在把话转给${names.labelOf(input.thread)}`
        : '正在转话';
    case 'message_coordinator':
      return '正在给主对话发话';
    case 'start_thread':
      return '正在开新的对话';
    case 'read_thread':
    case 'read_project_chat':
    case 'list_threads':
    case 'list_learned':
      return '正在读对话记录';
    case 'materials_index':
    case 'read_material':
    case 'search_materials':
    case 'read_import':
      return '正在读资料';
    case 'save_material':
      return '正在存资料';
    default:
      return '正在用工具';
  }
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
