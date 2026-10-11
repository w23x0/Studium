// 跨领域闭环（批 10b，M05:18）的单子字段：补习型 / 对比链接型。放在 Ticket.crossDomain 上，只加不改。
// 领域由程序按点的原文锚点所在书的学科目录算，不是模型自己说的。

export const CROSS_KINDS = ['补习型', '对比链接型'] as const;
export type CrossKind = (typeof CROSS_KINDS)[number];

export interface CrossDomain {
  kind: CrossKind;
  /**
   * 另一边的点（M08 点 id）。补习型：原问题所在领域里、需要这个前置的那个点；
   * 对比链接型：另一个领域里与新点结构相似、学习者已经会了的那个点。
   */
  otherPoint: string;
  /** 驱动这次学习的原问题，一句话（学习者的话或他在做的事）。 */
  problem: string;
  /** 新点所在的领域；程序算的。 */
  domain: string;
  /** 另一边的点所在的领域；程序算的。 */
  otherDomain: string;
}
