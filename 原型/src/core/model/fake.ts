// 假模型：程序测试一律用它，不调真模型。默认回显；可按轮给脚本，或按会话给应答函数。
// 工具调用由假模型直接执行核心交来的 ToolSpec.run，与真适配器走同一条钩子路径。
import {
  formatProgramFact,
  type ConversationSpec,
  type ModelAdapter,
  type ModelConversation,
  type ModelEvent,
  type TurnInput,
} from './port.ts';

export interface FakeStep {
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

export class FakeModel implements ModelAdapter {
  readonly name = 'fake';
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
    return {
      send: (input) =>
        this.run(spec, input, localTurn++, () => {
          if (announced) return undefined;
          announced = true;
          return token;
        }),
      close: () => Promise.resolve(),
    };
  }

  private async *run(
    spec: ConversationSpec,
    input: TurnInput,
    localTurn: number,
    newToken: () => string | undefined,
  ): AsyncGenerator<ModelEvent> {
    const n = this.turn++;
    const seen = input.role === 'program' ? formatProgramFact(input.text) : input.text;
    this.inputs.push({ spec, text: seen });
    const token = newToken();
    if (token !== undefined) yield { kind: 'session', token };
    if (n === this.options.failOnTurn) {
      yield { kind: 'turn_error', reason: '假模型按设定失败' };
      return;
    }
    yield { kind: 'raw', payload: { role: 'user', content: seen } };
    const results: string[] = [];
    const ctx: FakeContext = { spec, input, turn: localTurn, results };
    const scripted = this.options.script?.[n];
    const step: FakeStep = this.options.responder?.(ctx) ??
      (typeof scripted === 'string' ? { text: scripted } : scripted) ?? {
        text: `（假模型）收到：${input.text}`,
      };
    for (const call of step.calls ?? []) {
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
    yield { kind: 'turn_end' };
  }
}

function chunks(s: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += 4) out.push(s.slice(i, i + 4));
  return out;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
