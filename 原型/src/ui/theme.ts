// 浅色 / 深色 / 跟系统：只存在这台浏览器里（localStorage）。<html> 上标 data-theme（选了浅或深时）与 .dark（实际是深色时），
// styles.css 按它取颜色；学习页的组件小窗也按实际深浅给底色（component-frame.tsx）。
import { useCallback, useSyncExternalStore } from 'react';

export type Theme = 'system' | 'light' | 'dark';

const KEY = 'studium-theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');
const listeners = new Set<() => void>();

function stored(): Theme {
  const v = localStorage.getItem(KEY);
  return v === 'light' || v === 'dark' ? v : 'system';
}

function isDark(): boolean {
  const t = stored();
  return t === 'dark' || (t === 'system' && media.matches);
}

function apply(): void {
  const t = stored();
  const root = document.documentElement;
  if (t === 'system') delete root.dataset.theme;
  else root.dataset.theme = t;
  root.classList.toggle('dark', isDark());
  for (const fn of listeners) fn();
}

/** 页面一打开就照存的设定标好（在画界面之前，免得先闪一下另一种颜色）；系统深浅变了、别的标签页改了都跟着变。 */
export function initTheme(): void {
  apply();
  media.addEventListener('change', apply);
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) apply();
  });
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** 选的是哪种，和改它的函数。 */
export function useTheme(): [Theme, (t: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, stored);
  const set = useCallback((t: Theme) => {
    if (t === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
    apply();
  }, []);
  return [theme, set];
}

/** 现在实际是不是深色。 */
export function useDark(): boolean {
  return useSyncExternalStore(subscribe, isDark);
}
