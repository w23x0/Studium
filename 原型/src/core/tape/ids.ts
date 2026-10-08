// 录带里的编号：会话 id、选择卡 id、程序生成的记录 id 每次运行都不同。录带里一律换成稳定记号
// （⟦loop#2⟧ = 第 2 个开的闭环对话；⟦st#1⟧ = 第 1 条状态记录），回放时再换回这次运行的真实编号。
import type { Hub } from '../hub.ts';
import type { Studium } from '../studium.ts';

const TOKEN_RE = /⟦[a-z0-9]+#\d+⟧/g;

export class IdTokens {
  private readonly toToken = new Map<string, string>();
  private readonly toId = new Map<string, string>();
  private readonly counts = new Map<string, number>();

  /** 接上 Hub 与 Studium：按种类数会话、按前缀数生成的编号。要在开第一个会话之前接。 */
  attach(hub: Hub, studium: Studium): () => void {
    for (const s of [...hub.listSessions()].sort((a, b) => a.openedAt.localeCompare(b.openedAt))) {
      this.add(s.kind, s.sessionId);
    }
    const off1 = hub.subscribe((e) => {
      if (e.type === 'record' && e.record.type === 'session_opened') {
        this.add(e.record.kind, e.record.sessionId);
      }
    });
    const off2 = studium.onNewId((prefix, id) => this.add(prefix, id));
    return () => {
      off1();
      off2();
    };
  }

  private add(group: string, id: string): void {
    if (this.toToken.has(id)) return;
    const n = (this.counts.get(group) ?? 0) + 1;
    this.counts.set(group, n);
    const token = `⟦${group}#${String(n)}⟧`;
    this.toToken.set(id, token);
    this.toId.set(token, id);
  }

  has(token: string): boolean {
    return this.toId.has(token);
  }

  /** 会话 id → 记号（还没见过就原样返回）。 */
  token(id: string): string {
    return this.toToken.get(id) ?? id;
  }

  /** 把一个值里出现的已知编号都换成记号（深入对象与数组）。 */
  tokenize<T>(value: T): T {
    return mapStrings(value, (s) => {
      let out = s;
      for (const [id, token] of this.toToken) {
        if (out.includes(id)) out = out.split(id).join(token);
      }
      return out;
    });
  }

  /** 把记号换回这次运行的真实编号；不认识的记号原样留着。 */
  resolve<T>(value: T): T {
    return mapStrings(value, (s) => s.replace(TOKEN_RE, (t) => this.toId.get(t) ?? t));
  }

  /** 值里还有没解析的记号吗（回放时用来等对应的会话 / 卡出现）。 */
  unresolved(value: unknown): string[] {
    const out: string[] = [];
    mapStrings(value, (s) => {
      for (const m of s.matchAll(TOKEN_RE)) if (!this.toId.has(m[0])) out.push(m[0]);
      return s;
    });
    return out;
  }
}

function mapStrings<T>(value: T, fn: (s: string) => string): T {
  if (typeof value === 'string') return fn(value) as T;
  if (Array.isArray(value)) return value.map((v: unknown) => mapStrings(v, fn)) as T;
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, mapStrings(v as unknown, fn)]),
    ) as T;
  }
  return value;
}

/**
 * 比较两次运行的文字时抹掉每次都不同的部分：时间、会话 id、选择卡 id、程序生成的记录 id、录带记号的序号。
 * 只用于比较，不用于回放。
 */
export function normalizeForCompare(text: string): string {
  return text
    .replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?Z?)?/g, '⟦时间⟧')
    .replace(/\d{4}-\d{2}-\d{2}/g, '⟦日期⟧')
    .replace(/\b\d{8}-\d{6}-([a-z0-9]+)-[0-9a-f]{6}\b/g, '⟦$1⟧')
    .replace(/\b(card|f|st|sr)-[0-9a-f]{8}\b/g, '⟦$1⟧')
    .replace(/⟦([a-z0-9]+)#\d+⟧/g, '⟦$1⟧');
}
