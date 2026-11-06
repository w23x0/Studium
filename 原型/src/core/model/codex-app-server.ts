import { API_EFFORTS, type ApiConnection } from './api-connection.ts';
// Codex 的完整 agent 循环由本机 app-server 执行；Studium 只接工具与事件。
// 每个模型对话一个进程，权限、工具回调、临时分叉互不共用；stdio 协议按 0.166.0 核对。
import { z } from 'zod';
import {
  modelText,
  type ConversationSpec,
  type ModelAdapter,
  type ModelConversation,
  type ModelDisclosure,
  type ModelEvent,
  type QuotaSnapshot,
  type ToolResult,
  type TurnInput,
} from './port.ts';
import type { Profiles } from './profiles.ts';
import { codexArgs, codexEnv, prepareCodexHome } from './codex-config.ts';
import { asError, CodexRpc, EventQueue, type RpcId } from './codex-rpc.ts';
import {
  codexQuota,
  deltaNotification,
  emptyUsage,
  itemNotification,
  modelList,
  sessionToken,
  threadResponse,
  toolCall,
  turnNotification,
  usageNotification,
  type CodexUsage,
} from './codex-protocol.ts';
import { codexActions, codexActivity } from './codex-events.ts';

export interface CodexOptions {
  api?: ApiConnection;
  cwd: string;
  binary?: string;
  model?: string;
  profiles?: Profiles;
}

export class CodexAppServerModel implements ModelAdapter {
  readonly name = 'codex-app-server';
  readonly disclosure: ModelDisclosure;
  private readonly live = new Set<CodexConversation>();
  private lastQuota: QuotaSnapshot | undefined;

  constructor(private readonly options: CodexOptions) {
    this.disclosure = {
      service: 'OpenAI 的 GPT',
      route:
        options.api === undefined
          ? '经本机 Codex 登录（Codex app-server）'
          : `API：${options.api.baseUrl}`,
      profiles: options.profiles ?? {},
      ...(options.model !== undefined ? { defaultModel: options.model } : {}),
    };
  }

  open(spec: ConversationSpec): ModelConversation {
    const conv = new CodexConversation(spec, this.options, {
      started: (c) => {
        this.live.add(c);
      },
      closed: (c) => {
        this.live.delete(c);
      },
      quota: (q) => {
        this.lastQuota = q;
      },
    });
    return conv;
  }

  async quota(): Promise<QuotaSnapshot | undefined> {
    if (this.options.api !== undefined) return undefined;
    const conv = [...this.live].at(-1);
    if (conv !== undefined) {
      try {
        this.lastQuota = await conv.quota();
      } catch (error) {
        console.error('问 Codex 额度失败：', asError(error).message);
      }
    }
    return this.lastQuota;
  }
}

interface Turn {
  queue: EventQueue<ModelEvent>;
  id?: string;
  stopping: boolean;
  done: boolean;
  before: CodexUsage;
  last?: CodexUsage;
  limit?: number;
  text: { text: string; interim?: boolean }[];
  streamed: Map<string, { text: string; interim?: boolean }>;
  completedItems: Set<string>;
  calls: Map<string, Promise<ToolResult>>;
  interruptTimer?: NodeJS.Timeout;
}

class CodexConversation implements ModelConversation {
  private rpc: CodexRpc | undefined;
  private threadId: string | undefined;
  private token: string | undefined;
  private model: string | undefined;
  private effort: string | undefined;
  private imageInput = true;
  private total = emptyUsage();
  private current: Turn | undefined;
  private closed = false;
  private broken = false;
  private forked = false;

  constructor(
    private readonly spec: ConversationSpec,
    private readonly options: CodexOptions,
    private readonly owner: {
      started(c: CodexConversation): void;
      closed(c: CodexConversation): void;
      quota(q: QuotaSnapshot): void;
    },
  ) {
    this.token = spec.resumeToken;
    if (this.token !== undefined) {
      const saved = sessionToken.parse(JSON.parse(this.token) as unknown);
      this.total = saved.total;
    }
  }

