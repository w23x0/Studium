// 活页面在界面上的现读（纯函数）：从学习对话的正本里读出有过哪些版、现在第几版、编辑员在不在改。
import type { NumberedRecord } from '../shared/records.ts';

export interface PageVersionItem {
  version: number;
  at: string;
  by: 'editor' | 'learner' | 'rollback';
  from?: number;
  /** 和上一版代码一样（学习者只是在页面上动了一下）。 */
  same: boolean;
}

export function pageVersions(records: NumberedRecord[]): PageVersionItem[] {
  const out: PageVersionItem[] = [];
  let prev: string | undefined;
  for (const { record: r } of records) {
    if (r.type !== 'page_version') continue;
    out.push({
      version: r.version,
      at: r.at,
      by: r.by,
      ...(r.from !== undefined ? { from: r.from } : {}),
      same: prev === r.manifest,
    });
    prev = r.manifest;
  }
  return out;
}

/** 编辑员交回的程序事实以它开头（同核心 live-page.ts 的 editResultHead）。 */
const EDIT_RESULT = '页面编辑员交回';

/** 编辑员正在改：最近一次成功交出去的 edit_page 之后，还没见编辑员交回。 */
export function pageEditing(records: NumberedRecord[]): boolean {
  let asked = 0;
  let answered = 0;
  for (const { line, record: r } of records) {
    if (r.type === 'tool_call' && r.name === 'edit_page' && !r.isError) asked = line;
    if (r.type === 'program_fact' && r.text.startsWith(EDIT_RESULT)) answered = line;
    if (r.type === 'loop_ended') return false;
  }
  return asked > answered;
}
