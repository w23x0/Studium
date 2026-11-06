// 模型适配层的接口。核心只认这里；具体框架（Agent SDK、假模型、以后别家）各写一个适配器。
// 对应 `docs/设计/会话/学习对话.md` 的四个接口：开场交付（systemPrompt + 第一条消息）· 工具（tools）
// · 钩子（工具的 run 由核心实现，如“申请收口”；程序追加事实 = role 为 program 的输入）
// · 交回原文（ModelEvent 里的 raw，由核心逐条记进正本）。
import type { z } from 'zod';
import type { ConversationKind } from '../../shared/records.ts';
import type { QuotaWindow, TokenParts } from '../../shared/usage.ts';
import type { ProfileKey, Profiles } from './profiles.ts';

export interface ToolResult {
  text: string;
  /** 为真时，模型看到的是一条工具报错（参数不对、查无此物等）。 */
  isError?: boolean;
}

export interface ToolSpec {
  /** 工具名：只用字母、数字、下划线（各家框架都认）。 */
  name: string;
  description: string;
  input: z.ZodRawShape;
  run(args: Record<string, unknown>): Promise<ToolResult>;
}

/**
 * 一个会话的沙盒：能读写哪些数据、能否联网，由程序在执行环境里写死（记录/读写权限.md「执行方式」）。
 * 学习对话与导入会话用它；模型看到的是虚拟路径（`笔记.md`、`只读/学过的记录/…`）。
 */
export interface SandboxSpec {
  /** 模型可写的工作区（绝对路径）。 */
  workdir: string;
  /**
   * 只读的目录或单个文件；模型看到的是 `只读/<name>/…`。`name` 可含 `/`；以 `.md` 结尾的是单个文件。
   * `name` 为空串 = 整个 `只读/`（学习对话把只读区按虚拟路径原样摆在一个目录里，W16）；别的条目按最长前缀优先。
   */
  readOnly: { name: string; path: string }[];
  /** 默认 false：不给联网。 */
  network: boolean;
  /** 默认 true：给跑命令（Bash）。 */
  commands?: boolean;
  /** 挡掉不让读的（绝对路径；在只读区里也挡）：存密钥的位置、数据目录等（W11 §5）。工作区除外。 */
  denyRead?: string[];
}

export interface ConversationSpec {
  model?: string;
  effort?: string;
  /** 系统提示：只写定义、边界、输出格式。 */
  systemPrompt: string;
  /** 本会话能用的工具；写权限靠给什么工具来卡。 */
  tools: ToolSpec[];
  /** 有这一项 = 这个会话在沙盒里跑（通用读写与命令），工具只是沙盒里的两个命令。 */
  sandbox?: SandboxSpec;
  /** 上次的续接凭据（正本里最近一条 model_session），没有就是新开。 */
  resumeToken?: string;
  /** 为真时从 resumeToken 分叉：分出来的不写回原来那条线（W11 §6 问别的项目的主对话）。 */
  fork?: boolean;
  /** 这个模型对话属于哪个会话（录带、回放用来对上号；适配器不必用）。 */
  session?: { id: string; kind: ConversationKind };
  /** 为真时放开模型服务自带的联网搜索与网页抓取（学习对话；W12 起可与沙盒同时有）。 */
  webSearch?: boolean;
  /** 按哪一项配模型与强度；不给 = 按 `session.kind`。 */
  profile?: ProfileKey;
  /** 一次性的（问别的项目的主对话）：不留续接用的会话文件。 */
  ephemeral?: boolean;
}

/** 沙盒里的一个动作，程序当场记（不靠模型自报）。`content` 只有写类动作填。 */
export interface SandboxActionEvent {
  kind: 'sandbox_action';
  action: {
    op: 'read' | 'write' | 'run' | 'search' | 'other';
    /** 虚拟路径（工作区里的相对工作区；只读的 `只读/<name>/…`）。 */
    path?: string;
    command?: string;
    /** 一句中文说明（如“读 只读/本次对话.md”）。 */
    summary: string;
    ok: boolean;
    /** 写进去的文字（整份写 = 全文；追加 = 追加的部分）。 */
    content?: string;
  };
}

/** 一条输入：学习者的话与动作、程序追加的事实，或别的会话发来的话（peer，W12 §3.1：不包程序事实标记）。 */
export interface TurnInput {
  role: 'learner' | 'program' | 'peer';
  text: string;
  /** 本轮之前程序从记录重建的开场（主对话每轮新开时用）；不算进 text。 */
  preface?: string;
  /**
   * 为真时不包“程序事实”标记：学习对话按时间线排，每条前面带行号与时间、自己说清是什么
   * （会话/学习对话.md §3「上下文里的身份与时间线」）。
   */
  plain?: boolean;
  /** 学习者附的图片（W12 §5.6）：原样随这条输入送给模型；看不了图的模型按 text 里写的沙盒路径自己打开。 */
  images?: ImageData[];
}

