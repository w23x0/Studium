// 版式的共用状态：窄屏（< 768px）时左栏变抽屉、右侧面板盖满全屏（界面说明 §1.5）。
import { createContext, useContext, useSyncExternalStore } from 'react';

const NARROW = '(max-width: 767px)';

function subscribe(fn: () => void): () => void {
  const m = window.matchMedia(NARROW);
  m.addEventListener('change', fn);
  return () => m.removeEventListener('change', fn);
}

/** 现在是不是窄屏。 */
export function useNarrow(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(NARROW).matches);
}

export interface Layout {
  narrow: boolean;
  /** 窄屏时打开左栏抽屉。 */
  openNav: () => void;
}

export const LayoutContext = createContext<Layout>({ narrow: false, openNav: () => undefined });

export function useLayout(): Layout {
  return useContext(LayoutContext);
}
