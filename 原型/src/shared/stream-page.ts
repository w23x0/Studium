// 竖流学习页（10-29 #74 试验，与区域图并存）：主模型一个人管页面。页面不另存，从正本放一遍算出来——
// 开场在最上面，主模型的每条话、学习者的每句话按时间接在最下面；主模型调页面工具（改、拿掉、挪、拿回、交组件）
// 成功的那次 tool_call 照做。核心（工具、守卫）与界面都用这里的纯函数，算出来的一样。
// 改法照 Claude Code 的 Edit：按一段原文替换，原文在页面上必须唯一。
import type { MessageQuote, NumberedRecord, Ticket } from './records.ts';

/** 页面工具的名字（英文，接口只认英文）。 */
export const STREAM_TOOLS = {
  read: 'read_page',
  edit: 'edit_page',
  move: 'move_on_page',
  remove: 'remove_from_page',
  back: 'bring_back',
  put: 'put_component',
} as const;

const OPS = new Set<string>([
  STREAM_TOOLS.edit,
  STREAM_TOOLS.move,
  STREAM_TOOLS.remove,
  STREAM_TOOLS.back,
  STREAM_TOOLS.put,
]);

export type StreamMark = 'new' | 'edited' | 'moved' | 'back';

export interface StreamBlock {
  /** 程序里认块用（t12 主模型的话、u12 学习者、o3 开场、c:名字 组件），不进主模型上下文。 */
  id: string;
  kind: 'text' | 'learner' | 'opening' | 'component';
  /** 出自正本哪一行（组件 = 第一次交它的那行）。 */
  line: number;
  /** 正文：主模型的话（改过的是改后的）、学习者的话；组件 = 它的 HTML。 */
  text: string;
  /** 组件：主模型起的名字与第几版。 */
  name?: string;
  version?: number;
  /** 学习者：选中了页面上哪处再说的；或这句是在组件上的操作（组件名）。 */
  quote?: MessageQuote;
  op?: string;
  /** 开场：那时的单子。 */
  ticket?: Ticket;
  /** 最后一次被放上、改、挪、拿回是哪一行、怎么动的。 */
  touched: { line: number; how: StreamMark };
}

export interface StreamPage {
  /** 页面上从上到下。 */
  on: StreamBlock[];
  /** 拿掉了的（能拿回）。 */
  off: StreamBlock[];
}

/** 从正本算现在的页面；until = 只算到这一行之前（不含）。 */
export function replayStream(records: NumberedRecord[], until = Infinity): StreamPage {
  let page: StreamPage = { on: [], off: [] };
  let opening = false;
  const ticket =
    records[0]?.record.type === 'session_opened' ? records[0].record.ticket : undefined;
  for (const { line, record: r } of records) {
    if (line >= until) break;
    const add = (b: Omit<StreamBlock, 'touched'>) => {
      page = { ...page, on: [...page.on, { ...b, touched: { line, how: 'new' } }] };
    };
    switch (r.type) {
      case 'program_fact':
        // 开场 = 开学习时程序交的第一条事实；上页面只显示单子，程序写给模型的别的不上
        if (!opening) {
          opening = true;
          add({
            id: `o${String(line)}`,
            kind: 'opening',
            line,
            text: ticket !== undefined ? `这次学习的单子：${ticket.newPoint}` : '这次学习的开场',
            ...(ticket !== undefined ? { ticket } : {}),
          });
        }
        break;
      case 'user_message':
        add({
          id: `u${String(line)}`,
          kind: 'learner',
          line,
          text: r.text,
          ...(r.quote !== undefined ? { quote: r.quote } : {}),
        });
        break;
      case 'component_action':
        // 等回应的操作（如提交答案）以学习者的身份发出，和说的话一样上页面
        if (r.awaited && r.state !== true) {
          add({ id: `u${String(line)}`, kind: 'learner', line, text: r.text, op: r.component });
        }
        break;
      case 'assistant_message':
        if (r.text.trim() !== '') add({ id: `t${String(line)}`, kind: 'text', line, text: r.text });
        break;
      case 'tool_call':
        if (!r.isError && OPS.has(r.name)) {
          const next = applyStreamOp(page, r.name, r.args, line);
          if (!('error' in next)) page = next;
        }
        break;
      default:
        break;
    }
  }
  return page;
}

/** 学习者最后一次说话之后动过的块要标出来（到他下次说话为止）。 */
export function freshMark(records: NumberedRecord[], b: StreamBlock): StreamMark | undefined {
  let lastSaid = 0;
  for (const { line, record: r } of records) if (r.type === 'user_message') lastSaid = line;
  // 学习者还没说过话（刚开场）时整页都是新的，不标；开场块不标
  if (lastSaid === 0 || b.kind === 'opening') return undefined;
  return b.touched.line > lastSaid ? b.touched.how : undefined;
}

