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
import {
  baseDir,
  canDescend,
  canRead,
  canWrite,
  resolveSandboxPath,
  virtualPath,
} from './sandbox-paths.ts';

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

/** 进程内工具一次调用的上限：30 分钟（导入会话交 MinerU 转一份大 PDF 要十几分钟）。 */
const TOOL_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * 由 spec 与选项算出 SDK 的 options（纯函数，不调模型）。
 * 没有 `spec.sandbox` 时：内置工具全关、只挂我们的进程内 MCP 工具（要联网的再放联网搜索与网页抓取）。
 * 有沙盒时打开六个通用工具，cwd 落到工作区，只读目录经 additionalDirectories 与沙盒的 allowRead 给出，
 * 每次工具调用再经 `canUseTool` 按沙盒卡一道（记录/读写权限.md「执行方式」）。学习对话沙盒与联网同时有
 * （W12 §2）：联网只给模型的两个内置工具，沙盒里的命令照旧不联网。
 */

export function sdkOptionsFor(
  spec: ConversationSpec,
  o: ClaudeAgentSdkOptions,
  /** 子代理的一次工具调用（tool_use id）属于哪件活（task_id）；认不出返回 undefined。 */
  taskOfCall?: (toolUseId: string) => string | undefined,
): Options {
  const server = createSdkMcpServer({
    name: SERVER,
    // 我们的工具里有跑得久的（导入会话的 mineru、组件试跑）；不跟环境变量 MCP_TOOL_TIMEOUT 走——
    // 它设成 60 秒时模型拿到超时会再调一次
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
  const model = profile?.model ?? o.model;
  const effort = profile?.effort ?? o.effort;
  const sb = spec.sandbox;
  // 主对话带沙盒时 cwd 仍是数据目录（续接按它找会话文件，W11 §5）；其余有沙盒的落到工作区
  const cwd = sb !== undefined ? (sb.cwd ?? sb.workdir) : o.cwd;
  const denyRead =
    sb !== undefined ? [...(o.cwd !== undefined ? [o.cwd] : []), ...(sb.denyRead ?? [])] : [];
  const builtins =
    sb === undefined
      ? []
      : sb.commands === false
        ? SANDBOX_TOOLS.filter((t) => t !== 'Bash')
        : SANDBOX_TOOLS;
  // 联网只放搜索与网页抓取两个内置工具（W12 §2：学习对话可与沙盒同时有）
  const webTools = spec.webSearch === true ? ['WebSearch', 'WebFetch'] : [];
  const subs: SubagentSpec[] = [];
  return {
    systemPrompt: spec.systemPrompt,
    tools: [...builtins, ...webTools],
    settingSources: [],
    mcpServers: { [SERVER]: server },
    allowedTools: [...spec.tools.map((t) => `mcp__${SERVER}__${t.name}`), ...webTools],
    strictMcpConfig: true,
    includePartialMessages: true,
    // 思考概要（W12 §7.2）：只存进 model_raw、导出上下文时看，界面不显示、不进别的会话
    thinking: { type: 'adaptive', display: 'summarized' },
    ...(spec.resumeToken !== undefined ? { resume: spec.resumeToken } : {}),
    ...(spec.fork === true && spec.resumeToken !== undefined ? { forkSession: true } : {}),
    ...(spec.ephemeral === true ? { persistSession: false } : {}),
    ...(model !== undefined ? { model } : {}),
    ...(effort !== undefined ? { effort } : {}),
    ...(cwd !== undefined ? { cwd } : {}),
    ...(sb !== undefined
      ? {
          additionalDirectories: [
            ...readOnlyDirs(sb),
            ...(sb.cwd !== undefined && sb.cwd !== sb.workdir ? [sb.workdir] : []),
          ],
          permissionMode: 'default' as const,
          canUseTool: sandboxPermission(sb, subs, taskOfCall, spec.webSearch === true),
          hooks: {
            PreToolUse: [
              // 工作目录与 additionalDirectories 里的读，框架可能不问 canUseTool 就放行；挡掉的位置（存密钥处、
              // 数据目录）在调用前的钩子上再按同一套判断卡一道（W11 §5）
              { matcher: 'Read|Glob|Grep', hooks: [readGate(sb, subs)] },
            ],
          },
          sandbox: {
            enabled: true,
            autoAllowBashIfSandboxed: true,
            allowUnsandboxedCommands: false,
            filesystem: {
              allowWrite: [sb.workdir],
              // 子代理的目录主模型的命令也写不了（子代理不给命令，它写靠文件工具，不经沙盒）
              denyWrite: [...sb.readOnly.map((e) => e.path), ...subs.map((a) => a.writable)],
              denyRead,
              // 只在挡掉的范围里重新放开的才写进来（allowRead 压过 denyRead：把家目录写进来会把挡掉的又放开）；
              // 不在挡掉范围里的本来就读得到
              allowRead: [
                sb.workdir,
                ...sb.readOnly
                  .map((e) => e.path)
                  .filter((p) => denyRead.some((d) => within(resolve(p), d))),
              ],
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
export function sandboxPermission(
  sb: SandboxSpec,
  subs: SubagentSpec[] = [],
  taskOfCall?: (toolUseId: string) => string | undefined,
  /** 这个会话放开了联网搜索与网页抓取（W12 §2 学习对话）。 */
  web = false,
): CanUseTool {
  return (toolName, input, opts): Promise<PermissionResult> =>
    Promise.resolve(
      decide(
        sb,
        subs,
        toolName,
        input,
        // 是哪件活：按这次调用的 tool_use id 认（调用所在的子代理消息 → 派它的 Agent 调用 → task_started 的
        // task_id），不假设 SDK 的 agentID 就是 task_id；认不出（消息还没到）才退回 agentID。
        // 10-27 真模型核过一次（0.3.293，4 次调用）：两者相同，按调用认的都认得出
        opts.agentID === undefined ? undefined : (taskOfCall?.(opts.toolUseID) ?? opts.agentID),
        web,
      ),
    );
}

/** 读之前的钩子（主模型自己的读；子代理的读照旧经 canUseTool）：和 canUseTool 同一套判断。 */
function readGate(sb: SandboxSpec, subs: SubagentSpec[]): HookCallback {
  return (input) => {
    if (input.hook_event_name !== 'PreToolUse' || input.agent_id !== undefined) {
      return Promise.resolve({});
    }
    const toolInput =
      typeof input.tool_input === 'object' && input.tool_input !== null
        ? (input.tool_input as Record<string, unknown>)
        : {};
    const r = decide(sb, subs, input.tool_name, toolInput);
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
  /** 子代理做的：它这件活的编号（task_id）；主模型做的为 undefined。 */
  agentId?: string,
  /** 放开了联网搜索与网页抓取。 */
  web = false,
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
        return deny(
          `${shown(sb, abs, input)} 读不到${sb.cwd !== undefined ? '（要写完整路径，在家目录下、不在隐藏目录与数据目录里）' : ''}`,
        );
      }
      return allow(input);
    }
    case 'Glob':
    case 'Grep': {
      // 不给 path = SDK 的工作目录（主对话是数据目录，会被挡）
      const abs =
        input.path === undefined
          ? resolve(bySubagent ? (subs[0]?.writable ?? baseDir(sb)) : baseDir(sb))
          : pathOf(sb, input.path);
      if (abs === undefined || !canRead(sb, abs) || (bySubagent && !subCanRead(abs))) {
        return deny(
          `${shown(sb, abs, input)} 读不到${sb.cwd !== undefined ? '（path 要写完整路径，在家目录下、不在隐藏目录与数据目录里）' : ''}`,
        );
      }
      if (!canDescend(sb, abs)) {
        return deny(
          `${shown(sb, abs, input)} 里面包着不让读的位置（存密钥的隐藏目录、Studium 的数据目录），不能整个搜；给更具体的子目录`,
        );
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
    case 'WebSearch':
    case 'WebFetch':
      return web && !bySubagent ? allow(input) : deny(`这个工具不给用：${toolName}`);
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
          use.name === 'Glob' || use.name === 'Grep'
            ? (input.path ?? baseDir(sb))
            : input.file_path,
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
/** 我们自己的密钥不进模型那边的环境（沙盒里的命令会继承它；W11 §4 MinerU 密钥留在程序里）。 */
const OUR_SECRETS = /^(MINERU_TOKEN|STUDIUM_TOKEN|DEEPSEEK_API_KEY|OPENAI_API_KEY)$/;

export class ClaudeAgentSdkModel implements ModelAdapter {
  readonly name = 'claude-agent-sdk';
  readonly disclosure: ModelDisclosure;

  constructor(private readonly options: ClaudeAgentSdkOptions = {}) {
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
  /** SDK 的 query（中断用）。 */
  private query_: { interrupt(): Promise<unknown> } | undefined;
  /** 学习者点了停止：这一轮的结果按停下收尾。 */
  private stopping = false;
  /** 本轮里 SDK 已标出答到了哪些输入（老版本不标）。 */
  private stamped = false;
  /** 本轮主模型每次回话的用量（按 message id；同一次回话会拆成几条 SDK 消息）。 */
  private readonly usage = new Map<string, { context: number; output: number }>();
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
  /** 子代理消息里的工具调用（tool_use id）→ 它属于哪次派活（派它的 Agent 调用的 tool_use id）。 */
  private readonly callParent = new Map<string, string>();
  /** 本轮主模型这一侧收到的服务报错（SDK 造的助手消息，外层 error 有值）；本轮结果出来时取走。 */
  private readonly apiErrors: { code: string; text: string }[] = [];
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
    const q = query({
      prompt: this.input,
      options: sdkOptionsFor(this.spec, this.options, (id) => {
        const parent = this.callParent.get(id);
        return parent !== undefined ? this.taskOf.get(parent) : undefined;
      }),
    });
    this.query_ = q;
    this.close_ = () => {
      q.close();
    };
    this.output = q[Symbol.asyncIterator]();
    void this.pump(this.output);
  }

  private push(input: TurnInput): void {
    const uuid = randomUUID();
    this.pending.push(uuid);
    this.input.push({
      type: 'user',
      message: {
        role: 'user',
        // 学习者附的图原样送（W12 §5.6）：先图后字
        content:
          input.images !== undefined && input.images.length > 0
            ? [
                ...input.images.map((im) => ({
                  type: 'image' as const,
                  source: {
                    type: 'base64' as const,
                    media_type: im.mime,
                    data: im.data.toString('base64'),
                  },
                })),
                { type: 'text' as const, text: modelText(input) },
              ]
            : modelText(input),
      },
      parent_tool_use_id: null,
      uuid,
    });
  }

  /**
   * 学习者点了停止（W12 §4.4）：交 SDK 中断这一轮；SDK 随后交回这一轮的结果，按停下收尾（不记成失败），
   * 同一个对话之后接着用。
   */
  async interrupt(): Promise<void> {
    if (this.current === undefined || this.query_ === undefined) return;
    this.stopping = true;
    await this.query_.interrupt();
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
  private route(
    ev: ModelEvent | { kind: 'result'; failed: boolean; reason: string; notice?: string },
  ): void {
    if (ev.kind === 'result') {
      if (this.current === undefined) return;
      if (!this.stamped) this.pending.shift();
      const stopped = this.stopping;
      this.stopping = false;
      if (this.pending.length > 0 && !stopped) {
        // 还有交过去没答到的输入：SDK 会接着为它另跑一轮，读到它的结果再收尾
        if (ev.failed) this.current.push(turnError(ev));
        this.stamped = false;
        return;
      }
      if (stopped) this.pending.splice(0);
      this.finishTurn(ev.failed && !stopped ? turnError(ev) : { kind: 'turn_end' });
      return;
    }
    const sideOnly =
      ev.kind === 'subagent' ||
      (ev.kind === 'sandbox_action' && ev.agent !== undefined) ||
      ev.kind === 'session' ||
      ev.kind === 'model' ||
      ev.kind === 'usage';
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
  ): (ModelEvent | { kind: 'result'; failed: boolean; reason: string; notice?: string })[] {
    const out: (
      ModelEvent | { kind: 'result'; failed: boolean; reason: string; notice?: string }
    )[] = [];
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
    // 服务报错时 SDK 造的那条助手消息（model 是 "<synthetic>"）不是实际执行的模型
    if (msg.type === 'assistant' && msg.error === undefined) this.model(msg.message.model, out);
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
          // 正在做什么（W12 §4.5）：主模型开始调一个工具
          if (msg.type === 'assistant' && parent === null) {
            out.push({ kind: 'activity', tool: b.name, input: b.input ?? {} });
          }
          if (msg.parent_tool_use_id !== null) this.callParent.set(b.id, msg.parent_tool_use_id);
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
        // 子代理说的话不进主模型这一轮；记下最后一段，做完时作为它交回的（服务报错那句不算它说的）
        if (text !== '' && msg.error === undefined)
          this.lastWords.set(msg.parent_tool_use_id, text);
        return out;
      }
      // SDK 在回复上标出本轮已经并进来的用户消息（含中途插话）
      const answered =
        msg.user_message_uuids ??
        (msg.user_message_uuid !== undefined ? [msg.user_message_uuid] : []);
      if (answered.length > 0) this.stamped = true;
      const u = msg.message.usage as
        | {
            input_tokens?: number | null;
            cache_read_input_tokens?: number | null;
            cache_creation_input_tokens?: number | null;
            output_tokens?: number | null;
          }
        | undefined;
      if (u !== undefined && msg.error === undefined) {
        this.usage.set(msg.message.id, {
          context:
            (u.input_tokens ?? 0) +
            (u.cache_read_input_tokens ?? 0) +
            (u.cache_creation_input_tokens ?? 0),
          output: u.output_tokens ?? 0,
        });
      }
      for (const u of answered) {
        const i = this.pending.indexOf(u);
        if (i >= 0) this.pending.splice(i, 1);
      }
      if (msg.error !== undefined) {
        // 服务报错（额度用完、鉴权失败、过载……）：SDK 把报错句当一条助手消息交回，外层标 error。
        // 那句不是模型说的话，不交 assistant_text；收着，本轮结果出来时记进失败事件
        this.apiErrors.push({ code: msg.error, text });
      } else if (text !== '') out.push({ kind: 'assistant_text', text });
    }
    if (msg.type === 'result') {
      const used = [...this.usage.values()];
      this.usage.clear();
      const last = used.at(-1);
      if (last !== undefined && last.context > 0) {
        // 输出取本轮结果里的总数（流式时每条回话上的用量只是开头那一刻的）；没有再按各次回话加
        const total = (msg as { usage?: { output_tokens?: number | null } }).usage?.output_tokens;
        out.push({
          kind: 'usage',
          context: last.context,
          output: total ?? used.reduce((n, x) => n + x.output, 0),
        });
      }
      const errs = this.apiErrors.splice(0);
      const notice = errs.map((e) => (e.text !== '' ? e.text : e.code)).join('；');
      out.push({
        kind: 'result',
        failed: msg.subtype !== 'success' || msg.is_error || errs.length > 0,
        reason: `${failReason(msg)}${errs.length > 0 ? `；服务报错：${errs.map((e) => e.code).join('、')}` : ''}`,
        ...(notice !== '' ? { notice } : {}),
      });
    }
    return out;
  }

  private model(
    reported: string | undefined,
    out: (ModelEvent | { kind: 'result'; failed: boolean; reason: string; notice?: string })[],
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

function turnError(ev: { reason: string; notice?: string }): ModelEvent {
  return {
    kind: 'turn_error',
    reason: ev.reason,
    ...(ev.notice !== undefined ? { notice: ev.notice } : {}),
  };
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
    if (v !== undefined && !INHERITED_SESSION_VARS.includes(k) && !OUR_SECRETS.test(k)) env[k] = v;
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
