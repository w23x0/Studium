// 右侧依据面板与对话高亮的共用入口：消息、项目页、面板里的链接经它打开面板、跳到对话某句。
import { createContext, useContext } from 'react';
import type { BBox } from '../shared/protocol.ts';

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
  | { kind: 'disclosure' }
  /** 资料：不给书 = 书列表；给书 = 这本书的目录。 */
  | { kind: 'library'; book?: string }
  /** all = 不限项目资料、查全部。 */
  | { kind: 'search'; q: string; book?: string; all?: boolean }
  /** 书里的知识点：不给书 = 按书按章的概要；给书和章 = 那一章的点。all = 不限项目资料。 */
  | { kind: 'points'; book?: string; chapter?: string; all?: boolean }
  /**
   * 一个小节的原文；from–to 是要高亮的行。page / bbox 是已知的原件位置（回复里出处核对时比出来的）；
   * problem 是出处对不上的原因（对不上也照样打开，写明原因）。
   */
  | {
      kind: 'source';
      book: string;
      file: string;
      from?: number;
      to?: number;
      page?: number;
      bbox?: BBox;
      problem?: string;
    }
  /** 原件的一页；bbox 标出位置，quote 是书里的原句，file / line 能回到转录的原文。 */
  | {
      kind: 'page';
      book: string;
      page: number;
      bbox?: BBox;
      quote?: string;
      file?: string;
      line?: number;
    };

/** 面板里看书的几类东西：面板放宽一些。 */
export function isWideTarget(t: PanelTarget): boolean {
  return t.kind === 'library' || t.kind === 'search' || t.kind === 'source' || t.kind === 'page';
}

/** 对话里要高亮的几句；seq 每次跳转都变，好让同一处能再跳一次。 */
export interface Focus {
  sessionId: string;
  lines: number[];
  seq: number;
  scroll: boolean;
}

export interface PanelApi {
  show: (t: PanelTarget) => void;
  /** 换掉面板当前显示的这一项（翻页、翻小节，不多压一层返回）。 */
  replace: (t: PanelTarget) => void;
  /** 打开那个对话（不在当前时），高亮这几句；scroll 为真时滚过去。 */
  jump: (sessionId: string, lines: number[], scroll?: boolean) => void;
}

export const PanelContext = createContext<PanelApi>({
  show: () => undefined,
  replace: () => undefined,
  jump: () => undefined,
});

export function usePanel(): PanelApi {
  return useContext(PanelContext);
}

/** 当前项目（主对话 id）：资料检索、知识点概要默认按它的项目资料限定范围。 */
export const ProjectContext = createContext<string | undefined>(undefined);

export function useProject(): string | undefined {
  return useContext(ProjectContext);
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
