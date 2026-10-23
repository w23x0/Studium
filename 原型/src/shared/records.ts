// 会话正本（JSONL）里每一行的形状。正本只追加、永不改写：行号就是引用地址。
// 加新类型只能加，不改旧类型的字段含义；读到不认识的类型要原样保留。
import type {
  ReminderAdded,
  ReminderClosed,
  ResumeOrigin,
  Revisit,
  ReviewWindow,
} from './records-longterm.ts';
import type { CrossDomain } from './records-cross.ts';

export type * from './records-longterm.ts';
export type * from './records-cross.ts';

/**
 * main 主对话 · talk 畅谈对话 · loop 一次学习的对话 · guard 守卫 · nav 出选择卡（导航）
 * · retrieve 检索子代理（导航派的）· state 整理学习者状态 · pedagogy 记教法效果 · output 写产出对话
 */
export const CONVERSATION_KINDS = [
  'main',
  'talk',
  'loop',
  'guard',
  'nav',
  'retrieve',
  'state',
  'pedagogy',
  'output',
] as const;
export type ConversationKind = (typeof CONVERSATION_KINDS)[number];

/** 出发点的来源：学过的记录 / 自述 / 假定（只是来源标注，不是证据）。 */
export const START_SOURCES = ['学过的记录', '自述', '假定'] as const;

/** 单子：这次打算学什么、从哪出发（记录/单子与路线.md）。各栏都是文字，不再查知识点编号库。 */
export interface Ticket {
  /** 新点，一句话。 */
  newPoint: string;
  /** 预期理解：出发点怎么接到新点，一两句。 */
  clause: string;
  /** 这次用的出发点及其来源；`ref` = 依据（`会话 id:行号`）。 */
  startPoints: { point: string; source: (typeof START_SOURCES)[number]; ref?: string }[];
  /** 路线动作：继续主线 / 补前置 / 复习 / 复检 / 接着学 …… */
  routeAction: string;
  /** 对资料核的结果：`at` = 教材出处（`书/文件:行号`）；资料里没有的标 `modelAdded`。 */
  sourceCheck: { claim: string; at?: string; modelAdded?: boolean }[];
  /** 复习 / 复检：回头看以前那次学习（批 6）；没有 = 学新点。 */
  revisit?: Revisit;
  /** 补前置：合上后回到哪次学习（学习会话 id）。 */
  returnTo?: string;
  /** 接着学：接着哪次没合上的学习（学习会话 id）。 */
  resumeOf?: string;
  /** 跨领域的单子：补习型 / 对比链接型；同领域内的没有。 */
  crossDomain?: CrossDomain;
  /** 阶段验收（批 9）：这次学习里的练习都标阶段验收、默认不给提示；守卫照常判。没有 = 日常学习。 */
  stageCheck?: boolean;
}

export interface SessionOpened {
  type: 'session_opened';
  at: string;
  sessionId: string;
  kind: ConversationKind;
  title: string;
  /** 从哪个会话开出来的（学习对话 → 主对话；守卫 → 学习对话）。 */
  parent?: string;
  ticket?: Ticket;
  /** 挂在父会话的哪一行下（畅谈对话 → 主对话里那条学习者消息）。 */
  anchorLine?: number;
  /** 这次学习是接着一次没合上的学习学的（批 6）：记着原来那次，原来那次的正本不改。 */
  resumeOf?: ResumeOrigin;
  /** 这是一次阶段复盘（畅谈类会话的另一种活，批 6）：回看的时间窗口。 */
  review?: ReviewWindow;
}

