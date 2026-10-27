// 旧数据：10-26 的活页面（“对话旁边一张页面”，已撤下，见 `docs/撤下原文/活页面-对话旁边一张页面.md`）。
// W10 起学习对话按屏幕跑，形状在 screen.ts；这里的类型只留着读旧正本里的 page_* 记录与 `pages/` 目录，
// 新代码不再产生。PageTrialResult 与页面小窗的试跑仍在用（组件试跑）。

/** 清单里的一块：框架发的编号、内容指纹、子代理写的一句话（编号只在程序与子代理那边用，不进主模型上下文）。 */
export interface PageBlockRef {
  id: string;
  hash: string;
  summary: string;
}

/** 一版 = 一张块清单，顺序就是页面上的顺序。 */
export interface PageManifest {
  blocks: PageBlockRef[];
}

/** 学习者在页面上的一个动作：展开 / 折起（框架自己看得到）或页面自己定义的（经发送口递出）。 */
export type PageAction =
  | { kind: 'toggle'; block: string; open: boolean }
  | { kind: 'custom'; name: string; detail?: unknown; block?: string };

/** 旧数据里退回时选的原因（10-26 起不做退回）。 */
export type PageRollbackReason = '太多' | '太快' | '方向不对';

/** 新块编号的写法：b1、b2……（框架发，不由模型定）。 */
export const BLOCK_ID = /^b\d+$/;

// ───────────── 核心 ↔ 界面 ─────────────

export interface PageVersionView {
  version: number;
  line: number;
  at: string;
  by: 'editor' | 'learner' | 'rollback';
  from?: number;
  added: string[];
  removed: string[];
  changed: string[];
  /** 这一版和上一版的页面代码一样（学习者只是动了一下）。 */
  same: boolean;
}

/** GET /sessions/:id/page：现在第几版、有过哪些版。 */
export interface PageStateResponse {
  current: number;
  versions: PageVersionView[];
  /** 子代理正在改（界面上写一行“正在改页面”）。 */
  editing: boolean;
}

/** GET /sessions/:id/page/:version：那一版的每一块。 */
export interface PageContentResponse {
  version: number;
  blocks: { id: string; summary: string; html: string }[];
}

export interface PageActionsRequest {
  version: number;
  actions: PageAction[];
  /** 等回应的动作（如提交答案）：立刻推给主对话，不攒。 */
  awaited?: boolean;
}

export interface PageErrorRequest {
  version: number;
  message: string;
}

export interface PageTrialResult {
  ok: boolean;
  error?: string;
}
