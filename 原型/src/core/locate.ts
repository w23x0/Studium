// 依据串怎么定位（工单 README §4.2）：卡工具、路线决定、依据视图共用同一套规则。
// 串里最后一个 `:` 前面含 `/` → 当资料里那一行 `资料id/文件:行号`（资料属于当前项目、文件存在且行号在文件内才算定位到）；
// `外部导入/<导入 id>.md:<行号>`（前面可带 `学过的记录/`，也可只写 `<导入 id>:<行号>`）→ 当学习者导入的笔记 / 对话记录正文里那一行；
// 否则当 `<会话 id>:<行号>`（会话存在、正本里有这一行才算）。定位不了的原串照存，只是标出来。
import type { CitationView } from '../shared/protocol.ts';
import type { Hub } from './hub.ts';
import type { Sources } from './sources.ts';

export interface LocateDeps {
  hub: Hub;
  sources: Sources;
  /** 给了：资料里的一行还须属于这些资料（当前项目的；资料归项目，工单 W8 §4.4）。 */
  scope?: () => Promise<string[]>;
  /** 给了：能认外部导入里的一行（导入的正文；没有这条导入给 undefined）。 */
  importText?: (id: string) => Promise<string | undefined>;
}

export interface LocateResult {
  raw: string;
  /** 定位到了没有。 */
  ok: boolean;
  kind: 'book' | 'session' | 'import' | 'unknown';
  /** kind = book 时书里的那一段（含查得到的原文）。 */
  citation?: CitationView;
  sessionId?: string;
  /** kind = import 时导入 id 与那一行原文。 */
  importId?: string;
  importLine?: string;
  line?: number;
}

export async function locate(raw: string, d: LocateDeps): Promise<LocateResult> {
  const text = raw.trim();
  const at = text.lastIndexOf(':');
  if (at <= 0) return { raw, ok: false, kind: 'unknown' };
  const head = text.slice(0, at);
  const tail = Number(text.slice(at + 1));
  const imp = /^(?:(?:学过的记录\/)?外部导入\/)?(imp-[A-Za-z0-9_-]+?)(?:\.md)?$/.exec(head);
  if (imp?.[1] !== undefined) {
    const importId = imp[1];
    const body = Number.isInteger(tail) && tail > 0 ? await d.importText?.(importId) : undefined;
    const importLine = body?.split('\n')[tail - 1];
    return {
      raw,
      ok: importLine !== undefined,
      kind: 'import',
      importId,
      line: tail,
      ...(importLine !== undefined ? { importLine } : {}),
    };
  }
  if (head.includes('/')) {
    const citation = await d.sources.materialLine(text);
    if (citation === undefined) return { raw, ok: false, kind: 'book' };
    if (d.scope !== undefined && !(await d.scope()).includes(citation.book)) {
      return { raw, ok: false, kind: 'book', citation: { ...citation, resolved: false } };
    }
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
