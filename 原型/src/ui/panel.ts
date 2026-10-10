// 右侧依据面板与对话高亮的共用入口：消息、项目页、面板里的链接经它打开面板、跳到对话某句。
import { createContext, useContext } from 'react';

/** 面板里能看的东西。 */
export type PanelTarget =
  | { kind: 'home' }
  | { kind: 'loop'; loopId: string; verdictLine?: number }
  | { kind: 'card'; cardId: string; option?: number }
  | { kind: 'point'; id: string }
  | { kind: 'clause'; id: string }
  | { kind: 'learned'; recordId?: string }
  | { kind: 'state' }
  | { kind: 'teaching' }
  | { kind: 'disclosure' };

/** 对话里要高亮的几句；seq 每次跳转都变，好让同一处能再跳一次。 */
export interface Focus {
  sessionId: string;
  lines: number[];
  seq: number;
  scroll: boolean;
}

export interface PanelApi {
  show: (t: PanelTarget) => void;
  /** 打开那个对话（不在当前时），高亮这几句；scroll 为真时滚过去。 */
  jump: (sessionId: string, lines: number[], scroll?: boolean) => void;
}

export const PanelContext = createContext<PanelApi>({
  show: () => undefined,
  jump: () => undefined,
});

export function usePanel(): PanelApi {
  return useContext(PanelContext);
}

/** 当前显示的对话 id（消息组件判断高亮、打开本对话的依据时用）。 */
export const CurrentSessionContext = createContext<string | undefined>(undefined);

export function useCurrentSession(): string | undefined {
  return useContext(CurrentSessionContext);
}

/** 当前对话里要高亮的行（依据面板里引用到的原话）。 */
export const HighlightContext = createContext<readonly number[]>([]);

export function useHighlight(): readonly number[] {
  return useContext(HighlightContext);
}
