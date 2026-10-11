// 练习（批 9）的纯转换：对话里练习卡要的东西（能选作作答的原话、学习结束没有）、卡下按时间排的经过、
// “帮我归纳一下”能不能点、阶段验收的标记。单测覆盖。
import type { LearnerLineView, PracticeErrorView, PracticeTaskView } from '../shared/protocol.ts';
import type { NumberedRecord } from '../shared/records.ts';

/** 对话里和练习有关的消息附带的东西。 */
export type PracticeUi =
  /** 练习卡：loopOpen = 这段学习还没结束（结束了卡上不能再操作）；candidates = 布置之后学习者说的话（可选作作答）。 */
  | { kind: 'card'; taskId: string; loopOpen: boolean; candidates: LearnerLineView[] }
  /** 学习者的这句话是某道练习的作答（经卡交的，或老师认的）。 */
  | { kind: 'answer'; taskId: string; label: string }
  /** 写好了一份“这类题怎么想”。 */
  | { kind: 'summary'; id: string };

/** 可选作作答的原话最多列几句（最近的）。 */
export const CANDIDATE_LIMIT = 8;

interface MessageLike {
  role: 'user' | 'assistant' | 'system';
  text: string;
  line: number;
  objection?: unknown;
  practice?: PracticeUi;
}

/**
 * 对话转完后补上练习卡要的两样：每张卡之后学习者说过的话（最近几句，异议不算）、这段学习结束没有。
 * 直接改传进来的消息（与 thread-model 里合并消息的做法一致）。
 */
export function finishPracticeCards(out: MessageLike[], records: NumberedRecord[]): void {
  const ended = records.some((r) => r.record.type === 'loop_ended');
  for (const m of out) {
    if (m.practice?.kind !== 'card') continue;
    const after = out.filter(
      (x) => x.role === 'user' && x.line > m.line && x.objection === undefined,
    );
    m.practice = {
      ...m.practice,
      loopOpen: !ended,
      candidates: after.slice(-CANDIDATE_LIMIT).map((x) => ({ line: x.line, text: x.text })),
    };
  }
}

/** 老师把这几行认作作答：对话里那几句标上（已经标过的不改）。 */
export function markAnswers(
  out: MessageLike[],
  taskId: string,
  lines: number[],
  label: string,
): void {
  for (const m of out) {
    if (m.role === 'user' && lines.includes(m.line) && m.practice === undefined) {
      m.practice = { kind: 'answer', taskId, label };
    }
  }
}

/** 练习卡下按时间排的一条经过。 */
export type TimelineItem =
  | { kind: 'submission'; at: string; via: 'interface' | 'conversation'; lines: LearnerLineView[] }
  | { kind: 'hint'; at: string; by: 'learner' | 'teacher'; note?: string }
  | { kind: 'feedback'; at: string; line: number; text: string; errors: PracticeErrorView[] }
  | {
      kind: 'done';
      at: string;
      outcome: 'completed' | 'abandoned';
      note: string;
      by: 'teacher' | 'learner';
    };

const ORDER: Record<TimelineItem['kind'], number> = {
  submission: 0,
  hint: 1,
  feedback: 2,
  done: 3,
};

/** 作答、提示、反馈、做完按时间排（同一时刻按 作答 → 提示 → 反馈 → 做完）。 */
export function taskTimeline(task: PracticeTaskView): TimelineItem[] {
  const items: TimelineItem[] = [
    ...task.submissions.map((s): TimelineItem => ({
      kind: 'submission',
      at: s.at,
      via: s.via,
      lines: s.lines,
    })),
    ...task.hints.map((h): TimelineItem => ({
      kind: 'hint',
      at: h.at,
      by: h.by,
      ...(h.note !== undefined && h.note.trim() !== '' ? { note: h.note } : {}),
    })),
    ...task.feedbacks.map((f): TimelineItem => ({
      kind: 'feedback',
      at: f.at,
      line: f.line,
      text: f.text,
      errors: f.errors,
    })),
    ...(task.done !== undefined ? [{ kind: 'done' as const, ...task.done }] : []),
  ];
  return items
    .map((x, i) => ({ x, i }))
    .sort((a, b) => a.x.at.localeCompare(b.x.at) || ORDER[a.x.kind] - ORDER[b.x.kind] || a.i - b.i)
    .map(({ x }) => x);
}

/** 这道题还能不能交、要提示、放下：没结束的题、学习也没结束。 */
export function taskOpen(task: PracticeTaskView, loopOpen: boolean): boolean {
  return loopOpen && task.status !== 'completed' && task.status !== 'abandoned';
}

/** 归纳至少要几道做完的练习（与核心一致）。 */
export const SUMMARY_MIN = 2;

/** “帮我归纳一下”：这段学习里有没有练习（没有就不显示）、做完几道、能不能点。 */
export function summarizeState(tasks: PracticeTaskView[]): {
  show: boolean;
  completed: number;
  can: boolean;
} {
  const completed = tasks.filter((t) => t.status === 'completed').length;
  return { show: tasks.length > 0, completed, can: completed >= SUMMARY_MIN };
}

/** 作答与反馈里提到的学习者原话行（列表里“看作答”跳回去用）。 */
export function answerLines(task: PracticeTaskView): number[] {
  return [...new Set(task.submissions.flatMap((s) => s.lines.map((l) => l.line)))].sort(
    (a, b) => a - b,
  );
}

/** 一段文字的头一行（归纳列表里先只显示这一行，点开看全文）。 */
export function firstLine(text: string, max = 80): string {
  const line =
    text
      .trim()
      .split('\n')[0]
      ?.replace(/^#+\s*/, '') ?? '';
  return line.length > max ? `${line.slice(0, max)}…` : line;
}
