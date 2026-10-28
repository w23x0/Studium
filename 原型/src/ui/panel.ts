// 右侧依据面板与对话高亮的共用入口：消息、项目页、面板里的链接经它打开面板、跳到对话某句。
import { createContext, useContext } from 'react';
import type { BBox } from '../shared/protocol.ts';

/** 面板里能看的东西。 */
export type PanelTarget =
  /**
   * verdictLine：滚到这次判断；
   * editTicket：打开就展开改单子。
   */
  | { kind: 'loop'; loopId: string; verdictLine?: number; editTicket?: true }
  /** 我学会的：不给 = 全部；给 loopId = 直接展开那一次学习。 */
  | { kind: 'learned'; loopId?: string }
  | { kind: 'state' }
  | { kind: 'teaching' }
  | { kind: 'disclosure' }
  /** 资料浏览：不给 book = 资料列表；给 book（资料 id）= 这份资料的文件清单。 */
  | { kind: 'materials'; book?: string }
  /** all = 不限项目资料、查全部。 */
  | { kind: 'search'; q: string; book?: string; all?: boolean }
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
  /**
   * 我的产出里的一份（照 Claude 的 artifact：在面板里看与改）。tab 不给 = 正文；version 不给 = 最新版；
   * compare = 正在对比的两版；edit = 正在改（稿子另存在界面里，翻到别处再回来还在）。
   */
  | {
      kind: 'output';
      id: string;
      tab?: OutputTab;
      version?: number;
      compare?: [number, number];
      edit?: boolean;
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

export type OutputTab = 'text' | 'versions' | 'literature';

/** 面板里看书的几类东西与产出物：面板放宽一些。 */
export function isWideTarget(t: PanelTarget): boolean {
  return (
    t.kind === 'materials' ||
    t.kind === 'search' ||
    t.kind === 'source' ||
    t.kind === 'page' ||
    t.kind === 'output'
  );
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

/** 当前项目（主对话 id）：资料检索默认按它的项目资料限定范围。 */
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
