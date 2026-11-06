// 旧谈方向留下的（W20 前单开谈方向，之后方向在学习对话里谈、不再写）：主对话里的方向目标（project_goal）与谈方向对话的原文。
// 里面有学习者的长期想法，模型还要读：学习对话在 只读/方向.md、只读/谈方向/；主对话在 list_learned、read_thread。界面不显示。
import type { NumberedRecord, ProjectGoal } from '../shared/records.ts';
import { localMinute } from '../shared/time.ts';
import type { Hub } from './hub.ts';

/** 主对话里最后一条 project_goal；没有就 undefined。 */
export function currentGoal(records: NumberedRecord[]): ProjectGoal | undefined {
  const last = records.findLast((r) => r.record.type === 'project_goal')?.record;
  return last?.type === 'project_goal' ? last : undefined;
}

/**
 * 给模型看的旧方向目标：第一行 `方向目标：<text>`（临时版行尾加“（临时）”），有 abilities 时接名称、
 * 每块能力 / 理由 / 确认理由、顺序参考。
 */
function describeGoal(g: ProjectGoal): string {
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

/** 一次旧的谈方向对话。 */
export interface OldTalk {
  sessionId: string;
  title: string;
  openedAt: string;
  lastAt: string;
  records: NumberedRecord[];
}

/** 本项目 W20 前单开的谈方向，旧的在前；学习者删掉的不算。索引不收这种会话，按文件名认：会话 id 里带种类。 */
export async function oldTalks(hub: Hub, project: string): Promise<OldTalk[]> {
  const out: OldTalk[] = [];
  for (const id of (await hub.sessionIdsOnDisk()).sort()) {
    if (!/-talk-[0-9a-f]+$/.test(id) || hub.isDeleted(id)) continue;
    const records = await hub.records(id);
    const first = records[0]?.record;
    if (first?.type !== 'session_opened' || first.parent !== project) continue;
    const titled = records.findLast((r) => r.record.type === 'thread_title')?.record;
    out.push({
      sessionId: id,
      title: titled?.type === 'thread_title' ? titled.title : first.title,
      openedAt: first.at,
      lastAt: records.at(-1)?.record.at ?? first.at,
      records,
    });
  }
  return out;
}
