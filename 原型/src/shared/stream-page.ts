// 竖流学习页（10-29 #74 起；W12 起是唯一的学习页）：学习对话一个人管页面。页面不另存，从正本放一遍算出来——
// 学习对话每一轮最后写的话、学习者的每句话按时间接在最下面（工具调用之间说的话不上，W12 §4.6）；学习对话调页面工具
// （改、拿掉、挪、拿回、交组件）成功的那次 tool_call 照做。核心（工具）与界面都用这里的纯函数，算出来的一样。
// 改法照 Claude Code 的 Edit：按一段原文替换，原文在页面上必须唯一。改过的文字、换过版的组件留着以前的样子（W12 §4.7）；
// 文字里单独一行写 `[[组件:名字]]` 的，组件嵌在那里（W12 §5.1）。
import type { MessageQuote, NumberedRecord } from './records.ts';

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

/** 文字里嵌组件的那一行：`[[组件:名字]]`（W12 §5.1）。 */
export const INLINE_COMPONENT = /^\s*\[\[组件[:：]\s*(.+?)\s*\]\]\s*$/;

export interface StreamBlock {
  /** 程序里认块用（t12 学习对话的话、u12 学习者、c:名字 组件），不进模型上下文。 */
  id: string;
  kind: 'text' | 'learner' | 'component';
  /** 出自正本哪一行（组件 = 第一次交它的那行）。 */
  line: number;
  /** 正文：主模型的话（改过的是改后的）、学习者的话；组件 = 它的 HTML。 */
  text: string;
  /** 组件：主模型起的名字与第几版。 */
  name?: string;
  version?: number;
  /** 学习者：选中了页面上哪几处再说的；或这句是在组件上的操作（组件名）。 */
  quotes?: MessageQuote[];
  op?: string;
  /** 以前的样子（W12 §4.7）：文字改过的改前各版、组件的前几版 HTML，早的在前。 */
  history?: string[];
  /** 组件嵌在页面上某段文字里（那段写了 `[[组件:名字]]`）：不再单独占一块。 */
  inline?: true;
  /** 学习者停下后改过这一句（W12 §4.4）。 */
  edited?: true;
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
  for (const { line, record: r } of records) {
    if (line >= until) break;
    const add = (b: Omit<StreamBlock, 'touched'>) => {
      page = { ...page, on: [...page.on, { ...b, touched: { line, how: 'new' } }] };
    };
    switch (r.type) {
      case 'message_edited': {
        // 学习者停下后改了刚发的那句（W12 §4.4）：页面上只显示改后的；改前那句之后的回答不再显示
        if (r.by !== 'learner') break;
        const from = r.line;
        const keep = (b: StreamBlock) => !(b.kind === 'text' && b.line > from && b.line < line);
        page = {
          on: page.on
            .filter(keep)
            .map((b) =>
              b.id === `u${String(from)}` ? { ...b, text: r.text, edited: true as const } : b,
            ),
          off: page.off.filter(keep),
        };
        break;
      }
      case 'user_message':
        add({
          id: `u${String(line)}`,
          kind: 'learner',
          line,
          text: r.text,
          ...(quotesOf(r).length > 0 ? { quotes: quotesOf(r) } : {}),
        });
        break;
      case 'component_action':
        // 等回应的操作（如提交答案）以学习者的身份发出，和说的话一样上页面
        if (r.awaited && r.state !== true) {
          add({ id: `u${String(line)}`, kind: 'learner', line, text: r.text, op: r.component });
        }
        break;
      case 'assistant_message':
        // 工具调用之间说的话不上页面（W12 §4.6）
        if (r.interim !== true && r.text.trim() !== '') {
          add({ id: `t${String(line)}`, kind: 'text', line, text: r.text });
        }
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
  return markInline(page);
}

/** 页面上文字里嵌了哪些组件（`[[组件:名字]]`）：那些组件标 inline，不再单独占一块。 */
function markInline(page: StreamPage): StreamPage {
  const named = new Set<string>();
  for (const b of page.on) {
    if (b.kind !== 'text') continue;
    for (const l of b.text.split('\n')) {
      const m = INLINE_COMPONENT.exec(l);
      if (m?.[1] !== undefined) named.add(m[1]);
    }
  }
  if (named.size === 0) return page;
  const mark = (b: StreamBlock): StreamBlock =>
    b.kind === 'component' && b.name !== undefined && named.has(b.name)
      ? { ...b, inline: true }
      : b;
  return { on: page.on.map(mark), off: page.off.map(mark) };
}

/** 一段文字拆成文字段与嵌进来的组件（按 `[[组件:名字]]` 那一行拆）。 */
export function inlineParts(
  text: string,
): ({ kind: 'text'; text: string } | { kind: 'component'; name: string })[] {
  const out: ({ kind: 'text'; text: string } | { kind: 'component'; name: string })[] = [];
  let buf: string[] = [];
  const flush = () => {
    if (buf.join('\n').trim() !== '') out.push({ kind: 'text', text: buf.join('\n') });
    buf = [];
  };
  for (const l of text.split('\n')) {
    const m = INLINE_COMPONENT.exec(l);
    if (m?.[1] !== undefined) {
      flush();
      out.push({ kind: 'component', name: m[1] });
    } else buf.push(l);
  }
  flush();
  return out;
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
        // 前几版留着（W12 §4.7：第 N 版，能点开看旧版）
        ...(was !== undefined ? { history: [...(was.history ?? []), was.text] } : {}),
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
    else {
      // 改过的留着改前的样子（W12 §4.7）
      on.push({
        ...b,
        text,
        history: [...(b.history ?? []), b.text],
        touched: { line, how: 'edited' },
      });
    }
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

/** 给模型看的页面（read_page）：每块一个头，正文照原样；末尾列拿掉的（能拿回）。 */
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
          : `[第 ${String(b.line)} 行 · 学习者${quoteHead(b.quotes)}]`;
      case 'component':
        return `[组件「${b.name ?? ''}」· 第 ${String(b.version ?? 1)} 版${b.inline === true ? ' · 嵌在文字里' : ''}]`;
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

function quoteHead(qs: MessageQuote[] | undefined): string {
  const parts = (qs ?? []).map((q) =>
    q.component !== undefined
      ? `组件「${q.component}」`
      : q.line !== undefined
        ? `第 ${String(q.line)} 行里的一段`
        : '一段',
  );
  return parts.length > 0 ? ` · 选中了${parts.join('、')}` : '';
}

function gist(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 40 ? `${t.slice(0, 40)}……` : t;
}

/** 一句学习者的话选中了哪几处：11-05 起记在 quotes，旧行只有一处 quote。 */
export function quotesOf(r: { quote?: MessageQuote; quotes?: MessageQuote[] }): MessageQuote[] {
  return r.quotes ?? (r.quote !== undefined ? [r.quote] : []);
}

/** 学习者选中的几处交给模型时怎么写（很长只带开头和结尾；带前后几个字的写明在哪两段字中间）。 */
export function quotesPrefix(qs: readonly MessageQuote[]): string {
  if (qs.length === 0) return '';
  const one = (q: MessageQuote): string => {
    if (q.component !== undefined) return `组件「${q.component}」`;
    const t = q.text ?? '';
    const shown = t.length > 300 ? `${t.slice(0, 160)}……${t.slice(-100)}` : t;
    const where =
      q.before !== undefined || q.after !== undefined
        ? `（前面是“${q.before ?? ''}”，后面是“${q.after ?? ''}”）`
        : '';
    return `${q.line !== undefined ? `第 ${String(q.line)} 行里的这段` : '这段'}：\n「${shown}」${where}`;
  };
  if (qs.length === 1 && qs[0] !== undefined) return `学习者选中了${one(qs[0])}\n\n`;
  return `学习者选中了 ${String(qs.length)} 处：\n${qs.map((q, i) => `${String(i + 1)}. ${one(q)}`).join('\n')}\n\n`;
}
