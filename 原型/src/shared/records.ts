// 会话正本（JSONL）里每一行的形状。正本只追加、永不改写：行号就是引用地址。
// 加新类型只能加，不改旧类型的字段含义；读到不认识的类型要原样保留。

/**
 * main 主对话 · talk 畅谈对话 · loop 闭环对话 · guard 闭环守卫 · m09 写形成记录 · m05 出选择卡
 * · m15 整理学习者状态 · m10 记教法效果
 */
export type ConversationKind = 'main' | 'talk' | 'loop' | 'guard' | 'm09' | 'm05' | 'm15' | 'm10';

/** M05 给一个闭环开的单子。 */
export interface Ticket {
  /** 新点（M08 点 id）。 */
  newPoint: string;
  /** 选中的子句（M08 子句 id）。 */
  clause: string;
  /** 这次用的出发点及其来源。 */
  startPoints: { point: string; source: 'M09' | '自述' | '假定' }[];
  /** 路线动作：继续主线 / 补前置 / 开分叉 / 返回主线 …… */
  routeAction: string;
}

export interface SessionOpened {
  type: 'session_opened';
  at: string;
  sessionId: string;
  kind: ConversationKind;
  title: string;
  /** 从哪个会话开出来的（闭环对话 → 主对话；守卫 → 闭环对话）。 */
  parent?: string;
  ticket?: Ticket;
  /** 挂在父会话的哪一行下（畅谈对话 → 主对话里那条学习者消息）。 */
  anchorLine?: number;
}

export interface UserMessage {
  type: 'user_message';
  at: string;
  text: string;
  /** 有这一项 = 这句话是学习者对本闭环里第 toLine 行守卫判定提出的异议（原话照记，带标记）。 */
  objection?: { toLine: number };
  /** 随这句话附的图片（拍照 / 手写，批 4）：转写文字已并进 text（教学只读文字，M02:19），这里记原图与转写的来历。 */
  images?: ImageInput[];
}

/** 学习者消息里的一张图片：原图在输入存放处（只追加），转写由模型接口做、学习者发送前可改。 */
export interface ImageInput {
  /** 原图（学习者选的 / 拍的那张，原样保存）。 */
  attachmentId: string;
  /** 用的哪次转写；学习者没转写、自己写说明时没有。 */
  transcriptionId?: string;
  /** 转写用的是界面为转写缩小的副本时，副本的 id（副本记着它出自原图）。 */
  transcribedFrom?: string;
  /** 模型转写出的原文（学习者改之前）。 */
  transcript?: string;
  /** 并进消息里的文字（学习者改过的话与 transcript 不同）。 */
  sent: string;
  /** 转写用的实际执行模型；取不到时同 model_used 的兜底写法（含“未取到实际执行模型”）。 */
  model?: string;
}

export interface AssistantMessage {
  type: 'assistant_message';
  at: string;
  text: string;
}

/** 程序追加给模型的事实（开场交付、守卫结论、离开多久等）；不是学习者说的话。 */
export interface ProgramFact {
  type: 'program_fact';
  at: string;
  text: string;
}

/** 模型调了我们的工具：程序记下调了什么、得到什么（如读了哪份资料）。 */
export interface ToolCall {
  type: 'tool_call';
  at: string;
  name: string;
  args: unknown;
  result: string;
  isError: boolean;
}

/** 模型适配层吐出的原始消息，逐条原样（含思考块）。只有该会话自己读。 */
export interface ModelRaw {
  type: 'model_raw';
  at: string;
  adapter: string;
  payload: unknown;
}

/** 模型侧会话的续接凭据（如 Agent SDK 的 session_id），重启后接着同一份上下文。 */
export interface ModelSession {
  type: 'model_session';
  at: string;
  adapter: string;
  token: string;
}

/** 模型侧报告的实际执行模型名（不是别名、不是适配器名）；名字变了才追加一条。 */
export interface ModelUsed {
  type: 'model_used';
  at: string;
  adapter: string;
  model: string;
}

export interface TurnFailed {
  type: 'turn_failed';
  at: string;
  reason: string;
}

/** 闭环对话的诊断记录：给后续推理与审计用，不给学习者看，守卫不读。 */
export interface LoopNote {
  type: 'loop_note';
  at: string;
  text: string;
}

export interface CloseRequested {
  type: 'close_requested';
  at: string;
  by: 'model' | 'learner';
  reason: string;
}

/** 守卫判定，程序已核对引用行。 */
export interface GuardVerdict {
  type: 'guard_verdict';
  at: string;
  guardSessionId: string;
  closed: boolean;
  basis: string;
  /** 守卫引用的闭环对话行号。 */
  lines: number[];
  /** 程序核对不过时写明原因；有这一项时 closed 一律为 false。 */
  problem?: string;
}

/** 闭环结束：合上（学习者确认）或没合上就结束。 */
export interface LoopEnded {
  type: 'loop_ended';
  at: string;
  closed: boolean;
  /** 学习者确认或要结束时说的话，或界面按钮。 */
  note: string;
}

/** 合上之后 / 没合上就结束之后，各步的进度（写 M09、出选择卡）。 */
export interface AfterLoopStep {
  type: 'after_loop_step';
  at: string;
  step: 'm09_written' | 'card_ready' | 'failed';
  detail: string;
}

