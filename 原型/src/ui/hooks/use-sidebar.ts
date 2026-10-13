// 左栏的数据：左栏操作的现状（置顶 / 藏起来 / 改名，从核心读）与各对话最近的活动时间（从事件流里跟）。
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { SidebarActionRequest, SidebarView } from '../../shared/sidebar.ts';
import { api } from '../api.ts';
import { EMPTY_VIEW } from '../sidebar-model.ts';

/** 左栏操作的现状；loaded 之前是空的。act 记一条操作并换上新的现状。 */
export function useSidebarView(onError: (e: unknown) => void): {
  view: SidebarView;
  loaded: boolean;
  act: (req: SidebarActionRequest) => Promise<void>;
} {
  const [view, setView] = useState<SidebarView>(EMPTY_VIEW);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    api
      .sidebar()
      .then((r) => {
        setView(r.sidebar);
        setLoaded(true);
      })
      .catch(onError);
  }, [onError]);
  const act = useCallback(
    async (req: SidebarActionRequest) => {
      try {
        setView((await api.sidebarAct(req)).sidebar);
      } catch (e) {
        onError(e);
      }
    },
    [onError],
  );
  return { view, loaded, act };
}

// ── 活动时间：一个订阅，左栏与全部项目页共用 ──

/** 这些记录不算学习者看得见的活动（模型原始消息、续接凭据）。 */
const QUIET = new Set(['model_raw', 'model_session']);
let activity: Record<string, string> = {};
const listeners = new Set<() => void>();
let stop: (() => void) | undefined;

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  stop ??= api.events((e) => {
    if (e.type !== 'record' || QUIET.has(e.record.type)) return;
    if ((activity[e.sessionId] ?? '') >= e.record.at) return;
    activity = { ...activity, [e.sessionId]: e.record.at };
    for (const l of listeners) l();
  });
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) {
      stop?.();
      stop = undefined;
    }
  };
}

/** 打开页面以后各对话最近一条记录的时间（对话 id → 时间）。 */
export function useActivity(): Readonly<Record<string, string>> {
  return useSyncExternalStore(subscribe, () => activity);
}
