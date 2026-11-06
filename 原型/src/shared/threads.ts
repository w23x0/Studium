// 讨论串（一个项目开出去的任务对话）的分组与“现在结束没有”：界面的讨论串栏、主对话里的卡片与 list_threads 共用这一处。
// 照 Claude 项目的讨论串（W19）：只分开着和已结束，结束了说话就重开。
import type { SessionSummary } from './protocol.ts';
import type { LogRecord } from './records.ts';

/** 讨论串的状态（卡片与右栏同一来源）：开着 / 已结束。 */
export type ThreadGroup = 'open' | 'ended';

export function threadGroup(s: SessionSummary): ThreadGroup {
  return s.mark !== undefined ? 'ended' : 'open';
}

/**
 * 讨论串现在结束着的话，最后那条结束记录（重开过又结束 = 后一次）；开着返回空。
 * 结束：thread_closed；旧数据里的 loop_ended 也算。重开：thread_reopened。
 */
export function threadEnd<T extends { record: LogRecord }>(records: readonly T[]): T | undefined {
  let end: T | undefined;
  for (const r of records) {
    switch (r.record.type) {
      case 'thread_closed':
      case 'loop_ended':
        end = r;
        break;
      case 'thread_reopened':
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
