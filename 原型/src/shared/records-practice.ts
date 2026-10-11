// 练习任务（批 9，M03）新增的正本记录类型。只加，不改旧字段的意思。
// 都记在“练习所在的闭环”自己的正本里（只追加）；任务的状态由记录折叠得出，不存状态字段。
// records.ts 把这里的类型接进 LogRecord。

/** 练习的功能（M03:13-14：概念澄清 / 计算 / 证明 / 应用是另一个维度，不在这里建模）。 */
export const PRACTICE_FUNCTIONS = ['巩固', '变式', '迁移', '诊断'] as const;
export type PracticeFunction = (typeof PRACTICE_FUNCTIONS)[number];

export const PRACTICE_DIFFICULTIES = ['低', '中', '高'] as const;
export type PracticeDifficulty = (typeof PRACTICE_DIFFICULTIES)[number];

/** 题目从哪来：书里的习题（带出处，题面由程序按行读出）；或模型生成（只存在任务自己的记录里，标“生成”，不入 M07）。 */
export type PracticeSource =
  | {
      kind: 'textbook';
      book: string;
      bookTitle: string;
      file: string;
      from: number;
      to: number;
      /** 教材出处标记 【教材|…】。 */
      citation: string;
    }
  | { kind: 'generated' };

/** 布置一道练习。 */
export interface PracticeAssigned {
  type: 'practice_assigned';
  at: string;
  /** 任务编号（pr-xxxxxxxx）。 */
  id: string;
  /** 练什么：用日常话一句。 */
  focus: string;
  /** 对应的 M08 点（可空）。 */
  points: string[];
  /** 对应的 M08 子句（可空）。 */
  clause?: string;
  source: PracticeSource;
  /** 题面：书里的习题 = 程序按出处读出的原文；生成题 = 模型写的。 */
  prompt: string;
  /** 交什么（结果、关键步骤、理由……）。 */
  deliverable: string;
  hintsAllowed: boolean;
  /** 何时算完。 */
  doneWhen: string;
  function: PracticeFunction;
  difficulty: PracticeDifficulty;
  /** 阶段验收（与日常练习分开，默认不给提示）。 */
  stageCheck: boolean;
  /** 递进：接在哪一道之后（同一闭环里的任务编号）。 */
  follows?: string;
}

/** 教学侧把学习者的原话行认作某任务的作答（作答也可以由接口提交：那时记在学习者消息的 practice 字段上）。 */
export interface PracticeSubmitted {
  type: 'practice_submitted';
  at: string;
  taskId: string;
  /** 学习者原话的行号。 */
  lines: number[];
}

/** 一条错误：类型名 + 一句说明 + 指回学习者的原话行。 */
export interface PracticeError {
  /** 错误类型的短名（同一类错误用同一个名字，程序按名字合并成模式）。 */
  label: string;
  detail: string;
  lines: number[];
}

/** 对作答的反馈（只落在知识 / 思路 / 技巧 / 过程上，不评价人）。 */
export interface PracticeFeedback {
  type: 'practice_feedback';
  at: string;
  id: string;
  taskId: string;
  text: string;
  errors: PracticeError[];
}

/** 提示：学习者要了一次（learner），或教学侧给了一次（teacher，计入“提示用了几次”）。 */
export interface PracticeHint {
  type: 'practice_hint';
  at: string;
  taskId: string;
  by: 'learner' | 'teacher';
  note?: string;
}

/** 任务结束：完成 / 放弃。完成不等于掌握，也不触发闭环合上。 */
export interface PracticeDone {
  type: 'practice_done';
  at: string;
  taskId: string;
  outcome: 'completed' | 'abandoned';
  note: string;
  by: 'teacher' | 'learner';
}

/** 题型 / 方法归纳（M03:18）：据已完成的练习写的“这类题怎么想”，指回练习与学习者原话。 */
export interface PracticeSummary {
  type: 'practice_summary';
  at: string;
  id: string;
  tasks: { loopSessionId: string; taskId: string }[];
  text: string;
  /** 指回的学习者原话（闭环 + 行）。 */
  evidence: { loopSessionId: string; line: number }[];
  /** 谁让写的：学习者单独请求 / 教学侧自己在闭环里写。 */
  requestedBy: 'learner' | 'teacher';
}
