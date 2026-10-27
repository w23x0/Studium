// 框架小模型的那一次调用（`docs/设计/会话/学习对话.md` §11.2 框架行、`实现选型.md`「框架小模型」）：
// 只做两件事——把主模型点名拿回的极简短描述对到具体的块、按“和什么有关”摆位置。不定显示什么：
// 屏幕上只放这一轮的新块和对上的旧块；对不上不猜。这里只有纯函数：拼给小模型的话、读它的回答、切主模型的话。
import type { ScreenBlockRef } from '../../shared/screen.ts';
import { localMinute } from '../../shared/time.ts';

/** 可点名的旧块：块本身 + 它在线上的时间 + 给小模型看的种类。 */
export interface Candidate {
  ref: ScreenBlockRef;
  at: string;
}

/** 主模型这一轮“说给框架的话”（arrange_screen 工具的参数，几次调用合在一起）。 */
export interface ArrangeAsk {
  parts: { begins: string; about: string }[];
  about?: string;
  bringBack: string[];
  layout?: string;
}

const KIND_LABEL: Record<ScreenBlockRef['kind'], string> = {
  text: '主模型写的',
  learner: '学习者说的',
  subagent: '子代理交回',
  component: '组件',
  pending: '正在做的组件',
};

/** 给小模型的那段话：候选的旧块（时间 + 一句话指向，不给内容）、这一轮的新块、主模型的点名与放法。 */
export function arrangeInput(
  candidates: Candidate[],
  fresh: ScreenBlockRef[],
  ask: ArrangeAsk,
): string {
  return [
    '候选的旧块（按时间先后；每行：key · 时间 · 种类 · 一句话）：',
    ...(candidates.length > 0
      ? candidates.map(
          (c) =>
            `- ${c.ref.key} · ${localMinute(c.at)} · ${KIND_LABEL[c.ref.kind]} · ${c.ref.pointer}`,
        )
      : ['（没有）']),
    '',
    '这一轮的新块（按顺序；每行：key · 种类 · 一句话）：',
    ...fresh.map((b) => `- ${b.key} · ${KIND_LABEL[b.kind]} · ${b.pointer}`),
    '',
    '主模型点名要拿回的旧块（每条一句描述）：',
    ...(ask.bringBack.length > 0 ? ask.bringBack.map((d) => `- ${d}`) : ['（没有）']),
    '',
    `主模型说的放法：${ask.layout !== undefined && ask.layout !== '' ? ask.layout : '（没说）'}`,
  ].join('\n');
}

export interface ArrangeAnswer {
  matches: { desc: string; key?: string }[];
  rows: string[][];
}

/**
 * 读小模型的回答（一段 JSON，可能裹在代码块里）。认不出的 key 当没对上；新块漏摆的按原顺序补在后面；
 * 同一块只摆一次；一行最多两块。读不出 JSON 就抛错（调用方按“没对上”处理）。
 */
export function readAnswer(
  text: string,
  candidates: Candidate[],
  fresh: ScreenBlockRef[],
  ask: ArrangeAsk,
): ArrangeAnswer {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error(`小模型没给 JSON：${text.slice(0, 120)}`);
  const raw = JSON.parse(text.slice(start, end + 1)) as {
    matches?: { desc?: unknown; key?: unknown }[];
    rows?: unknown[];
  };
  const known = new Set(candidates.map((c) => c.ref.key));
  const freshKeys = fresh.map((b) => b.key);
  const matches = ask.bringBack.map((desc, i) => {
    const m = raw.matches?.[i];
    const key = typeof m?.key === 'string' && known.has(m.key) ? m.key : undefined;
    return { desc, ...(key !== undefined ? { key } : {}) };
  });
  const allowed = new Set([...freshKeys, ...matches.flatMap((m) => (m.key ? [m.key] : []))]);
  const placed = new Set<string>();
  const rows: string[][] = [];
  for (const row of raw.rows ?? []) {
    if (!Array.isArray(row)) continue;
    const keys = row.filter(
      (k): k is string => typeof k === 'string' && allowed.has(k) && !placed.has(k),
    );
    for (const k of keys) placed.add(k);
    for (let i = 0; i < keys.length; i += 2) rows.push(keys.slice(i, i + 2));
  }
  // 对上了但没摆的旧块放在上面，漏摆的新块按原顺序补在下面
  const missingOld = [...allowed].filter((k) => !placed.has(k) && !freshKeys.includes(k));
  const missingNew = freshKeys.filter((k) => !placed.has(k));
  return {
    matches,
    rows: [...missingOld.map((k) => [k]), ...rows, ...missingNew.map((k) => [k])],
  };
}

/**
 * 把主模型这一轮写给学习者的话切成几块（W10 §9 第 3 条：可拆，怎么切由主模型定）：每块按它给的“开头几个字”
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
    const at = begins === '' ? -1 : text.indexOf(begins, from);
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
      text: text.slice(c.at, cuts[i + 1]?.at ?? text.length).trim(),
      pointer: c.about,
    }))
    .filter((p) => p.text !== '');
}

/** 主模型没给指向时，用开头几个字当这块的一句话（给小模型认）。 */
function firstWords(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 40 ? `${t.slice(0, 40)}…` : t;
}

/** 学习者的话、子代理交回给小模型看的一句话：开头几个字。 */
export function gist(prefix: string, text: string): string {
  return `${prefix}${firstWords(text)}`;
}
