// 学习页的现读（纯函数）：从学习对话的正本里读出有过哪些屏、什么时候该重读当前屏、学习者刚说的话。
import type { NumberedRecord } from '../shared/records.ts';

export interface ScreenItem {
  n: number;
  at: string;
  line: number;
}

export function screensOf(records: NumberedRecord[]): ScreenItem[] {
  return records.flatMap(({ line, record: r }) =>
    r.type === 'screen' ? [{ n: r.n, at: r.at, line }] : [],
  );
}

/**
 * 当前屏要重读的时机：新的一屏、组件换了一版、子代理开始或交回（占位换成组件）。
 * 返回一个随这些记录变的串，给 useEffect 当依赖。
 */
export function screenRefreshKey(records: NumberedRecord[]): string {
  let n = 0;
  for (const { record: r } of records) {
    if (
      r.type === 'screen' ||
      r.type === 'component_version' ||
      r.type === 'subagent_started' ||
      r.type === 'subagent_result'
    ) {
      n += 1;
    }
  }
  return String(n);
}

/**
 * 学习者刚发的话：最后一屏之后说的，显示到主模型下一轮输出为止（会话/学习对话.md §11.3 学习者回话）；
 * 之后留不留由主模型定（它点名拿回才在屏幕上）。
 */
export function justSaid(
  records: NumberedRecord[],
): { line: number; text: string; replyTo?: string }[] {
  const last = screensOf(records).at(-1)?.line ?? 0;
  return records.flatMap(({ line, record: r }) =>
    line > last && r.type === 'user_message'
      ? [
          {
            line,
            text: r.text,
            ...(r.replyTo !== undefined ? { replyTo: r.replyTo.pointer } : {}),
          },
        ]
      : [],
  );
}

/**
 * 最后一屏之后没跑成的那一轮（界面上说一句，不进屏幕）：有就回它（带服务交回的报错句，如额度几点恢复），
 * 没有就是 undefined。
 */
export function failedSinceScreen(records: NumberedRecord[]): { notice?: string } | undefined {
  const last = screensOf(records).at(-1)?.line ?? 0;
  const f = records
    .flatMap(({ line, record: r }) => (line > last && r.type === 'turn_failed' ? [r] : []))
    .at(-1);
  if (f === undefined) return undefined;
  return f.notice !== undefined ? { notice: f.notice } : {};
}

/**
 * 收口那一行（界面说明 §2.6「收口时」）：最后一次申请收口之后还没有收尾记录 = 正在整理；有了 = 整理好了
 * （verdictLine 给面板定位）。守卫 10-23 起不把关，这里只说整理好了，不说学没学会。
 */
export function closeLine(
  records: NumberedRecord[],
): { kind: 'closing' } | { kind: 'done'; verdictLine: number } | undefined {
  let out: { kind: 'closing' } | { kind: 'done'; verdictLine: number } | undefined;
  for (const { line, record: r } of records) {
    if (r.type === 'close_requested') out = { kind: 'closing' };
    // 守卫没交回（有 problem）时学习又开着了：不显示“已整理好”
    if (r.type === 'guard_verdict')
      out = r.problem === undefined ? { kind: 'done', verdictLine: line } : undefined;
  }
  return out;
}
