// 学习者看到的屏幕（`docs/设计/会话/学习对话.md` §11、`实现选型.md`「屏幕存储」）：一次学习只有一条上下文，
// 每一轮学习者眼前的屏幕由主模型这一轮的输出定；一屏 = 一张块清单。块按内容指纹存一份，清单也按指纹存；
// 正本只记第几屏与清单指纹（记录类型在 records.ts）。本文件是核心与界面共用的形状。
// 块的 key、组件编号、版本号只在程序与界面里用，不进主模型上下文。
import type { Ticket } from './records.ts';

/** 屏幕上的一块：从哪来 + 指向（一句话）。 */
export type ScreenBlockRef =
  /** 主模型这一轮写的一段（内容按指纹存）；line = 这一段所在的 assistant_message 行。 */
  | { kind: 'text'; key: string; pointer: string; hash: string; line: number }
  /** 学习者说的话（user_message 那行），或他在组件上的操作（component_action 那行，op 为真）。 */
  | { kind: 'learner'; key: string; pointer: string; line: number; op?: true }
  /** 子代理交回的一句（subagent_result 那行，或框架另开子代理的 component_report 那行）。 */
  | { kind: 'subagent'; key: string; pointer: string; line: number }
  /** 一个组件；显示哪一版按这一屏的时间现算（当前屏 = 最新版）。 */
  | { kind: 'component'; key: string; pointer: string; component: string }
  /** 还在做的组件：占位，子代理交上后换成它做的组件。 */
  | { kind: 'pending'; key: string; pointer: string; task: string }
  /**
   * 程序推来的块（§11.3「程序推来的块上屏」）：开场（line = 开场那条 program_fact）、收尾记录（line = 那条
   * guard_verdict）。上屏只显示学习者在界面别处本来就看得到的部分，只给模型看的（沙盒路径等）不上屏。
   */
  | { kind: 'opening' | 'closing'; key: string; pointer: string; line: number };

/** 一屏 = 一张块清单：从上到下一行行，一行里有两块 = 并排。 */
export interface ScreenManifest {
  rows: ScreenBlockRef[][];
}

/** 组件的一版 = 一张块清单（同旧活页面的清单形状：每块一个 HTML 文件 + 一句话）。 */
export interface ComponentManifest {
  blocks: { id: string; hash: string; summary: string }[];
}

/** 组件发出的话要交给谁（子代理按交代做进组件代码）：做它的子代理 / 主对话 / 两边。 */
export const ACTION_TARGETS = ['maker', 'main', 'both'] as const;
export type ActionTarget = (typeof ACTION_TARGETS)[number];

// ───────────── 核心 ↔ 界面 ─────────────

/** 解好的一块：界面直接照着画。 */
export type ResolvedBlock =
  | { kind: 'text'; key: string; pointer: string; text: string }
  | { kind: 'learner'; key: string; pointer: string; text: string }
  | { kind: 'subagent'; key: string; pointer: string; text: string }
  | {
      kind: 'component';
      key: string;
      pointer: string;
      component: string;
      version: number;
      blocks: { id: string; html: string }[];
    }
  | { kind: 'pending'; key: string; pointer: string }
  /** 开场：显示那时的单子（同学习页顶上单子条的几项，加路线动作）。 */
  | { kind: 'opening'; key: string; pointer: string; ticket?: Ticket }
  /** 收尾记录：显示整理的内容（同“看整理的内容”那份）；界面按 verdictLine 取。 */
  | { kind: 'closing'; key: string; pointer: string; verdictLine: number };

/** GET /sessions/:id/screens：有过哪些屏（第几屏、哪一行、什么时候）。 */
export interface ScreenListResponse {
  screens: { n: number; line: number; at: string }[];
}

/** GET /sessions/:id/screens/:n：那一屏摆好的每一块。 */
export interface ScreenResponse {
  n: number;
  at: string;
  rows: ResolvedBlock[][];
}

/** POST /sessions/:id/screens/action：组件发出的一句话。 */
export interface ComponentActionRequest {
  component: string;
  text: string;
  /** 等回应（如提交答案）：立刻跑一轮，不攒。 */
  awaited?: boolean;
  to?: ActionTarget;
}

export interface ComponentErrorRequest {
  component: string;
  version: number;
  message: string;
}
