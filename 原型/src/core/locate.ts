// 依据串怎么定位（工单 README §4.2）：卡工具、路线决定、依据视图共用同一套规则。
// 串里最后一个 `:` 前面含 `/` → 当书里那一行（书、文件存在且行号在文件内才算定位到）；
// 否则当 `<会话 id>:<行号>`（会话存在、正本里有这一行才算）。定位不了的原串照存，只是标出来。
import type { CitationView } from '../shared/protocol.ts';
import type { Hub } from './hub.ts';
import type { Sources } from './sources.ts';

export interface LocateDeps {
  hub: Hub;
  sources: Sources;
}

export interface LocateResult {
  raw: string;
  /** 定位到了没有。 */
  ok: boolean;
  kind: 'book' | 'session' | 'unknown';
  /** kind = book 时书里的那一段（含查得到的原文）。 */
  citation?: CitationView;
  sessionId?: string;
  line?: number;
}

export async function locate(raw: string, d: LocateDeps): Promise<LocateResult> {
  const text = raw.trim();
  const at = text.lastIndexOf(':');
  if (at <= 0) return { raw, ok: false, kind: 'unknown' };
  const head = text.slice(0, at);
  const tail = Number(text.slice(at + 1));
  if (head.includes('/')) {
    const citation = await d.sources.bookLine(text);
    if (citation === undefined) return { raw, ok: false, kind: 'book' };
    return { raw, ok: citation.resolved, kind: 'book', citation };
  }
  if (!Number.isInteger(tail) || tail <= 0) return { raw, ok: false, kind: 'session' };
  const sessionId = head;
  if (!d.hub.listSessions().some((s) => s.sessionId === sessionId)) {
    return { raw, ok: false, kind: 'session', sessionId, line: tail };
  }
  const recs = await d.hub.records(sessionId);
  return { raw, ok: recs.some((r) => r.line === tail), kind: 'session', sessionId, line: tail };
}
