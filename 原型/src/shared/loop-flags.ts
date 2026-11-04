// 一次学习的正本折叠出的状态（结束、搁置）。纯函数，只读记录、不写。W12 §2 起学习对话结束后能重开：
// 结束 = 最后一条 loop_ended 之后没有 thread_reopened。
import type { LoopEnded, LoopShelved, NumberedRecord } from './records.ts';

export interface LoopFlags {
  /** 现在是结束着的：最后一次结束（重开过又结束 = 后一次）。 */
  ended?: LoopEnded;
  /** 现在是搁置着的（已结束的不算）。 */
  shelved?: LoopShelved;
}

export function foldLoop(recs: NumberedRecord[]): LoopFlags {
  let shelved: LoopShelved | undefined;
  let ended: LoopEnded | undefined;
  for (const { record: r } of recs) {
    switch (r.type) {
      case 'loop_ended':
        ended = r;
        shelved = undefined;
        break;
      case 'thread_reopened':
        ended = undefined;
        break;
      case 'loop_shelved':
        shelved = r;
        break;
      case 'loop_resumed':
        shelved = undefined;
        break;
      default:
        break;
    }
  }
  return {
    ...(ended !== undefined ? { ended } : {}),
    ...(ended === undefined && shelved !== undefined ? { shelved } : {}),
  };
}
