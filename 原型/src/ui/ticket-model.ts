// 单子按文字显示（记录/单子与路线.md「单子」；工单 W6 §4.3）：新点 · 预期理解 · 出发点（各注来源）·
// 对资料核的结果（出处可点开原文，资料里没有的标“模型补的”）· 路线动作 · 回看 / 补前置 / 接着学 / 阶段验收。
// 纯函数，单测覆盖；给学习者看的栏名不露内部词。
import type { SourceView, TicketView } from '../shared/protocol.ts';
import type { Ticket } from '../shared/records.ts';
import type { PanelTarget } from './panel.ts';
import { W } from './wording.ts';

/** 一行依据能点开什么：面板里的一处原文，或跳到某个对话的那几行。 */
export type RefLink =
  { kind: 'panel'; target: PanelTarget } | { kind: 'jump'; sessionId: string; lines: number[] };

export type TicketRowKind =
  | 'newPoint'
  | 'clause'
  | 'startPoint'
  | 'sourceCheck'
  | 'routeAction'
  | 'revisit'
  | 'returnTo'
  | 'resumeOf'
  | 'stageCheck';

export interface TicketRow {
  kind: TicketRowKind;
  /** 给学习者看的栏名。 */
  label: string;
  text: string;
  /** 来源标注、查不到、模型补的这类小字。 */
  note?: string;
  /** 单子里原样的依据串。 */
  ref?: string;
  link?: RefLink;
  modelAdded?: true;
}

/** 一条回查结果能点开成什么；查不到（或认不出）就不给链接。 */
export function refLink(s: SourceView): RefLink | undefined {
  if (!s.resolved) return undefined;
  if (s.kind === 'book_line') {
    if (
      s.book === undefined ||
      s.file === undefined ||
      s.from === undefined ||
      s.to === undefined
    ) {
      return undefined;
    }
    return {
      kind: 'panel',
      target: { kind: 'source', book: s.book, file: s.file, from: s.from, to: s.to },
    };
  }
  if (s.kind === 'loop_line') {
    if (s.sessionId === undefined || s.line === undefined) return undefined;
    return { kind: 'jump', sessionId: s.sessionId, lines: [s.line] };
  }
  return undefined;
}

/** 单子按顺序排成给学习者看的几行；给了 `refs` 才能把依据变成可点的链接。 */
export function ticketRows(t: Ticket, refs?: readonly SourceView[]): TicketRow[] {
  const rows: TicketRow[] = [];
  const byRaw = new Map<string, SourceView>();
  for (const s of refs ?? []) byRaw.set(s.raw.trim(), s);

  /** 带依据串的一行：回查到了就点开，查不到就写明。 */
  const withRef = (row: TicketRow, raw: string): TicketRow => {
    const found = byRaw.get(raw.trim());
    if (found === undefined) return { ...row, ref: raw };
    if (found.resolved) {
      const link = refLink(found);
      return { ...row, ref: raw, ...(link !== undefined ? { link } : {}) };
    }
    return { ...row, ref: raw, note: W.sourceNotResolved };
  };

  if (t.newPoint !== '') rows.push({ kind: 'newPoint', label: W.newPoint, text: t.newPoint });
  if (t.clause !== '') rows.push({ kind: 'clause', label: W.clause, text: t.clause });
  for (const s of t.startPoints) {
    const row: TicketRow = {
      kind: 'startPoint',
      label: W.startPoints,
      text: s.point,
      note: W.startSource[s.source],
    };
    rows.push(s.ref !== undefined ? withRef(row, s.ref) : row);
  }
  for (const c of t.sourceCheck) {
    if (c.modelAdded === true) {
      rows.push({
        kind: 'sourceCheck',
        label: W.sourceCheck,
        text: c.claim,
        note: W.modelAdded,
        modelAdded: true,
      });
    } else if (c.at !== undefined) {
      rows.push(withRef({ kind: 'sourceCheck', label: W.sourceCheck, text: c.claim }, c.at));
    } else {
      rows.push({ kind: 'sourceCheck', label: W.sourceCheck, text: c.claim });
    }
  }
  if (t.routeAction !== '') {
    rows.push({ kind: 'routeAction', label: W.routeAction, text: t.routeAction });
  }
  if (t.revisit !== undefined) {
    rows.push({
      kind: 'revisit',
      label: W.ticketRevisit,
      text: W.revisitLine(t.revisit.kind),
      link: {
        kind: 'panel',
        target: {
          kind: 'loop',
          loopId: t.revisit.ofLoop,
          ...(t.revisit.verdictLine !== undefined ? { verdictLine: t.revisit.verdictLine } : {}),
        },
      },
    });
  }
  if (t.returnTo !== undefined) {
    rows.push({
      kind: 'returnTo',
      label: W.ticketReturnTo,
      text: W.ticketReturnToText,
      link: { kind: 'panel', target: { kind: 'loop', loopId: t.returnTo } },
    });
  }
  if (t.resumeOf !== undefined) {
    rows.push({
      kind: 'resumeOf',
      label: W.ticketResumeOf,
      text: W.ticketResumeOfText,
      link: { kind: 'panel', target: { kind: 'loop', loopId: t.resumeOf } },
    });
  }
  if (t.stageCheck === true) {
    rows.push({ kind: 'stageCheck', label: W.stageCheck, text: W.stageCheckHint });
  }
  return rows;
}

/** 单子视图（平铺，带 refs）也照 `ticketRows` 显示。 */
export function ticketRowsOf(t: TicketView): TicketRow[] {
  return ticketRows(t, t.refs);
}

/** 一次改单子改了哪几栏（给学习者看的栏名）；只比学习者能改的三栏。 */
export function editedFields(before: Ticket, after: Ticket): string[] {
  const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
  const out: string[] = [];
  if (before.newPoint !== after.newPoint) out.push(W.newPoint);
  if (before.clause !== after.clause) out.push(W.clause);
  if (!same(before.startPoints, after.startPoints)) out.push(W.startPoints);
  return out;
}
