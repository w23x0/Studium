// 会话正本（JSONL）里每一行的形状。正本只追加、永不改写：行号就是引用地址。
// 加新类型只能加，不改旧类型的字段含义；读到不认识的类型要原样保留。
import type {
  RegressionNote,
  ReminderAdded,
  ReminderClosed,
  ResumeOrigin,
  Revisit,
  ReviewWindow,
} from './records-longterm.ts';
import type {
  PracticeAssigned,
  PracticeDone,
  PracticeFeedback,
  PracticeHint,
  PracticeSubmitted,
  PracticeSummary,
} from './records-practice.ts';

export type * from './records-longterm.ts';
export type * from './records-practice.ts';

/**
 * main 主对话 · talk 畅谈对话 · loop 闭环对话 · guard 闭环守卫 · m09 写形成记录 · m05 出选择卡
 * · m15 整理学习者状态 · m10 记教法效果 · output 写产出（M14 任务对话）
 */
export type ConversationKind =
  'main' | 'talk' | 'loop' | 'guard' | 'm09' | 'm05' | 'm15' | 'm10' | 'output';

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
  /** 复习 / 复检：回头看以前合上过的点（批 6）；没有 = 学新点。 */
  revisit?: Revisit;
  /** 阶段验收闭环（批 9）：闭环里的练习都标阶段验收、默认不给提示；守卫照常判。没有 = 日常闭环。 */
  stageCheck?: boolean;
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
  /** 这个闭环是从另一个闭环分叉出来的（批 5）：来源、原因、返回条件。parent 仍是项目主对话。 */
  fork?: ForkOrigin;
  /** 这个闭环是接着一个没合上的闭环学的（批 6）：记着原闭环，原闭环的正本不改。 */
  resumeOf?: ResumeOrigin;
  /** 这是一次阶段复盘（畅谈类会话的另一种活，批 6）：回看的时间窗口。 */
  review?: ReviewWindow;
}

/** 分叉闭环的来历（M01:18 会话关系：来源、分叉、返回；M05:19 返回条件）。 */
export interface ForkOrigin {
  /** 从哪个闭环分出来（父闭环会话 id）。 */
  fromLoop: string;
  /** gap = 教学侧发现前置缺口；branch = 学习者想岔开去学别的。 */
  kind: 'gap' | 'branch';
  /** 分叉原因：缺哪个出发点 / 学习者想去学什么（一句话）。 */
  reason: string;
  /** 缺的出发点（M08 点 id）；说不到点上时没有。 */
  missingPoint?: string;
  /** 父闭环里指回学习者原话的行。 */
  basisLines: number[];
  /** 父闭环里通知 M05 的那条 route_signal 所在行。 */
  signalLine: number;
  /** 返回条件：程序写定，分叉的新点合上就回父闭环。 */
  returnCondition: string;
  /** 范围 / 停止条件（M05 在小卡上给的，补到原闭环够用为止）；可没有。 */
  scope?: string;
}

export interface UserMessage {
  type: 'user_message';
  at: string;
  text: string;
  /** 有这一项 = 这句话是学习者对本闭环里第 toLine 行守卫判定提出的异议（原话照记，带标记）。 */
  objection?: { toLine: number };
  /** 随这句话附的图片（拍照 / 手写，批 4）：转写文字已并进 text（教学只读文字，M02:19），这里记原图与转写的来历。 */
  images?: ImageInput[];
  /** 有这一项 = 这句话是学习者经练习任务提交的作答（批 9）：taskId 是任务编号；原话照记。 */
  practice?: { taskId: string };
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
  /** 结构化条目：“以前会的现在答不出”（批 6）；text 是教学侧对这一条的说明。 */
  regression?: RegressionNote;
  /** 这一轮的教法强度（M10 的四项参数 + 偏向）；模型没填就没有这个字段。 */
  intensity?: Intensity;
}

export const LEVELS = ['低', '中', '高'] as const;
export const PACES = ['慢', '中', '快'] as const;
export const LEANS = ['输入', '均衡', '练习'] as const;

/** 一轮教学的强度：信息量 / 提示强度 / 挑战程度各三档，节奏三档，以及这一轮偏输入还是偏练习。 */
export interface Intensity {
  info: (typeof LEVELS)[number];
  hint: (typeof LEVELS)[number];
  challenge: (typeof LEVELS)[number];
  pace: (typeof PACES)[number];
  lean: (typeof LEANS)[number];
  reason?: string;
}

/** 强度的五项：信息量 / 提示强度 / 挑战程度 / 节奏 / 偏输入还是偏练习。 */
export type Dimension = 'info' | 'hint' | 'challenge' | 'pace' | 'lean';

export interface IntensityTurn {
  line: number;
  info: string;
  hint: string;
  challenge: string;
  pace: string;
  lean: string;
}

