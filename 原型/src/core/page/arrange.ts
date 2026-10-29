// 框架小模型的那一次调用（`docs/设计/会话/学习对话.md` §11.2 框架行、`实现选型.md`「框架小模型」）：
// 学习页是一份一直在的区域图（CSS grid-template-areas），小模型照主模型的布局指令改它——把点名拿回 / 拿掉的
// 极简短描述对到具体的块、定新块放哪、挪哪。不定显示什么：放上去的块一直在，只有主模型说拿掉才拿掉。
// 交回的区域图由框架检查（名字认不认识、是不是方块、有没有没说拿掉就消失的块），不过就打回。
// 这里只有纯函数：块的名字、拼给小模型的话、读回答、检查、把新块接在最下面、旧屏转布局、切主模型的话。
import type { PageLayout, ScreenBlockRef, ScreenManifest } from '../../shared/screen.ts';
import { localMinute } from '../../shared/time.ts';

/** 可点名的旧块：块本身 + 它在线上的时间。 */
export interface Candidate {
  ref: ScreenBlockRef;
  at: string;
}

/** 主模型这一轮“说给框架的话”（arrange_screen 工具的参数，几次调用合在一起）。 */
export interface ArrangeAsk {
  parts: { begins: string; about: string }[];
  about?: string;
  bringBack: string[];
  remove: string[];
  layout?: string;
}

/** 小模型交回的：点名各对到哪个名字、新的区域图。 */
export interface ArrangeAnswer {
  bringBack: { desc: string; key?: string }[];
  remove: { desc: string; key?: string }[];
  columns: string;
  areas: string[];
}

const KIND_LABEL: Record<ScreenBlockRef['kind'], string> = {
  text: '主模型写的',
  learner: '学习者说的',
  subagent: '子代理交回',
  component: '组件',
  pending: '正在做的组件',
  opening: '开场（程序推来的）',
  closing: '收尾记录（程序推来的）',
};

function kindLabel(b: ScreenBlockRef): string {
  return b.kind === 'learner' && b.op === true ? '学习者在组件上的操作' : KIND_LABEL[b.kind];
}

/** 块在区域图里的名字（要是合法的 CSS 名字：字母开头，只有字母、数字、_ 与 -）。 */
export function nameOf(ref: ScreenBlockRef): string {
  if (ref.kind === 'component') return safe(ref.component);
  if (ref.kind === 'pending') return `p_${safe(ref.task).slice(0, 8)}`;
  return safe(ref.key);
}

function safe(s: string): string {
  const t = s.replace(/[^A-Za-z0-9_-]/g, '_');
  return /^[A-Za-z]/.test(t) ? t : `b${t}`;
}

const EMPTY = '.';

/** 区域图的一行拆成格子。 */
export function cellsOf(row: string): string[] {
  return row
    .trim()
    .split(/\s+/)
    .filter((c) => c !== '');
}

/** 区域图里出现的名字，按从上到下、从左到右第一次出现的顺序（窄屏就按这个顺序排成一列）。 */
export function readingOrder(areas: string[]): string[] {
  const seen: string[] = [];
  for (const row of areas)
    for (const c of cellsOf(row)) if (c !== EMPTY && !seen.includes(c)) seen.push(c);
  return seen;
}

function columnCount(columns: string): number {
  return cellsOf(columns).length;
}

/** 给小模型的那段话：现在的布局、页面上的块、没在页面上的旧块（只给一句话，不给内容）、这一轮的新块、主模型的指令。 */
export function arrangeInput(
  page: PageLayout,
  offPage: Candidate[],
  fresh: ScreenBlockRef[],
  ask: ArrangeAsk,
  retry?: { answer: string; errors: string[] },
): string {
  const line = (b: ScreenBlockRef, at?: string) =>
    `- ${nameOf(b)}${at !== undefined ? ` · ${localMinute(at)}` : ''} · ${kindLabel(b)} · ${b.pointer}`;
  const onPage = readingOrder(page.areas).flatMap((n) => {
    const b = page.blocks[n];
    return b !== undefined ? [line(b)] : [];
  });
  return [
    '现在的布局：',
    `columns: ${page.columns}`,
    'areas:',
    ...(page.areas.length > 0 ? page.areas.map((r) => `"${r}"`) : ['（空的，还没放东西）']),
    '',
    '页面上现在的块（每行：名字 · 种类 · 一句话）：',
    ...(onPage.length > 0 ? onPage : ['（没有）']),
    '',
    '没在页面上、可以拿回的旧块（按时间先后；每行：名字 · 时间 · 种类 · 一句话）：',
    ...(offPage.length > 0 ? offPage.map((c) => line(c.ref, c.at)) : ['（没有）']),
    '',
    '这一轮的新块（按顺序，都要放上去）：',
    ...(fresh.length > 0 ? fresh.map((b) => line(b)) : ['（没有）']),
    '',
    '主模型点名要拿回的旧块：',
    ...(ask.bringBack.length > 0 ? ask.bringBack.map((d) => `- ${d}`) : ['（没有）']),
    '主模型点名要拿掉的块：',
    ...(ask.remove.length > 0 ? ask.remove.map((d) => `- ${d}`) : ['（没有）']),
    `主模型说的放法：${ask.layout !== undefined && ask.layout !== '' ? ask.layout : '（没说）'}`,
    ...(retry !== undefined
      ? [
          '',
          '你上一次交回的没过检查：',
          retry.answer.slice(0, 1500),
          '问题：',
          ...retry.errors.map((e) => `- ${e}`),
          '改好再交一次。',
        ]
      : []),
  ].join('\n');
}

