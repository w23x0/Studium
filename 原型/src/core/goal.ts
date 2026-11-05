// 方向目标的读（旧数据）：W20 起不再单开谈方向、不再写 project_goal；以前谈定的照旧读得到。
// 当前值 = 主对话里最后一条 project_goal；旧形状只有 text 的照样合法，新形状多 abilities 等字段。只读、不缓存。
import type { NumberedRecord, ProjectGoal } from '../shared/records.ts';
import { localMinute } from '../shared/time.ts';

/** 主对话里最后一条 project_goal；没有就 undefined。 */
export function currentGoal(
  records: NumberedRecord[],
): { line: number; goal: ProjectGoal } | undefined {
  for (let i = records.length - 1; i >= 0; i--) {
    const r = records[i];
    if (r?.record.type === 'project_goal') return { line: r.line, goal: r.record };
  }
  return undefined;
}

/**
 * 给模型看的旧方向目标：第一行 `方向目标：<text>`（临时版行尾加“（临时）”），有 abilities 时接名称、
 * 每块能力 / 理由 / 确认理由、顺序参考。
 */
export function describeGoal(g: ProjectGoal): string {
  const lines = [`方向目标：${g.text}${g.provisional === true ? '（临时）' : ''}`];
  if (g.abilities !== undefined) {
    if (g.title !== undefined) lines.push(`名称：${g.title}`);
    for (const a of g.abilities) {
      let line = `- 目标能力：${a.ability}；为什么学：${a.reason}`;
      if (a.confirmedReason !== undefined) {
        line += `；学习者确认时的理由：${a.confirmedReason}`;
      }
      lines.push(line);
    }
    if (g.orderHint !== undefined) lines.push(`顺序参考（只作参考）：${g.orderHint}`);
  }
  return lines.join('\n');
}

/** 给模型看的一段（主对话的 list_learned、学习对话只读区的 方向.md）：标明是旧记录、哪天谈定的。 */
export function oldGoalBlock(g: ProjectGoal): string {
  return `以前单开谈方向时定下的方向（旧记录，谈定于 ${localMinute(g.at)}；之后学习者的想法看跨次记录和对话原文）：\n${describeGoal(g)}`;
}
