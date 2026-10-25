// Claude Agent SDK 适配器：整个核心里唯一允许引用 @anthropic-ai/claude-agent-sdk 的文件
// （依赖方向测试 tests/architecture.test.ts 会查）。
// 按 04-实现选型：关掉内置工具、不读 CLAUDE.md 与设置、用我们自己的系统提示；
// 登录走产品负责人本机的 Claude 订阅（先在本机用 `claude` 登录一次）。
import { randomUUID } from 'node:crypto';
import { dirname, isAbsolute, resolve } from 'node:path';
import {
  createSdkMcpServer,
  query,
  tool,
  type CanUseTool,
  type Options,
  type PermissionResult,
  type SDKMessage,
  type SDKUserMessage,
} from '@anthropic-ai/claude-agent-sdk';
import {
  modelText,
  type ConversationSpec,
  type ImageData,
  type ImageTranscriber,
  type ModelAdapter,
  type ModelConversation,
  type ModelDisclosure,
  type ModelEvent,
  type SandboxActionEvent,
  type SandboxSpec,
  type TurnInput,
} from './port.ts';
import type { Effort, Profiles } from './profiles.ts';
import { canRead, canWrite, resolveSandboxPath, virtualPath } from './sandbox-paths.ts';

const SERVER = 'studium';

/** 有沙盒时打开的内置工具：通用读写、搜索与命令（工单 W4 §5.10）。 */
const SANDBOX_TOOLS = ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'];

export interface ClaudeAgentSdkOptions {
  /** 不填用 SDK 默认模型。 */
  model?: string;
  /** 按会话类分开配的模型与强度；没配的类用 SDK 默认。 */
  profiles?: Profiles;
  /** 没按会话类配到强度的对话用的强度（如评测里的模拟学生、判分）；不填用 SDK 默认。 */
  effort?: Effort;
  /** SDK 子进程的工作目录。SDK 按它归档自己的会话文件，续接时要一致，所以固定成数据目录。 */
  cwd?: string;
}

/**
 * 由 spec 与选项算出 SDK 的 options（纯函数，不调模型；单测覆盖）。
 * 没有 `spec.sandbox` 时保持原样：内置工具全关、只挂我们的进程内 MCP 工具。
 * 有沙盒时打开六个通用工具，cwd 落到工作区，只读目录经 additionalDirectories 与沙盒的 allowRead 给出，
 * 每次工具调用再经 `canUseTool` 按沙盒卡一道（记录/读写权限.md「执行方式」）。
 */
/** 进程内工具一次调用的上限：30 分钟（一次导航连检索在真模型上要几分钟）。 */
const TOOL_TIMEOUT_MS = 30 * 60 * 1000;

export function sdkOptionsFor(spec: ConversationSpec, o: ClaudeAgentSdkOptions): Options {
  const server = createSdkMcpServer({
    name: SERVER,
    // 我们的工具里有整段跑完一个会话的（plan_next 跑完导航、retrieve 跑完检索子代理），常超过一分钟；
    // 不跟环境变量 MCP_TOOL_TIMEOUT 走——它设成 60 秒时模型拿到超时会再调一次，开出重复的导航
    timeout: TOOL_TIMEOUT_MS,
    tools: spec.tools.map((t) =>
      tool(t.name, t.description, t.input, async (args) => {
        const r = await t.run(args);
        return { content: [{ type: 'text', text: r.text }], isError: r.isError === true };
      }),
    ),
  });
  const profile = spec.session ? o.profiles?.[spec.session.kind] : undefined;
  const model = profile?.model ?? o.model;
  const effort = profile?.effort ?? o.effort;
  const sb = spec.sandbox;
  const cwd = sb !== undefined ? sb.workdir : o.cwd;
  // 只放联网搜索与网页抓取两个内置工具；没有会话同时带沙盒与 webSearch（工单 W5 §4.6）
  const webTools = spec.webSearch === true ? ['WebSearch', 'WebFetch'] : [];
  return {
    systemPrompt: spec.systemPrompt,
    tools: [...(sb !== undefined ? SANDBOX_TOOLS : []), ...webTools],
    settingSources: [],
    mcpServers: { [SERVER]: server },
    allowedTools: [...spec.tools.map((t) => `mcp__${SERVER}__${t.name}`), ...webTools],
    strictMcpConfig: true,
    includePartialMessages: true,
    ...(spec.resumeToken !== undefined ? { resume: spec.resumeToken } : {}),
    ...(model !== undefined ? { model } : {}),
    ...(effort !== undefined ? { effort } : {}),
    ...(cwd !== undefined ? { cwd } : {}),
    ...(sb !== undefined
      ? {
          additionalDirectories: readOnlyDirs(sb),
          permissionMode: 'default' as const,
          canUseTool: sandboxPermission(sb),
          sandbox: {
            enabled: true,
            autoAllowBashIfSandboxed: true,
            allowUnsandboxedCommands: false,
            filesystem: {
              allowWrite: [sb.workdir],
              denyWrite: sb.readOnly.map((e) => e.path),
              denyRead: o.cwd !== undefined ? [o.cwd] : [],
              allowRead: [sb.workdir, ...sb.readOnly.map((e) => e.path)],
            },
            // network: false = 不给联网（只放空名单并收紧）
            ...(sb.network ? {} : { network: { allowedDomains: [], strictAllowlist: true } }),
          },
        }
      : {}),
    env: cleanEnv(),
  };
}

