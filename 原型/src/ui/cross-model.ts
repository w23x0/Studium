// 界面的纯转换：来源说明的显示行。
import type { NoteItem, SourceNoteField, SourceNoteView } from '../shared/protocol.ts';
import { SOURCE_NOTE_FIELDS } from '../shared/protocol.ts';

export interface NoteRow {
  field: SourceNoteField;
  item: NoteItem | undefined;
}

/** 来源说明里的五项，按固定顺序；没有的 item 为空（界面写“还没说明”，不编）。 */
export function noteRows(n: SourceNoteView): NoteRow[] {
  return SOURCE_NOTE_FIELDS.map((field) => ({ field, item: n[field] }));
}
