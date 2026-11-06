// 会话正本（JSONL）里每一行的形状。正本只追加、永不改写：行号就是引用地址（等于文件行号）。
// 加新类型只能加，不改旧类型的字段含义。磁盘上还有早就不再产生的类型（旧数据，文件不动）：读到不认识的类型跳过，不报错。
import type { TokenParts } from './usage.ts';

/** main 主对话 · loop 一次学习的对话 · import 导入处理。程序只认这三种；磁盘上别的种类是旧数据，不进索引、界面不列。 */
export const CONVERSATION_KINDS = ['main', 'loop', 'import'] as const;
export type ConversationKind = (typeof CONVERSATION_KINDS)[number];

export interface SessionOpened {
  type: 'session_opened';
  at: string;
  sessionId: string;
  kind: ConversationKind;
  title: string;
  /** 从哪个会话开出来的（学习对话、导入会话 → 主对话）。 */
  parent?: string;
  /** 挂在父会话的哪一行下（讨论串 → 主对话里那条学习者消息）。 */
  anchorLine?: number;
  /** 竖流学习页：页面从正本放一遍算出来（src/shared/stream-page.ts）；W12 起新开的都是。没有 = 更早的学习，只读。 */
  page?: 'stream';
}

export interface UserMessage {
  type: 'user_message';
  at: string;
  text: string;
  /** 旧数据（区域图学习页）：学习者回在某一块下面的，对话原文里写明回在哪一块。 */
  replyTo?: { pointer: string };
  /** 竖流学习页（11-05 起，#92）：学习者选中的几处，按选的先后。 */
  quotes?: MessageQuote[];
}

/** 学习者选中的页面上的一处：某一行里的一段原文，或一个组件（组件名 = 主模型起的名字）。 */
export interface MessageQuote {
  line?: number;
  text?: string;
  component?: string;
  /** 选中那段前后各几个字（11-05 起，#92）：同一行里同样的字出现几次时，靠它认是哪一处。 */
  before?: string;
  after?: string;
}

export interface AssistantMessage {
  type: 'assistant_message';
  at: string;
  text: string;
}

/** 程序追加给模型的事实（一次学习结束了等）；不是学习者说的话。 */
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

/**
 * 沙盒里的一个动作（读 / 写 / 跑命令……），由程序当场记（记录/对话与事件记录.md §3），不靠模型自报。
 * `path` 是虚拟路径。
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
  /** API 服务标识；旧记录未填表示账号登录通道。 */
  connection?: string;
  type: 'model_session';
  at: string;
  adapter: string;
  token: string;
}

/**
 * 打开模型侧会话时实际给的系统提示词与我们的工具（11-03：导出上下文时要看到当时的版本，提示词文件会改）；
 * 和上一条一样就不再记。内置工具（读写、命令、联网）的定义在 SDK 里，只记名字。
 */
export interface ContextOpened {
  type: 'context_opened';
  at: string;
  systemPrompt: string;
  tools: { name: string; description: string }[];
  builtins: string[];
  subagents: { name: string; description: string; prompt: string }[];
}

/** 模型侧报告的实际执行模型名（不是别名、不是适配器名）；名字变了才追加一条。 */
export interface ModelUsed {
  connection?: string;
  /** 本轮采用的配置；用于重启后判断对话栏的待生效选择。 */
  selection?: { model?: string; effort?: string };
  type: 'model_used';
  at: string;
  adapter: string;
  model: string;
}

export interface TurnFailed {
  type: 'turn_failed';
  at: string;
  reason: string;
  /**
   * 模型服务交回的报错原句（如额度用完时 SDK 把“You've hit your session limit…”当一条助手消息交回）。
   * 它不是模型说的话：只记在这里，不记成 assistant_message。
   */
  notice?: string;
}

/** 旧数据：一次学习结束（W19 起学习对话结束记 thread_closed）；读时算已结束。 */
export interface LoopEnded {
  type: 'loop_ended';
  at: string;
}

