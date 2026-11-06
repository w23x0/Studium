import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api.ts';

/** 打开时读一次；只在设置变了、实际模型变了时再读（11-06 去掉切回页面、每轮开始结束的刷新）；旧请求不能盖掉较新的选择。 */
export function useModelSettings<T>(
  read: () => Promise<T>,
  sessionId?: string,
): { data: T | undefined; error: string; reload: () => Promise<void> } {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const current = ++generation.current;
    try {
      const next = await read();
      if (current === generation.current) {
        setData(next);
        setError('');
      }
    } catch (e) {
      if (current === generation.current) setError(e instanceof Error ? e.message : String(e));
    }
  }, [read]);
  useEffect(() => {
    void reload();
    const refresh = () => {
      void reload();
    };
    const unsubscribe = api.events((e) => {
      if (e.type === 'model_settings' && (e.sessionId === '' || e.sessionId === sessionId))
        refresh();
      if (e.type === 'record' && e.sessionId === sessionId && e.record.type === 'model_used') {
        refresh();
      }
    });
    return () => {
      generation.current++;
      unsubscribe();
    };
  }, [reload, sessionId]);
  return { data, error, reload };
}
