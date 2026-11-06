// 讨论串（项目对话右边那一栏）的纯转换：一个项目开出去的任务对话 → 开着 / 已结束（W19，照 Claude 项目）。
// 分组规则在 `../shared/threads.ts`（主对话里的讨论串卡片也用它，W12 §4.1）。
// 学习者删掉的讨论串核心那边就不列了（W12 §4.3）。
import type { SessionSummary } from '../shared/protocol.ts';
import { threadGroup, type ThreadGroup } from '../shared/threads.ts';

export type { ThreadGroup };

export interface ThreadRow {
  id: string;
  title: string;
  /** 排序与显示用：最近活动。 */
  at: string;
}

export function threadGroups(
  sessions: readonly SessionSummary[],
  projectId: string,
): Record<ThreadGroup, ThreadRow[]> {
  const out: Record<ThreadGroup, ThreadRow[]> = { open: [], ended: [] };
  for (const s of sessions) {
    if (s.parent !== projectId || s.kind !== 'loop') continue;
    out[threadGroup(s)].push({ id: s.sessionId, title: s.title, at: s.lastAt ?? s.openedAt });
  }
  for (const g of Object.values(out)) g.sort((a, b) => b.at.localeCompare(a.at));
  return out;
}

/** 一个讨论串现在的状态（主对话里的卡片与右栏同一来源）；不是讨论串、找不到返回空。 */
export function threadStatus(
  sessions: readonly SessionSummary[],
  id: string,
): { title: string; group: ThreadGroup } | undefined {
  const s = sessions.find((x) => x.sessionId === id);
  if (s?.kind !== 'loop') return undefined;
  return { title: s.title, group: threadGroup(s) };
}