/** 旧数据：区域图学习页的子代理交回的话，是当时对话原文的一部分。 */
export interface SubagentResult {
  type: 'subagent_result';
  at: string;
  text: string;
}

/** 方向目标的一块：学成后能做什么、为什么学、学习者确认时自己给的理由。 */
export interface GoalAbility {
  ability: string;
  reason: string;
  confirmedReason?: string;
}

/**
 * 旧数据（W20 起不再写）：谈方向交回时写在主对话里的方向目标。里面有学习者的长期想法，模型还要读（`core/goal.ts`）。
 */
export interface ProjectGoal {
  type: 'project_goal';
  at: string;
  /** 方向目标一句话。 */
  text: string;
  /** 方向目标短名。 */
  title?: string;
  /** 目标能力与每块理由。 */
  abilities?: GoalAbility[];
  /** 顺序参考，只作参考。 */
  orderHint?: string;
  /** 冷启动临时版；只在 true 时带。 */
  provisional?: boolean;
}

/** 本轮附在输入前的当前事实（主对话每轮从记录给），可回查。 */
export interface TurnContext {
  type: 'turn_context';
  at: string;
  /** 这条事实是附在哪条输入前的（主对话里那条输入的行号）。 */
  forLine: number;
  text: string;
}

/** 主对话开出一个讨论串，挂在某条学习者消息下（`docs/设计/会话/主对话.md`）。 */
export interface TaskOpened {
  type: 'task_opened';
  at: string;
  sessionId: string;
  kind: ConversationKind;
  title: string;
  /** 挂在主对话的哪一行下。 */
  anchorLine: number;
}

/** 项目名。会话开头的名字不改，界面与列表取最新一条。 */
export interface ProjectTitle {
  type: 'project_title';
  at: string;
  title: string;
  /** learner = 学习者在界面上改的名（左栏“重命名”）；goal = 旧数据：谈定方向时一起定的。 */
  source: 'goal' | 'learner';
}

/** 讨论串结束 / 重开（照 Claude 项目的讨论串：结束只是收起，再说话就重开）。 */
export interface ThreadClosed {
  type: 'thread_closed';
  at: string;
  /** main = 主对话结束的；self = 讨论串自己结束的（W12 §3.3）；learner = 学习者在讨论串栏点的（W19）。 */
  by: 'main' | 'self' | 'learner';
  reason: string;
}

export interface ThreadReopened {
  type: 'thread_reopened';
  at: string;
  /** learner = 学习者在已结束的讨论串里又说话；main = 主对话传话或按学习者的话重开。 */
  by: 'learner' | 'main';
  reason?: string;
}

/** 讨论串自己起的总结标题（谈的东西变了再起一条）；开头那行的名字不改，界面取最新一条。 */
export interface ThreadTitle {
  type: 'thread_title';
  at: string;
  title: string;
}

/**
 * 项目加 / 去掉一份资料（只作记录）。W11 起本项目能读什么按资料的归属算（`<数据>/资料/<id>/source.json`），
 * 不再折叠这些记录；删 = 资料标删，各项目都读不到。
 */
export interface ProjectMaterial {
  type: 'project_material';
  at: string;
  op: 'add' | 'remove';
  /** 资料 id（项目资料区里的一份，工单 W8）。 */
  material?: string;
}

/**
 * 上传的一份分到了哪边（工单 W9 §4.2）：程序先按扩展名粗分，拿不准的交模型判一次；学习者改判再记一条，
 * 以最后一条为准。记在项目主对话里。
 */
export interface UploadRouted {
  type: 'upload_routed';
  at: string;
  upload: string;
  /** 上传里的相对路径（整个笔记文件夹 = 文件夹名）。 */
  file: string;
  routedTo: '资料' | '学过的';
  by: 'model' | 'learner';
  reason?: string;
  /** 归属（W11）：分流时模型顺带判的；改归属另记 material_owner。旧行没有。 */
  owner?: '学习者' | '项目';
  /** 落到了哪：资料 id / 外部导入 id；落不下写原因。 */
  material?: string;
  import?: string;
  problem?: string;
}

