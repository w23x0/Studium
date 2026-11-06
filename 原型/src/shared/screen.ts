// 学习页的组件（`docs/设计/会话/学习对话.md` §11）：组件的一版 = 一张块清单（按指纹存在 `<数据>/screens/<学习 id>/`），
// 正本只记 component_version。本文件是核心与界面共用的形状。

/** 组件的一版 = 一张块清单（每块一个 HTML 文件 + 一句话）。 */
export interface ComponentManifest {
  blocks: { id: string; hash: string; summary: string }[];
}

// ───────────── 核心 ↔ 界面 ─────────────

/**
 * GET /sessions/:id/screens：不是竖流开的旧学习只读看时用的组件——每个组件最后一版；
 * line = 第一次交上的那行（界面按它和文字一起按时间排）。
 */
export interface OldComponentsResponse {
  components: {
    component: string;
    pointer: string;
    line: number;
    version: number;
    blocks: { id: string; html: string }[];
  }[];
}

/** POST /sessions/:id/screens/action：组件发出的一句话。 */
export interface ComponentActionRequest {
  component: string;
  text: string;
  /** 等回应（如提交答案）：立刻跑一轮，不攒。 */
  awaited?: boolean;
  /** 组件“现在的状态”（只留最后一次，下次学习者说话时带上）。 */
  state?: boolean;
}

/** 组件新一版在学习者浏览器里试跑的结果。 */
export interface PageTrialResult {
  ok: boolean;
  error?: string;
}

export interface ComponentErrorRequest {
  component: string;
  version: number;
  message: string;
}
