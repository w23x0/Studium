// 学过的记录按层（docs/设计/记录/学过的记录.md）：上层（单子；没合上的另带结束原话与路线决定）、
// 中层（守卫判定）、外部导入。protocol.ts 把它们 re-export，界面从 protocol.ts 取。
import type { Ticket, Understanding } from './records.ts';

/** 一次学习的两层：上层 + 中层（没合上 / 进行中的没有中层）。 */
export interface Learning {
  loopId: string;
  title: string;
  openedAt: string;
  /** 结束了才有。 */
  endedAt?: string;
  status: '进行中' | '合上' | '没合上';
  /** 上层：单子。 */
  ticket: Ticket;
  /** 没合上：学习者为什么结束的原话。 */
  endNote?: string;
  /** 没合上：导航读那次对话出下一张卡时写的路线决定。 */
  routeDecision?: { line: number; decision: string; reason: string };
  /** 合上：通过的那份守卫判定（中层）。 */
  verdict?: {
    line: number;
    closed: boolean;
    basis: string;
    understanding: Understanding[];
    model?: string;
  };
}

/** 外部导入（学习者在系统之外学到的）：存原样指针，标未验证，不经模型分析。 */
export interface Import {
  id: string;
  at: string;
  channel: '畅谈' | '笔记';
  /** 畅谈 = 学习者原话的行；笔记 = 那份笔记。 */
  ref: { session: string; lines: number[] } | { note: string };
  unverified: true;
}

export interface LearnedResponse {
  learnings: Learning[];
  imports: Import[];
}

export interface LearningResponse {
  learning: Learning;
}