/** 项目说明（记录/项目说明.md）：每次改动存一版，当前值 = 最后一条。记在项目主对话里。 */
export interface ProjectInstructions {
  type: 'project_instructions';
  at: string;
  text: string;
  by: 'learner' | 'main';
  /** 主对话代写时：学习者那句话所在行。 */
  forLine?: number;
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
  | ContextOpened
  | SandboxAction
  | TurnFailed
  | LoopEnded
  | SubagentResult
  | ProjectGoal
  | TurnContext
  | TaskOpened
  | ProjectTitle
  | ThreadClosed
  | ThreadReopened
  | ThreadTitle
  | ProjectMaterial
  | UploadRouted
  | ProjectInstructions
  | ComponentVersion
  | ComponentAction
  | ComponentError
  | ContextUsed
  | MaterialOwnerChanged
  | ProjectAsked
  | ThreadMessage
  | ThreadDeleted
  | TurnStopped
  | MessageEdited
  | MessageReaction
  | CrossNote
  | MessageTidied;

// ───────────── W12：一个对话一个模型（发话、删除、停止与编辑、表情） ─────────────

/**
 * 别的会话发来的一句话（W12 §3.1，照 Claude 讨论串的 wake）：记在收话的会话里，交给它的模型时写明谁发的、什么时候。
 * cited = 附上的学习者原话（程序照抄，标成学习者的原话）；reply = 这是对方回它先前发去的话（再回就不转回去）。
 */
export interface ThreadMessage {
  type: 'thread_message';
  at: string;
  /** 发话的会话 id。 */
  from: string;
  text: string;
  cited?: { session: string; line: number; at: string; text: string }[];
  reply?: true;
  /**
   * 程序附给模型、不算对话原文的内容（W14 §1.2：开场的沙盒说明、项目说明、跨次记录、上次学习的原文）。
   * 发给模型时接在 text 和 cited 后面；对话原文（renderTranscript）、给人和别的对话看的地方都不带，免得一层套一层。
   * 旧记录没有这一项，程序附的小段在 text 里，照旧。
   */
  attached?: string;
}

/**
 * 学习者删了一个讨论串（W12 §4.3）：记在主对话里，只追加；之后界面不显示、别的会话读不到、学过的记录与沙盒里
 * 不再包含。被删的会话正本留着。
 */
export interface ThreadDeleted {
  type: 'thread_deleted';
  at: string;
  session: string;
  /** 删时的标题（主对话上下文里那一句用）。 */
  title: string;
}

/** 学习者在生成中途点了停止（W12 §4.4）：这一轮断开；下一轮交给模型时前面接一句。 */
export interface TurnStopped {
  type: 'turn_stopped';
  at: string;
}

/**
 * 改了一条话（W12 §4.4）：learner = 学习者停下后改自己刚发的那句（界面只显示改后的，改前那句之后的回答不再显示）；
 * model = 主对话改自己上一条说的话（照 Claude 的 edit_message）。原来那行不动。
 */
export interface MessageEdited {
  type: 'message_edited';
  at: string;
  /** 改的是哪一行。 */
  line: number;
  text: string;
  by: 'learner' | 'model';
}

/** 主对话对学习者一句话回了一个表情、没有说话（W12 §3.2，照 Claude 的 react）。 */
export interface MessageReaction {
  type: 'message_reaction';
  at: string;
  line: number;
  emoji: string;
}

/** 一份资料的归属改了（W11，记录/资料.md「存在一处、按归属读」）：记在发起改动的主对话里，同时写 source.json。 */
export interface MaterialOwnerChanged {
  type: 'material_owner';
  at: string;
  material: string;
  owner: { kind: 'learner' } | { kind: 'project'; projects: string[] };
  by: 'model' | 'learner';
}

/**
 * 别的会话来问这个项目的主对话（W11 §6，试验）：从主对话分叉答一次，分叉不接回主对话的线；
 * 记在被问的主对话里，只作记录，不进它的上下文。
 */
export interface ProjectAsked {
  type: 'project_asked';
  at: string;
  /** 来问的会话 id。 */
  from: string;
  question: string;
  answer: string;
}

/** 一轮跑完时主模型上下文有多大（10-29 起，所有会话；只记、不显示）：最后一次回话的 input + 缓存读 + 缓存写。 */
export interface ContextUsed {
  /** 服务报告的上下文上限；旧记录或未报告时省略。 */
  limit?: number;
  type: 'context_used';
  at: string;
  /** 上下文大小（token）。 */
  tokens: number;
  /** 这一轮主模型输出了多少（token，各次回话相加）。 */
  output: number;
  /** 适配器已归一的本轮用量；旧记录没有时仍从 Claude 原始消息计算输入与缓存。 */
  parts?: TokenParts;
}

// ───────────── 学习页的组件（块与清单的形状在 screen.ts）─────────────

/** 组件换了一版：框架查过（试跑过没有见 trialed）。内容在 `<数据>/screens/<学习 id>/`。 */
export interface ComponentVersion {
  type: 'component_version';
  at: string;
  /** 组件的名字。 */
  component: string;
  version: number;
  manifest: string;
  /** 这个组件是什么（一句话）。 */
  pointer: string;
  trialed: boolean;
}

/** 学习者在组件上的一个操作（组件发出的一句看得懂的话）；身份是学习者。 */
export interface ComponentAction {
  type: 'component_action';
  at: string;
  component: string;
  text: string;
  awaited: boolean;
  /** 组件更新的“现在的状态”（竖流学习页，照 MCP Apps 的 update-model-context）：只留最后一次，下次学习者说话时带上。 */
  state?: true;
}

/** 组件在学习者那边运行时报错（上屏后、学习者碰到时才出的）。 */
export interface ComponentError {
  type: 'component_error';
  at: string;
  component: string;
  version: number;
  message: string;
}

/** 带行号的记录；行号从 1 开始，等于 JSONL 文件里的行。 */
export interface NumberedRecord {
  line: number;
  record: LogRecord;
}

// ───────────── W13：跨次记录（#83，试验中） ─────────────

/**
 * 跨次记录的一条（W13）：对话当场记下的事实——学到哪（progress，只有学习对话记）、学习者说过的长期的话
 * （learner，照原话），或撤回一条（withdraw）。记在写它的那个会话的正本里，编号 = `会话 id:L行号`；
 * 只追加，改主意 / 撤回都是新记一条、用 replaces 指旧的。对学习者的判断不记，读的一方按出处读原文。
 */
export interface CrossNote {
  type: 'cross_note';
  at: string;
  kind: 'progress' | 'learner' | 'withdraw';
  /** progress：这次的边界、停在哪、留下没讲的；learner：当时在说什么；withdraw：学习者怎么说的。 */
  text: string;
  /** learner：学习者原话里的一段（程序核对它出现在 lines 里学习者那句话中）。 */
  quote?: string;
  /** 出处：本会话正本里的行号。 */
  lines: number[];
  /** 谁读得到：project = 本项目；learner = 学习者的所有项目（学习者明说以后都这样才用）。 */
  scope: 'project' | 'learner';
  /** 被替换 / 撤回的那条（`会话 id:L行号`）。 */
  replaces?: string;
}

// ───────────── W17：整理学习者的话（#91，试验中） ─────────────

/**
 * 学习对话对学习者一行话的整理（W17）：改转写错词、分开几件事、改口后的结论，只写他说了什么，不写判断。
 * 原话不动、照旧是证据；同一行再整理以后写的为准。记在学习对话自己的正本里。
 */
export interface MessageTidied {
  type: 'message_tidied';
  at: string;
  /** 学习者那句话在本会话正本里的行号。 */
  line: number;
  text: string;
}