/** 方向目标（主对话里谈定；畅谈对话的输出契约暂缓，D-10）。 */
export interface ProjectGoal {
  type: 'project_goal';
  at: string;
  text: string;
}

export interface ChoiceOption {
  ticket: Ticket;
  /** 给学习者看的一句话。 */
  title: string;
  reason: string;
  /** 这个选项从哪来：M08 点 / 子句 id、M09 记录 id、闭环原文（会话 id:行号）、书里 书名/文件:行号（旧卡可能只有文件:行号，认不出是哪一本）；须可回查。旧卡没有。 */
  sources?: string[];
}

/** M05 出的选择卡，贴在主对话里。 */
export interface ChoiceCard {
  type: 'choice_card';
  at: string;
  cardId: string;
  m05SessionId: string;
  options: ChoiceOption[];
  recommended: number;
  /** 触发原因：学习者要下一步 / 闭环合上 / 没合上就结束。 */
  trigger: string;
}

/** 学习者在选择卡上选定（M01 存成路线事实），并开出闭环对话。 */
export interface ChoiceMade {
  type: 'choice_made';
  at: string;
  cardId: string;
  option: number;
  loopSessionId: string;
}

/** 主对话开出一个任务对话（畅谈对话），挂在某条学习者消息下（M01 会话关系）。 */
export interface TaskOpened {
  type: 'task_opened';
  at: string;
  sessionId: string;
  kind: ConversationKind;
  title: string;
  /** 挂在主对话的哪一行下。 */
  anchorLine: number;
}

/** 项目名（随方向目标变）。会话开头的名字不改，界面与列表取最新一条。 */
export interface ProjectTitle {
  type: 'project_title';
  at: string;
  title: string;
  /** goal = 谈定方向时一起定的。 */
  source: 'goal';
}

/** 畅谈对话交回：谈出的方向目标（已记进项目），本对话结束。 */
export interface TalkEnded {
  type: 'talk_ended';
  at: string;
  goal: string;
  title: string;
}

/** 主对话把学习者指向某个已有对话（跟进某个闭环时）。 */
export interface ConversationPointer {
  type: 'conversation_pointer';
  at: string;
  sessionId: string;
}

/**
 * 项目选用 / 去掉一份资料（书或个人笔记，book = 书库里的书 id）。只追加：当前选了哪些 = 按顺序折叠这些记录。
 * 一份都没选 = 不限定范围（资料工具查全库）。
 */
export interface ProjectMaterial {
  type: 'project_material';
  at: string;
  op: 'add' | 'remove';
  book: string;
}

/** 项目期限（可不填）。deadline 为 null = 清掉期限；取最新一条。 */
export interface ProjectDeadline {
  type: 'project_deadline';
  at: string;
  /** YYYY-MM-DD。 */
  deadline: string | null;
  note?: string;
}

export type LogRecord =
  | SessionOpened
  | UserMessage
  | AssistantMessage
  | ProgramFact
  | ToolCall
  | ModelRaw
  | ModelSession
  | ModelUsed
  | TurnFailed
  | LoopNote
  | CloseRequested
  | GuardVerdict
  | LoopEnded
  | AfterLoopStep
  | ProjectGoal
  | ChoiceCard
  | ChoiceMade
  | TaskOpened
  | ProjectTitle
  | TalkEnded
  | ConversationPointer
  | ProjectMaterial
  | ProjectDeadline;

/** 学习者异议指向什么：守卫的一次判定（闭环 + 判定所在行），或 M09 / M10 / M15 的一条记录（记录 id）。 */
export type ObjectionTarget =
  | { kind: 'guard_verdict'; loopSessionId: string; line: number }
  | { kind: 'm09' | 'm10' | 'm15'; recordId: string };

/**
 * 学习者异议：只追加的一条独立记录，指向原记录，不改原记录（异议按自述来源记录，不覆盖可观察事实）。
 * 存在知识层的异议存放处（不在会话正本里）；对还开着的闭环里守卫判定的异议则作为带标记的学习者原话进闭环正本。
 */
export interface LearnerObjection {
  id: string;
  at: string;
  text: string;
  target: ObjectionTarget;
}

export const SOURCE_REPORT_KINDS = ['转录错', '公式错', '定位错', '其他'] as const;
export type SourceReportKind = (typeof SOURCE_REPORT_KINDS)[number];

/**
 * 学习者对某段教材原文的报错（转录错、公式错、定位错……）。只追加；先只记录，回 M06 修正是后续的事（M07:20）。
 * quote 是报错当时那几行原文的快照，之后原文被重新转录也还能对上。
 */
export interface SourceReport {
  id: string;
  at: string;
  book: string;
  file: string;
  from: number;
  to: number;
  kind: SourceReportKind;
  text: string;
  quote: string;
  /** 报错时看的 PDF 页（有就记）。 */
  page?: number;
  status: 'open';
}

/** 带行号的记录；行号从 1 开始，等于 JSONL 文件里的行。 */
export interface NumberedRecord {
  line: number;
  record: LogRecord;
}
