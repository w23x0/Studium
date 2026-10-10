// 闭环正本折叠出的状态（批 5：搁置、等分叉回来、停车记录、分叉关系）。纯函数，只读记录、不写。
import type {
  DetourCard,
  ForkReturned,
  LoopEnded,
  LoopShelved,
  NumberedRecord,
  ParkingNote,
} from '../shared/records.ts';

/** 分叉最多嵌几层（分叉里再分叉）；再多就先收尾里面的。 */
export const MAX_FORK_DEPTH = 3;

/** 没收尾的闭环（进行中 + 搁置 + 等分叉）到这个数就提示别再开新的（实现细节，可调）。 */
export const LOAD_HEAVY = 3;
/** 停车场积压到这个数提示降载、优先收尾（实现细节，可调）。 */
export const PARKING_PILE = 3;

export interface ForkLink {
  /** 开分叉的那条 detour_made 所在行。 */
  line: number;
  forkLoopSessionId: string;
  returned?: ForkReturned;
}

export interface LoopFlags {
  ended?: LoopEnded;
  /** 现在是搁置着的（已结束的闭环不算）。 */
  shelved?: LoopShelved;
  /** 在等哪个分叉闭环回来（已结束的闭环不算）。 */
  waitingFork?: string;
  /** 小卡出了、学习者还没选。 */
  openDetour?: { line: number; card: DetourCard };
  /** 最近一条停车记录。 */
  parking?: ParkingNote & { line: number };
  forks: ForkLink[];
}

export function foldLoop(recs: NumberedRecord[]): LoopFlags {
  const forks: ForkLink[] = [];
  let shelved: LoopShelved | undefined;
  let ended: LoopEnded | undefined;
  let parking: (ParkingNote & { line: number }) | undefined;
  const cards = new Map<string, { line: number; card: DetourCard }>();
  const made = new Set<string>();
  for (const { line, record: r } of recs) {
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
      case 'parking_note':
        parking = { ...r, line };
        break;
      case 'detour_card':
        cards.set(r.cardId, { line, card: r });
        break;
      case 'detour_made':
        made.add(r.cardId);
        if (r.choice === 'fork' && r.forkLoopSessionId !== undefined) {
          forks.push({ line, forkLoopSessionId: r.forkLoopSessionId });
        }
        break;
      case 'fork_returned': {
        const f = forks.find((x) => x.forkLoopSessionId === r.forkLoopSessionId);
        if (f) f.returned = r;
        break;
      }
      default:
        break;
    }
  }
  const open = [...cards.values()].filter((c) => !made.has(c.card.cardId)).at(-1);
  const waiting = forks.find((f) => f.returned === undefined);
  const live = ended === undefined;
  return {
    ...(ended !== undefined ? { ended } : {}),
    ...(live && shelved !== undefined ? { shelved } : {}),
    ...(live && waiting !== undefined ? { waitingFork: waiting.forkLoopSessionId } : {}),
    ...(live && open !== undefined ? { openDetour: open } : {}),
    ...(parking !== undefined ? { parking } : {}),
    forks,
  };
}

/** 一个闭环现在的状态标签（给 M05 开场、主对话工具用）。 */
export function stateLabel(f: LoopFlags): string {
  if (f.ended !== undefined) return f.ended.closed ? '合上' : '没合上就结束';
  if (f.shelved !== undefined) return '搁置中';
  if (f.waitingFork !== undefined) return '等分叉回来';
  return '进行中';
}
