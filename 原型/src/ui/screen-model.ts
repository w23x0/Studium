// 学习页的现读（纯函数）：从学习对话的正本里读出页面上次什么时候改过、什么时候该重读页面、学习者刚说的话。
import { closeStatus } from '../shared/closing.ts';
import type { NumberedRecord } from '../shared/records.ts';

/** 页面最后一次改动（布局一版，或 10-29 前的一屏）在正本哪一行；还没有就是 0。 */
export function lastShownLine(records: NumberedRecord[]): number {
  let last = 0;
  for (const { line, record: r } of records)
    if (r.type === 'layout' || r.type === 'screen') last = line;
  return last;
}

/**
 * 页面要重读的时机：布局换了一版、组件换了一版、子代理开始或交回（占位换成组件）。
 * 返回一个随这些记录变的串，给 useEffect 当依赖。
 */
export function screenRefreshKey(records: NumberedRecord[]): string {
  let n = 0;
  for (const { record: r } of records) {
    if (
      r.type === 'layout' ||
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
 * 学习者刚发的话：页面最后一次改动之后说的，显示到主模型下一轮输出为止（会话/学习对话.md §11.3 学习者回话）；
 * 之后留不留由主模型定（它说放上页面才在页面上）。
 */
export function justSaid(
  records: NumberedRecord[],
): { line: number; text: string; replyTo?: string }[] {
  const last = lastShownLine(records);
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
 * 页面最后一次改动之后没跑成的那一轮（界面上说一句，不进页面）：有就回它（带服务交回的报错句，如额度几点恢复），
 * 没有就是 undefined。
 */
export function failedSinceScreen(records: NumberedRecord[]): { notice?: string } | undefined {
  const last = lastShownLine(records);
  const f = records
    .flatMap(({ line, record: r }) => (line > last && r.type === 'turn_failed' ? [r] : []))
    .at(-1);
  if (f === undefined) return undefined;
  return f.notice !== undefined ? { notice: f.notice } : {};
}

/**
 * 收口那一行（界面说明 §2.6「收口时」）：学习者点了“我觉得懂了”、还没等到收尾那一句 = 在收尾；
 * 那一句到了 = done（学完之后也留着；带那一句与所在行，给面板定位；old = 旧数据里守卫的收尾记录，summary 是它的总述）。
 */
export type CloseLine =
  { kind: 'closing' } | { kind: 'done'; line: number; summary: string; old?: true } | undefined;

export function closeLine(records: NumberedRecord[]): CloseLine {
  // 学完之后收尾那一句仍留在页面上；没合上就结束时不再“在收尾”
  const ended = records.some((r) => r.record.type === 'loop_ended');
  const c = closeStatus(records.filter((r) => r.record.type !== 'loop_ended'));
  if (c === undefined) return undefined;
  if (c.kind === 'waiting') return ended ? undefined : { kind: 'closing' };
  return {
    kind: 'done',
    line: c.line,
    summary: c.summary,
    ...(c.old === true ? { old: true as const } : {}),
  };
}
