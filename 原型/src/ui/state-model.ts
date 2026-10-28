// 我的状态：现在还算数的几条。“当前状态”页是给导航、学习对话读的（带记录编号、承载读数之类的分型），
// 不给学习者看原文；界面只列它点到的那几条底层记录。纯函数。
import type { StateRecordView } from '../shared/protocol.ts';

export function stillValid(
  records: StateRecordView[],
  current: string | undefined,
): StateRecordView[] {
  // 还没整理出当前状态页：列全部
  if (current === undefined) return records;
  // 只认每条开头的编号：句中提到的（如“这条取代 st-…”）是被取代的旧条
  const heads = [...current.matchAll(/^\s*[-*]\s*(st-[0-9a-f]+)/gm)].map((m) => m[1]);
  const ids = new Set(heads.length > 0 ? heads : (current.match(/st-[0-9a-f]+/g) ?? []));
  return records.filter((x) => ids.has(x.id));
}
