// 方向目标的读与写（工单 W5 §4.2）。当前值 = 主对话里最后一条 project_goal；
// 旧形状只有 text 的照样合法，新形状多 abilities 等字段。只读、不缓存。
import type { GoalAbility, NumberedRecord, ProjectGoal } from '../shared/records.ts';

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

/** 各块能力用“；”连起来，存进旧字段 text。 */
export function goalText(abilities: GoalAbility[]): string {
  return abilities.map((a) => a.ability.trim()).join('；');
}

/**
 * 给模型看的完整方向目标：第一行照 W3 格式 `方向目标：<text>`（临时版行尾加“（临时）”），
 * 有 abilities 时接名称、每块能力 / 理由 / 确认理由、顺序参考。不写期限（各开场已有期限行）。
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
