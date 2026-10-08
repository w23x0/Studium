// 正本记录 → 界面上的消息列表与对话状态。纯函数，单测覆盖。
// 学习者看到的程序文字一律日常话：程序事实（给模型看的）不显示，守卫判定、结束等只显示一句结果。
import type { ChoiceCard, NumberedRecord } from '../shared/records.ts';

export interface UiMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  /** 这条消息起始的正本行号，以后做引用跳转用。 */
  line: number;
  failed?: boolean;
  /** 去另一个对话的入口（谈方向、开始学的任务、回到某个对话）。 */
  link?: { sessionId: string; label: string };
}

export interface UiContext {
  /** 模型这一轮还在跑：没有流式文字时也放一条“正在回答”的占位。 */
  running?: boolean;
  /** 会话名（回到某个对话的入口用）。 */
  titleOf?: (sessionId: string) => string | undefined;
}

export function toUiMessages(
  records: NumberedRecord[],
  draft: string,
  ctx: UiContext = {},
): UiMessage[] {
  const out: UiMessage[] = [];
  const push = (m: UiMessage) => out.push(m);
  const cards = new Map<string, ChoiceCard>();
  for (const { line, record: r } of records) {
    const id = `l${String(line)}`;
    switch (r.type) {
      case 'user_message':
        push({ id, role: 'user', text: r.text, line });
        break;
      case 'assistant_message':
      case 'turn_failed': {
        const text = r.type === 'assistant_message' ? r.text : '（这次回复没完成，可以再发一次）';
        const prev = out.at(-1);
        // 同一轮里的多段助手文字合成一条显示
        if (prev?.role === 'assistant' && prev.failed !== true) prev.text += `\n\n${text}`;
        else push({ id, role: 'assistant', text, line });
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
          text:
            r.closed && r.problem === undefined
              ? '看起来这部分你已经掌握了。'
              : '还差一点，我们接着来。',
          line,
        });
        break;
      case 'loop_ended':
        push({ id, role: 'system', text: r.closed ? '这部分学完了。' : '先学到这里。', line });
        break;
      case 'project_goal':
        push({ id, role: 'system', text: `记下了你的方向：${r.text}`, line });
        break;
      case 'talk_ended':
        push({ id, role: 'system', text: '方向谈好了，回到项目里接着往下。', line });
        break;
      case 'task_opened': {
        const label = '单独谈谈你想学什么';
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
      default:
        // 程序事实、诊断记录、工具调用、原始消息等是给模型与审计用的，不显示
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
