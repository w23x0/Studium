// 读一份只读视图；相关的记录写进来时（收尾、结束、讨论串变化……）自动重读。
import { useEffect, useState } from 'react';
import type { ServerEvent } from '../../shared/protocol.ts';
import { api } from '../api.ts';

/** 这些记录写进来时，依据面板与学过的记录上的内容可能变了（只列现在还会写进来的种类）。 */
const RELOAD_ON = new Set([
  'session_opened',
  'close_requested',
  'loop_ended',
  'after_loop_step',
  'project_title',
  'project_material',
  'tool_call',
  // 沙盒动作：读了教学工具时，依据面板的“这次用过的教学工具”要重读
  'sandbox_action',
  'user_message',
  // 学到一半：接着学（旧数据里搁置着的）
  'loop_resumed',
  // 讨论串结束 / 重开 / 改名 / 开出
  'thread_closed',
  'thread_reopened',
  'thread_title',
  'task_opened',
  // 上传分流、改判；项目说明
  'upload_routed',
  'project_instructions',
]);

function relevant(e: ServerEvent): boolean {
  return e.type === 'record' && RELOAD_ON.has(e.record.type);
}

/** 相关记录到来时变一次的计数（攒半秒，避免一串记录连着重读）。 */
export function useLiveTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = api.events((e) => {
      if (!relevant(e)) return;
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(() => setTick((t) => t + 1), 500);
    });
    return () => {
      if (timer !== undefined) clearTimeout(timer);
      stop();
    };
  }, []);
  return tick;
}

export interface Loaded<T> {
  data?: T | undefined;
  error?: string | undefined;
  reload: () => void;
}

/** key 变了就重读；live 为真时相关记录到来也重读。 */
export function useLoad<T>(key: string, load: () => Promise<T>, live = true): Loaded<T> {
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>({ key });
  const [bump, setBump] = useState(0);
  const tick = useLiveTick();
  const liveTick = live ? tick : 0;
  useEffect(() => {
    let alive = true;
    load()
      .then((data) => {
        if (alive) setState({ key, data });
      })
      .catch((e: unknown) => {
        if (alive) setState({ key, error: e instanceof Error ? e.message : String(e) });
      });
    return () => {
      alive = false;
    };
    // load 每次渲染都是新函数，不放进依赖；读什么由 key 决定
  }, [key, bump, liveTick]);
  // 换了 key 还没读回来时不显示上一份
  const same = state.key === key;
  return {
    data: same ? state.data : undefined,
    error: same ? state.error : undefined,
    reload: () => setBump((b) => b + 1),
  };
}
