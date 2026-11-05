// 正本记录 → 界面上的消息列表与对话状态。纯函数，单测覆盖。
// 学习者看到的程序文字一律日常话：程序事实（给模型看的）不显示。学习对话（含旧的）不走这里，走竖流学习页。
// 模型用了什么工具、工具调用之间说的话（W12 §4.6 中途碎话）、别的对话发来的话（学习者看不到）都不显示。
// 一个讨论串在主对话里只有一张卡片，标题与状态跟着它现在的样子（W12 §4.1）。
import type { NumberedRecord } from '../shared/records.ts';
import type { ThreadGroup } from '../shared/threads.ts';
import { W } from './wording.ts';
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
  /** 去另一个对话的入口（开始学的任务、回到某个对话；旧数据里有谈方向）。 */
  link?: { sessionId: string; label: string };
  /** 学习者随这句话附的图片（原图 id），对话里显示缩略图、可点开。 */
  images?: string[];
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
  const reactions = new Map<number, string>();
  for (const { record: r } of records) {
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
  for (const { line, record: r } of records) {
    const id = `l${String(line)}`;
    if (edits.hidden.has(line)) continue;
    switch (r.type) {
      case 'user_message':
        push({
          id,
          role: 'user',
          text: edits.text.get(line) ?? r.text,
          line,
          at: r.at,
          ...(edits.text.has(line) ? { edited: true as const } : {}),
          ...(reactions.has(line) ? { reaction: reactions.get(line) ?? '' } : {}),
          ...(editable === line ? { editable: true as const } : {}),
          ...(r.images !== undefined && r.images.length > 0
            ? { images: r.images.map((i) => i.attachmentId) }
            : {}),
        });
        break;
      case 'assistant_message':
      case 'turn_failed': {
        // 工具调用之间说的话（W12 §4.6）只作“正在做什么”的依据，不显示
        if (r.type === 'assistant_message' && r.interim === true) break;
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
      case 'ticket_edited':
        push({ id, role: 'system', text: W.ticketEdited, line });
        break;
      case 'talk_ended':
        // 旧数据：方向谈好了（W20 起不再有），对话里不另起一行
        break;
      case 'task_opened':
        // 旧数据：导航不给入口（W12 撤掉；只读看在讨论串之外）
        if (r.kind === 'nav') break;
        card(line, r.sessionId, r.title);
        break;
      case 'turn_stopped':
        push({ id, role: 'system', text: WT.stopped, line });
        break;
      case 'find_candidates':
        // 旧数据：找资料交回的候选（11-04 起不再开；勾选的界面 W19 撤掉），只列标题
        push({
          id,
          role: 'system',
          text: `${W.candidatesTitle}：${r.candidates.map((c) => c.title).join('；')}`,
          line,
        });
        break;
      case 'choice_made':
        // 旧数据：导航定了单子、开出的学习
        card(line, r.loopSessionId, '一次学习');
        break;
      case 'conversation_pointer':
        // 旧数据：回到某个对话的入口（同一讨论串只放一张卡片）
        card(line, r.sessionId, '之前那段对话');
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
