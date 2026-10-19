// 正本记录 → 界面上的消息列表与对话状态。纯函数，单测覆盖。
// 学习者看到的程序文字一律日常话：程序事实（给模型看的）不显示，守卫判定、结束等只显示一句结果。
import type { ChoiceCard, NumberedRecord, ReviewWindow, RevisitKind } from '../shared/records.ts';
import { parseReviewReturned } from '../shared/records-longterm.ts';
import { finishPracticeCards, markAnswers, type PracticeUi } from './practice-model.ts';
import { judgementLine, W } from './wording.ts';

export interface UiMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  /** 这条消息起始的正本行号，引用跳转用。 */
  line: number;
  /** 同一轮多段回复合成一条时，合进来的全部行号（含 line）。 */
  lines?: number[];
  failed?: boolean;
  /** 是否学会的判断那句提示：可点开看理由（line 即判定所在行）。 */
  verdict?: { closed: boolean };
  /** 学习者对某次判断提的不同看法（原话照记）。 */
  objection?: { toLine: number; label: string };
  /** 去另一个对话的入口（谈方向、开始学的任务、回到某个对话）。 */
  link?: { sessionId: string; label: string };
  /** 学习者随这句话附的图片（原图 id），对话里显示缩略图、可点开。 */
  images?: string[];
  /** 练习（批 9）：练习卡、交给练习的作答、写好的归纳。 */
  practice?: PracticeUi;
}

export interface UiContext {
  /** 模型这一轮还在跑：没有流式文字时也放一条“正在回答”的占位。 */
  running?: boolean;
  /** 会话名（回到某个对话的入口用）。 */
  titleOf?: (sessionId: string) => string | undefined;
  /** 这个对话是阶段复盘吗（主对话里开出复盘的那句用）。 */
  isReview?: (sessionId: string) => boolean;
}

export function toUiMessages(
  records: NumberedRecord[],
  draft: string,
  ctx: UiContext = {},
): UiMessage[] {
  const out: UiMessage[] = [];
  const push = (m: UiMessage) => out.push(m);
  const cards = new Map<string, ChoiceCard>();
  /** 练习编号 → 练什么（做完那一行用）。 */
  const practiceFocus = new Map<string, string>();
  for (const { line, record: r } of records) {
    const id = `l${String(line)}`;
    switch (r.type) {
      case 'user_message':
        push({
          id,
          role: 'user',
          text: r.text,
          line,
          ...(r.objection !== undefined
            ? { objection: { toLine: r.objection.toLine, label: W.objectionTag } }
            : {}),
          ...(r.images !== undefined && r.images.length > 0
            ? { images: r.images.map((i) => i.attachmentId) }
            : {}),
          ...(r.practice !== undefined
            ? {
                practice: {
                  kind: 'answer' as const,
                  taskId: r.practice.taskId,
                  label: W.practice.answerTag,
                },
              }
            : {}),
        });
        break;
      case 'assistant_message':
      case 'turn_failed': {
        const text = r.type === 'assistant_message' ? r.text : '（这次回复没完成，可以再发一次）';
        const prev = out.at(-1);
        // 同一轮里的多段助手文字合成一条显示
        if (prev?.role === 'assistant' && prev.failed !== true) {
          prev.text += `\n\n${text}`;
          prev.lines = [...(prev.lines ?? [prev.line]), line];
        } else push({ id, role: 'assistant', text, line });
        if (r.type === 'turn_failed') {
          const last = out.at(-1);
          if (last) last.failed = true;
        }
        break;
      }
      case 'guard_verdict':
        push({
          id,
          role: 'system',
          text: judgementLine(r.closed, r.problem),
          line,
          verdict: { closed: r.closed && r.problem === undefined },
        });
        break;
      case 'loop_ended':
        push({ id, role: 'system', text: r.closed ? '这部分学完了。' : '先学到这里。', line });
        break;
      case 'project_goal':
        push({ id, role: 'system', text: `记下了你的方向：${r.text}`, line });
        break;
      case 'talk_ended':
        push({
          id,
          role: 'system',
          text:
            r.review !== undefined ? W.reviewEndedLine(r.goal) : '方向谈好了，回到项目里接着往下。',
          line,
        });
        break;
      case 'task_opened': {
        // 写产出的对话（批 8b）标题是“写：某某”；阶段复盘（批 6）；别的是谈方向的对话
        const label =
          r.kind === 'output'
            ? `一起写：${r.title.replace(/^写：/, '')}`
            : ctx.isReview?.(r.sessionId) === true
              ? W.reviewTask
              : '单独谈谈你想学什么';
        push({ id, role: 'system', text: label, line, link: { sessionId: r.sessionId, label } });
        break;
      }
      case 'choice_card':
        cards.set(r.cardId, r);
        break;
      case 'choice_made': {
        const title = cards.get(r.cardId)?.options[r.option]?.title;
        const label = title !== undefined ? `开始学：${title}` : '开始学';
        push({
          id,
          role: 'system',
          text: label,
          line,
          link: { sessionId: r.loopSessionId, label },
        });
        break;
      }
      case 'conversation_pointer': {
        const label = `回到：${ctx.titleOf?.(r.sessionId) ?? '之前那段学习'}`;
        push({ id, role: 'system', text: label, line, link: { sessionId: r.sessionId, label } });
        break;
      }
      case 'loop_shelved': {
        const note = learnerShelveNote(r.note);
        push({
          id,
          role: 'system',
          text: note !== undefined ? W.shelvedLineNote(note) : W.shelvedLine,
          line,
        });
        break;
      }
      case 'loop_resumed':
        push({ id, role: 'system', text: W.resumedLine, line });
        break;
      case 'program_fact': {
        // 程序事实是给模型看的，不显示；唯一例外：阶段复盘交回主对话的那一句（像学完一段那样显示一行）
        const back = parseReviewReturned(r.text);
        if (back !== undefined) {
          const label = W.reviewEndedLine(back.summary);
          push({
            id,
            role: 'system',
            text: label,
            line,
            link: { sessionId: back.reviewSessionId, label },
          });
        }
        break;
      }
      // 练习（批 9）：布置的题是一张卡；老师认的作答把那几句标上；做完 / 放下与写好的归纳各一行
      case 'practice_assigned':
        practiceFocus.set(r.id, r.focus);
        push({
          id,
          role: 'system',
          text: W.practice.cardText(r.focus),
          line,
          practice: { kind: 'card', taskId: r.id, loopOpen: true, candidates: [] },
        });
        break;
      case 'practice_submitted':
        markAnswers(out, r.taskId, r.lines, W.practice.markedTag);
        break;
      case 'practice_done':
        push({
          id,
          role: 'system',
          text: W.practice.doneLine(r.outcome, practiceFocus.get(r.taskId) ?? ''),
          line,
        });
        break;
      case 'practice_summary':
        push({
          id,
          role: 'system',
          text: W.practice.summaryLine,
          line,
          practice: { kind: 'summary', id: r.id },
        });
        break;
      default:
        // 诊断记录、工具调用、原始消息等是给模型与审计用的，不显示
        break;
    }
  }
  finishPracticeCards(out, records);
  if (draft !== '' || ctx.running === true) {
    out.push({ id: 'draft', role: 'assistant', text: draft, line: 0 });
  }
  return out;
}

