// 活页面（`docs/设计/会话/学习对话.md` §11、`会话/页面子代理.md`、`实现选型.md`「活页面存储」）：
// 页面由一块块 HTML 组成，每块按内容指纹存一份，一版 = 一张块清单；正本里只记版本号与清单的指纹。
// 本文件是核心与界面共用的形状（记录类型在 records.ts）。

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
