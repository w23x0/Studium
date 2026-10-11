// 右侧依据面板与对话高亮的共用入口：消息、项目页、面板里的链接经它打开面板、跳到对话某句。
import { createContext, useContext } from 'react';
import type { BBox } from '../shared/protocol.ts';

/** 面板里能看的东西。 */
export type PanelTarget =
  | { kind: 'home' }
  /** verdictLine：滚到这次判断；noteLine：滚到这一轮老师的观察（从“出现在教法变化之后”点进来）。 */
  | { kind: 'loop'; loopId: string; verdictLine?: number; noteLine?: number }
  | { kind: 'card'; cardId: string; option?: number }
  | { kind: 'point'; id: string }
  | { kind: 'clause'; id: string }
  /** 我学会的：不给 = 每个知识点现在的样子；point = 这个知识点的经过；recordId = 那条记录所在知识点的经过。 */
  | { kind: 'learned'; recordId?: string; point?: string }
  | { kind: 'state' }
  | { kind: 'teaching' }
  /** 教法（教学工具）：不给名字 = 列表；给名字 = 这一份的全文。 */
  | { kind: 'tools'; name?: string }
  | { kind: 'disclosure' }
  /** 练习里看到的（批 9）：常犯的错 + 这类题怎么想；summary 给了就展开那一份归纳。 */
  | { kind: 'practice'; summary?: string }
  /** 书里的习题（批 9）：给章就只看这一章。 */
  | { kind: 'exercises'; book: string; chapter?: string }
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

export type OutputTab = 'text' | 'versions' | 'literature' | 'general';

/** 面板里看书的几类东西与产出物：面板放宽一些。 */
export function isWideTarget(t: PanelTarget): boolean {
  return (
    t.kind === 'library' ||
    t.kind === 'search' ||
    t.kind === 'source' ||
    t.kind === 'page' ||
    t.kind === 'exercises' ||
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