/** 读小模型的回答（一段 JSON，可能裹在代码块里）；读不出就抛错。 */
export function readAnswer(text: string, ask: ArrangeAsk): ArrangeAnswer {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error(`小模型没给 JSON：${text.slice(0, 120)}`);
  const raw = JSON.parse(text.slice(start, end + 1)) as {
    bring_back?: { key?: unknown }[];
    remove?: { key?: unknown }[];
    columns?: unknown;
    areas?: unknown;
  };
  const pick = (descs: string[], got: { key?: unknown }[] | undefined) =>
    descs.map((desc, i) => {
      const key = got?.[i]?.key;
      return { desc, ...(typeof key === 'string' && key !== '' ? { key } : {}) };
    });
  return {
    bringBack: pick(ask.bringBack, raw.bring_back),
    remove: pick(ask.remove, raw.remove),
    columns: typeof raw.columns === 'string' ? raw.columns.trim() : '',
    areas: Array.isArray(raw.areas)
      ? raw.areas.filter((r): r is string => typeof r === 'string')
      : [],
  };
}

const COLUMN = /^(\d+(\.\d+)?fr|\d+(\.\d+)?%|auto)$/;
const MAX_COLUMNS = 4;

/**
 * 查小模型交回的布局：列宽写法、每行格数、名字都认识、同一名字占的是方块、这一轮的新块与对上的旧块都放了、
 * 页面上原有的块没写在“拿掉”里就不能消失。过了就返回新布局（去掉全空的行），不过返回问题清单。
 */
export function checkLayout(
  page: PageLayout,
  answer: ArrangeAnswer,
  fresh: ScreenBlockRef[],
  offPage: Candidate[],
): { layout: PageLayout } | { errors: string[] } {
  const errors: string[] = [];
  const cols = cellsOf(answer.columns);
  if (cols.length === 0 || cols.length > MAX_COLUMNS || !cols.every((c) => COLUMN.test(c))) {
    errors.push(
      `columns 要是 1 到 ${String(MAX_COLUMNS)} 个列宽（如 "1fr 1fr"、"2fr 1fr"），交回的是 "${answer.columns}"`,
    );
  }
  const before = new Set(readingOrder(page.areas));
  const offByName = new Map(offPage.map((c) => [nameOf(c.ref), c.ref]));
  const removed = new Set(answer.remove.flatMap((m) => (m.key !== undefined ? [m.key] : [])));
  const brought = answer.bringBack.flatMap((m) => (m.key !== undefined ? [m.key] : []));
  for (const n of removed) if (!before.has(n)) errors.push(`拿掉的 ${n} 不在页面上`);
  for (const n of brought) if (!offByName.has(n)) errors.push(`拿回的 ${n} 不在可以拿回的旧块里`);
  const freshNames = fresh.map(nameOf);
  const allowed = new Set([
    ...[...before].filter((n) => !removed.has(n)),
    ...freshNames,
    ...brought,
  ]);

  const rows = answer.areas.map(cellsOf).filter((r) => r.some((c) => c !== EMPTY));
  if (rows.length === 0 && allowed.size > 0) errors.push('areas 是空的');
  for (const [i, r] of rows.entries()) {
    if (r.length !== cols.length) {
      errors.push(
        `areas 第 ${String(i + 1)} 行有 ${String(r.length)} 格，columns 是 ${String(cols.length)} 列`,
      );
    }
    for (const c of r) {
      if (c !== EMPTY && !allowed.has(c)) errors.push(`${c} 不是能放的块（不认识，或已说拿掉）`);
    }
  }
  const placed = new Set(rows.flat().filter((c) => c !== EMPTY));
  for (const n of placed) if (!isRectangle(rows, n)) errors.push(`${n} 占的格子不是一个方块`);
  for (const n of allowed) {
    if (placed.has(n)) continue;
    if (before.has(n)) errors.push(`${n} 原来在页面上，这次没放、也没写在拿掉里`);
    else errors.push(`${n} 要放上去，但区域图里没有`);
  }
  if (errors.length > 0) return { errors };

  const blocks: Record<string, ScreenBlockRef> = {};
  for (const n of placed) {
    const ref = page.blocks[n] ?? fresh.find((b) => nameOf(b) === n) ?? offByName.get(n);
    if (ref !== undefined) blocks[n] = ref;
  }
  return { layout: { columns: cols.join(' '), areas: rows.map((r) => r.join(' ')), blocks } };
}

