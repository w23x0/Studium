// 只存在这台浏览器里的界面设置（localStorage）：左栏收起、开发者模式、讨论串开着没有。各处读同一份，改了立刻都变。
import { useCallback, useSyncExternalStore } from 'react';

const KEYS = {
  sidebarCollapsed: 'studium-sidebar-collapsed',
  devMode: 'studium-dev-mode',
  threadsOpen: 'studium-threads-open',
} as const;

export type SettingName = keyof typeof KEYS;

// 开发者模式默认关（界面说明 §2.11）：学习者第一次打开不看到开发用的面板入口
const DEFAULTS: Record<SettingName, boolean> = {
  sidebarCollapsed: false,
  devMode: false,
  threadsOpen: true,
};

const listeners = new Set<() => void>();

function read(name: SettingName): boolean {
  const v = localStorage.getItem(KEYS[name]);
  return v === null ? DEFAULTS[name] : v === '1';
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  // 别的标签页改了也跟着变
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && (Object.values(KEYS) as string[]).includes(e.key)) fn();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener('storage', onStorage);
  };
}

/** 读一项设置并拿到改它的函数。 */
export function useSetting(name: SettingName): [boolean, (v: boolean) => void] {
  const value = useSyncExternalStore(subscribe, () => read(name));
  const set = useCallback(
    (v: boolean) => {
      localStorage.setItem(KEYS[name], v ? '1' : '0');
      for (const fn of listeners) fn();
    },
    [name],
  );
  return [value, set];
}
