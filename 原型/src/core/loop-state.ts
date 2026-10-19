// 一次学习的正本折叠出的状态（搁置）。纯函数，只读记录、不写。
import type { LoopEnded, LoopShelved, NumberedRecord } from '../shared/records.ts';

/** 没收尾的学习（进行中 + 搁置）到这个数就提示别再开新的（实现细节，可调）。 */
export const LOAD_HEAVY = 3;
/** 停车场积压到这个数提示降载、优先收尾（实现细节，可调）。 */
export const PARKING_PILE = 3;

export interface LoopFlags {
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
        ended ??= r;
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

/** 一次学习现在的状态标签（给导航开场、主对话工具用）。 */
export function stateLabel(f: LoopFlags): string {
  if (f.ended !== undefined) return f.ended.closed ? '合上' : '没合上就结束';
  if (f.shelved !== undefined) return '搁置中';
  return '进行中';
}
