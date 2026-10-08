// 模型适配层的接口。核心只认这里；具体框架（Agent SDK、假模型、以后别家）各写一个适配器。
// 对应 03「闭环对话」四个接口：开场交付（systemPrompt + opening）· 工具（tools，后续里程碑）
// · 钩子（后续里程碑）· 交回原文（ModelEvent 里的 raw，由核心逐条记进正本）。

export interface ConversationSpec {
  /** 系统提示：只写定义、边界、输出格式。 */
  systemPrompt: string;
  /** 上次的续接凭据（正本里最近一条 model_session），没有就是新开。 */
  resumeToken?: string;
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
  /** 发一条学习者消息，流式拿回本轮事件，直到 turn_end 或 turn_error。一次只跑一轮。 */
  send(text: string): AsyncIterable<ModelEvent>;
  close(): Promise<void>;
}

export interface ModelAdapter {
  /** 适配器名，记进正本（model_raw / model_session 的 adapter 字段）。 */
  readonly name: string;
  open(spec: ConversationSpec): ModelConversation;
}
