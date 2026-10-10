// 对话的名字（产出物页、项目概览里列“一起写的对话”用）；新开对话时自动重读。
import type { SessionSummary } from '../../shared/protocol.ts';
import { api } from '../api.ts';
import { useLoad } from './use-load.ts';

export function useSessions(): SessionSummary[] {
  const r = useLoad('sessions', () => api.listSessions());
  return r.data?.sessions ?? [];
}