function isRectangle(rows: string[][], name: string): boolean {
  let top = Infinity;
  let bottom = -1;
  let left = Infinity;
  let right = -1;
  let count = 0;
  for (const [i, r] of rows.entries()) {
    for (const [j, c] of r.entries()) {
      if (c !== name) continue;
      count += 1;
      top = Math.min(top, i);
      bottom = Math.max(bottom, i);
      left = Math.min(left, j);
      right = Math.max(right, j);
    }
  }
  return count === (bottom - top + 1) * (right - left + 1);
}

/** 没给指令（或小模型两次都没交对）时：旧布局不动，新块按顺序各占一整行接在最下面。 */
export function appendBlocks(page: PageLayout, add: ScreenBlockRef[]): PageLayout {
  const n = Math.max(1, columnCount(page.columns));
  const blocks = { ...page.blocks };
  const areas = [...page.areas];
  for (const b of add) {
    const name = nameOf(b);
    if (blocks[name] !== undefined) continue;
    blocks[name] = b;
    areas.push(Array.from({ length: n }, () => name).join(' '));
  }
  return { columns: page.columns === '' ? '1fr' : page.columns, areas, blocks };
}

/** 10-29 之前的学习对话：最后一屏转成布局（一行一块占满，一行两块左右各半），之后在它上面改。 */
export function fromScreen(m: ScreenManifest): PageLayout {
  const wide = m.rows.some((r) => r.length > 1);
  const blocks: Record<string, ScreenBlockRef> = {};
  const areas = m.rows.map((r) => {
    for (const b of r) blocks[nameOf(b)] = b;
    const names = r.map(nameOf);
    return wide && names.length === 1 ? `${names[0] ?? ''} ${names[0] ?? ''}` : names.join(' ');
  });
  return { columns: wide ? '1fr 1fr' : '1fr', areas, blocks };
}

export const EMPTY_LAYOUT: PageLayout = { columns: '1fr', areas: [], blocks: {} };

/**
 * 把主模型这一轮写给学习者的话切成几块（可拆，怎么切由主模型定）：每块按它给的“开头几个字”
 * 在整段里找起点；找不到的那块并进前一块（指向接在后面）。不切就是一块。
 */
export function splitParts(text: string, ask: ArrangeAsk): { text: string; pointer: string }[] {
  const fallback = ask.about ?? firstWords(text);
  if (ask.parts.length === 0)
    return text.trim() === '' ? [] : [{ text: text.trim(), pointer: fallback }];
  const cuts: { at: number; about: string }[] = [];
  let from = 0;
  for (const p of ask.parts) {
    const begins = p.begins.trim();
    const found = begins === '' ? -1 : text.indexOf(begins, from);
    const at = found < 0 ? -1 : lineStartIfMarkup(text, found);
    if (at < 0) {
      const last = cuts.at(-1);
      if (last !== undefined) last.about = `${last.about}；${p.about}`;
      else cuts.push({ at: 0, about: p.about });
      continue;
    }
    cuts.push({ at, about: p.about });
    from = at + begins.length;
  }
  const first = cuts[0];
  if (first !== undefined && first.at > 0) {
    // 第一块前面还有话：单成一块
    cuts.unshift({ at: 0, about: ask.about ?? firstWords(text.slice(0, first.at)) });
  }
  return cuts
    .map((c, i) => ({
      text: trimRules(text.slice(c.at, cuts[i + 1]?.at ?? text.length)),
      pointer: c.about,
    }))
    .filter((p) => p.text !== '');
}

/**
 * 主模型给的“开头几个字”前面同一行只有 Markdown 记号（`**`、`#`、`- `、`1. `、`> `）时，从行首切，
 * 免得记号留在上一块（上一块末尾多出一个孤零零的 `**`，这一块的加粗也坏了）。
 */
function lineStartIfMarkup(text: string, at: number): number {
  const start = text.lastIndexOf('\n', at - 1) + 1;
  return /^[ \t>#*_+-]*(\d+[.)][ \t]*)?[*_]*$/.test(text.slice(start, at)) ? start : at;
}

/** 块与块之间的分隔由布局管：去掉一块开头、结尾单独成行的分隔线（`---`）。 */
function trimRules(t: string): string {
  return t
    .trim()
    .replace(/^(?:[-*_]{3,}[ \t]*\n+)+/, '')
    .replace(/(?:\n+[ \t]*[-*_]{3,})+$/, '')
    .trim();
}

/** 主模型没给指向时，用开头几个字当这块的一句话（给小模型认）。 */
function firstWords(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 40 ? `${t.slice(0, 40)}…` : t;
}

/** 学习者的话、子代理交回、开场、收尾记录给小模型看的一句话：开头几个字。 */
export function gist(prefix: string, text: string): string {
  return `${prefix}${firstWords(text)}`;
}
