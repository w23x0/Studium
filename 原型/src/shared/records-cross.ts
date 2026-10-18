// 跨领域学习的单子字段：补习型 / 对比链接型（会话/导航.md「跨领域」）。放在 Ticket.crossDomain 上，只加不改。
// 只写类型、另一边一句话、原问题：领域由模型现场判断，程序不算。

export const CROSS_KINDS = ['补习型', '对比链接型'] as const;
export type CrossKind = (typeof CROSS_KINDS)[number];

export interface CrossDomain {
  kind: CrossKind;
  /**
   * 另一边的点，一句话。补习型：原问题所在那边、需要这个前置的那个点；
   * 对比链接型：另一边与新点结构相似、学习者已经会了的那个点。
   */
  otherPoint: string;
  /** 驱动这次学习的原问题，一句话（学习者的话或他在做的事）。 */
  problem: string;
}
