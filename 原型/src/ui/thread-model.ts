// 正本记录 → 界面上的消息列表与对话状态。纯函数，单测覆盖。
// 学习者看到的程序文字一律日常话：程序事实（给模型看的）不显示，收尾、结束等只显示一句结果。
// 模型用了什么工具、工具调用之间说的话（W12 §4.6 中途碎话）、别的对话发来的话（学习者看不到）都不显示。
// 一个讨论串在主对话里只有一张卡片，标题与状态跟着它现在的样子（W12 §4.1）。
import type {
  FindCandidate,
  NumberedRecord,
  ReviewWindow,
  RevisitKind,
} from '../shared/records.ts';
import { closeStatus } from '../shared/closing.ts';
import { foldLoop } from '../shared/loop-flags.ts';
import { threadEnded, type ThreadGroup } from '../shared/threads.ts';
import { judgementLine, W } from './wording.ts';
import { WP } from './wording-page.ts';
import { WT } from './wording-tools.ts';

export interface UiMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  /** 这条消息起始的正本行号，引用跳转用。 */
  line: number;
  /** 什么时候说的（鼠标移上去时左下角显示，W12 §4.2）。 */
  at?: string;
  /** 改过（学习者停下后改的那句、主对话改了自己上一条）：显示的是改后的。 */
  edited?: true;
  /** 主对话对这句回了一个表情（W12 §3.2）。 */
  reaction?: string;
  /** 学习者停下之后能改这一句、重新生成（W12 §4.4）。 */
  editable?: true;
  /** 讨论串卡片（W12 §4.1）：点开去那边；标题与状态现取。 */
  card?: { sessionId: string; title: string; group?: ThreadGroup };
  /** 同一轮多段回复合成一条时，合进来的全部行号（含 line）。 */
  lines?: number[];
  failed?: boolean;
  /** 收尾那一句（旧数据：守卫的收尾记录）那行：可点开看记录（line 即它所在行）。 */
  verdict?: { closed: boolean; said?: true };
  /** 学习者对某次判断提的不同看法（原话照记）。 */
  objection?: { toLine: number; label: string };
  /** 去另一个对话的入口（谈方向、开始学的任务、回到某个对话）。 */
  link?: { sessionId: string; label: string };
  /** 学习者随这句话附的图片（原图 id），对话里显示缩略图、可点开。 */
  images?: string[];
  /** 找资料对话交回的候选清单（勾了才存）。 */
  candidates?: CandidatesView;
  /** 等待中的一行（在等收尾那一句；旧数据是守卫正在整理）：灰字，那一句到了或学习对话回了话就消失。 */
  pending?: true;
}

/** 找资料的候选清单：清单所在行、各份候选；存过了带勾了哪些、存成了哪些资料。 */
export interface CandidatesView {
  line: number;
  items: FindCandidate[];
  picked?: { picked: number[]; materials: string[] };
}

export interface UiContext {
  /** 模型这一轮还在跑：没有流式文字时也放一条“正在回答”的占位。 */
  running?: boolean;
  /** 会话名（回到某个对话的入口用）。 */
  titleOf?: (sessionId: string) => string | undefined;
  /** 讨论串现在的标题与状态（卡片用；删掉的给空，卡片就不显示）。 */
  statusOf?: (sessionId: string) => { title: string; group: ThreadGroup } | undefined;
}

/**
 * 学习者改过的那句（W12 §4.4）：被改的行 → 改后的文字；改前那句之后、改的那一行之前的回答不再显示。
 * 主对话改了自己上一条：被改的行 → 改后的文字。
 */
function editsOf(records: NumberedRecord[]): {
  text: Map<number, string>;
  hidden: Set<number>;
} {
  const text = new Map<number, string>();
  const hidden = new Set<number>();
  for (const { line, record: r } of records) {
    if (r.type !== 'message_edited') continue;
    text.set(r.line, r.text);
    if (r.by === 'learner') {
      for (const x of records) if (x.line > r.line && x.line < line) hidden.add(x.line);
    }
  }
  return { text, hidden };
}

