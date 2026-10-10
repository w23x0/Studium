// 读一份只读视图；相关的记录写进来时（判断、结束、出选项、写记录……）自动重读。
import { useEffect, useState } from 'react';
import type { ServerEvent } from '../../shared/protocol.ts';
import { api } from '../api.ts';

/** 这些记录写进来时，依据面板与项目页上的内容可能变了。 */
const RELOAD_ON = new Set([
  'session_opened',
  'guard_verdict',
  'close_requested',
  'loop_note',
  'loop_ended',
  'after_loop_step',
  'choice_card',
  'choice_made',
  'project_goal',
  'project_title',
  'project_material',
  'project_deadline',
  'tool_call',
  'user_message',
  // 学到一半（批 5）：通知、小卡、选了什么、岔出去的回来、先放一放 / 接着学、没学完的记录
  'route_signal',
  'detour_card',
  'detour_made',
  'fork_returned',
  'loop_shelved',
  'loop_resumed',
  'parking_note',
  // 跨段学习的长期功能（批 6）：提醒加上 / 办掉；复盘交回、开出复盘
  'reminder_added',
  'reminder_closed',
  'talk_ended',
  'task_opened',
]);

function relevant(e: ServerEvent): boolean {
  return e.type === 'record' && RELOAD_ON.has(e.record.type);
}

const localBumps = new Set<() => void>();

/** 界面自己写了不进正本记录的东西（如存产出物、登记文献）：让读着的视图都重读一次。 */
export function bumpLive(): void {
  for (const f of [...localBumps]) f();
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
    const bump = () => setTick((t) => t + 1);
    localBumps.add(bump);
    return () => {
      if (timer !== undefined) clearTimeout(timer);
      localBumps.delete(bump);
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