export interface UserMessage {
  type: 'user_message';
  at: string;
  text: string;
  /** 有这一项 = 这句话是学习者对本次学习里第 toLine 行守卫判定提出的异议（原话照记，带标记）。 */
  objection?: { toLine: number };
  /** 随这句话附的图片（拍照 / 手写，批 4）：转写文字已并进 text（教学只读文字，不读原图），这里记原图与转写的来历。 */
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

/** 沙盒动作的标签（程序按路径打，不看模型说什么；工单 W4 §5.3）。 */
export const TEACHING_TOOL_TAG = '教学工具:';

/**
 * 沙盒里的一个动作（读 / 写 / 跑命令……），由程序当场记（记录/对话与事件记录.md §3），不靠模型自报。
 * `path` 是虚拟路径；`tag` 由程序按路径打（读 只读/教学工具/<文件> → 教学工具:<文件名>）。
 */
export interface SandboxAction {
  type: 'sandbox_action';
  at: string;
  actor: 'model';
  op: 'read' | 'write' | 'run' | 'search' | 'other';
  path?: string;
  command?: string;
  summary: string;
  ok: boolean;
  tag?: string;
  /** 写类动作写进去的文字（整份写 = 全文；追加 = 追加的部分）。 */
  content?: string;
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

export interface CloseRequested {
  type: 'close_requested';
  at: string;
  by: 'model' | 'learner';
  reason: string;
}

/** 一条证据的独立程度：独立完成 / 提示后完成 / 答案暴露后。 */
export const INDEPENDENCE = ['独立', '提示后', '答案暴露后'] as const;
/** 一条证据的持久程度：仅当场 / 含变式 / 含延迟。 */
export const DURABILITY = ['仅当场', '含变式', '含延迟'] as const;

/**
 * 学习者实际表现出的理解（守卫判定顺带写下，记录/学过的记录.md「守卫判定」）：
 * 可与单子的预期理解不同；指回学习者的行，并注明证据强度（独立程度 + 持久程度）。
 */
export interface Understanding {
  /** 学习者实际表现出的理解，一句到几句。 */
  text: string;
  /** 学习对话里学习者的行，≥ 1 条。 */
  lines: number[];
  independence: (typeof INDEPENDENCE)[number];
  durability: (typeof DURABILITY)[number];
}

/** 守卫判定，程序已核对引用行。 */
export interface GuardVerdict {
  type: 'guard_verdict';
  at: string;
  guardSessionId: string;
  closed: boolean;
  basis: string;
  /** 守卫引用的学习对话行号。 */
  lines: number[];
  /** 学习者实际表现出的理解：判合上时必有且 ≥ 1 条；判没合上时可有可无。 */
  understanding?: Understanding[];
  /** 守卫这一轮实际执行的模型（不是别名）。 */
  model?: string;
  /** 程序核对不过时写明原因；有这一项时 closed 一律为 false。 */
  problem?: string;
}

/**
 * 学习者改这次学习的单子（记录/单子与路线.md「单子」规矩“可见可改”）：只追加一条，
 * 记改前、改后与时间；`session_opened` 里那张与卡上的那张都不改。
 */
export interface TicketEdited {
  type: 'ticket_edited';
  at: string;
  by: 'learner';
  before: Ticket;
  after: Ticket;
}

/** 一次学习结束：合上（学习者确认）或没合上就结束。 */
export interface LoopEnded {
  type: 'loop_ended';
  at: string;
  closed: boolean;
  /** 学习者确认或要结束时说的话，或界面按钮。 */
  note: string;
}

/** 一次学习结束之后的清单出错时记一条；card_ready 是 10-23 前自动出选择卡留下的旧记录。 */
export interface AfterLoopStep {
  type: 'after_loop_step';
  at: string;
  step: 'card_ready' | 'failed';
  detail: string;
}

/** 方向目标的一块：学成后能做什么、为什么学、学习者确认时自己给的理由。 */
export interface GoalAbility {
  ability: string;
  reason: string;
  confirmedReason?: string;
}

/** 方向目标（主对话里谈定；畅谈对话的输出契约暂缓，D-10）。 */
export interface ProjectGoal {
  type: 'project_goal';
  at: string;
  /** 旧字段，意思不变（方向目标一句话）；新记录 = abilities[].ability 用“；”连起来（程序拼）。 */
  text: string;
  /** 方向目标短名，同时作项目名。 */
  title?: string;
  /** 目标能力与每块理由；旧形状没有。 */
  abilities?: GoalAbility[];
  /** 顺序参考，只作参考。 */
  orderHint?: string;
  /** YYYY-MM-DD（同时照旧另写 project_deadline）。 */
  deadline?: string;
  /** 冷启动临时版；只在 true 时带。 */
  provisional?: boolean;
  /** 哪个畅谈交回的。 */
  talkSessionId?: string;
  /** 主对话里上一条 project_goal 的行号；第一条不带。 */
  supersedes?: number;
}

/** 本轮附在输入前的当前事实（主对话每轮从记录给），可回查。 */
export interface TurnContext {
  type: 'turn_context';
  at: string;
  /** 这条事实是附在哪条输入前的（主对话里那条输入的行号）。 */
  forLine: number;
  text: string;
}

export interface ChoiceOption {
  ticket: Ticket;
  /** 给学习者看的一句话。 */
  title: string;
  reason: string;
  /** 这个选项从哪来：学习对话里冒出的问题、导航现场说出的候选、现场判断的知识边缘（会话 id:行号）、书里 书名/文件:行号；须可回查。旧卡没有。 */
  sources?: string[];
}

/** 导航出的选择卡，贴在主对话里。 */
export interface ChoiceCard {
  type: 'choice_card';
  at: string;
  cardId: string;
  navSessionId: string;
  options: ChoiceOption[];
  recommended: number;
  /** 触发原因：学习者要下一步 / 学习合上 / 没合上就结束。 */
  trigger: string;
}

/**
 * 一次出卡时导航作出的路线决定与理由（记录/单子与路线.md「路线决定与理由」）。
 * 写在项目主对话的正本里，紧接它的是这次的选择卡；新决定取代旧决定时旧的留着，`supersedes` 指上一条的行号。
 */
export interface RouteDecision {
  type: 'route_decision';
  at: string;
  /** 交这次卡的导航会话。 */
  navSessionId: string;
  /** 为什么出卡：合上 / 没合上 / 学习者要求 / 补前置合上 …… */
  trigger: string;
  decision: string;
  reason: string;
  /** 理由的依据，每条 `会话 id:行号` 或 `书/文件:行号`；须可回查。 */
  basis: string[];
  /** 主对话里上一条路线决定的行号；第一条没有。 */
  supersedes?: number;
}

/** 学习者在选择卡上选定（存成路线事实），并开出学习对话。 */
export interface ChoiceMade {
  type: 'choice_made';
  at: string;
  cardId: string;
  option: number;
  loopSessionId: string;
}

/** 主对话开出一个任务对话（畅谈对话），挂在某条学习者消息下（`docs/设计/会话/主对话.md`）。 */
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
  /** goal = 谈定方向时一起定的；learner = 学习者在界面上改的名（左栏“重命名”）。 */
  source: 'goal' | 'learner';
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

/** 主对话把学习者指向某个已有对话（跟进某次学习时）。 */
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

/** 学习者把这次学习搁置（可恢复；与“结束（没合上）”不同）。 */
export interface LoopShelved {
  type: 'loop_shelved';
  at: string;
  note: string;
}

/** 搁置的学习恢复（学习者点“接着学”，或在里面又说话）。 */
export interface LoopResumed {
  type: 'loop_resumed';
  at: string;
  by: 'button' | 'message';
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
  | SandboxAction
  | TurnFailed
  | CloseRequested
  | GuardVerdict
  | TicketEdited
  | LoopEnded
  | AfterLoopStep
  | ProjectGoal
  | TurnContext
  | ChoiceCard
  | RouteDecision
  | ChoiceMade
  | TaskOpened
  | ProjectTitle
  | TalkEnded
  | ConversationPointer
  | ProjectMaterial
  | ProjectDeadline
  | LoopShelved
  | LoopResumed
  | ReminderAdded
  | ReminderClosed;

/** 学习者异议指向什么：守卫的一次判定（学习会话 + 判定所在行），或教法记录 / 状态记录的一条（记录 id）。 */
export type ObjectionTarget =
  | { kind: 'guard_verdict'; loopSessionId: string; line: number }
  | { kind: 'pedagogy' | 'state'; recordId: string };

/**
 * 学习者异议：只追加的一条独立记录，指向原记录，不改原记录（异议按自述来源记录，不覆盖可观察事实）。
 * 存在知识层的异议存放处（不在会话正本里）；对还开着的那次学习里守卫判定的异议则作为带标记的学习者原话进正本。
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
 * 学习者对某段教材原文的报错（转录错、公式错、定位错……）。只追加；先只记录，回资料修订是后续的事（`docs/设计/记录/资料.md`）。
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
