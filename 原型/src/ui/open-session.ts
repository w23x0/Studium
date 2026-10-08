// 界面里“去另一个对话”的入口：消息里的链接经它切换当前对话。
import { createContext, useContext } from 'react';

export const OpenSessionContext = createContext<(sessionId: string) => void>(() => undefined);

export function useOpenSession(): (sessionId: string) => void {
  return useContext(OpenSessionContext);
}