export type LoopState =
  | { kind: 'open'; closeRequested: boolean }
  | { kind: 'awaiting_confirm'; basis: string }
  | { kind: 'ended'; closed: boolean };

/** 闭环对话现在在哪一步：进行中 / 守卫判合上等学习者确认 / 已结束。 */
export function loopState(records: NumberedRecord[]): LoopState {
  let state: LoopState = { kind: 'open', closeRequested: false };
  for (const { record: r } of records) {
    if (r.type === 'close_requested' && state.kind === 'open') {
      state = { kind: 'open', closeRequested: true };
    }
    if (r.type === 'guard_verdict') {
      state = r.closed
        ? { kind: 'awaiting_confirm', basis: r.basis }
        : { kind: 'open', closeRequested: false };
    }
    if (r.type === 'loop_ended') state = { kind: 'ended', closed: r.closed };
  }
  return state;
}

/** 阶段复盘的对话：回看的时间窗口（开头那行记的）；谈方向的对话没有。 */
export function reviewWindow(records: NumberedRecord[]): ReviewWindow | undefined {
  const first = records[0]?.record;
  return first?.type === 'session_opened' ? first.review : undefined;
}

/** 畅谈对话交回了没有。 */
export function talkEnded(records: NumberedRecord[]): boolean {
  return records.some((r) => r.record.type === 'talk_ended');
}

/** 主对话里还没选的最新一张选择卡。 */
export function pendingCard(records: NumberedRecord[]): ChoiceCard | undefined {
  const chosen = new Set(
    records.flatMap((r) => (r.record.type === 'choice_made' ? [r.record.cardId] : [])),
  );
  const cards = records.flatMap((r) => (r.record.type === 'choice_card' ? [r.record] : []));
  const last = cards.at(-1);
  return last && !chosen.has(last.cardId) ? last : undefined;
}

/** 界面上点“先放一放”没写原因时发的备注（核心照存；显示时不当成学习者的话）。 */
export const SHELVE_NO_NOTE = '学习者点了“先放一放”，没写为什么';

/**
 * 搁置备注里学习者自己写的那句；程序代写的（没写原因、接口默认）不算，返回空。
 * 程序代写的几种：界面的 SHELVE_NO_NOTE、接口不带备注时的默认话。
 */
export function learnerShelveNote(note: string): string | undefined {
  const t = note.trim();
  if (t === '' || t === SHELVE_NO_NOTE || t === '学习者在界面上点了按钮') return undefined;
  return t;
}

/** 一段学习的中途状态（顶部提示、底部操作用）。 */
export interface LoopSide {
  /** 先放一放着（已结束的不算）。 */
  shelved?: { at: string; note?: string };
  /** 这段是接着另一段没学完的学的（批 6）。 */
  resumeOf?: string;
  /** 这段是复习 / 复检（批 6）。 */
  revisit?: RevisitKind;
  /** 这段是阶段验收（批 9）。 */
  stageCheck?: boolean;
}

export function loopSide(records: NumberedRecord[]): LoopSide {
  let shelved: LoopSide['shelved'];
  let resumeOf: string | undefined;
  let revisit: RevisitKind | undefined;
  let stageCheck = false;
  let ended = false;
  for (const { record: r } of records) {
    switch (r.type) {
      case 'session_opened':
        if (r.resumeOf !== undefined) resumeOf = r.resumeOf.fromLoop;
        if (r.ticket?.revisit !== undefined) revisit = r.ticket.revisit.kind;
        if (r.ticket?.stageCheck === true) stageCheck = true;
        break;
      case 'loop_ended':
        ended = true;
        break;
      case 'loop_shelved': {
        const note = learnerShelveNote(r.note);
        shelved = { at: r.at, ...(note !== undefined ? { note } : {}) };
        break;
      }
      case 'loop_resumed':
        shelved = undefined;
        break;
      default:
        break;
    }
  }
  return {
    ...(!ended && shelved !== undefined ? { shelved } : {}),
    ...(resumeOf !== undefined ? { resumeOf } : {}),
    ...(revisit !== undefined ? { revisit } : {}),
    ...(stageCheck ? { stageCheck } : {}),
  };
}
