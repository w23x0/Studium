// “我学会的”与项目页用的纯转换（记录/学过的记录.md「分层」「外部导入」；工单 W6 §4.3）：
// 每次学习一行（标题、状态、时间），最新的在前；展开看上层（单子、没合上的结束原话与路线决定）与
// 中层（通过的判定）；外部导入单列、标“未验证”。单测覆盖。
import type { Import, Learning } from '../shared/protocol-learned.ts';
import { shortTime } from './evidence-model.ts';
import { ticketRows, type TicketRow } from './ticket-model.ts';
import { understandingRows, type UnderstandingRow } from './verdict-model.ts';
import { W } from './wording.ts';

export interface LearnedRow {
  loopId: string;
  title: string;
  status: Learning['status'];
  /** 状态的说法（三种各不相同）。 */
  statusLabel: string;
  /** 排序与显示用的时间：结束过就用结束时间，否则用开始时间。 */
  at: string;
  time: string;
  newPoint: string;
  /** 学习者把它搁置着了。 */
  shelved: boolean;
}

export type UnclosedRow = LearnedRow & {
  endNote?: string;
  routeDecision?: { line: number; decision: string; reason: string };
};

/** 一次学习的行；按时间从新到旧。 */
export function learnedRows(
  ls: readonly Learning[],
  shelvedIds: readonly string[] = [],
): LearnedRow[] {
  return ls
    .map((l) => ({
      loopId: l.loopId,
      title: l.title,
      status: l.status,
      statusLabel: W.learnedStatus[l.status],
      at: l.endedAt ?? l.openedAt,
      time: shortTime(l.endedAt ?? l.openedAt),
      newPoint: l.ticket.newPoint,
      shelved: shelvedIds.includes(l.loopId),
    }))
    .sort((a, b) => (a.at === b.at ? 0 : a.at < b.at ? 1 : -1));
}

/** 项目页的三组：进行中（含搁置的，标出来）、合上、没合上（停车场 = 没合上那些的上层）。 */
export function projectGroups(
  ls: readonly Learning[],
  shelvedIds: readonly string[] = [],
): { inProgress: LearnedRow[]; closed: LearnedRow[]; unclosed: UnclosedRow[] } {
  const rows = learnedRows(ls, shelvedIds);
  const byId = new Map(ls.map((l) => [l.loopId, l]));
  const unclosed: UnclosedRow[] = rows
    .filter((r) => r.status === '没合上')
    .map((r) => {
      const l = byId.get(r.loopId);
      return {
        ...r,
        ...(l?.endNote !== undefined ? { endNote: l.endNote } : {}),
        ...(l?.routeDecision !== undefined ? { routeDecision: l.routeDecision } : {}),
      };
    });
  return {
    inProgress: rows.filter((r) => r.status === '进行中'),
    closed: rows.filter((r) => r.status === '合上'),
    unclosed,
  };
}

export interface LearnedDetail {
  upper: {
    ticket: TicketRow[];
    endNote?: string;
    routeDecision?: { line: number; decision: string; reason: string; jump?: JumpRef };
  };
  middle?: {
    line: number;
    closed: boolean;
    basis: string;
    model?: string;
    rows: UnderstandingRow[];
    jump: JumpRef;
  };
  transcript: { sessionId: string };
}

/** 跳到某个对话的那几行。 */
export interface JumpRef {
  sessionId: string;
  lines: number[];
}

/** 展开一次学习：上层（单子、没合上的结束原话与路线决定）+ 中层（通过的判定）+ 对话原文入口。 */
export function learnedDetail(l: Learning, projectId?: string): LearnedDetail {
  const rd = l.routeDecision;
  return {
    upper: {
      ticket: ticketRows(l.ticket),
      ...(l.endNote !== undefined ? { endNote: l.endNote } : {}),
      ...(rd !== undefined
        ? {
            routeDecision: {
              line: rd.line,
              decision: rd.decision,
              reason: rd.reason,
              ...(projectId !== undefined
                ? { jump: { sessionId: projectId, lines: [rd.line] } }
                : {}),
            },
          }
        : {}),
    },
    ...(l.verdict !== undefined
      ? {
          middle: {
            line: l.verdict.line,
            closed: l.verdict.closed,
            basis: l.verdict.basis,
            ...(l.verdict.model !== undefined ? { model: l.verdict.model } : {}),
            rows: understandingRows(l.verdict),
            jump: { sessionId: l.loopId, lines: [l.verdict.line] },
          },
        }
      : {}),
    transcript: { sessionId: l.loopId },
  };
}

export interface ImportRow {
  id: string;
  at: string;
  time: string;
  channel: string;
  /** 都标“未验证”。 */
  unverified: string;
  jump?: JumpRef;
  note?: string;
}

/** 外部导入：从新到旧；畅谈的能跳回学习者那几句，笔记的写明是哪一份。 */
export function importRows(is: readonly Import[]): ImportRow[] {
  return [...is]
    .sort((a, b) => (a.at === b.at ? 0 : a.at < b.at ? 1 : -1))
    .map((x) => {
      const base = {
        id: x.id,
        at: x.at,
        time: shortTime(x.at),
        channel: W.importChannel[x.channel],
        unverified: W.unverified,
      };
      return 'session' in x.ref
        ? { ...base, jump: { sessionId: x.ref.session, lines: x.ref.lines } }
        : { ...base, note: x.ref.note };
    });
}
