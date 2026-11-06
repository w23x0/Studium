// 右侧面板的共用入口：消息、面板里的链接经它打开面板。
import { createContext, useContext } from 'react';

/** 面板里能看的东西。 */
export type PanelTarget =
  /** 资料浏览：不给 material = 资料列表；给 material（资料 id）= 这份资料的文件清单。 */
  | { kind: 'materials'; material?: string }
  /** all = 不限项目资料、查全部。 */
  | { kind: 'search'; q: string; material?: string; all?: boolean }
  /** 一个文件的原文；from–to 是要高亮的行；problem 是出处对不上的原因（对不上也照样打开，写明原因）。 */
  | {
      kind: 'source';
      material: string;
      file: string;
      from?: number;
      to?: number;
      problem?: string;
    };

export interface PanelApi {
  show: (t: PanelTarget) => void;
  /** 换掉面板当前显示的这一项（搜索结果页重搜，不多压一层返回）。 */
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
