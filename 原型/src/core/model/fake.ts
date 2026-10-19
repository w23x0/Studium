// 假模型：程序测试一律用它，不调真模型。默认回显；可按轮给脚本，或按会话给应答函数。
// 工具调用由假模型直接执行核心交来的 ToolSpec.run，与真适配器走同一条钩子路径。
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { canRead, canWrite, resolveSandboxPath, virtualPath } from './sandbox-paths.ts';
import {
  formatProgramFact,
  type ConversationSpec,
  type ImageData,
  type ImageTranscriber,
  type ModelAdapter,
  type ModelConversation,
  type ModelEvent,
  type SandboxActionEvent,
  type TurnInput,
} from './port.ts';

/** 一步里要做的一个沙盒动作（在真实文件系统上执行；`run` 不真跑）。 */
export type FakeSandboxOp =
  | { op: 'write' | 'append'; path: string; content: string }
  | { op: 'read'; path: string }
  | { op: 'run'; command: string };

export interface FakeStep {
  /** 先做的沙盒动作（按顺序）。 */
  sandbox?: FakeSandboxOp[];
  /** 依次调用的工具。 */
  calls?: { name: string; args: Record<string, unknown> }[];
  /** 调完工具后说的话；不给就不说话。 */
  text?: string;
}

export interface FakeContext {
  spec: ConversationSpec;
  input: TurnInput;
  /** 这个对话里的第几轮（从 0 数）。 */
  turn: number;
  /** 本轮已执行的工具结果，按调用顺序。 */
  results: string[];
}

export interface FakeOptions {
  /** 按全局轮次给出的回复；用完后回到默认回显。 */
  script?: (string | FakeStep)[];
  /** 按会话应答；返回 undefined 时退回 script / 回显。 */
  responder?: (ctx: FakeContext) => FakeStep | undefined;
  /** 第 n 轮（全局，从 0 数）失败。 */
  failOnTurn?: number;
  /** 每个增量之间的等待毫秒数，测流式与“进行中”状态用。 */
  delayMs?: number;
}

/** 一个假对话的本轮状态：本轮在跑时收下的插话，等下一个停顿处处理。 */
interface FakeTurnState {
  active: boolean;
  pending: TurnInput[];
}

export class FakeModel implements ModelAdapter {
  readonly name = 'fake';
  readonly disclosure = {
    service: '无（假模型，测试用，内容不送往任何服务）',
    route: '本机进程内',
    profiles: {},
  };
  /** 假模型自报的“实际执行模型”，测试用来核对记录里存的是它而不是适配器名。 */
  static readonly MODEL_NAME = 'fake-model-1';
  /** 假模型对任何图片给的固定转写。 */
  static readonly TRANSCRIPT = '$v = v_0 + at$';
  /** 图片转写：不看图，给固定结果；收到的图记在 images 里供测试核对。 */
  readonly images: ImageData[] = [];
  readonly transcriber: ImageTranscriber = {
    model: FakeModel.MODEL_NAME,
    transcribe: (image) => {
      this.images.push(image);
      return Promise.resolve({ text: FakeModel.TRANSCRIPT, model: FakeModel.MODEL_NAME });
    },
  };
  readonly opened: ConversationSpec[] = [];
  /** 每轮收到的输入（模型实际看到的文字），测试用来核对程序追加的事实与行号。 */
  readonly inputs: { spec: ConversationSpec; text: string }[] = [];
  private turn = 0;

  constructor(private readonly options: FakeOptions = {}) {}

  open(spec: ConversationSpec): ModelConversation {
    this.opened.push(spec);
    const token = spec.resumeToken ?? `fake-${String(this.opened.length)}`;
    let announced = spec.resumeToken !== undefined;
    let localTurn = 0;
    const state: FakeTurnState = { active: false, pending: [] };
    return {
      send: (input) =>
        this.run(spec, state, input, localTurn++, () => {
          if (announced) return undefined;
          announced = true;
          return token;
        }),
      interject: (input) => {
        if (!state.active) return false;
        state.pending.push(input);
        return true;
      },
      close: () => Promise.resolve(),
    };
  }

  private async *run(
    spec: ConversationSpec,
    state: FakeTurnState,
    input: TurnInput,
    localTurn: number,
    newToken: () => string | undefined,
  ): AsyncGenerator<ModelEvent> {
    state.active = true;
    try {
      const token = newToken();
      if (token !== undefined) yield { kind: 'session', token };
      yield { kind: 'model', name: FakeModel.MODEL_NAME };
      if (this.turn === this.options.failOnTurn) {
        this.turn++;
        this.inputs.push({ spec, text: seenText(input) });
        yield { kind: 'turn_error', reason: '假模型按设定失败' };
        return;
      }
      yield* this.respond(spec, state, input, localTurn, true);
      // 本轮最后一个停顿处：还没处理的插话在这里接着答
      for (let x = state.pending.shift(); x; x = state.pending.shift()) {
        yield* this.respond(spec, state, x, localTurn, false);
      }
      // 同步收尾：此后的插话由调用方按新一轮发
      state.active = false;
      yield { kind: 'turn_end' };
    } finally {
      state.active = false;
    }
  }