/** 只读目录（单文件条目给它的父目录，去重）。 */
function readOnlyDirs(sb: SandboxSpec): string[] {
  const out = new Set<string>();
  for (const e of sb.readOnly) out.add(e.name.endsWith('.md') ? dirname(e.path) : e.path);
  return [...out];
}

export interface ToolUse {
  name: string;
  input: Record<string, unknown>;
}

/**
 * 工具调用能不能做（工单 W4 §5.10）：我们的 `mcp__studium__*` 一律放行；Read / Glob / Grep 按 `canRead`；
 * Write / Edit 按 `canWrite`；Bash 放行（命令由沙盒卡）；其余工具不给用。相对路径按工作区解析。
 */
export function sandboxPermission(sb: SandboxSpec): CanUseTool {
  return (toolName: string, input: Record<string, unknown>): Promise<PermissionResult> =>
    Promise.resolve(decide(sb, toolName, input));
}

function decide(
  sb: SandboxSpec,
  toolName: string,
  input: Record<string, unknown>,
): PermissionResult {
  if (toolName.startsWith(`mcp__${SERVER}__`)) return allow(input);
  switch (toolName) {
    case 'Read': {
      const abs = pathOf(sb, input.file_path);
      if (abs === undefined || !canRead(sb, abs)) return deny(`${shown(sb, abs, input)} 读不到`);
      return allow(input);
    }
    case 'Glob':
    case 'Grep': {
      const abs = input.path === undefined ? resolve(sb.workdir) : pathOf(sb, input.path);
      if (abs === undefined || !canRead(sb, abs)) return deny(`${shown(sb, abs, input)} 读不到`);
      // 文件匹配式（Glob 的 pattern、Grep 的 glob）自己带绝对路径或 `..` 也会跑到范围外
      const k = toolName === 'Glob' ? 'pattern' : 'glob';
      const v = input[k];
      if (typeof v === 'string' && (isAbsolute(v) || v.split(/[\\/]/).includes('..'))) {
        return deny(`${k} 只写相对 path 的匹配式，不带绝对路径或 ..`);
      }
      return allow(input);
    }
    case 'Write':
    case 'Edit': {
      const abs = pathOf(sb, input.file_path);
      if (abs === undefined || !canWrite(sb, abs)) {
        return deny(`${shown(sb, abs, input)} 是只读的，或在工作区外，不能写`);
      }
      return allow(input);
    }
    case 'Bash':
      return allow(input);
    default:
      return deny(`这个工具不给用：${toolName}`);
  }
}

function allow(input: Record<string, unknown>): PermissionResult {
  return { behavior: 'allow', updatedInput: input };
}

function deny(message: string): PermissionResult {
  return { behavior: 'deny', message };
}

function pathOf(sb: SandboxSpec, v: unknown): string | undefined {
  return typeof v === 'string' && v !== '' ? resolveSandboxPath(sb, v) : undefined;
}

function shown(sb: SandboxSpec, abs: string | undefined, input: Record<string, unknown>): string {
  if (abs !== undefined) return virtualPath(sb, abs);
  const raw = input.file_path ?? input.path;
  return typeof raw === 'string' && raw !== '' ? raw : '这个路径';
}

/**
 * 一个跑完的工具调用记成沙盒动作（工单 W4 §5.10）：Read → read，Write / Edit → write（带 content），
 * Glob / Grep → search，Bash → run（带 command）；我们的工具与认不出的返回 undefined（不记）。
 */
