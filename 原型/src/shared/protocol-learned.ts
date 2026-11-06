// 学过的记录（docs/设计/记录/学过的记录.md）：一次学习只有进行中 / 已结束，原文就是记录。外部导入。

/** 一次学习。 */
export interface Learning {
  loopId: string;
  title: string;
  openedAt: string;
  /** 结束了才有。 */
  endedAt?: string;
  status: '进行中' | '已结束';
}

/** 外部导入（学习者在系统之外学到的）：存原样指针，标未验证，不经模型分析。 */
export interface Import {
  id: string;
  at: string;
  channel: '畅谈' | '笔记' | '对话记录';
  /** 畅谈（旧数据）= 学习者原话的行；笔记 / 对话记录 = 一份资料（W11：和资料存在一处，`<数据>/资料/<资料 id>/`）。 */
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