export type ModelEvent =
  /** 流式增量文字，只给界面显示，不进正本。 */
  | { kind: 'text_delta'; text: string }
  /** 正在流出来的思考概要：只推给界面（成块后在 raw 里记）。 */
  | { kind: 'thinking_delta'; text: string }
  /** 一条完整的助手消息（本轮可能有多条）；interim 有值时使用服务明确给出的阶段。 */
  | { kind: 'assistant_text'; text: string; interim?: boolean }
  /** 适配层收到的原始消息，原样进正本。 */
  | { kind: 'raw'; payload: unknown }
  /** 续接凭据（第一次拿到或变化时报一次）。 */
  | { kind: 'session'; token: string }
  /** 本轮实际执行的模型名（不是可变别名）；拿到就报，名字变了再报。 */
  | { kind: 'model'; name: string }
  /** 沙盒里的一个动作（读 / 写 / 跑命令……），程序当场记进正本。 */
  | SandboxActionEvent
  /** 主模型开始调一个工具（W12 §4.5 正在做什么）：工具名与参数，只给界面显示一行，不进正本。 */
  | { kind: 'activity'; tool: string; input: Record<string, unknown> }
  /** 一轮跑完时主模型上下文多大（最后一次回话的 input + 缓存读 + 缓存写）与这一轮输出了多少（token）。 */
  | { kind: 'usage'; context: number; output: number; parts?: TokenParts; limit?: number }
  /** 本轮结束。 */
  | { kind: 'turn_end' }
  /** 本轮失败；对话仍可继续。notice = 服务交回的报错原句（不是模型的话，不当 assistant_text 交）。 */
  | { kind: 'turn_error'; reason: string; notice?: string };

export interface ModelConversation {
  /** 发一条输入，流式拿回本轮事件，直到 turn_end 或 turn_error。一次只跑一轮。 */
  send(input: TurnInput): AsyncIterable<ModelEvent>;
  /**
   * 学习者点了停止（W12 §4.4）：中断正在跑的这一轮，send() 的事件流随之结束；对话之后还能接着发。
   * 适配器不支持就不实现，核心改为关掉对话、下一轮按续接凭据接上。
   */
  interrupt?(): Promise<void>;
  /**
   * 接住不是 send() 引起的事：`side` 是不属于哪一轮的事件（续接凭据、模型名、用量）；`unprompted` 是
   * 模型自己起的一轮（主模型空着时框架自己接着跑一轮），
   * 交来这一轮的事件流，直到 turn_end 或 turn_error。适配器不支持就不实现。
   */
  listen?(handlers: {
    side(ev: ModelEvent): void;
    unprompted(events: AsyncIterable<ModelEvent>): void;
  }): void;
  close(): Promise<void>;
}

/** 这个适配器把内容送往哪个服务（外发披露，给界面看）。 */
export interface ModelDisclosure {
  /** 内容送往的服务，如“Anthropic 的 Claude”。 */
  service: string;
  /** 经什么通道，如“本机的 Claude 订阅”。 */
  route: string;
  /** 没按会话类单独配时用的模型；不填 = 服务默认。 */
  defaultModel?: string;
  /** 按会话类配的模型与强度（来自 profiles.ts）。 */
  profiles: Profiles;
}

export interface ModelAdapter {
  /** 适配器名，记进正本（model_raw / model_session 的 adapter 字段）。 */
  readonly name: string;
  /** 内容送往哪个服务；没有就是不外发（或还没声明）。 */
  readonly disclosure?: ModelDisclosure;
  /** 在轮开始时取一次，整个轮固定使用这个适配器和配置。 */
  selection?(
    sessionId: string,
    kind: ConversationKind,
  ): {
    adapter: ModelAdapter;
    key: string;
    connection?: string;
    model?: string;
    effort?: string;
  };
  open(spec: ConversationSpec): ModelConversation;
  /**
   * 订阅额度各窗口（W14 §3）：有活着的模型对话就问一次，再交回最后一次拿到的值（只在内存里）；
   * 一次都没拿到 = undefined。只有走订阅额度的适配器实现，别家不实现（界面就不显示额度）。
   */
  quota?(): Promise<QuotaSnapshot | undefined>;
}

/** 最后一次拿到的额度与拿到的时间（ISO）。 */
export interface QuotaSnapshot {
  windows: QuotaWindow[];
  at: string;
}

/** 一张图片：原样的字节与类型。 */
export interface ImageData {
  mime: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
  data: Buffer;
}

/** 程序事实在各家模型那里都以一条用户消息送达，用固定标记与学习者的话区分。 */
export function formatProgramFact(text: string): string {
  return `<程序事实>\n${text}\n</程序事实>`;
}

/**
 * 模型实际看到的一条输入：有 preface 时先给开场（空一行），再接这条输入本身
 * （程序事实包标记，plain 时不包；学习者的话原样）。适配器与假模型都只经这里拼，录带与回放的口径一致。
 */
export function modelText(input: TurnInput): string {
  const wrap = (t: string) => (input.plain === true ? t : formatProgramFact(t));
  const preface = input.preface !== undefined ? `${wrap(input.preface)}\n\n` : '';
  const body = input.role === 'program' ? wrap(input.text) : input.text;
  return preface + body;
}