  /** 答一条输入；outer 为真时在工具调用之间处理插话（模拟模型在停顿处看到新消息）。 */
  private async *respond(
    spec: ConversationSpec,
    state: FakeTurnState,
    input: TurnInput,
    localTurn: number,
    outer: boolean,
  ): AsyncGenerator<ModelEvent> {
    const n = this.turn++;
    const seen = seenText(input);
    this.inputs.push({ spec, text: seen });
    yield { kind: 'raw', payload: { role: 'user', content: seen } };
    const results: string[] = [];
    const ctx: FakeContext = { spec, input, turn: localTurn, results };
    const scripted = this.options.script?.[n];
    const step: FakeStep = this.options.responder?.(ctx) ??
      (typeof scripted === 'string' ? { text: scripted } : scripted) ?? {
        text: `（假模型）收到：${input.text}`,
      };
    // 先做沙盒动作，再调工具，最后说话（工单 W4 §5.2）
    for (const op of step.sandbox ?? []) {
      const { action, text } = await runSandboxOp(spec, op);
      if (text !== undefined) results.push(text);
      yield { kind: 'sandbox_action', action };
    }
    for (const call of step.calls ?? []) {
      if (this.options.delayMs) await sleep(this.options.delayMs);
      if (outer) {
        for (let x = state.pending.shift(); x; x = state.pending.shift()) {
          yield* this.respond(spec, state, x, localTurn, false);
        }
      }
      const t = spec.tools.find((x) => x.name === call.name);
      yield {
        kind: 'raw',
        payload: {
          role: 'assistant',
          content: [{ type: 'tool_use', name: call.name, input: call.args }],
        },
      };
      const r = t ? await t.run(call.args) : { text: `没有这个工具：${call.name}`, isError: true };
      results.push(r.text);
      yield {
        kind: 'raw',
        payload: {
          role: 'user',
          content: [{ type: 'tool_result', content: r.text, is_error: r.isError === true }],
        },
      };
    }
    // 应答函数可以在看过工具结果后再定要说的话
    const text = step.text ?? this.options.responder?.({ ...ctx, results })?.text;
    if (text !== undefined && text !== '') {
      for (const chunk of chunks(text)) {
        if (this.options.delayMs) await sleep(this.options.delayMs);
        yield { kind: 'text_delta', text: chunk };
      }
      yield { kind: 'raw', payload: { role: 'assistant', content: [{ type: 'text', text }] } };
      yield { kind: 'assistant_text', text };
    }
  }
}

/**
 * 在真实文件系统上做一个沙盒动作（工单 W4 §5.2）：相对路径按 `workdir` 解析，`只读/<name>/…` 映射到对应目录；
 * 越界写不写、越界读不读；`run` 不真执行，只记一条。
 */
async function runSandboxOp(
  spec: ConversationSpec,
  op: FakeSandboxOp,
): Promise<{ action: SandboxActionEvent['action']; text?: string }> {
  const sb = spec.sandbox;
  if (sb === undefined) {
    return {
      action: {
        op: op.op === 'read' ? 'read' : op.op === 'run' ? 'run' : 'write',
        ...(op.op === 'run' ? { command: op.command } : { path: op.path }),
        summary: '这个会话没有沙盒',
        ok: false,
      },
    };
  }
  if (op.op === 'run') {
    return {
      action: {
        op: 'run',
        command: op.command,
        summary: `跑命令（假模型不执行）：${op.command}`,
        ok: true,
      },
    };
  }
  const abs = resolveSandboxPath(sb, op.path);
  const shown = virtualPath(sb, abs);
  if (op.op === 'read') {
    if (!canRead(sb, abs)) {
      return {
        action: { op: 'read', path: shown, summary: `读 ${shown}`, ok: false },
        text: `读不到 ${shown}：不在能读的范围内`,
      };
    }
    try {
      const body = await readFile(abs, 'utf8');
      return { action: { op: 'read', path: shown, summary: `读 ${shown}`, ok: true }, text: body };
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      return {
        action: { op: 'read', path: shown, summary: `读 ${shown}`, ok: false },
        text: `读不到 ${shown}：${reason}`,
      };
    }
  }
  if (!canWrite(sb, abs)) {
    return {
      action: { op: 'write', path: shown, summary: `写 ${shown}`, ok: false },
      text: `写不了 ${shown}：只读，或在工作区外`,
    };
  }
  await mkdir(dirname(abs), { recursive: true });
  if (op.op === 'write') await writeFile(abs, op.content);
  else await appendFile(abs, op.content);
  return {
    action: {
      op: 'write',
      path: shown,
      summary: `${op.op === 'write' ? '写' : '追加'} ${shown}`,
      ok: true,
      content: op.content,
    },
  };
}

function seenText(input: TurnInput): string {
  return input.role === 'program' ? formatProgramFact(input.text) : input.text;
}

function chunks(s: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += 4) out.push(s.slice(i, i + 4));
  return out;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
