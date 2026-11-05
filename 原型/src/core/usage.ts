// W14 §4 使用情况面板：本项目各会话的 token，打开面板时从正本现算（不缓存、不写正本）。
// 输入、缓存写入、缓存读取取 model_raw 里助手消息的 usage（同一条消息一个内容块一行，按消息 id 去重）；
// 输出取 context_used.output 按轮加总，算给那一轮的模型（model_raw 里的 output_tokens 只是流式开头的数）。
import type { SessionSummary } from '../shared/protocol.ts';
import type { NumberedRecord } from '../shared/records.ts';
import type { TokenParts, UsageModelColumn, UsageResponse, UsageThread } from '../shared/usage.ts';
import { tokenTotal } from '../shared/usage.ts';
import { projectIn } from './cross-notes.ts';

export interface UsageDeps {
  listSessions: () => SessionSummary[];
  records: (sessionId: string) => Promise<NumberedRecord[]>;
}

const zero = (): TokenParts => ({ input: 0, output: 0, cacheWrite: 0, cacheRead: 0 });

function add(into: TokenParts, p: Partial<TokenParts>): void {
  into.input += p.input ?? 0;
  into.output += p.output ?? 0;
  into.cacheWrite += p.cacheWrite ?? 0;
  into.cacheRead += p.cacheRead ?? 0;
}

/** 本项目（主对话 id）的用量：归属本项目的会话（含主对话与只读的旧种类；已删的不在会话表里）。 */
export async function projectUsage(deps: UsageDeps, project: string): Promise<UsageResponse> {
  const all = deps.listSessions();
  const sessions = new Map(all.map((s) => [s.sessionId, s]));
  const threads: UsageThread[] = [];
  const columns = new Map<string, UsageModelColumn>();
  const total = zero();
  for (const s of all) {
    if (projectIn(sessions, s.sessionId) !== project) continue;
    const byModel = sessionUsage(await deps.records(s.sessionId));
    if (byModel.size === 0) continue;
    // 导入会话界面上看不到：token 照算进总数与模型列，不进讨论串列表、不算讨论串数；主对话进列表、不算讨论串数
    const hidden = s.kind === 'import';
    const counted = !hidden && s.kind !== 'main';
    const parts = zero();
    for (const [model, p] of byModel) {
      add(parts, p);
      const col = columns.get(model) ?? { model, parts: zero(), threads: 0 };
      add(col.parts, p);
      if (counted) col.threads += 1;
      columns.set(model, col);
    }
    add(total, parts);
    if (hidden) continue;
    threads.push({
      sessionId: s.sessionId,
      kind: s.kind,
      title: s.kind === 'main' ? '主对话' : s.title,
      models: [...byModel.entries()]
        .sort((a, b) => tokenTotal(b[1]) - tokenTotal(a[1]))
        .map(([m]) => m),
      at: s.lastAt ?? s.openedAt,
      parts,
    });
  }
  return {
    threads,
    models: [...columns.values()].sort((a, b) => tokenTotal(b.parts) - tokenTotal(a.parts)),
    total,
  };
}

/** 一个会话按模型分的四类 token。 */
function sessionUsage(records: readonly NumberedRecord[]): Map<string, TokenParts> {
  const messages = new Map<string, { model: string; parts: Partial<TokenParts> }>();
  const outputs: { model: string; output: number }[] = [];
  let current: string | undefined;
  for (const { record: r } of records) {
    if (r.type === 'model_raw') {
      const m = assistantUsage(r.payload);
      if (m === undefined) continue;
      current = m.model;
      messages.set(m.id, { model: m.model, parts: m.parts });
    } else if (r.type === 'model_used') {
      current = r.model;
    } else if (r.type === 'context_used' && r.output > 0) {
      outputs.push({ model: current ?? '（模型未知）', output: r.output });
    }
  }
  const out = new Map<string, TokenParts>();
  const at = (model: string): TokenParts => {
    let p = out.get(model);
    if (p === undefined) {
      p = zero();
      out.set(model, p);
    }
    return p;
  };
  for (const m of messages.values()) add(at(m.model), m.parts);
  for (const o of outputs) add(at(o.model), { output: o.output });
  return out;
}

/** model_raw 里一条助手消息的 id、模型与用量（不是助手消息、服务报错造的那条都不算）。 */
function assistantUsage(
  payload: unknown,
): { id: string; model: string; parts: Partial<TokenParts> } | undefined {
  if (typeof payload !== 'object' || payload === null) return undefined;
  const p = payload as {
    role?: unknown;
    id?: unknown;
    model?: unknown;
    usage?: {
      input_tokens?: number | null;
      cache_creation_input_tokens?: number | null;
      cache_read_input_tokens?: number | null;
    } | null;
  };
  if (p.role !== 'assistant' || typeof p.id !== 'string' || typeof p.model !== 'string') {
    return undefined;
  }
  if (p.model === '<synthetic>' || p.usage === undefined || p.usage === null) return undefined;
  return {
    id: p.id,
    model: p.model,
    parts: {
      input: p.usage.input_tokens ?? 0,
      cacheWrite: p.usage.cache_creation_input_tokens ?? 0,
      cacheRead: p.usage.cache_read_input_tokens ?? 0,
    },
  };
}
