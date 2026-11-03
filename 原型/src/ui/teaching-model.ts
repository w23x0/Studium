// 用过的教学工具按名字计数（依据面板里一次学习用到的教法）。
import type { TeachingToolUseView } from '../shared/protocol.ts';

/** 取用过的教学工具按名字合并（保留第一次取用的顺序），带次数。 */
export function toolCounts(uses: TeachingToolUseView[]): { name: string; count: number }[] {
  const out: { name: string; count: number }[] = [];
  for (const u of uses) {
    const hit = out.find((x) => x.name === u.name);
    if (hit) hit.count += 1;
    else out.push({ name: u.name, count: 1 });
  }
  return out;
}
