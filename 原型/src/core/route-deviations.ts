// 路线偏差（docs/设计/记录/单子与路线.md「路线偏差记录」）：不另存一份，从已有记录现算。
// 只记计划偏差的事实（学习者没选推荐项、没合上就结束、中途改线），不形成对学习者水平的结论。只读，不写。
import type { RouteDeviationView } from '../shared/protocol-longterm.ts';
import type { Hub } from './hub.ts';

/** 从项目主对话与各次学习的记录里现算三类偏差，按时间升序。 */
export async function routeDeviations(hub: Hub, mainId: string): Promise<RouteDeviationView[]> {
  const main = await hub.records(mainId);
  const out: RouteDeviationView[] = [];

  // ① 没选推荐项：主对话里的卡与它后面的选择
  for (const { line, record } of main) {
    if (record.type !== 'choice_card') continue;
    const made = main.find(
      (r) => r.record.type === 'choice_made' && r.record.cardId === record.cardId,
    );
    if (made?.record.type !== 'choice_made') continue;
    if (made.record.option === record.recommended) continue;
    const rec = record.options[record.recommended];
    const picked = record.options[made.record.option];
    out.push({
      kind: '没选推荐项',
      at: made.record.at,
      loopId: made.record.loopSessionId,
      text: `推荐「${rec?.title ?? ''}」，学习者选了「${picked?.title ?? ''}」`,
      refs: [`${mainId}:${String(line)}`, `${mainId}:${String(made.line)}`],
    });
  }

  // ② 没合上就结束：本项目里每一次没合上就结束的学习
  for (const s of hub.listSessions().filter((x) => x.kind === 'loop' && x.parent === mainId)) {
    const recs = await hub.records(s.sessionId);
    const ended = recs.find((r) => r.record.type === 'loop_ended');
    if (ended?.record.type !== 'loop_ended' || ended.record.closed) continue;
    out.push({
      kind: '没合上就结束',
      at: ended.record.at,
      loopId: s.sessionId,
      text: `「${s.title}」没合上就结束：${ended.record.note}`,
      refs: [`${s.sessionId}:${String(ended.line)}`],
    });
  }

  // ③ 中途改线：没合上触发、取代了上一条的路线决定
  for (const { line, record } of main) {
    if (record.type !== 'route_decision') continue;
    if (record.supersedes === undefined || !record.trigger.startsWith('没合上：')) continue;
    const loopId = /（([A-Za-z0-9_-]+)）\s*$/.exec(record.trigger)?.[1];
    if (loopId === undefined) continue;
    const ended = (await hub.records(loopId)).find((r) => r.record.type === 'loop_ended');
    out.push({
      kind: '中途改线',
      at: record.at,
      loopId,
      text: `${record.decision}（理由：${record.reason}）`,
      refs: [
        `${mainId}:${String(line)}`,
        `${mainId}:${String(record.supersedes)}`,
        ...(ended !== undefined ? [`${loopId}:${String(ended.line)}`] : []),
      ],
    });
  }

  return out.sort((a, b) => a.at.localeCompare(b.at));
}