/** 学习者最后那句能不能改（W12 §4.4）：停下了、之后没有完整的回答、也没在跑。 */
export function lastEditable(records: NumberedRecord[], running: boolean): number | undefined {
  if (running) return undefined;
  let lastUser: number | undefined;
  let stopped = false;
  let answered = false;
  for (const { line, record: r } of records) {
    if (r.type === 'user_message' || (r.type === 'message_edited' && r.by === 'learner')) {
      lastUser = r.type === 'user_message' ? line : r.line;
      stopped = false;
      answered = false;
    } else if (r.type === 'turn_stopped') stopped = true;
    else if (r.type === 'assistant_message' && r.interim !== true && !stopped) answered = true;
  }
  return lastUser !== undefined && stopped && !answered ? lastUser : undefined;
}

export function toUiMessages(
  records: NumberedRecord[],
  draft: string,
  ctx: UiContext = {},
): UiMessage[] {
  const out: UiMessage[] = [];
  const push = (m: UiMessage) => out.push(m);
  const picks = new Map<number, { picked: number[]; materials: string[] }>();
  const reactions = new Map<number, string>();
  for (const { record: r } of records) {
    if (r.type === 'candidates_picked')
      picks.set(r.forLine, { picked: r.picked, materials: r.materials });
    if (r.type === 'message_reaction') reactions.set(r.line, r.emoji);
  }
  const edits = editsOf(records);
  const editable = lastEditable(records, ctx.running === true);
  /** 已经放过卡片的讨论串：一条讨论串在主对话里只有一张卡片（W12 §4.1）。 */
  const carded = new Set<string>();
  const card = (line: number, sessionId: string, fallback: string) => {
    if (carded.has(sessionId)) return;
    carded.add(sessionId);
    const status = ctx.statusOf?.(sessionId);
    // 删掉的讨论串（列表里没有了）不放卡片；没有状态函数时（单测）照旧放
    if (ctx.statusOf !== undefined && status === undefined) return;
    const title = status?.title ?? ctx.titleOf?.(sessionId) ?? fallback;
    push({
      id: `l${String(line)}`,
      role: 'system',
      text: title,
      line,
      card: { sessionId, title, ...(status !== undefined ? { group: status.group } : {}) },
    });
  };
  /** 去掉“在收尾”那行：收尾那一句到了、学习结束了、又申请了一次，或之后又有人说话（学习对话觉得还差、直接回了话）。 */
  const dropPending = () => {
    const waiting = out.findIndex((m) => m.pending === true);
    if (waiting >= 0) out.splice(waiting, 1);
  };
  for (const { line, record: r } of records) {
    const id = `l${String(line)}`;
    if (edits.hidden.has(line)) continue;
    switch (r.type) {
      case 'close_requested':
        dropPending();
        if (r.summary !== undefined && r.summary.trim() !== '') {
          // 收尾那一句到了（10-31 起学习对话写的）：照原样显示
          push({
            id,
            role: 'system',
            text: `${WP.closedSaid}${r.summary}`,
            line,
            verdict: { closed: true, said: true },
          });
        } else {
          push({ id, role: 'system', text: WT.closing, line, pending: true });
        }
        break;
      case 'user_message':
        dropPending();
        push({
          id,
          role: 'user',
          text: edits.text.get(line) ?? r.text,
          line,
          at: r.at,
          ...(edits.text.has(line) ? { edited: true as const } : {}),
          ...(reactions.has(line) ? { reaction: reactions.get(line) ?? '' } : {}),
          ...(editable === line ? { editable: true as const } : {}),
          ...(r.objection !== undefined
            ? { objection: { toLine: r.objection.toLine, label: W.objectionTag } }
            : {}),
          ...(r.images !== undefined && r.images.length > 0
            ? { images: r.images.map((i) => i.attachmentId) }
            : {}),
        });
        break;
      case 'assistant_message':
      case 'turn_failed': {
        // 工具调用之间说的话（W12 §4.6）只作“正在做什么”的依据，不显示
        if (r.type === 'assistant_message' && r.interim === true) break;
        // 学习对话回了话、没写收尾那一句（觉得还差）：不再显示“在收尾”
        dropPending();
        const text =
          r.type === 'assistant_message'
            ? (edits.text.get(line) ?? r.text)
            : r.notice !== undefined
              ? `（这次回复没完成：${r.notice}；可以再发一次）`
              : '（这次回复没完成，可以再发一次）';
        const prev = out.at(-1);
        // 同一轮里的多段助手文字合成一条显示
        if (prev?.role === 'assistant' && prev.failed !== true) {
          prev.text += `\n\n${text}`;
          prev.lines = [...(prev.lines ?? [prev.line]), line];
        } else {
          push({
            id,
            role: 'assistant',
            text,
            line,
            at: r.at,
            ...(edits.text.has(line) ? { edited: true as const } : {}),
          });
        }
        if (r.type === 'turn_failed') {
          const last = out.at(-1);
          if (last) last.failed = true;
        }
        break;
      }
      case 'guard_verdict': {
        // 旧数据：收尾记录交回了，“正在整理”那行换成整理好了（守卫 10-23 起不把关）
        dropPending();
        push({
          id,
          role: 'system',
          text: judgementLine(r.problem),
          line,
          verdict: { closed: r.closed && r.problem === undefined },
        });
        break;
      }
      case 'loop_ended': {
        dropPending();
        // 结束那句只在底栏说一次（界面说明 §2.6）
        break;
      }
      case 'ticket_edited':
        push({ id, role: 'system', text: W.ticketEdited, line });
        break;
      case 'talk_ended':
        // 方向谈好了只在底栏说一次（界面说明 §2.4）
        break;
      case 'task_opened':
        // 旧数据：导航不给入口（W12 撤掉；只读看在讨论串之外）
        if (r.kind === 'nav') break;
        card(line, r.sessionId, r.title);
        break;
      case 'turn_stopped':
        push({ id, role: 'system', text: WT.stopped, line });
        break;
      case 'find_candidates': {
        const picked = picks.get(line);
        push({
          id,
          role: 'system',
          text: W.candidatesTitle,
          line,
          candidates: { line, items: r.candidates, ...(picked !== undefined ? { picked } : {}) },
        });
        break;
      }
      case 'choice_made':
        // 旧数据：导航定了单子、开出的学习
        card(line, r.loopSessionId, '一次学习');
        break;
      case 'conversation_pointer':
        // 旧数据：回到某个对话的入口（同一讨论串只放一张卡片）
        card(line, r.sessionId, '之前那段对话');
        break;
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
      case 'page_rollback':
        // 旧数据（10-26 起不做退回）：标一行退回到哪
        push({ id, role: 'system', text: WP.rolledBackLine(r.to, r.reason), line });
        break;
      default:
        // 诊断记录、工具调用、原始消息等是给模型与审计用的，不显示
        break;
    }
  }
  if (draft !== '' || ctx.running === true) {
    out.push({ id: 'draft', role: 'assistant', text: draft, line: 0 });
  }
  return out;
}