/**
 * 照一次页面工具调用改页面（工具当场检查用它，放正本时也用它，保证两边一样）。
 * 出错返回 { error }，措辞照 Claude Code 的 Edit。
 */
export function applyStreamOp(
  page: StreamPage,
  tool: string,
  rawArgs: unknown,
  line: number,
): StreamPage | { error: string } {
  const a = (typeof rawArgs === 'object' && rawArgs !== null ? rawArgs : {}) as Record<
    string,
    unknown
  >;
  const s = (k: string) => (typeof a[k] === 'string' ? a[k] : undefined);
  switch (tool) {
    case STREAM_TOOLS.edit:
      return edit(page, s('old_string') ?? '', s('new_string') ?? '', a.replace_all === true, line);
    case STREAM_TOOLS.remove: {
      const f = find(page.on, s('block') ?? '');
      if ('error' in f) return f;
      return { on: page.on.filter((b) => b.id !== f.id), off: [...page.off, f] };
    }
    case STREAM_TOOLS.move: {
      const f = find(page.on, s('block') ?? '');
      if ('error' in f) return f;
      const rest = page.on.filter((b) => b.id !== f.id);
      const at = insertAt(rest, s('after'));
      if (typeof at !== 'number') return at;
      return { ...page, on: splice(rest, at, { ...f, touched: { line, how: 'moved' } }) };
    }
    case STREAM_TOOLS.back: {
      const f = find(page.off, s('block') ?? '', '拿掉的块里');
      if ('error' in f) return f;
      const at = insertAt(page.on, s('after'));
      if (typeof at !== 'number') return at;
      return {
        on: splice(page.on, at, { ...f, touched: { line, how: 'back' } }),
        off: page.off.filter((b) => b.id !== f.id),
      };
    }
    case STREAM_TOOLS.put: {
      const name = (s('name') ?? '').trim();
      const html = s('html') ?? '';
      if (name === '') return { error: 'name 要写组件的名字' };
      if (html.trim() === '') return { error: 'html 是空的' };
      const id = `c:${name}`;
      const was = [...page.on, ...page.off].find((b) => b.id === id);
      const version = (was?.version ?? 0) + 1;
      const block: StreamBlock = {
        id,
        kind: 'component',
        line: was?.line ?? line,
        text: html,
        name,
        version,
        touched: { line, how: was === undefined ? 'new' : 'edited' },
      };
      const after = s('after');
      // 同名再交 = 换新版：在页面上就原位换；拿掉过的放回来
      if (after === undefined && page.on.some((b) => b.id === id)) {
        return { ...page, on: page.on.map((b) => (b.id === id ? block : b)) };
      }
      const rest = page.on.filter((b) => b.id !== id);
      const at = insertAt(rest, after);
      if (typeof at !== 'number') return at;
      return { on: splice(rest, at, block), off: page.off.filter((b) => b.id !== id) };
    }
    default:
      return { error: `不认识的页面工具：${tool}` };
  }
}

function edit(
  page: StreamPage,
  old: string,
  neu: string,
  all: boolean,
  line: number,
): StreamPage | { error: string } {
  if (old === '') return { error: 'old_string 不能是空的' };
  if (old === neu) return { error: '没有要改的：old_string 和 new_string 一样' };
  const hits = page.on.flatMap((b) =>
    b.kind === 'text' || b.kind === 'learner' ? [{ b, n: count(b.text, old) }] : [],
  );
  const total = hits.reduce((n, h) => n + h.n, 0);
  if (total === 0) return { error: `要替换的原文在页面上没找到。\n原文：${old}` };
  if (total > 1 && !all) {
    return {
      error: `找到 ${String(total)} 处要替换的原文，但 replace_all 是 false。要全部替换就把 replace_all 设为 true；只换一处就多给点上下文，让它在页面上唯一。\n原文：${old}`,
    };
  }
  for (const h of hits) {
    if (h.n === 0 || h.b.kind !== 'learner') continue;
    // 学习者的话只能整块拿掉（或挪），不能改
    if (!(h.b.text.trim() === old.trim() && neu.trim() === '')) {
      return { error: `第 ${String(h.b.line)} 行是学习者的话，不能改，只能挪或拿掉。` };
    }
  }
  const on: StreamBlock[] = [];
  const off = [...page.off];
  for (const b of page.on) {
    const h = hits.find((x) => x.b.id === b.id);
    if (h === undefined || h.n === 0) {
      on.push(b);
      continue;
    }
    const text = b.text.split(old).join(neu);
    if (text.trim() === '') off.push(b);
    else on.push({ ...b, text, touched: { line, how: 'edited' } });
  }
  return { on, off };
}

