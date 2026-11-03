// 讨论串（项目对话右边那一栏）的纯转换：一个项目开出去的任务对话 → 等你 / 进行中 / 停着 / 已结束。
// 分组规则在 `../shared/threads.ts`（主对话里的讨论串卡片也用它，W12 §4.1）；每行带什么小标签改下面 TAG_OF。
// 学习者删掉的讨论串核心那边就不列了（W12 §4.3）。
import type { SessionMark, SessionSummary } from '../shared/protocol.ts';
import { THREAD_KINDS, threadGroup, type ThreadGroup } from '../shared/threads.ts';
import { W } from './wording.ts';

export type { ThreadGroup };

/** 行尾的小标签（没有的不显示）。 */
const TAG_OF: Partial<Record<SessionMark, string>> = {
  guarded: W.threads.tagGuarded,
  candidates: W.threads.tagCandidates,
  closed: W.threads.tagClosed,
  unclosed: W.learnedStatus.没合上,
};

export interface ThreadRow {
  id: string;
  kind: SessionSummary['kind'];
  title: string;
  tag?: string;
  /** 排序与显示用：最近活动。 */
  at: string;
}

export function threadGroups(
  sessions: readonly SessionSummary[],
  projectId: string,
): Record<ThreadGroup, ThreadRow[]> {
  const out: Record<ThreadGroup, ThreadRow[]> = { waiting: [], running: [], paused: [], ended: [] };
  for (const s of sessions) {
    if (s.parent !== projectId || !THREAD_KINDS.has(s.kind)) continue;
    const tag = s.mark !== undefined ? TAG_OF[s.mark] : undefined;
    out[threadGroup(s)].push({
      id: s.sessionId,
      kind: s.kind,
      title: s.title,
      at: s.lastAt ?? s.openedAt,
      ...(tag !== undefined ? { tag } : {}),
    });
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
  if (s === undefined || !THREAD_KINDS.has(s.kind)) return undefined;
  return { title: s.title, group: threadGroup(s) };
}
