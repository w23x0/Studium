// 界面的纯转换（可单测）：来源说明的显示行、跨领域标记。
import type {
  CrossDomainView,
  NoteItem,
  SourceNoteField,
  SourceNoteView,
} from '../shared/protocol.ts';
import { SOURCE_NOTE_FIELDS } from '../shared/protocol.ts';

export interface NoteRow {
  field: SourceNoteField;
  item: NoteItem | undefined;
}

/** 来源说明里的五项，按固定顺序；没有的 item 为空（界面写“还没说明”，不编）。 */
export function noteRows(n: SourceNoteView): NoteRow[] {
  return SOURCE_NOTE_FIELDS.map((field) => ({ field, item: n[field] }));
}

// ───────────── 跨领域 ─────────────

/** 选项上的跨领域标记（单子里带的）：只带类型与另一边是什么。 */
export function crossOf(o: {
  ticket: { crossDomain?: { kind: CrossDomainView['kind']; otherPoint: string } };
}): { kind: CrossDomainView['kind']; otherPoint: string } | undefined {
  const c = o.ticket.crossDomain;
  return c === undefined ? undefined : { kind: c.kind, otherPoint: c.otherPoint };
}
