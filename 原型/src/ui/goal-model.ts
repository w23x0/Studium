// 方向目标在项目页上按块显示（记录/方向目标.md「内容」；工单 W6 §4.3）：目标能力逐块带理由与学习者
// 确认的理由、顺序参考、临时版；只有一句话的旧记录照旧显示那一句。纯函数，单测覆盖。
import type { GoalView } from '../shared/protocol.ts';
import { W } from './wording.ts';

export interface GoalRow {
  kind: 'title' | 'ability' | 'orderHint' | 'provisional' | 'text';
  label: string;
  text: string;
  reason?: string;
  confirmedReason?: string;
}

export function goalRows(g: GoalView | undefined): GoalRow[] {
  if (g === undefined) return [];
  if (g.abilities === undefined) {
    return [{ kind: 'text', label: W.goalText, text: g.text }];
  }
  const rows: GoalRow[] = [];
  if (g.title !== undefined && g.title !== '') {
    rows.push({ kind: 'title', label: W.goalTitle, text: g.title });
  }
  for (const a of g.abilities) {
    rows.push({
      kind: 'ability',
      label: W.goalAbility,
      text: a.ability,
      reason: a.reason,
      ...(a.confirmedReason !== undefined ? { confirmedReason: a.confirmedReason } : {}),
    });
  }
  if (g.orderHint !== undefined && g.orderHint !== '') {
    rows.push({ kind: 'orderHint', label: W.goalOrderHint, text: g.orderHint });
  }
  if (g.provisional === true) {
    rows.push({ kind: 'provisional', label: W.goalProvisional, text: W.provisionalGoal });
  }
  return rows;
}
