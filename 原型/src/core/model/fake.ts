// 假模型：程序测试一律用它，不调真模型。默认回显；可传脚本按顺序给出回复。
import type { ConversationSpec, ModelAdapter, ModelConversation, ModelEvent } from './port.ts';

export interface FakeOptions {
  /** 按轮给出的回复；用完后回到默认回显。 */
  script?: string[];
  /** 第 n 轮（从 0 数）失败。 */
  failOnTurn?: number;
  /** 每个增量之间的等待毫秒数，测流式与“进行中”状态用。 */
  delayMs?: number;
}

export class FakeModel implements ModelAdapter {
  readonly name = 'fake';
  readonly opened: ConversationSpec[] = [];
  private turn = 0;

  constructor(private readonly options: FakeOptions = {}) {}

  open(spec: ConversationSpec): ModelConversation {
    this.opened.push(spec);
    const token = spec.resumeToken ?? `fake-${String(this.opened.length)}`;
    let announced = spec.resumeToken !== undefined;
    return {
      send: (text) =>
        this.run(text, () => {
          if (announced) return undefined;
          announced = true;
          return token;
        }),
      close: () => Promise.resolve(),
    };
  }

  private async *run(text: string, newToken: () => string | undefined): AsyncGenerator<ModelEvent> {
    const n = this.turn++;
    const token = newToken();
    if (token !== undefined) yield { kind: 'session', token };
    if (n === this.options.failOnTurn) {
      yield { kind: 'turn_error', reason: '假模型按设定失败' };
      return;
    }
    const reply = this.options.script?.[n] ?? `（假模型）收到：${text}`;
    yield { kind: 'raw', payload: { role: 'user', content: text } };
    for (const chunk of chunks(reply)) {
      if (this.options.delayMs) await sleep(this.options.delayMs);
      yield { kind: 'text_delta', text: chunk };
    }
    yield { kind: 'raw', payload: { role: 'assistant', content: [{ type: 'text', text: reply }] } };
    yield { kind: 'assistant_text', text: reply };
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
