// 学过的记录按层（docs/设计/记录/学过的记录.md）：W19 起一次学习只有进行中 / 已结束，原文就是记录；
// 旧数据另有上层（单子；没合上的另带结束原话与路线决定）、中层（收尾那一句或守卫判定）。外部导入。
import type { Ticket, Understanding } from './records.ts';

/** 一次学习的两层：上层 + 中层（没合上 / 进行中的没有中层）。 */
export interface Learning {
  loopId: string;
  title: string;
  openedAt: string;
  /** 结束了才有。 */
  endedAt?: string;
  /** W19 起只有进行中 / 已结束；合上 / 没合上是旧数据（loop_ended）。 */
  status: '进行中' | '已结束' | '合上' | '没合上';
  /** 上层：单子（现在的这张：改过就是改后的）。 */
  ticket: Ticket;
  /** 学习者改过单子：每次改动在正本里的行号与时间（没改过就不带）。 */
  ticketEdits?: { line: number; at: string }[];
  /** 没合上：学习者为什么结束的原话。 */
  endNote?: string;
  /** 没合上：导航读那次对话出下一张卡时写的路线决定。 */
  routeDecision?: { line: number; decision: string; reason: string };
  /** 旧数据，合上：收尾那一句（10-31 至 W19，学习对话调 request_close 写的，学习者确认学完了）。 */
  closing?: { line: number; at: string; summary: string };
  /** 旧数据：合上时通过的那份守卫判定（10-31 起不再产生）。 */
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
  channel: '畅谈' | '笔记' | '对话记录';
  /** 畅谈 = 学习者原话的行；笔记 / 对话记录 = 一份资料（W11：和资料存在一处，`<数据>/资料/<资料 id>/`）。 */
  ref: { session: string; lines: number[] } | { material: string };
  unverified: true;
  /** 笔记 / 对话记录：标题（多是原文件名）。 */
  title?: string;
  /** 从哪个项目导入的（项目页“我导入的学过的”只列本项目的）；学过的按人，不按项目划界。 */
  project?: string;
}

export interface LearnedResponse {
  learnings: Learning[];
  imports: Import[];
}
