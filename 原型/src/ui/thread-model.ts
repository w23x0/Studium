// 正本记录 → 界面上的消息列表与对话状态。纯函数，单测覆盖。
// 学习者看到的程序文字一律日常话：程序事实（给模型看的）不显示，守卫判定、结束等只显示一句结果。
import type {
  ChoiceCard,
  FindCandidate,
  NumberedRecord,
  ReviewWindow,
  RevisitKind,
} from '../shared/records.ts';
import { parseReviewReturned } from '../shared/records-longterm.ts';
import { judgementLine, W } from './wording.ts';
import { sandboxLabel, toolLabel, WT } from './wording-tools.ts';

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
  /** 找资料对话交回的候选清单（勾了才存）。 */
  candidates?: CandidatesView;
  /** 工具行：模型这一段用了哪些工具、做了什么（一行摘要，可展开）；调工具前的短旁白收在这里，不当正文。 */
  tools?: ToolGroup;
  /** 等待中的一行（守卫正在整理）：灰字，判断出来后消失。 */
  pending?: true;
}

/** 一组连着的工具调用 / 沙盒动作。 */
export interface ToolGroup {
  labels: string[];
  /** 模型调工具前说的短话（给程序的过程说明，不算回答）。 */
  narration: string[];
  /** 其中没成的几次。 */
  failed: number;
}

/** 调工具前的旁白最长多少字算“短”（再长就当正文照常显示）。 */
const NARRATION_MAX = 120;
/** 这些记录夹在旁白与工具调用之间也不算打断。 */
const QUIET = new Set(['model_raw', 'model_used', 'model_session', 'turn_context']);
const TOOLISH = new Set(['tool_call', 'sandbox_action', 'task_opened']);

/** 哪几行助手文字只是调工具前的短旁白：紧跟着（中间只隔原始消息）就是工具调用、沙盒动作或开任务。 */
function narrationLines(records: NumberedRecord[]): Set<number> {
  const out = new Set<number>();
  records.forEach(({ line, record: r }, i) => {
    if (r.type !== 'assistant_message' || r.text.trim().length > NARRATION_MAX) return;
    for (const next of records.slice(i + 1)) {
      if (QUIET.has(next.record.type)) continue;
      if (TOOLISH.has(next.record.type)) out.add(line);
      return;
    }
  });
  return out;
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
  const picks = new Map<number, { picked: number[]; materials: string[] }>();
  for (const { record: r } of records) {
    if (r.type === 'candidates_picked')
      picks.set(r.forLine, { picked: r.picked, materials: r.materials });
  }
  const narration = narrationLines(records);
  /** 最近一组工具行：之后只有程序的小字（入口卡片等）时，新的工具调用并进这一组。 */
  const toolGroup = (id: string, line: number): ToolGroup => {
    for (let i = out.length - 1; i >= 0; i--) {
      const m = out[i];
      if (m === undefined || m.role !== 'system') break;
      if (m.tools !== undefined) return m.tools;
    }
    const tools: ToolGroup = { labels: [], narration: [], failed: 0 };
    // 工具行放在它开出的入口卡片前面（开对话、开学习的卡片是工具调用的结果，记录里却先到）
    let at = out.length;
    while (at > 0 && out[at - 1]?.role === 'system' && out[at - 1]?.link !== undefined) at -= 1;
    out.splice(at, 0, { id, role: 'system', text: '', line, tools });
    return tools;
  };
  /** 导航对话之后主对话有没有接着说话或开学习：有就是定完了（学习者中途插话不算）。 */
  const laterActivity = (afterLine: number) =>
    records.some(
      ({ line: l, record: x }) =>
        l > afterLine && (x.type === 'choice_made' || x.type === 'assistant_message'),
    );
  /** 去掉“正在整理”那行：判断出来了、学习结束了、又申请了一次，或之后又有人说话（守卫没交回时不卡在那里）。 */
  const dropPending = () => {
    const waiting = out.findIndex((m) => m.pending === true);
    if (waiting >= 0) out.splice(waiting, 1);
  };
  for (const { line, record: r } of records) {
    const id = `l${String(line)}`;
    switch (r.type) {
      case 'tool_call': {
        const g = toolGroup(id, line);
        const label = toolLabel(r.name);
        if (label !== '') g.labels.push(label);
        if (r.isError) g.failed += 1;
        break;
      }
      case 'sandbox_action': {
        const g = toolGroup(id, line);
        g.labels.push(sandboxLabel(r.op, r.path));
        if (!r.ok) g.failed += 1;
        break;
      }
      case 'close_requested':
        dropPending();
        push({ id, role: 'system', text: WT.closing, line, pending: true });
        break;
      case 'user_message':
        dropPending();
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
        });
        break;
      case 'assistant_message':
      case 'turn_failed': {
        if (r.type === 'assistant_message' && narration.has(line)) {
          toolGroup(id, line).narration.push(r.text.trim());
          break;
        }
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
      case 'guard_verdict': {
        // 判断出来了：“正在整理”那行换成判断
        dropPending();
        push({
          id,
          role: 'system',
          text: judgementLine(r.closed, r.problem),
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
      case 'project_goal':
        push({ id, role: 'system', text: W.goalSavedLine, line });
        break;
      case 'talk_ended':
        // 方向谈好了只在底栏说一次（界面说明 §2.4）
        break;
      case 'task_opened': {
        // 写产出的对话（批 8b）标题是“写：某某”；阶段复盘（批 6）；想下一步（导航，只看不聊）；别的是谈方向的对话
        const label =
          r.kind === 'output'
            ? `一起写：${r.title.replace(/^写：/, '')}`
            : r.kind === 'nav'
              ? `${laterActivity(line) ? WT.navDone : `${WT.navRunning}…`} · ${WT.navWatch}`
              : r.kind === 'find'
                ? W.findTask
                : ctx.isReview?.(r.sessionId) === true
                  ? W.reviewTask
                  : '单独谈谈你想学什么';
        push({ id, role: 'system', text: label, line, link: { sessionId: r.sessionId, label } });
        break;
      }
      case 'choice_card':
        cards.set(r.cardId, r);
        break;
      case 'project_instructions':
        // 主对话代写的项目说明：显示一行，学习者知道改了、去哪看（学习者自己在项目页改的不显示）
        if (r.by === 'main') push({ id, role: 'system', text: W.instructionsChangedLine, line });
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
      default:
        // 诊断记录、工具调用、原始消息等是给模型与审计用的，不显示
        break;
    }
  }
  if (draft !== '' || ctx.running === true) {
    out.push({ id: 'draft', role: 'assistant', text: draft, line: 0 });
  }
  // 只有结果另有显示的工具、也没说什么话的工具行不留（不占一行空白）
  return out.filter(
    (m) => m.tools === undefined || m.tools.labels.length + m.tools.narration.length > 0,
  );
}

export type LoopState =
  | { kind: 'open'; closeRequested: boolean }
  | { kind: 'awaiting_confirm'; basis: string }
  | { kind: 'ended'; closed: boolean };

/** 学习对话现在在哪一步：进行中 / 判定合上、等学习者确认 / 已结束。 */
export function loopState(records: NumberedRecord[]): LoopState {
  let state: LoopState = { kind: 'open', closeRequested: false };
  for (const { record: r } of records) {
    if (r.type === 'close_requested' && state.kind === 'open') {
      state = { kind: 'open', closeRequested: true };
    }
    // 申请后学习者又说话了（比如整理没交回来）：按钮恢复，可以再申请
    if (r.type === 'user_message' && state.kind === 'open') {
      state = { kind: 'open', closeRequested: false };
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