  private async start(): Promise<void> {
    this.assertOpen();
    if (this.rpc !== undefined && !this.broken) return;
    await this.rpc?.close();
    this.assertOpen();
    this.broken = false;
    const runtime = prepareCodexHome(this.options.cwd, this.options.api !== undefined);
    const rpc: CodexRpc = new CodexRpc(
      this.options.binary ?? 'codex',
      codexArgs(this.spec, this.options.cwd, runtime.loginHome, this.options.api),
      runtime.cwd,
      codexEnv(runtime.home, this.options.api),
      {
        notification: (method, params) => this.notification(method, params),
        request: (id, method, params) => this.request(rpc, id, method, params),
        failed: (error) => {
          this.broken = true;
          this.owner.closed(this);
          this.finish(error.message);
        },
      },
    );
    this.rpc = rpc;
    await rpc.request('initialize', {
      clientInfo: { name: 'studium', title: 'Studium', version: '1.0.0' },
      capabilities: { experimentalApi: true },
    });
    rpc.notify('initialized');
    if (this.options.api === undefined) {
      const account = z
        .object({ account: z.unknown().nullable() })
        .parse(await rpc.request('account/read', {}));
      if (account.account == null) {
        throw new Error(
          'Codex 尚未登录：请先在本机运行 codex login（需使用 auth.json 文件存储登录信息）',
        );
      }
    }
    const key = this.spec.profile ?? this.spec.session?.kind;
    const profile = key === undefined ? undefined : this.options.profiles?.[key];
    const requested = this.spec.model ?? profile?.model ?? this.options.model;
    const models: z.infer<typeof modelList>['data'] = [];
    let cursor: string | undefined;
    if (this.options.api !== undefined) {
      if (!requested) throw new Error('请先在对话输入区选择或填写 API 模型 ID');
      models.push({
        id: requested,
        model: requested,
        isDefault: true,
        supportedReasoningEfforts: API_EFFORTS.codex.map((reasoningEffort) => ({
          reasoningEffort,
        })),
      });
    } else
      do {
        const page = modelList.parse(
          await rpc.request('model/list', {
            limit: 100,
            includeHidden: true,
            ...(cursor !== undefined ? { cursor } : {}),
          }),
        );
        models.push(...page.data);
        cursor = page.nextCursor ?? undefined;
      } while (cursor !== undefined);
    const selected =
      requested === undefined
        ? models.find((m) => m.isDefault)
        : models.find((m) => m.model === requested || m.id === requested);
    if (selected === undefined)
      throw new Error(`Codex 账号没有可用模型${requested === undefined ? '' : `：${requested}`}`);
    this.effort =
      this.spec.effort === 'default' ? undefined : (this.spec.effort ?? profile?.effort);
    if (
      this.effort !== undefined &&
      !selected.supportedReasoningEfforts.some((e) => e.reasoningEffort === this.effort)
    ) {
      throw new Error(
        `${selected.model} 不支持强度 ${this.effort}；可用：${selected.supportedReasoningEfforts.map((e) => e.reasoningEffort).join(' / ')}`,
      );
    }
    this.imageInput = selected.inputModalities?.includes('image') ?? true;
    const base = {
      model: selected.model,
      modelProvider: this.options.api === undefined ? 'openai' : 'studium_api',
      cwd: this.spec.sandbox?.workdir ?? runtime.cwd,
      baseInstructions: this.spec.systemPrompt,
      developerInstructions: '',
      approvalPolicy: 'never',
      permissions: 'studium',
    };
    let response: unknown;
    if (this.token !== undefined) {
      const saved = sessionToken.parse(JSON.parse(this.token) as unknown);
      const fork = this.spec.fork === true && !this.forked;
      response = await rpc.request(fork ? 'thread/fork' : 'thread/resume', {
        ...base,
        threadId: saved.threadId,
        excludeTurns: true,
        ...(fork ? { ephemeral: this.spec.ephemeral === true } : {}),
      });
      this.forked = fork || this.forked;
    } else {
      response = await rpc.request('thread/start', {
        ...base,
        ephemeral: this.spec.ephemeral === true,
        dynamicTools: this.spec.tools.map((t) => ({
          type: 'function',
          name: t.name,
          description: t.description,
          inputSchema: z.toJSONSchema(z.object(t.input), { target: 'draft-07' }),
        })),
      });
    }
    const opened = threadResponse.parse(response);
    if (opened.instructionSources.length > 0) {
      throw new Error('Codex 意外加载了外部指令文件，已停止这个对话');
    }
    this.threadId = opened.thread.id;
    this.model = opened.model;
    this.current?.queue.push({ kind: 'model', name: opened.model });
    this.owner.started(this);
  }