export type LoopState =
  | { kind: 'open'; closeRequested: boolean }
  | { kind: 'awaiting_confirm'; summary: string; line: number; old?: true }
  | { kind: 'ended'; closed: boolean };

/** 学习对话现在在哪一步：进行中（在等收尾那一句时 closeRequested）/ 收尾那一句到了、等学习者确认 / 已结束。 */
export function loopState(records: NumberedRecord[]): LoopState {
  // 结束后能重开（W12 §2）：最后一次结束之后没重开过才算结束着
  const ended = foldLoop(records).ended;
  if (ended !== undefined) return { kind: 'ended', closed: ended.closed };
  const c = closeStatus(records);
  if (c?.kind === 'ready') {
    return {
      kind: 'awaiting_confirm',
      summary: c.summary,
      line: c.line,
      ...(c.old === true ? { old: true as const } : {}),
    };
  }
  return { kind: 'open', closeRequested: c?.kind === 'waiting' };
}

/** 阶段复盘的对话：回看的时间窗口（开头那行记的）；谈方向的对话没有。 */
export function reviewWindow(records: NumberedRecord[]): ReviewWindow | undefined {
  const first = records[0]?.record;
  return first?.type === 'session_opened' ? first.review : undefined;
}

/** 畅谈对话现在算不算交回了（交回后学习者又接着说就重开，以最后一条为准）。 */
export function talkEnded(records: NumberedRecord[]): boolean {
  return threadEnded(records);
}

/** 旧数据：以前界面上点“先放一放”没写原因时发的备注（这个按钮已去掉，读旧记录时仍要认出来）。 */
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
  /** 这段是阶段验收。 */
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
      case 'thread_reopened':
        ended = false;
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
