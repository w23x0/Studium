// 模型适配层的接口。核心只认这里；具体框架（Agent SDK、假模型、以后别家）各写一个适配器。
// 对应 03「闭环对话」四个接口：开场交付（systemPrompt + 第一条消息）· 工具（tools）
// · 钩子（工具的 run 由核心实现，如“申请收口”；程序追加事实 = role 为 program 的输入）
// · 交回原文（ModelEvent 里的 raw，由核心逐条记进正本）。
import type { z } from 'zod';
import type { ConversationKind } from '../../shared/records.ts';

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

export interface ConversationSpec {
  /** 系统提示：只写定义、边界、输出格式。 */
  systemPrompt: string;
  /** 本会话能用的工具；写权限靠给什么工具来卡。 */
  tools: ToolSpec[];
  /** 上次的续接凭据（正本里最近一条 model_session），没有就是新开。 */
  resumeToken?: string;
  /** 这个模型对话属于哪个会话（录带、回放用来对上号；适配器不必用）。 */
  session?: { id: string; kind: ConversationKind };
}

/** 一条输入：学习者的话，或程序追加的事实（守卫结论、离开多久等）。 */
export interface TurnInput {
  role: 'learner' | 'program';
  text: string;
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

export interface ModelAdapter {
  /** 适配器名，记进正本（model_raw / model_session 的 adapter 字段）。 */
  readonly name: string;
  open(spec: ConversationSpec): ModelConversation;
}

/** 程序事实在各家模型那里都以一条用户消息送达，用固定标记与学习者的话区分。 */
export function formatProgramFact(text: string): string {
  return `<程序事实>\n${text}\n</程序事实>`;
}
