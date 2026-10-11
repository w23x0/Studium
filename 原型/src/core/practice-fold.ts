// 练习任务的状态折叠（批 9）：闭环正本里的练习记录 → 任务视图。纯函数，只读记录、不写。
// 任务状态不存盘：布置 → 作答 → 反馈 → 完成 / 放弃，都由记录折叠得出。
import type { LearnerLineView, PracticeTaskView } from '../shared/protocol-practice.ts';
import type { NumberedRecord } from '../shared/records.ts';

/** 折叠时需要的外部查询：点的名字。 */
export interface FoldDeps {
  pointName(id: string): string;
}

/** 学习者行号 → 原话（该闭环正本里的 user_message）。 */
export function learnerTexts(recs: NumberedRecord[]): Map<number, string> {
  const out = new Map<number, string>();
  for (const { line, record: r } of recs) if (r.type === 'user_message') out.set(line, r.text);
  return out;
}

function lineViews(lines: number[], texts: Map<number, string>): LearnerLineView[] {
  return lines.map((line) => ({ line, text: texts.get(line) ?? '' }));
}

interface Work {
  view: PracticeTaskView;
  lastSubmissionLine: number;
  lastFeedbackLine: number;
}

/** 一个闭环的全部练习任务（布置先后为序）。 */
export function foldPractice(
  loopSessionId: string,
  recs: NumberedRecord[],
  deps: FoldDeps,
): PracticeTaskView[] {
  const texts = learnerTexts(recs);
  const works = new Map<string, Work>();
  for (const { line, record: r } of recs) {
    switch (r.type) {
      case 'practice_assigned':
        works.set(r.id, {
          lastSubmissionLine: 0,
          lastFeedbackLine: 0,
          view: {
            id: r.id,
            loopSessionId,
            line,
            at: r.at,
            focus: r.focus,
            points: r.points.map((id) => ({ id, name: deps.pointName(id) })),
            ...(r.clause !== undefined ? { clauseId: r.clause } : {}),
            source: r.source,
            prompt: r.prompt,
            deliverable: r.deliverable,
            hintsAllowed: r.hintsAllowed,
            doneWhen: r.doneWhen,
            function: r.function,
            difficulty: r.difficulty,
            stageCheck: r.stageCheck,
            ...(r.follows !== undefined ? { follows: r.follows } : {}),
            status: 'assigned',
            hintsUsed: 0,
            hintsAsked: 0,
            hints: [],
            submissions: [],
            feedbacks: [],
          },
        });
        break;
      case 'user_message': {
        const w = r.practice !== undefined ? works.get(r.practice.taskId) : undefined;
        if (w === undefined) break;
        w.view.submissions.push({ at: r.at, via: 'interface', lines: lineViews([line], texts) });
        w.lastSubmissionLine = line;
        break;
      }
      case 'practice_submitted': {
        const w = works.get(r.taskId);
        if (w === undefined) break;
        w.view.submissions.push({
          at: r.at,
          via: 'conversation',
          lines: lineViews(r.lines, texts),
        });
        w.lastSubmissionLine = line;
        break;
      }
      case 'practice_feedback': {
        const w = works.get(r.taskId);
        if (w === undefined) break;
        w.view.feedbacks.push({
          id: r.id,
          at: r.at,
          line,
          text: r.text,
          errors: r.errors.map((e) => ({
            label: e.label,
            detail: e.detail,
            lines: lineViews(e.lines, texts),
          })),
        });
        w.lastFeedbackLine = line;
        break;
      }
      case 'practice_hint': {
        const w = works.get(r.taskId);
        if (w === undefined) break;
        w.view.hints.push({
          at: r.at,
          by: r.by,
          ...(r.note !== undefined ? { note: r.note } : {}),
        });
        if (r.by === 'teacher') w.view.hintsUsed++;
        else w.view.hintsAsked++;
        break;
      }
      case 'practice_done': {
        const w = works.get(r.taskId);
        if (w === undefined || w.view.done !== undefined) break;
        w.view.done = { at: r.at, outcome: r.outcome, note: r.note, by: r.by };
        break;
      }
      default:
        break;
    }
  }
  return [...works.values()].map((w) => {
    const v = w.view;
    v.status =
      v.done !== undefined
        ? v.done.outcome
        : w.lastSubmissionLine === 0
          ? 'assigned'
          : w.lastFeedbackLine > w.lastSubmissionLine
            ? 'feedback'
            : 'submitted';
    return v;
  });
}

/** 错误类型名合并用的键：去空白与标点、统一大小写（同一类错误模型应沿用同一个名字，这里再容一点格式差）。 */
export function labelKey(label: string): string {
  return label.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
}
