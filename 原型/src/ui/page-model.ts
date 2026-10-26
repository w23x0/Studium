// 活页面在界面上的现读（纯函数）：从学习对话的正本里读出有过哪些版、现在第几版、子代理在不在改。
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

/** 页面子代理的名字（同核心 live-page.ts 的 PAGE_AGENT）。 */
const PAGE_AGENT = 'page';

/** 页面子代理正在改：派出去了、还没交回。 */
export function pageEditing(records: NumberedRecord[]): boolean {
  const open = new Set<string>();
  for (const { record: r } of records) {
    if (r.type === 'subagent_started' && r.agent === PAGE_AGENT) open.add(r.taskId);
    if (r.type === 'subagent_result') open.delete(r.taskId);
    if (r.type === 'loop_ended') return false;
  }
  return open.size > 0;
}