function count(text: string, sub: string): number {
  return text.split(sub).length - 1;
}

/** 认块：“第 N 行”、“组件「名」”（或组件名本身）、或块里唯一的一段原文。 */
function find(
  blocks: StreamBlock[],
  ref: string,
  where = '页面上',
): StreamBlock | { error: string } {
  const r = ref.trim();
  if (r === '') return { error: '要写是哪一块：“第 N 行”、“组件「名」”，或那块里唯一的一段原文' };
  const ln = /^第\s*(\d+)\s*行$/.exec(r);
  if (ln !== null) {
    const n = Number(ln[1]);
    const b = blocks.find((x) => x.line === n && x.kind !== 'component');
    return b ?? { error: `${where}没有第 ${String(n)} 行的块` };
  }
  const cm = /^组件「(.+)」$/.exec(r);
  const name = cm !== null ? cm[1] : r;
  const comp = blocks.find((x) => x.kind === 'component' && x.name === name);
  if (comp !== undefined) return comp;
  if (cm !== null) return { error: `${where}没有叫「${name}」的组件` };
  const hits = blocks.filter((x) => x.kind !== 'component' && x.text.includes(r));
  if (hits.length === 1 && hits[0] !== undefined) return hits[0];
  if (hits.length === 0) return { error: `${where}没找到含这段原文的块：${r}` };
  return {
    error: `${where}有 ${String(hits.length)} 块都含这段原文（第 ${hits.map((h) => String(h.line)).join('、')} 行），多给点上下文或写“第 N 行”。`,
  };
}

/** 放在谁后面：没写 = 最下面；“top” = 最上面；否则认块。 */
function insertAt(on: StreamBlock[], after: string | undefined): number | { error: string } {
  if (after === undefined || after.trim() === '') return on.length;
  if (after.trim().toLowerCase() === 'top') return 0;
  const f = find(on, after);
  if ('error' in f) return { error: `after：${f.error}` };
  return on.findIndex((b) => b.id === f.id) + 1;
}

function splice(on: StreamBlock[], at: number, b: StreamBlock): StreamBlock[] {
  return [...on.slice(0, at), b, ...on.slice(at)];
}

/** 给模型看的页面（read_page）与守卫读的页面：每块一个头，正文照原样；末尾列拿掉的（能拿回）。 */
export function streamPageText(
  page: StreamPage,
  opts: { withOff?: boolean; component?: (html: string) => string } = {},
): string {
  const withOff = opts.withOff ?? true;
  const head = (b: StreamBlock) => {
    switch (b.kind) {
      case 'text':
        return `[第 ${String(b.line)} 行 · 你写的]`;
      case 'learner':
        return b.op !== undefined
          ? `[第 ${String(b.line)} 行 · 学习者在组件「${b.op}」上]`
          : `[第 ${String(b.line)} 行 · 学习者${quoteHead(b.quote)}]`;
      case 'opening':
        return `[第 ${String(b.line)} 行 · 开场]`;
      case 'component':
        return `[组件「${b.name ?? ''}」· 第 ${String(b.version ?? 1)} 版]`;
    }
  };
  const comp = opts.component ?? ((html: string) => `（HTML ${String(html.length)} 字符）`);
  const out = page.on.map((b) => `${head(b)}\n${b.kind === 'component' ? comp(b.text) : b.text}`);
  if (page.on.length === 0) out.push('（页面是空的）');
  if (withOff && page.off.length > 0) {
    out.push(
      '',
      '拿掉了的（能用 bring_back 拿回）：',
      ...page.off.map((b) => `${head(b)} ${gist(b.kind === 'component' ? '' : b.text)}`),
    );
  }
  return out.join('\n\n');
}

function quoteHead(q: MessageQuote | undefined): string {
  if (q === undefined) return '';
  if (q.component !== undefined) return ` · 选中了组件「${q.component}」`;
  return q.line !== undefined ? ` · 选中了第 ${String(q.line)} 行里的一段` : '';
}

function gist(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 40 ? `${t.slice(0, 40)}……` : t;
}

/** 学习者选中的一段交给模型时怎么写（很长只带开头和结尾）。 */
export function quotePrefix(q: MessageQuote): string {
  if (q.component !== undefined) return `学习者选中了组件「${q.component}」\n\n`;
  const t = q.text ?? '';
  const shown = t.length > 300 ? `${t.slice(0, 160)}……${t.slice(-100)}` : t;
  return q.line !== undefined
    ? `学习者选中了第 ${String(q.line)} 行里的这段：\n「${shown}」\n\n`
    : `学习者选中了这段：\n「${shown}」\n\n`;
}
