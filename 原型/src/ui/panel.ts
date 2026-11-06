// 右侧面板的共用入口：消息、面板里的链接经它打开面板。
import { createContext, useContext } from 'react';
import type { BBox } from '../shared/protocol.ts';

/** 面板里能看的东西。 */
export type PanelTarget =
  /** 资料浏览：不给 material = 资料列表；给 material（资料 id）= 这份资料的文件清单。 */
  | { kind: 'materials'; material?: string }
  /** all = 不限项目资料、查全部。 */
  | { kind: 'search'; q: string; material?: string; all?: boolean }
  /**
   * 一个小节的原文；from–to 是要高亮的行。page / bbox 是已知的原件位置（回复里出处核对时比出来的）；
   * problem 是出处对不上的原因（对不上也照样打开，写明原因）。
   */
  | {
      kind: 'source';
      material: string;
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
      material: string;
      page: number;
      bbox?: BBox;
      quote?: string;
      file?: string;
      line?: number;
    };

export interface PanelApi {
  show: (t: PanelTarget) => void;
  /** 换掉面板当前显示的这一项（翻页、翻小节，不多压一层返回）。 */
  replace: (t: PanelTarget) => void;
}

export const PanelContext = createContext<PanelApi>({
  show: () => undefined,
  replace: () => undefined,
});

export function usePanel(): PanelApi {
  return useContext(PanelContext);
}

/** 当前项目（主对话 id）：资料检索默认按它的项目资料限定范围。 */
export const ProjectContext = createContext<string | undefined>(undefined);

export function useProject(): string | undefined {
  return useContext(ProjectContext);
}