export interface DimensionTrend {
  first: string;
  last: string;
  /** 相邻重复合并后的走法，如 高 → 中 → 低。 */
  sequence: string[];
  direction: '升' | '降' | '持平' | '起伏';
}

/** 一个闭环里四项（+偏向）的走向，程序算；使教法记录之间可比较。 */
export interface IntensityTrend {
  turns: IntensityTurn[];
  /** 没标强度的诊断条数。 */
  unannotated: number;
  summary: Record<Dimension, DimensionTrend>;
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
  step: 'm09_written' | 'card_ready' | 'failed' | 'parked' | 'returned';
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
  /** 阶段复盘交回时有：goal 是交回主对话的那一句（批 6）。 */
  review?: ReviewWindow;
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

/**
 * 闭环中途教学侧通知 M05（M04:21 前置缺口与分叉依据；M05:42 闭环进行中也可被触发）。
 * 只记事实与依据：缺的是哪个出发点、指回学习者哪几行，不在这里下决定。
 */
export interface RouteSignal {
  type: 'route_signal';
  at: string;
  /** gap = 前置缺口（含自述 / 假定的出发点不牢）；branch = 学习者想分叉去学别的。 */
  kind: 'gap' | 'branch';
  /** 缺的出发点或想去的点（M08 点 id）；对不上 M08 时没有。 */
  missingPoint?: string;
  /** 缺什么 / 想去哪，用日常话写。 */
  missingText: string;
  /** 指回本闭环里学习者的原话行。 */
  basisLines: number[];
  note?: string;
}

/** 小卡上的一个选项。 */
export interface DetourOption {
  /** fork = 先补 / 先去学（开分叉，合上后回来）；continue = 先不管接着学；shelve = 先搁置本闭环。 */
  kind: 'fork' | 'continue' | 'shelve';
  /** 给学习者看的一句话。 */
  title: string;
  reason: string;
  /** 可回查的出处；程序会补上指回的学习者原话行（会话 id:行号）。 */
  sources: string[];
  /** 只有 fork 有：分叉闭环的单子。 */
  ticket?: Ticket;
  /** 只有 fork 有：补到什么程度为止。 */
  scope?: string;
}

/** M05 在闭环中途出的小卡，贴在该闭环里（2–3 个选项，至少含 fork 与 continue）。 */
export interface DetourCard {
  type: 'detour_card';
  at: string;
  cardId: string;
  m05SessionId: string;
  /** 对应本闭环里哪一条 route_signal。 */
  signalLine: number;
  options: DetourOption[];
  recommended: number;
}

/** 学习者在小卡上选定（M01 存成路线事实）。 */
export interface DetourMade {
  type: 'detour_made';
  at: string;
  cardId: string;
  option: number;
  choice: 'fork' | 'continue' | 'shelve';
  /** choice = fork 时开出的分叉闭环。 */
  forkLoopSessionId?: string;
}

/** 分叉闭环结束，回到父闭环（记在父闭环里）。delivered = 回来的事实已追加给父闭环的教学侧。 */
export interface ForkReturned {
  type: 'fork_returned';
  at: string;
  forkLoopSessionId: string;
  /** 分叉闭环合上了（补的点补上了）吗。 */
  closed: boolean;
  delivered: boolean;
  /** 没有追加的原因（父闭环已结束 / 搁置着）。 */
  note?: string;
}

/** 学习者把闭环搁置（可恢复；与“结束（没合上）”不同）。 */
export interface LoopShelved {
  type: 'loop_shelved';
  at: string;
  note: string;
}

/** 搁置的闭环恢复（学习者点“接着学”，或在里面又说话）。 */
export interface LoopResumed {
  type: 'loop_resumed';
  at: string;
  by: 'button' | 'message';
}

/**
 * 停车记录（M04:22、M05:27）：没合上就结束、或搁置的闭环，缺在哪个出发点、何时从哪接上。
 * 由 M05 的一个会话写（m05SessionId）；记在该闭环自己的正本里。
 */
export interface ParkingNote {
  type: 'parking_note';
  at: string;
  reason: 'ended_unclosed' | 'shelved';
  missing: { point?: string; text: string }[];
  /** 恢复计划：何时。 */
  when: string;
  /** 恢复计划：从哪接上。 */
  resumeFrom: string;
  /** 指回本闭环里学习者原话的行（可没有）。 */
  basisLines: number[];
  m05SessionId: string;
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
  | ProjectDeadline
  | RouteSignal
  | DetourCard
  | DetourMade
  | ForkReturned
  | LoopShelved
  | LoopResumed
  | ParkingNote
  | ReminderAdded
  | ReminderClosed
  | PracticeAssigned
  | PracticeSubmitted
  | PracticeFeedback
  | PracticeHint
  | PracticeDone
  | PracticeSummary;

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