  async *send(input: TurnInput): AsyncGenerator<ModelEvent> {
    if (this.current !== undefined) throw new Error('Codex 对话一次只能运行一轮');
    const turn: Turn = {
      queue: new EventQueue(),
      stopping: false,
      done: false,
      before: { ...this.total },
      text: [],
      streamed: new Map(),
      completedItems: new Set(),
      calls: new Map(),
    };
    this.current = turn;
    try {
      await this.start();
      turn.before = { ...this.total };
      if (turn.stopping || turn.done || this.closed) {
        throw new Error('Codex 本轮在输入送达前已停止');
      }
      if ((input.images?.length ?? 0) > 0 && !this.imageInput)
        throw new Error(`${this.model ?? '当前模型'} 不支持图片输入`);
      const result = await this.rpc?.request('turn/start', {
        threadId: this.threadId,
        input: [
          ...(input.images ?? []).map((im) => ({
            type: 'image',
            url: `data:${im.mime};base64,${im.data.toString('base64')}`,
          })),
          { type: 'text', text: modelText(input) },
        ],
        ...(this.effort !== undefined ? { effort: this.effort } : {}),
      });
      turn.id = z.object({ turn: z.object({ id: z.string() }) }).parse(result).turn.id;
      this.saveToken();
      if (this.shouldInterrupt()) await this.interrupt();
      yield* turn.queue;
    } catch (error) {
      this.broken = true;
      this.finish(asError(error).message);
      await this.rpc?.close();
      this.owner.closed(this);
      // 输入还没被接收：让 Hub 丢掉这份对话，下次重新生成开场 / 跨服务历史。
      if (turn.id === undefined) throw error;
      yield* turn.queue;
    } finally {
      // 消费者提前停止读流（例如导入超时）时，也结束模型这一轮。
      if (!turn.done) await this.close();
      this.current = undefined;
    }
  }

  async interrupt(): Promise<void> {
    const turn = this.current;
    if (turn === undefined || turn.done) return;
    turn.stopping = true;
    // 开场握手还没完成时，由 send() 检查 stopping；turn/start 已发出的由其返回后中断。
    if (turn.id === undefined) return;
    try {
      await this.rpc?.request(
        'turn/interrupt',
        { threadId: this.threadId, turnId: turn.id },
        10_000,
      );
      if (this.shouldInterrupt() && turn.interruptTimer === undefined) {
        turn.interruptTimer = setTimeout(() => {
          this.broken = true;
          this.finish();
          this.owner.closed(this);
          void this.rpc
            ?.close()
            .catch((error: unknown) => console.error('关闭 Codex 失败：', asError(error).message));
        }, 10_000);
      }
    } catch (error) {
      console.error('Codex 中断未响应，关闭进程：', asError(error).message);
      this.broken = true;
      await this.rpc?.close();
      this.owner.closed(this);
      this.finish();
    }
  }

  /** 状态可能在 await turn/start 期间被通知或学习者的停止操作改变。 */
  private shouldInterrupt(): boolean {
    return this.current?.stopping === true && !this.current.done;
  }

  private assertOpen(): void {
    if (this.closed) throw new Error('Codex 对话已关闭');
  }

