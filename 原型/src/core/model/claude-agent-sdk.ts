// Claude Agent SDK 适配器：整个核心里唯一允许引用 @anthropic-ai/claude-agent-sdk 的文件
// （依赖方向测试 tests/architecture.test.ts 会查）。
// 按 04-实现选型：关掉内置工具、不读 CLAUDE.md 与设置、用我们自己的系统提示；
// 登录走产品负责人本机的 Claude 订阅（先在本机用 `claude` 登录一次）。
import { randomUUID } from 'node:crypto';
import {
  createSdkMcpServer,
  query,
  tool,
  type SDKMessage,
  type SDKUserMessage,
} from '@anthropic-ai/claude-agent-sdk';
import {
  formatProgramFact,
  type ConversationSpec,
  type ModelAdapter,
  type ModelConversation,
  type ModelEvent,
  type TurnInput,
} from './port.ts';

const SERVER = 'studium';

export interface ClaudeAgentSdkOptions {
  /** 不填用 SDK 默认模型。 */
  model?: string;
  /** SDK 子进程的工作目录。SDK 按它归档自己的会话文件，续接时要一致，所以固定成数据目录。 */
  cwd?: string;
}

/** 从外层 Claude Code 继承来的会话变量会让 SDK 接到外层会话上，去掉。 */
const INHERITED_SESSION_VARS = ['CLAUDECODE', 'CLAUDE_CODE_SESSION_ID', 'CLAUDE_CODE_ENTRYPOINT'];

export class ClaudeAgentSdkModel implements ModelAdapter {
  readonly name = 'claude-agent-sdk';

  constructor(private readonly options: ClaudeAgentSdkOptions = {}) {}

  open(spec: ConversationSpec): ModelConversation {
    return new SdkConversation(spec, this.options);
  }
}

class SdkConversation implements ModelConversation {
  private readonly input = new AsyncQueue<SDKUserMessage>();
  private output: AsyncIterator<SDKMessage> | undefined;
  private close_: (() => void) | undefined;
  private sessionId: string | undefined;
  /** 本轮在跑时为真；插话只在这时收。 */
  private turnActive = false;
  /** 已交给 SDK、还没见它答到的输入（按 uuid）。 */
  private readonly pending: string[] = [];

  constructor(
    private readonly spec: ConversationSpec,
    private readonly options: ClaudeAgentSdkOptions,
  ) {
    this.sessionId = spec.resumeToken;
  }

  private start(): AsyncIterator<SDKMessage> {
    const server = createSdkMcpServer({
      name: SERVER,
      tools: this.spec.tools.map((t) =>
        tool(t.name, t.description, t.input, async (args) => {
          const r = await t.run(args);
          return { content: [{ type: 'text', text: r.text }], isError: r.isError === true };
        }),
      ),
    });
    const q = query({
      prompt: this.input,
      options: {
        systemPrompt: this.spec.systemPrompt,
        tools: [],
        settingSources: [],
        mcpServers: { [SERVER]: server },
        allowedTools: this.spec.tools.map((t) => `mcp__${SERVER}__${t.name}`),
        strictMcpConfig: true,
        includePartialMessages: true,
        ...(this.spec.resumeToken !== undefined ? { resume: this.spec.resumeToken } : {}),
        ...(this.options.model !== undefined ? { model: this.options.model } : {}),
        ...(this.options.cwd !== undefined ? { cwd: this.options.cwd } : {}),
        env: cleanEnv(),
      },
    });
    this.close_ = () => {
      q.close();
    };
    return q[Symbol.asyncIterator]();
  }

  private push(input: TurnInput, priority?: 'next'): void {
    const uuid = randomUUID();
    this.pending.push(uuid);
    this.input.push({
      type: 'user',
      message: {
        role: 'user',
        content: input.role === 'program' ? formatProgramFact(input.text) : input.text,
      },
      parent_tool_use_id: null,
      uuid,
      ...(priority !== undefined ? { priority } : {}),
    });
  }

