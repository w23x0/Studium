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
  type HookCallback,
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
  type SubagentSpec,
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
  const key = spec.profile ?? spec.session?.kind;
  const profile = key !== undefined ? o.profiles?.[key] : undefined;
  // 主模型派的子代理：模型与强度按 profiles 的 subagent 一项（会话/页面子代理.md「模型」单独配）
  const subProfile = o.profiles?.subagent;
  const model = profile?.model ?? o.model;
  const effort = profile?.effort ?? o.effort;
  const sb = spec.sandbox;
  const cwd = sb !== undefined ? sb.workdir : o.cwd;
  const builtins =
    sb === undefined
      ? []
      : sb.commands === false
        ? SANDBOX_TOOLS.filter((t) => t !== 'Bash')
        : SANDBOX_TOOLS;
  // 只放联网搜索与网页抓取两个内置工具；没有会话同时带沙盒与 webSearch（工单 W5 §4.6）
  const webTools = spec.webSearch === true ? ['WebSearch', 'WebFetch'] : [];
  // 子代理：框架自带的 Agent（派）与 SendMessage（续同一个）；子代理只拿自己那几样工具（会话/页面子代理.md）
  const subs = sb !== undefined ? (spec.subagents ?? []) : [];
  const agentTools = subs.length > 0 ? ['Agent', 'SendMessage'] : [];
  return {
    systemPrompt: spec.systemPrompt,
    tools: [...builtins, ...webTools, ...agentTools],
    ...(subs.length > 0
      ? {
          agents: Object.fromEntries(
            subs.map((a) => [
              a.name,
              {
                description: a.description,
                prompt: a.prompt,
                tools: [...a.builtins, ...a.ownTools.map((t) => `mcp__${SERVER}__${t}`)],
                background: true,
                ...(subProfile?.model !== undefined ? { model: subProfile.model } : {}),
                ...(subProfile?.effort !== undefined ? { effort: subProfile.effort } : {}),
              },
            ]),
          ),
        }
      : {}),
    settingSources: [],
    mcpServers: { [SERVER]: server },
    // 子代理专用的工具不预先放行：每次都经 canUseTool 看是不是子代理在调
    allowedTools: [
      ...spec.tools
        .filter((t) => !subs.some((a) => a.ownTools.includes(t.name)))
        .map((t) => `mcp__${SERVER}__${t.name}`),
      ...webTools,
    ],
    strictMcpConfig: true,
    includePartialMessages: true,
    ...(spec.resumeToken !== undefined ? { resume: spec.resumeToken } : {}),
    ...(spec.ephemeral === true ? { persistSession: false } : {}),
    ...(model !== undefined ? { model } : {}),
    ...(effort !== undefined ? { effort } : {}),
    ...(cwd !== undefined ? { cwd } : {}),
    ...(sb !== undefined
      ? {
          additionalDirectories: readOnlyDirs(sb),
          permissionMode: 'default' as const,
          canUseTool: sandboxPermission(sb, subs),
          // 派子代理不经 canUseTool（框架自己放行），同一套判断挂在调用前的钩子上
          ...(subs.length > 0
            ? {
                hooks: {
                  PreToolUse: [{ matcher: 'Agent|Task', hooks: [agentGate(sb, subs)] }],
                },
              }
            : {}),
          sandbox: {
            enabled: true,
            autoAllowBashIfSandboxed: true,
            allowUnsandboxedCommands: false,
            filesystem: {
              allowWrite: [sb.workdir],
              // 子代理的目录主模型的命令也写不了（子代理不给命令，它写靠文件工具，不经沙盒）
              denyWrite: [...sb.readOnly.map((e) => e.path), ...subs.map((a) => a.writable)],
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
 * 工具调用能不能做（工单 W4 §5.10）：我们的 `mcp__studium__*` 放行（子代理专用的只给子代理）；
 * Read / Glob / Grep 按 `canRead`；Write / Edit 按 `canWrite`，子代理只能写自己的目录、主模型不能写那里；
 * Bash 放行（命令由沙盒卡）；派子代理与给它发消息放行；其余工具不给用。相对路径按工作区解析。
 * 子代理的调用带 agentID（会话/页面子代理.md：外围只做能写哪些文件、交时检查、试跑）。
 */
export function sandboxPermission(sb: SandboxSpec, subs: SubagentSpec[] = []): CanUseTool {
  return (toolName, input, opts): Promise<PermissionResult> =>
    Promise.resolve(decide(sb, subs, toolName, input, opts.agentID));
}

/** 派子代理前的钩子：和 canUseTool 同一套判断，拦下时把原因交回给模型。 */
function agentGate(sb: SandboxSpec, subs: SubagentSpec[]): HookCallback {
  return (input) => {
    if (input.hook_event_name !== 'PreToolUse') return Promise.resolve({});
    const toolInput =
      typeof input.tool_input === 'object' && input.tool_input !== null
        ? (input.tool_input as Record<string, unknown>)
        : {};
    const r = decide(sb, subs, input.tool_name, toolInput, input.agent_id);
    return Promise.resolve(
      r.behavior === 'deny'
        ? {
            hookSpecificOutput: {
              hookEventName: 'PreToolUse' as const,
              permissionDecision: 'deny' as const,
              permissionDecisionReason: r.message,
            },
          }
        : {},
    );
  };
}

function decide(
  sb: SandboxSpec,
  subs: SubagentSpec[],
  toolName: string,
  input: Record<string, unknown>,
  /** 子代理做的：它的编号（SDK 的 agent_id，同 task_id）；主模型做的为 undefined。 */
  agentId?: string,
): PermissionResult {
  const bySubagent = agentId !== undefined;
  const own = new Set(subs.flatMap((a) => a.ownTools.map((t) => `mcp__${SERVER}__${t}`)));
  if (toolName.startsWith(`mcp__${SERVER}__`)) {
    return own.has(toolName) && !bySubagent ? deny('这个工具是子代理用的') : allow(input);
  }
  // 子代理只读得到它能写的与给它的（记录/读写权限.md 页面子代理行）
  const subCanRead = (abs: string) =>
    subs.some(
      (a) =>
        within(abs, a.writable) ||
        [...(a.readable ?? []), ...(a.readableFor?.(agentId) ?? [])].some((r) => within(abs, r)),
    );
  switch (toolName) {
    case 'Read': {
      const abs = pathOf(sb, input.file_path);
      if (abs === undefined || !canRead(sb, abs) || (bySubagent && !subCanRead(abs))) {
        return deny(`${shown(sb, abs, input)} 读不到`);
      }
      return allow(input);
    }
    case 'Glob':
    case 'Grep': {
      const abs =
        input.path === undefined
          ? resolve(bySubagent ? (subs[0]?.writable ?? sb.workdir) : sb.workdir)
          : pathOf(sb, input.path);
      if (abs === undefined || !canRead(sb, abs) || (bySubagent && !subCanRead(abs))) {
        return deny(`${shown(sb, abs, input)} 读不到`);
      }
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
      const inSub = abs !== undefined && subs.some((a) => within(abs, a.writable));
      // 子代理写错地方：告诉它能写的完整路径（它不一定知道工作区在哪）
      if (bySubagent && !inSub) {
        return deny(`你只能写这里面的文件：${subs.map((a) => a.writable).join('、')}`);
      }
      if (abs === undefined || !canWrite(sb, abs)) {
        return deny(`${shown(sb, abs, input)} 是只读的，或在工作区外，不能写`);
      }
      if (!bySubagent && inSub) return deny(`${shown(sb, abs, input)} 由子代理改，派它去改`);
      return allow(input);
    }
    case 'Bash':
      return sb.commands === false || bySubagent ? deny('这里不给跑命令') : allow(input);
    case 'Agent':
    case 'Task': {
      if (subs.length === 0 || bySubagent) return deny(`这个工具不给用：${toolName}`);
      const sub = subs.find((a) => a.name === input.subagent_type);
      if (sub === undefined)
        return deny(`只能派这几个子代理：${subs.map((a) => a.name).join('、')}`);
      return sub.busy?.() === true
        ? deny('它还在做上一件；等它交回，或用 SendMessage 接着跟它说')
        : allow(input);
    }
    case 'SendMessage':
      return subs.length > 0 && !bySubagent ? allow(input) : deny(`这个工具不给用：${toolName}`);
    default:
      return deny(`这个工具不给用：${toolName}`);
  }
}

function within(abs: string, dir: string): boolean {
  const d = resolve(dir);
  return abs === d || abs.startsWith(`${d}/`);
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

/** 一轮的事件流：边收边交（send() 与模型自己起的一轮都用它）。 */
class Channel implements AsyncIterable<ModelEvent> {
  private readonly q = new AsyncQueue<ModelEvent>();
  private done_ = false;
  private readonly waiters: (() => void)[] = [];

  push(ev: ModelEvent): void {
    if (!this.done_) this.q.push(ev);
  }

  end(): void {
    if (this.done_) return;
    this.done_ = true;
    this.q.end();
    for (const w of this.waiters.splice(0)) w();
  }

  get done(): boolean {
    return this.done_;
  }

  ended(): Promise<void> {
    return this.done_ ? Promise.resolve() : new Promise((r) => this.waiters.push(r));
  }

  [Symbol.asyncIterator](): AsyncIterator<ModelEvent> {
    return this.q[Symbol.asyncIterator]();
  }
}

/**
 * 一份 SDK 对话。SDK 的输出是一条连续的流：send() 那一轮的事交给 send()；子代理在后台跑时的动作、
 * 主模型空着时子代理做完、框架自己接着跑的一轮，经 listen() 交给核心（10-26 真模型实测：0.3.293
 * 流式输入下，主模型空着时子代理做完会自己起一轮）。
 */
class SdkConversation implements ModelConversation {
  private readonly input = new AsyncQueue<SDKUserMessage>();
  private output: AsyncIterator<SDKMessage> | undefined;
  private close_: (() => void) | undefined;
  private sessionId: string | undefined;
  private reportedModel: string | undefined;
  /** 正在跑的那一轮（send() 的或模型自己起的）；没有 = 主模型空着。 */
  private current: Channel | undefined;
  /** 已交给 SDK、还没见它答到的输入（按 uuid）。 */
  private readonly pending: string[] = [];
  /** 本轮里 SDK 已标出答到了哪些输入（老版本不标）。 */
  private stamped = false;
  /** 见过、还没配上结果的工具调用（按 tool_use id）；沙盒动作由它配对。 */
  private readonly toolUses = new Map<string, ToolUse>();
  /** 派子代理的那次调用（tool_use id）→ 子代理名字。 */
  private readonly agentOf = new Map<string, string>();
  /** 子代理最后说的一段话（按派它的那次调用）。 */
  private readonly lastWords = new Map<string, string>();
  /** 派子代理那次调用的交代原文（按 tool_use id），开始时带进 SubagentEvent。 */
  private readonly briefs = new Map<string, string>();
  /** 派子代理的那次调用（tool_use id）→ 这件活的编号（task_id）。 */
  private readonly taskOf = new Map<string, string>();
  private handlers: Parameters<NonNullable<ModelConversation['listen']>>[0] | undefined;

  constructor(
    private readonly spec: ConversationSpec,
    private readonly options: ClaudeAgentSdkOptions,
  ) {
    this.sessionId = spec.resumeToken;
  }

  listen(handlers: Parameters<NonNullable<ModelConversation['listen']>>[0]): void {
    this.handlers = handlers;
  }

  private start(): void {
    if (this.output !== undefined) return;
    const q = query({ prompt: this.input, options: sdkOptionsFor(this.spec, this.options) });
    this.close_ = () => {
      q.close();
    };
    this.output = q[Symbol.asyncIterator]();
    void this.pump(this.output);
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
    if (this.current === undefined || this.current.done) return false;
    this.push(input, 'next');
    return true;
  }

  async *send(input: TurnInput): AsyncGenerator<ModelEvent> {
    this.start();
    // 模型自己起的那一轮还没跑完：等它收尾再发（核心那边会把它当一轮接着记）
    while (this.current !== undefined) await this.current.ended();
    const turn = new Channel();
    this.current = turn;
    this.stamped = false;
    this.push(input);
    yield* turn;
  }

  /** 一直读 SDK 的输出，分给正在跑的那一轮，或经 listen() 交给核心。 */
  private async pump(output: AsyncIterator<SDKMessage>): Promise<void> {
    for (;;) {
      let next: IteratorResult<SDKMessage>;
      try {
        next = await output.next();
      } catch (e) {
        this.finishTurn({
          kind: 'turn_error',
          reason: `Agent SDK 出错：${e instanceof Error ? e.message : String(e)}`,
        });
        return;
      }
      if (next.done === true) {
        // 对话已断：没答到的不会再答了，清掉免得下一轮一直等它们
        this.pending.splice(0);
        this.finishTurn({ kind: 'turn_error', reason: 'Agent SDK 提前结束了对话' });
        return;
      }
      for (const ev of this.eventsOf(next.value)) this.route(ev);
    }
  }

  /** 一个事件交给谁：主模型这一轮的进当前一轮（没有就开一轮“模型自己起的”）；子代理的另交。 */
  private route(ev: ModelEvent | { kind: 'result'; failed: boolean; reason: string }): void {
    if (ev.kind === 'result') {
      if (this.current === undefined) return;
      if (!this.stamped) this.pending.shift();
      if (this.pending.length > 0) {
        // 还有插话没并进本轮：SDK 会接着为它另跑一轮，读到它的结果再收尾
        if (ev.failed) this.current.push({ kind: 'turn_error', reason: ev.reason });
        this.stamped = false;
        return;
      }
      this.finishTurn(ev.failed ? { kind: 'turn_error', reason: ev.reason } : { kind: 'turn_end' });
      return;
    }
    const sideOnly =
      ev.kind === 'subagent' ||
      (ev.kind === 'sandbox_action' && ev.agent !== undefined) ||
      ev.kind === 'session' ||
      ev.kind === 'model';
    if (this.current === undefined && sideOnly) {
      this.handlers?.side(ev);
      return;
    }
    if (this.current === undefined) {
      // 主模型空着，模型自己起了一轮（子代理做完后）：交给核心当一轮记
      const turn = new Channel();
      this.current = turn;
      this.stamped = false;
      if (this.handlers !== undefined) this.handlers.unprompted(turn);
      else void drainQuietly(turn);
    }
    this.current.push(ev);
  }

  private finishTurn(last: ModelEvent): void {
    const turn = this.current;
    if (turn === undefined) return;
    turn.push(last);
    this.current = undefined;
    turn.end();
  }

  /** 一条 SDK 消息 → 我们的事件（有状态：工具调用配对、子代理认人）。 */
  private eventsOf(
    msg: SDKMessage,
  ): (ModelEvent | { kind: 'result'; failed: boolean; reason: string })[] {
    const out: (ModelEvent | { kind: 'result'; failed: boolean; reason: string })[] = [];
    const sid = 'session_id' in msg ? msg.session_id : undefined;
    if (sid !== undefined && sid !== this.sessionId) {
      this.sessionId = sid;
      out.push({ kind: 'session', token: sid });
    }
    if (msg.type === 'system') {
      const m = msg as { subtype: string; model?: string } & Record<string, unknown>;
      if (m.subtype === 'init' && typeof m.model === 'string') this.model(m.model, out);
      if (m.subtype === 'task_started' && typeof m.task_id === 'string') {
        const agent = typeof m.subagent_type === 'string' ? m.subagent_type : '子代理';
        const via = typeof m.tool_use_id === 'string' ? m.tool_use_id : undefined;
        if (via !== undefined) {
          this.agentOf.set(via, agent);
          this.taskOf.set(via, m.task_id);
        }
        const brief = via !== undefined ? this.briefs.get(via) : undefined;
        out.push({
          kind: 'subagent',
          phase: 'started',
          agent,
          taskId: m.task_id,
          ...(typeof m.description === 'string' ? { description: m.description } : {}),
          ...(brief !== undefined ? { brief } : {}),
        });
      }
      if (m.subtype === 'task_notification' && typeof m.task_id === 'string') {
        const via = typeof m.tool_use_id === 'string' ? m.tool_use_id : undefined;
        const words = via !== undefined ? this.lastWords.get(via) : undefined;
        const summary = typeof m.summary === 'string' ? m.summary : undefined;
        const said = words ?? summary;
        out.push({
          kind: 'subagent',
          phase: 'done',
          agent: (via !== undefined ? this.agentOf.get(via) : undefined) ?? '子代理',
          taskId: m.task_id,
          ...(typeof m.status === 'string' ? { status: m.status } : {}),
          ...(said !== undefined ? { text: said } : {}),
        });
      }
      return out;
    }
    if (msg.type === 'assistant') this.model(msg.message.model, out);
    if (msg.type === 'stream_event') {
      const ev = msg.event;
      if (
        msg.parent_tool_use_id === null &&
        ev.type === 'content_block_delta' &&
        ev.delta.type === 'text_delta'
      ) {
        out.push({ kind: 'text_delta', text: ev.delta.text });
      }
      return out;
    }
    if (msg.type === 'assistant' || msg.type === 'user') {
      const parent = msg.parent_tool_use_id;
      const agent = parent !== null ? (this.agentOf.get(parent) ?? '子代理') : undefined;
      const task = parent !== null ? this.taskOf.get(parent) : undefined;
      // 沙盒里跑的时候：把工具调用与它的结果配成沙盒动作事件（工单 W4 §5.10）
      for (const b of blocks(msg.message.content)) {
        if (b.type === 'tool_use' && typeof b.id === 'string' && typeof b.name === 'string') {
          this.toolUses.set(b.id, { name: b.name, input: b.input ?? {} });
          const prompt = b.input?.prompt;
          if ((b.name === 'Agent' || b.name === 'Task') && typeof prompt === 'string') {
            this.briefs.set(b.id, prompt);
          }
        }
      }
      if (agent === undefined) out.push({ kind: 'raw', payload: msg.message });
      if (msg.type === 'user') {
        for (const b of blocks(msg.message.content)) {
          if (b.type !== 'tool_result' || typeof b.tool_use_id !== 'string') continue;
          const use = this.toolUses.get(b.tool_use_id);
          if (use === undefined) continue;
          this.toolUses.delete(b.tool_use_id);
          const sb = this.spec.sandbox;
          if (sb === undefined) continue;
          const action = sandboxActionOf(sb, use, { is_error: b.is_error === true });
          if (action !== undefined) {
            out.push({
              kind: 'sandbox_action',
              ...(agent !== undefined ? { agent } : {}),
              ...(task !== undefined ? { task } : {}),
              action,
            });
          }
        }
      }
    }
    if (msg.type === 'assistant') {
      const text = msg.message.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
      if (msg.parent_tool_use_id !== null) {
        // 子代理说的话不进主模型这一轮；记下最后一段，做完时作为它交回的
        if (text !== '') this.lastWords.set(msg.parent_tool_use_id, text);
        return out;
      }
      // SDK 在回复上标出本轮已经并进来的用户消息（含中途插话）
      const answered =
        msg.user_message_uuids ??
        (msg.user_message_uuid !== undefined ? [msg.user_message_uuid] : []);
      if (answered.length > 0) this.stamped = true;
      for (const u of answered) {
        const i = this.pending.indexOf(u);
        if (i >= 0) this.pending.splice(i, 1);
      }
      if (text !== '') out.push({ kind: 'assistant_text', text });
    }
    if (msg.type === 'result') {
      out.push({
        kind: 'result',
        failed: msg.subtype !== 'success' || msg.is_error,
        reason: failReason(msg),
      });
    }
    return out;
  }

  private model(
    reported: string | undefined,
    out: (ModelEvent | { kind: 'result'; failed: boolean; reason: string })[],
  ): void {
    if (reported !== undefined && reported !== '' && reported !== this.reportedModel) {
      this.reportedModel = reported;
      out.push({ kind: 'model', name: reported });
    }
  }

  close(): Promise<void> {
    this.input.end();
    this.close_?.();
    return Promise.resolve();
  }
}

/** 没人接的一轮也要读完，免得卡住。 */
async function drainQuietly(events: AsyncIterable<ModelEvent>): Promise<void> {
  const it = events[Symbol.asyncIterator]();
  while (!(await it.next()).done) {
    /* 只读完，不用 */
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