  async quota(): Promise<QuotaSnapshot> {
    if (this.rpc === undefined) throw new Error('Codex 对话尚未启动');
    return codexQuota(await this.rpc.request('account/rateLimits/read', {}, 10_000));
  }

  private saveToken(): void {
    if (this.threadId === undefined || this.current?.id === undefined) return;
    const token = JSON.stringify({ version: 1, threadId: this.threadId, total: this.total });
    if (token === this.token) return;
    this.token = token;
    if (this.spec.ephemeral !== true) this.current.queue.push({ kind: 'session', token });
  }

  private flushText(): void {
    const turn = this.current;
    if (turn === undefined) return;
    for (const message of turn.text.splice(0))
      turn.queue.push({ kind: 'assistant_text', ...message });
  }

  private finish(error?: string): void {
    const turn = this.current;
    if (turn === undefined || turn.done) return;
    turn.done = true;
    clearTimeout(turn.interruptTimer);
    // 停止或断线可能只交回增量、没有 completed item；已显示给学习者的文字仍要留下。
    for (const message of turn.streamed.values()) {
      if (message.text !== '') turn.text.push(message);
    }
    turn.streamed.clear();
    // 最终文字必须在最后一条 raw 之后交；Hub 遇到后续 raw 会把待交文字当成中途说明。
    this.flushText();
    if (turn.last !== undefined) {
      const diff = (k: keyof CodexUsage) => Math.max(0, this.total[k] - turn.before[k]);
      const cacheRead = diff('cachedInputTokens');
      const cacheWrite = diff('cacheWriteInputTokens');
      const output = diff('outputTokens');
      turn.queue.push({
        kind: 'usage',
        context: turn.last.inputTokens,
        ...(turn.limit !== undefined ? { limit: turn.limit } : {}),
        output,
        parts: {
          input: Math.max(0, diff('inputTokens') - cacheRead - cacheWrite),
          cacheRead,
          cacheWrite,
          output,
        },
      });
    }
    this.saveToken();
    turn.queue.push(
      error !== undefined && !turn.stopping
        ? { kind: 'turn_error', reason: error, notice: error }
        : { kind: 'turn_end' },
    );
    turn.queue.end();
  }