export function sandboxActionOf(
  sb: SandboxSpec,
  use: ToolUse,
  result: { is_error?: boolean },
): SandboxActionEvent['action'] | undefined {
  const ok = result.is_error !== true;
  const input = use.input;
  const path =
    use.name === 'Bash'
      ? undefined
      : pathOf(
          sb,
          use.name === 'Glob' || use.name === 'Grep' ? (input.path ?? sb.workdir) : input.file_path,
        );
  const shownPath = path === undefined ? undefined : virtualPath(sb, path);
  const withPath = shownPath !== undefined ? { path: shownPath } : {};
  switch (use.name) {
    case 'Read':
      return { op: 'read', ...withPath, summary: `读 ${shownPath ?? ''}`, ok };
    case 'Write':
    case 'Edit': {
      const content =
        typeof input.content === 'string'
          ? input.content
          : typeof input.new_string === 'string'
            ? input.new_string
            : undefined;
      return {
        op: 'write',
        ...withPath,
        summary: `写 ${shownPath ?? ''}`,
        ok,
        ...(content !== undefined ? { content } : {}),
      };
    }
    case 'Glob':
    case 'Grep':
      return { op: 'search', ...withPath, summary: `查 ${shownPath ?? ''}`, ok };
    case 'Bash':
      return {
        op: 'run',
        ...(typeof input.command === 'string' ? { command: input.command } : {}),
        summary: `跑命令：${typeof input.command === 'string' ? input.command : ''}`,
        ok,
      };
    default:
      return undefined;
  }
}

/** 消息里认得出的一小块内容（只取我们配沙盒动作要用的几个字段）。 */
interface ContentBlock {
  type: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  is_error?: boolean;
}

/** 消息里的内容块（内容是纯字符串时没有块）。 */
function blocks(content: unknown): ContentBlock[] {
  return Array.isArray(content) ? (content as ContentBlock[]) : [];
}

/** 从外层 Claude Code 继承来的会话变量会让 SDK 接到外层会话上，去掉。 */
const INHERITED_SESSION_VARS = ['CLAUDECODE', 'CLAUDE_CODE_SESSION_ID', 'CLAUDE_CODE_ENTRYPOINT'];

export class ClaudeAgentSdkModel implements ModelAdapter {
  readonly name = 'claude-agent-sdk';
  readonly disclosure: ModelDisclosure;
  readonly transcriber: ImageTranscriber;

  constructor(private readonly options: ClaudeAgentSdkOptions = {}) {
    this.transcriber = new SdkTranscriber(options);
    this.disclosure = {
      service: 'Anthropic 的 Claude',
      route: '经本机的 Claude 订阅（Claude Agent SDK）',
      profiles: options.profiles ?? {},
      ...(options.model !== undefined ? { defaultModel: options.model } : {}),
    };
  }

  open(spec: ConversationSpec): ModelConversation {
    return new SdkConversation(spec, this.options);
  }
}

class SdkConversation implements ModelConversation {
  private readonly input = new AsyncQueue<SDKUserMessage>();
  private output: AsyncIterator<SDKMessage> | undefined;
  private close_: (() => void) | undefined;
  private sessionId: string | undefined;
  private reportedModel: string | undefined;
  /** 本轮在跑时为真；插话只在这时收。 */
  private turnActive = false;
  /** 已交给 SDK、还没见它答到的输入（按 uuid）。 */
  private readonly pending: string[] = [];
  /** 本轮见过、还没配上结果的工具调用（按 tool_use id）；沙盒动作由它配对。 */
  private readonly toolUses = new Map<string, ToolUse>();

  constructor(
    private readonly spec: ConversationSpec,
    private readonly options: ClaudeAgentSdkOptions,
  ) {
    this.sessionId = spec.resumeToken;
  }

  private start(): AsyncIterator<SDKMessage> {
    const q = query({ prompt: this.input, options: sdkOptionsFor(this.spec, this.options) });
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
        content: modelText(input),
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
      const reported =
        msg.type === 'system' && msg.subtype === 'init'
          ? msg.model
          : msg.type === 'assistant'
            ? msg.message.model
            : undefined;
      if (reported !== undefined && reported !== '' && reported !== this.reportedModel) {
        this.reportedModel = reported;
        yield { kind: 'model', name: reported };
      }
      if (msg.type === 'stream_event') {
        const ev = msg.event;
        if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
          yield { kind: 'text_delta', text: ev.delta.text };
        }
        continue;
      }
      if (msg.type === 'assistant' || msg.type === 'user') {
        // 沙盒里跑的时候：把工具调用与它的结果配成沙盒动作事件（工单 W4 §5.10）
        for (const b of blocks(msg.message.content)) {
          if (b.type === 'tool_use' && typeof b.id === 'string' && typeof b.name === 'string') {
            this.toolUses.set(b.id, { name: b.name, input: b.input ?? {} });
          }
        }
        yield { kind: 'raw', payload: msg.message };
        if (msg.type === 'user') {
          for (const b of blocks(msg.message.content)) {
            if (b.type !== 'tool_result' || typeof b.tool_use_id !== 'string') continue;
            const use = this.toolUses.get(b.tool_use_id);
            if (use === undefined) continue;
            this.toolUses.delete(b.tool_use_id);
            const sb = this.spec.sandbox;
            if (sb === undefined) continue;
            const action = sandboxActionOf(sb, use, { is_error: b.is_error === true });
            if (action !== undefined) yield { kind: 'sandbox_action', action };
          }
        }
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
          if (failed) yield { kind: 'turn_error', reason: failReason(msg) };
          stamped = false;
          continue;
        }
        // 同步收尾：此后的插话由核心按新一轮发
        this.turnActive = false;
        yield failed ? { kind: 'turn_error', reason: failReason(msg) } : { kind: 'turn_end' };
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

/**
 * 图片转写：一问一答（图片 + 一句请求），不给工具、不留会话文件、不续接。
 * 用全局默认模型（转写不是会话类，不走 profiles）；实际执行的模型从 SDK 报的消息里取。
 */
class SdkTranscriber implements ImageTranscriber {
  readonly model?: string;

