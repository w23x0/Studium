// 正本记录 → 界面上的消息列表与对话状态。纯函数。
// 学习者看到的程序文字一律日常话：程序事实（给模型看的）不显示。主对话走这里，学习对话走竖流学习页。
// 模型用了什么工具、别的对话发来的话（学习者看不到）都不显示。
// 一个讨论串在主对话里只有一张卡片，标题与状态跟着它现在的样子（W12 §4.1）。
import type { NumberedRecord } from '../shared/records.ts';
import type { ThreadGroup } from '../shared/threads.ts';
import { WT } from './wording-tools.ts';

export interface UiMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  /** 这条消息起始的正本行号。 */
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
  failed?: boolean;
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
    } else if (r.type === 'turn_stopped') {
      // 停之前写的半截不算答完（和核心 editLast 的判断一致）
      stopped = true;
      answered = false;
    } else if (r.type === 'assistant_message' && !stopped) answered = true;
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
    // 删掉的讨论串、旧种类（列表里没有）不放卡片
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
        });
        break;
      case 'assistant_message':
      case 'turn_failed': {
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
      case 'task_opened':
        card(line, r.sessionId, r.title);
        break;
      case 'turn_stopped':
        push({ id, role: 'system', text: WT.stopped, line });
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
