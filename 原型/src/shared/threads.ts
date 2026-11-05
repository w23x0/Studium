// 讨论串（一个项目开出去的任务对话）的分组与“现在结束没有”：界面的讨论串栏、主对话里的卡片与 list_threads 共用这一处。
// 照 Claude 项目的讨论串（W19）：只分开着和已结束，结束了说话就重开；学习对话也一样，没有“合上 / 没合上”“等确认”。
import type { SessionSummary } from './protocol.ts';
import type { ConversationKind, LogRecord } from './records.ts';

/** 讨论串的状态（卡片与右栏同一来源）：开着 / 已结束。 */
export type ThreadGroup = 'open' | 'ended';

/** 讨论串里列的对话种类（主对话本身、导入会话不列；找资料、写产出是旧数据，照旧列着只读看）。 */
export const THREAD_KINDS: ReadonlySet<ConversationKind> = new Set<ConversationKind>([
  'talk',
  'loop',
  'find',
  'output',
]);

export function threadGroup(s: SessionSummary): ThreadGroup {
  return s.mark !== undefined ? 'ended' : 'open';
}

/**
 * 讨论串现在结束着的话，最后那条结束记录（重开过又结束 = 后一次）；开着返回空。
 * 结束：thread_closed（学习对话 W19 起也是它）；旧数据还有 loop_ended（合上 / 没合上）、talk_ended、candidates_picked。
 * 重开：thread_reopened；旧数据里找资料又交回候选（find_candidates）也算又开着。
 */
export function threadEnd<T extends { record: LogRecord }>(records: readonly T[]): T | undefined {
  let end: T | undefined;
  for (const r of records) {
    switch (r.record.type) {
      case 'thread_closed':
      case 'loop_ended':
      case 'talk_ended':
      case 'candidates_picked':
        end = r;
        break;
      case 'thread_reopened':
      case 'find_candidates':
        end = undefined;
        break;
      default:
        break;
    }
  }
  return end;
}

export function threadEnded(records: readonly { record: LogRecord }[]): boolean {
  return threadEnd(records) !== undefined;
}
