// 模型适配层的接口。核心只认这里；具体框架（Agent SDK、假模型、以后别家）各写一个适配器。
// 对应 `docs/设计/会话/学习对话.md` 的四个接口：开场交付（systemPrompt + 第一条消息）· 工具（tools）
// · 钩子（工具的 run 由核心实现，如“申请收口”；程序追加事实 = role 为 program 的输入）
// · 交回原文（ModelEvent 里的 raw，由核心逐条记进正本）。
import type { z } from 'zod';
import type { ConversationKind } from '../../shared/records.ts';
import type { Profiles } from './profiles.ts';

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
 * 学习对话与导航派出的检索子代理用它；模型看到的是虚拟路径（`诊断.md`、`只读/学过的记录/…`）。
 */
export interface SandboxSpec {
  /** 模型可写的工作区（绝对路径）。 */
  workdir: string;
  /** 只读的目录或单个文件；模型看到的是 `只读/<name>/…`。`name` 可含 `/`；以 `.md` 结尾的是单个文件。 */
  readOnly: { name: string; path: string }[];
  /** 默认 false：不给联网。 */
  network: boolean;
}

export interface ConversationSpec {
  /** 系统提示：只写定义、边界、输出格式。 */
  systemPrompt: string;
  /** 本会话能用的工具；写权限靠给什么工具来卡。 */
  tools: ToolSpec[];
  /** 有这一项 = 这个会话在沙盒里跑（通用读写与命令），工具只是沙盒里的两个命令。 */
  sandbox?: SandboxSpec;
  /** 上次的续接凭据（正本里最近一条 model_session），没有就是新开。 */
  resumeToken?: string;
  /** 这个模型对话属于哪个会话（录带、回放用来对上号；适配器不必用）。 */
  session?: { id: string; kind: ConversationKind };
  /** 为真时放开模型服务自带的联网搜索与网页抓取（畅谈、导航）。 */
  webSearch?: boolean;
}

/** 沙盒里的一个动作，程序当场记（不靠模型自报）。`content` 只有写类动作填。 */
export interface SandboxActionEvent {
  kind: 'sandbox_action';
  action: {
    op: 'read' | 'write' | 'run' | 'search' | 'other';
    /** 虚拟路径（工作区里的相对工作区；只读的 `只读/<name>/…`）。 */
    path?: string;
    command?: string;
    /** 一句中文说明（如“读 只读/教学工具/提取练习.md”）。 */
    summary: string;
    ok: boolean;
    /** 写进去的文字（整份写 = 全文；追加 = 追加的部分）。 */
    content?: string;
  };
}

/** 一条输入：学习者的话，或程序追加的事实（守卫结论、离开多久等）。 */
export interface TurnInput {
  role: 'learner' | 'program';
  text: string;
  /** 本轮之前程序从记录重建的开场（主对话每轮新开时用）；不算进 text。 */
  preface?: string;
}

export type ModelEvent =
  /** 流式增量文字，只给界面显示，不进正本。 */
  | { kind: 'text_delta'; text: string }
  /** 一条完整的助手消息（本轮可能有多条）。 */
  | { kind: 'assistant_text'; text: string }
  /** 适配层收到的原始消息，原样进正本。 */
  | { kind: 'raw'; payload: unknown }
  /** 续接凭据（第一次拿到或变化时报一次）。 */
  | { kind: 'session'; token: string }
  /** 本轮实际执行的模型名（不是可变别名）；拿到就报，名字变了再报。 */
  | { kind: 'model'; name: string }
  /** 沙盒里的一个动作（读 / 写 / 跑命令……），程序当场记进正本。 */
  | SandboxActionEvent
  /** 本轮结束。 */
  | { kind: 'turn_end' }
  /** 本轮失败；对话仍可继续。 */
  | { kind: 'turn_error'; reason: string };

export interface ModelConversation {
  /** 发一条输入，流式拿回本轮事件，直到 turn_end 或 turn_error。一次只跑一轮。 */
  send(input: TurnInput): AsyncIterable<ModelEvent>;
  /**
   * 中途插话：本轮还在跑时再交一条输入，模型在本轮下一个停顿处（工具调用之间）看到它，
   * 对它的回应仍从正在跑的 send() 里出来。返回 false 表示本轮已在收尾，调用方改按新一轮发。
   * 适配器不支持就不实现，核心退回排队。
   */
  interject?(input: TurnInput): boolean;
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
  /** 图片转写（学习者拍的手写等，批 4）；适配器做不了就不给，核心如实告诉学习者。 */
  readonly transcriber?: ImageTranscriber;
  open(spec: ConversationSpec): ModelConversation;
}

/** 一张图片：原样的字节与类型。 */
export interface ImageData {
  mime: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
  data: Buffer;
}

export interface TranscribeResult {
  text: string;
  /** 实际执行的模型（不是别名）；取不到就不填，核心写明兜底。 */
  model?: string;
}

/** 把图片转成文字：一问一答、不留对话、不给工具。 */
export interface ImageTranscriber {
  /** 声明要用的模型（外发披露用）；不填 = 服务默认。实际执行的模型看每次结果。 */
  readonly model?: string;
  /** instructions 是系统提示（只写定义、边界、输出格式）。 */
  transcribe(image: ImageData, instructions: string): Promise<TranscribeResult>;
}

/** 程序事实在各家模型那里都以一条用户消息送达，用固定标记与学习者的话区分。 */
export function formatProgramFact(text: string): string {
  return `<程序事实>\n${text}\n</程序事实>`;
}

/**
 * 模型实际看到的一条输入：有 preface 时先给程序事实形式的开场（空一行），再接这条输入本身
 * （程序事实包标记；学习者的话原样）。适配器与假模型都只经这里拼，录带与回放的口径一致。
 */
export function modelText(input: TurnInput): string {
  const preface = input.preface !== undefined ? `${formatProgramFact(input.preface)}\n\n` : '';
  const body = input.role === 'program' ? formatProgramFact(input.text) : input.text;
  return preface + body;
}
