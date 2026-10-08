// 调用量计数：包一层模型接口，按标签（会话类 / 学生 / 判分）数对话、轮次、模型请求、token、思考块与实际模型。
// 模型请求按原始消息里的消息 id 去重（Agent SDK 一次请求的多个内容块各出一条原始消息）；没有 id 的（假模型）每条算一次。
// 中途插话原样转给里面的对话：不转的话核心会退回排队，测不到插话。
import type {
  ModelAdapter,
  ModelConversation,
  ModelEvent,
  TurnInput,
} from '../../src/core/model/port.ts';

export interface UsageRow {
  conversations: number;
  /** send 次数（一轮可能含多次模型请求与工具调用）。 */
  turns: number;
  /** 模型请求数。 */
  requests: number;
  inputTokens: number;
  outputTokens: number;
  /** 原始消息里的思考块数（看思考强度有没有起作用的旁证）。 */
  thinkingBlocks: number;
  /** 原始消息里报的实际模型。 */
  models: Set<string>;
  turnErrors: string[];
}

interface RawMessage {
  role?: unknown;
  id?: unknown;
  model?: unknown;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
  content?: unknown;
}

export class Usage {
  readonly rows = new Map<string, UsageRow>();
  private readonly tokensById = new Map<string, { input: number; output: number; row: UsageRow }>();

  row(label: string): UsageRow {
    let r = this.rows.get(label);
    if (!r) {
      r = {
        conversations: 0,
        turns: 0,
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        thinkingBlocks: 0,
        models: new Set(),
        turnErrors: [],
      };
      this.rows.set(label, r);
    }
    return r;
  }

  /** 包一个模型接口；label 按开对话时的设定给标签。 */
  wrap(
    inner: ModelAdapter,
    label: (spec: Parameters<ModelAdapter['open']>[0]) => string,
  ): ModelAdapter {
    return {
      name: inner.name,
      open: (spec) => {
        const row = this.row(label(spec));
        row.conversations++;
        const conv = inner.open(spec);
        const wrapped: ModelConversation = {
          send: (input) => this.count(row, conv.send(input)),
          close: () => conv.close(),
        };
        if (conv.interject) {
          wrapped.interject = (input: TurnInput) => conv.interject?.(input) === true;
        }
        return wrapped;
      },
    };
  }

  private async *count(
    row: UsageRow,
    events: AsyncIterable<ModelEvent>,
  ): AsyncGenerator<ModelEvent> {
    row.turns++;
    for await (const ev of events) {
      if (ev.kind === 'raw') this.seeRaw(row, ev.payload);
      if (ev.kind === 'turn_error') row.turnErrors.push(ev.reason);
      yield ev;
    }
  }

  private seeRaw(row: UsageRow, payload: unknown): void {
    if (typeof payload !== 'object' || payload === null) return;
    const m = payload as RawMessage;
    if (m.role !== 'assistant') return;
    if (typeof m.model === 'string') row.models.add(m.model);
    if (Array.isArray(m.content)) {
      for (const b of m.content as { type?: unknown }[]) {
        if (b.type === 'thinking' || b.type === 'redacted_thinking') row.thinkingBlocks++;
      }
    }
    const input =
      (m.usage?.input_tokens ?? 0) +
      (m.usage?.cache_read_input_tokens ?? 0) +
      (m.usage?.cache_creation_input_tokens ?? 0);
    const output = m.usage?.output_tokens ?? 0;
    if (typeof m.id !== 'string') {
      row.requests++;
      row.inputTokens += input;
      row.outputTokens += output;
      return;
    }
    const seen = this.tokensById.get(m.id);
    if (!seen) {
      row.requests++;
      row.inputTokens += input;
      row.outputTokens += output;
      this.tokensById.set(m.id, { input, output, row });
      return;
    }
    // 同一请求的后续内容块：token 取最大的那次（各块上报的用量可能是累计的）
    if (input > seen.input) {
      seen.row.inputTokens += input - seen.input;
      seen.input = input;
    }
    if (output > seen.output) {
      seen.row.outputTokens += output - seen.output;
      seen.output = output;
    }
  }

  total(filter: (label: string) => boolean = () => true): Omit<UsageRow, 'models' | 'turnErrors'> {
    const t = {
      conversations: 0,
      turns: 0,
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      thinkingBlocks: 0,
    };
    for (const [label, r] of this.rows) {
      if (!filter(label)) continue;
      t.conversations += r.conversations;
      t.turns += r.turns;
      t.requests += r.requests;
      t.inputTokens += r.inputTokens;
      t.outputTokens += r.outputTokens;
      t.thinkingBlocks += r.thinkingBlocks;
    }
    return t;
  }
}
