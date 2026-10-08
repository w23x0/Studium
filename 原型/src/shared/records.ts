// 会话正本（JSONL）里每一行的形状。正本只追加、永不改写：行号就是引用地址。
// 加新类型只能加，不改旧类型的字段含义；读到不认识的类型要原样保留。

export type ConversationKind = 'main';

export interface SessionOpened {
  type: 'session_opened';
  at: string;
  sessionId: string;
  kind: ConversationKind;
  title: string;
}

export interface UserMessage {
  type: 'user_message';
  at: string;
  text: string;
}

export interface AssistantMessage {
  type: 'assistant_message';
  at: string;
  text: string;
}

/** 模型适配层吐出的原始消息，逐条原样（含思考块）；交回的对话原文由我们据此自己记。 */
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

export interface TurnFailed {
  type: 'turn_failed';
  at: string;
  reason: string;
}

export type LogRecord =
  SessionOpened | UserMessage | AssistantMessage | ModelRaw | ModelSession | TurnFailed;

/** 带行号的记录；行号从 1 开始，等于 JSONL 文件里的行。 */
export interface NumberedRecord {
  line: number;
  record: LogRecord;
}