  constructor(private readonly options: ClaudeAgentSdkOptions) {
    if (options.model !== undefined) this.model = options.model;
  }

  async transcribe(
    image: ImageData,
    instructions: string,
  ): Promise<{ text: string; model?: string }> {
    const input = new AsyncQueue<SDKUserMessage>();
    input.push({
      type: 'user',
      message: {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: image.mime, data: image.data.toString('base64') },
          },
          { type: 'text', text: '请转写这张图片。' },
        ],
      },
      parent_tool_use_id: null,
      uuid: randomUUID(),
    });
    const q = query({
      prompt: input,
      options: {
        systemPrompt: instructions,
        tools: [],
        settingSources: [],
        strictMcpConfig: true,
        maxTurns: 1,
        persistSession: false,
        ...(this.options.model !== undefined ? { model: this.options.model } : {}),
        ...(this.options.cwd !== undefined ? { cwd: this.options.cwd } : {}),
        env: cleanEnv(),
      },
    });
    let model: string | undefined;
    const texts: string[] = [];
    try {
      for await (const msg of q) {
        const reported =
          msg.type === 'system' && msg.subtype === 'init'
            ? msg.model
            : msg.type === 'assistant'
              ? msg.message.model
              : undefined;
        if (reported !== undefined && reported !== '') model = reported;
        if (msg.type === 'assistant') {
          for (const b of msg.message.content) if (b.type === 'text') texts.push(b.text);
        }
        if (msg.type === 'result') {
          if (msg.subtype !== 'success' || msg.is_error) {
            throw new Error(`Agent SDK 转写失败：${msg.subtype}`);
          }
          break;
        }
      }
    } finally {
      input.end();
      q.close();
    }
    const text = texts.join('').trim();
    if (text === '') throw new Error('Agent SDK 转写没有给出文字');
    return { text, ...(model !== undefined ? { model } : {}) };
  }
}

export interface ModelCapability {
  /** 传给 SDK 的模型名（含 default、sonnet 这类别名）。 */
  value: string;
  /** 别名实际指向的模型。 */
  resolved?: string;
  /** 这个模型支持的思考强度；空 = 不支持强度参数。 */
  efforts: string[];
}

/**
 * 列出本机订阅可用的模型与各自支持的思考强度，不调模型。SDK 遇到模型不支持的强度会悄悄降级，
 * 评测用它核对按会话类配的强度会不会被接受。
 */
export async function listModelCapabilities(cwd?: string): Promise<ModelCapability[]> {
  const input = new AsyncQueue<SDKUserMessage>();
  const q = query({
    prompt: input,
    options: {
      tools: [],
      settingSources: [],
      strictMcpConfig: true,
      env: cleanEnv(),
      ...(cwd !== undefined ? { cwd } : {}),
    },
  });
  try {
    const models = await q.supportedModels();
    return models.map((m) => ({
      value: m.value,
      ...(m.resolvedModel !== undefined ? { resolved: m.resolvedModel } : {}),
      efforts: m.supportedEffortLevels ?? [],
    }));
  } finally {
    input.end();
    q.close();
  }
}

/** 本轮失败的原因：带上 SDK 给的错误原文（如沙盒缺依赖、续接不到会话），只写 subtype 看不出哪里坏了。 */
function failReason(msg: { subtype: string; errors?: string[] }): string {
  const detail =
    msg.errors !== undefined && msg.errors.length > 0 ? `（${msg.errors.join('；')}）` : '';
  return `Agent SDK 本轮失败：${msg.subtype}${detail}`;
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