  /**
   * 中途插话：按流式输入交给 SDK，priority 'next' = 在本轮下一个停顿处并进来（04「实现时要守的」）。
   * 不确定：priority 各值的确切行为 SDK 类型里没写，待本机真模型确认。
   */
  interject(input: TurnInput): boolean {
    if (!this.turnActive || this.output === undefined) return false;
    this.push(input, 'next');
    return true;
  }

  async *send(input: TurnInput): AsyncGenerator<ModelEvent> {
    this.output ??= this.start();
    this.turnActive = true;
    try {
      yield* this.read(input);
    } finally {
      this.turnActive = false;
    }
  }

  private async *read(input: TurnInput): AsyncGenerator<ModelEvent> {
    if (this.output === undefined) throw new Error('SDK 对话还没开');
    this.push(input);
    let stamped = false;
    for (;;) {
      const next = await this.output.next();
      if (next.done === true) {
        this.turnActive = false;
        // 对话已断：没答到的不会再答了，清掉免得下一轮一直等它们
        this.pending.splice(0);
        yield { kind: 'turn_error', reason: 'Agent SDK 提前结束了对话' };
        return;
      }
      const msg = next.value;
      const sid = 'session_id' in msg ? msg.session_id : undefined;
      if (sid !== undefined && sid !== this.sessionId) {
        this.sessionId = sid;
        yield { kind: 'session', token: sid };
      }
      if (msg.type === 'stream_event') {
        const ev = msg.event;
        if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
          yield { kind: 'text_delta', text: ev.delta.text };
        }
        continue;
      }
      if (msg.type === 'assistant' || msg.type === 'user') {
        yield { kind: 'raw', payload: msg.message };
      }
      if (msg.type === 'assistant') {
        // SDK 在回复上标出本轮已经并进来的用户消息（含中途插话）
        const answered =
          msg.user_message_uuids ??
          (msg.user_message_uuid !== undefined ? [msg.user_message_uuid] : []);
        if (answered.length > 0) stamped = true;
        for (const u of answered) {
          const i = this.pending.indexOf(u);
          if (i >= 0) this.pending.splice(i, 1);
        }
        const text = msg.message.content
          .flatMap((b) => (b.type === 'text' ? [b.text] : []))
          .join('');
        if (text !== '') yield { kind: 'assistant_text', text };
      }
      if (msg.type === 'result') {
        // 老版本不标 uuid：一个结果算答了最早的一条
        if (!stamped) this.pending.shift();
        const failed = msg.subtype !== 'success' || msg.is_error;
        if (this.pending.length > 0) {
          // 还有插话没并进本轮：SDK 会接着为它另跑一轮，读到它的结果再收尾
          if (failed) yield { kind: 'turn_error', reason: `Agent SDK 本轮失败：${msg.subtype}` };
          stamped = false;
          continue;
        }
        // 同步收尾：此后的插话由核心按新一轮发
        this.turnActive = false;
        yield failed
          ? { kind: 'turn_error', reason: `Agent SDK 本轮失败：${msg.subtype}` }
          : { kind: 'turn_end' };
        return;
      }
    }
  }

  close(): Promise<void> {
    this.input.end();
    this.close_?.();
    return Promise.resolve();
  }
}

function cleanEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined && !INHERITED_SESSION_VARS.includes(k)) env[k] = v;
  }
  return env;
}

/** 流式输入用的队列：push 进去的消息按顺序交给 SDK。 */
class AsyncQueue<T> implements AsyncIterable<T> {
  private items: T[] = [];
  private waiters: ((r: IteratorResult<T>) => void)[] = [];
  private ended = false;

  push(item: T): void {
    const w = this.waiters.shift();
    if (w) w({ value: item, done: false });
    else this.items.push(item);
  }

  end(): void {
    this.ended = true;
    for (const w of this.waiters.splice(0)) w({ value: undefined, done: true });
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: () => {
        const item = this.items.shift();
        if (item !== undefined) return Promise.resolve({ value: item, done: false });
        if (this.ended) return Promise.resolve({ value: undefined, done: true });
        return new Promise((resolve) => this.waiters.push(resolve));
      },
    };
  }
}