  private notification(method: string, params: unknown): void {
    if (method === 'account/rateLimits/updated') {
      try {
        this.owner.quota(codexQuota(params));
      } catch (error) {
        // 额度是附加信息，服务改变字段时保留旧值，不让学习对话中断。
        console.error('读取 Codex 额度通知失败：', asError(error).message);
      }
      return;
    }
    const turn = this.current;
    if (turn === undefined || turn.done) return;
    const scope = z
      .object({ threadId: z.string().optional(), turnId: z.string().optional() })
      .safeParse(params);
    if (!scope.success || scope.data.threadId !== this.threadId) return;
    if (scope.data.turnId !== undefined && turn.id !== undefined && scope.data.turnId !== turn.id)
      return;
    if (method === 'thread/tokenUsage/updated') {
      const u = usageNotification.parse(params);
      if (u.tokenUsage.modelContextWindow != null) turn.limit = u.tokenUsage.modelContextWindow;
      this.total = u.tokenUsage.total;
      if (turn.id !== undefined) {
        turn.last = u.tokenUsage.last;
        turn.queue.push({ kind: 'raw', payload: { method, params } });
      }
      return;
    }
    if (method === 'item/agentMessage/delta') {
      const delta = deltaNotification.parse(params);
      const message = turn.streamed.get(delta.itemId) ?? { text: '' };
      message.text += delta.delta;
      turn.streamed.set(delta.itemId, message);
      turn.queue.push({ kind: 'text_delta', text: delta.delta });
      return;
    }
    if (method.endsWith('/delta')) return; // 完整 item 已含这些内容，增量不重复写正本。
    if (method === 'turn/started') {
      turn.id = turnNotification.parse(params).turn.id;
      turn.before = { ...this.total };
      return;
    }
    if (method === 'item/started' || method === 'item/completed') {
      const entry = itemNotification.parse(params).item;
      if (entry.type === 'userMessage') return; // Hub 已记录输入；不把图片 base64 再存一遍。
      if (method === 'item/started') {
        if (entry.type === 'agentMessage')
          turn.streamed.set(entry.id, { text: '', ...phaseOf(entry.phase) });
        if (entry.type !== 'agentMessage') this.flushText();
        turn.queue.push({ kind: 'raw', payload: { method, params } });
        const activity = codexActivity(entry);
        if (activity !== undefined) turn.queue.push(activity);
      } else if (!turn.completedItems.has(entry.id)) {
        turn.completedItems.add(entry.id);
        turn.streamed.delete(entry.id);
        turn.queue.push({ kind: 'raw', payload: { method, params } });
        if (entry.type === 'agentMessage' && entry.text !== undefined && entry.text !== '') {
          turn.text.push({
            text: entry.text,
            ...phaseOf(entry.phase),
          });
        }
        if (this.spec.sandbox !== undefined) {
          for (const action of codexActions(entry, this.spec.sandbox))
            turn.queue.push({ kind: 'sandbox_action', action });
        }
      }
      return;
    }
    if (method === 'model/rerouted') {
      const r = z.object({ toModel: z.string() }).parse(params);
      this.model = r.toModel;
      turn.queue.push({ kind: 'model', name: r.toModel });
    }
    // 完整 item、压缩、服务错误和轮结束保留原通知；账号信息不在这个分支。
    if (
      method === 'turn/completed' ||
      method === 'thread/compacted' ||
      method === 'error' ||
      method === 'model/rerouted'
    ) {
      turn.queue.push({ kind: 'raw', payload: { method, params } });
    }
    if (method === 'turn/completed') {
      const completed = turnNotification.parse(params).turn;
      this.finish(
        completed.status === 'failed' ? (completed.error?.message ?? 'Codex 本轮失败') : undefined,
      );
    }
  }

  private async request(rpc: CodexRpc, id: RpcId, method: string, params: unknown): Promise<void> {
    if (method !== 'item/tool/call') {
      rpc.reject(id, `Studium 不支持这项 Codex 请求：${method}`);
      return;
    }
    const call = toolCall.parse(params);
    const turn = this.current;
    const allowed =
      rpc === this.rpc &&
      turn !== undefined &&
      !turn.done &&
      !turn.stopping &&
      call.threadId === this.threadId &&
      call.turnId === turn.id &&
      call.namespace == null;
    const tool = allowed ? this.spec.tools.find((t) => t.name === call.tool) : undefined;
    if (tool === undefined || turn === undefined) {
      rpc.respond(id, {
        success: false,
        contentItems: [{ type: 'inputText', text: `当前会话不能调用工具 ${call.tool}` }],
      });
      return;
    }
    let result = turn.calls.get(call.callId);
    if (result === undefined) {
      result = (async (): Promise<ToolResult> => {
        try {
          return await tool.run(z.object(tool.input).parse(call.arguments));
        } catch (error) {
          return { text: asError(error).message, isError: true };
        }
      })();
      turn.calls.set(call.callId, result);
    }
    const r = await result;
    const response = {
      success: r.isError !== true,
      contentItems: [{ type: 'inputText', text: r.text }],
    };
    if (!turn.done)
      turn.queue.push({
        kind: 'raw',
        payload: { method, direction: 'response', callId: call.callId, result: response },
      });
    rpc.respond(id, response);
  }

  async close(): Promise<void> {
    this.closed = true;
    this.finish('Codex 对话已关闭');
    this.owner.closed(this);
    await this.rpc?.close();
  }
}

function phaseOf(phase: string | null | undefined): { interim?: boolean } {
  return phase === 'commentary' || phase === 'partial_answer' || phase === 'final_answer'
    ? { interim: phase === 'commentary' }
    : {};
}
