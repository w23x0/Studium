// 学习页的过程记录（11-06 试验）：模型一轮里读了什么、想了什么、做了什么，从正本算成一段，留在对话里。
// 显示：思考概要原文、每一步一行。不显示：工具返回的内容、组件代码、脚本全文、提示词与程序附的上下文。
// 只给学习者看，不进任何模型的上下文。
import type { NumberedRecord } from '../shared/records.ts';

export type ProcessItem =
  { kind: 'thought'; text: string } | { kind: 'step'; text: string; failed: boolean };

export interface ProcessGroup {
  /** 第一条的行号：在页面上排在这里。 */
  line: number;
  items: ProcessItem[];
  from: string;
  to: string;
  /** 这一轮已经写完给学习者的话。 */
  done: boolean;
}

const STEP_MAX = 100;

export function processGroups(records: readonly NumberedRecord[]): ProcessGroup[] {
  const out: ProcessGroup[] = [];
  let cur: ProcessGroup | undefined;
  const push = (line: number, at: string, item: ProcessItem) => {
    cur ??= { line, items: [], from: at, to: at, done: false };
    cur.items.push(item);
    cur.to = at;
  };
  const close = () => {
    if (cur === undefined) return;
    cur.done = true;
    out.push(cur);
    cur = undefined;
  };
  for (const { line, record: r } of records) {
    switch (r.type) {
      case 'user_message':
      case 'thread_message':
        close();
        break;
      case 'assistant_message':
        close();
        break;
      case 'model_raw':
        for (const item of rawItems(r.payload)) push(line, r.at, item);
        break;
      case 'sandbox_action':
        push(line, r.at, { kind: 'step', text: oneLine(r.summary), failed: !r.ok });
        break;
      case 'tool_call': {
        const text = toolStep(r.name, r.args);
        if (text !== undefined) {
          push(line, r.at, { kind: 'step', text, failed: r.isError });
        }
        break;
      }
      default:
        break;
    }
  }
  if (cur !== undefined) out.push(cur);
  return out;
}

/** 折起来时那一行的内容。 */
export function processSummary(g: ProcessGroup): { thoughts: number; steps: number; ms: number } {
  return {
    thoughts: g.items.filter((i) => i.kind === 'thought').length,
    steps: g.items.filter((i) => i.kind === 'step').length,
    ms: Date.parse(g.to) - Date.parse(g.from),
  };
}

/** 模型原始消息里要显示的：思考概要；联网（它们不走沙盒动作，只在这里看得到）。 */
function rawItems(payload: unknown): ProcessItem[] {
  if (typeof payload !== 'object' || payload === null) return [];
  const p = payload as { role?: unknown; content?: unknown };
  if (p.role !== 'assistant' || !Array.isArray(p.content)) return [];
  const out: ProcessItem[] = [];
  for (const block of p.content as Record<string, unknown>[]) {
    if (block.type === 'thinking' && typeof block.thinking === 'string') {
      const text = block.thinking.trim();
      if (text !== '') out.push({ kind: 'thought', text });
    } else if (block.type === 'tool_use') {
      const input = (block.input ?? {}) as Record<string, unknown>;
      if (block.name === 'WebSearch') {
        out.push({ kind: 'step', text: `网上搜：${oneLine(str(input.query))}`, failed: false });
      } else if (block.name === 'WebFetch') {
        out.push({ kind: 'step', text: `读网页：${oneLine(str(input.url))}`, failed: false });
      }
    }
  }
  return out;
}

function toolStep(name: string, args: unknown): string | undefined {
  const a = (typeof args === 'object' && args !== null ? args : {}) as Record<string, unknown>;
  const label = str(a.name) !== '' ? `「${str(a.name)}」` : '';
  switch (name) {
    case 'set_title':
      return undefined;
    case 'put_component':
      return `做组件${label}`;
    case 'edit_component':
      return `改组件${label}`;
    case 'reuse_component':
      return `拿来以前的组件${label}`;
    case 'edit_page':
    case 'move_on_page':
    case 'remove_from_page':
    case 'bring_back':
      return '改页面';
    case 'read_page':
      return '看页面';
    case 'tidy_message':
      return '整理你说的话';
    case 'note_down':
      return `记一笔：${oneLine(str(a.text))}`;
    case 'message_coordinator':
      return '给主对话发话';
    case 'message_thread':
      return '给别的对话发话';
    case 'read_thread':
    case 'list_threads':
      return '读别的对话';
    case 'ask_project':
      return '问别的项目';
    case 'close_thread':
      return '结束这个对话';
    default:
      return name;
  }
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/** 一步一行：只留第一行，去掉沙盒的长路径（学习者看到 只读/… 和文件名就够）。 */
function oneLine(s: string): string {
  const first = (s.split('\n')[0] ?? '').replace(/\/\S*?\/sandbox\/[^/\s]+\//g, '').trim();
  return first.length > STEP_MAX ? `${first.slice(0, STEP_MAX)}…` : first;
}
