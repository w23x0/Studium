// 核心与界面之间的 HTTP / SSE 协议。界面只认这里的类型，不碰核心实现。
import type { ConversationKind, NumberedRecord } from './records.ts';

export interface SessionSummary {
  sessionId: string;
  kind: ConversationKind;
  title: string;
  openedAt: string;
  parent?: string;
}

export interface CreateSessionResponse {
  session: SessionSummary;
}

export interface ProjectResponse {
  mainSessionId: string;
}

export interface ChooseRequest {
  option: number;
}

export interface ChooseResponse {
  loopSessionId: string;
}

export interface ListSessionsResponse {
  sessions: SessionSummary[];
}

export interface RecordsResponse {
  records: NumberedRecord[];
  running: boolean;
}

export interface SendMessageRequest {
  text: string;
}

export interface SearchResponse {
  hits: { sessionId: string; line: number; text: string }[];
}

export interface ErrorResponse {
  error: string;
}

/** SSE 推给界面的事件。 */
export type ServerEvent =
  | { type: 'record'; sessionId: string; line: number; record: NumberedRecord['record'] }
  | { type: 'delta'; sessionId: string; text: string }
  | { type: 'running'; sessionId: string; running: boolean };

export const API_PREFIX = '/api';
