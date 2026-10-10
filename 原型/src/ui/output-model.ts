// 我的产出（批 8b）的纯转换：正文里的引用标记换成链接、逐行差异折叠、方法比较的表格稿、作者与保存请求。单测覆盖。
import type {
  DiffLine,
  MethodComparison,
  ObjectRefView,
  OutputAuthor,
  SaveVersionRequest,
  VersionView,
} from '../shared/m14.ts';
import { parseObjectRefs, type ObjectRef, type ObjectRefKind } from '../shared/object-ref.ts';
import { linkCitations } from './source-model.ts';
import { W } from './wording.ts';

// ───────────── 正文里的引用 ─────────────

/** 知识点 / 一步连接引用换成的链接地址前缀；Markdown 的链接组件认到它就画成知识点小标签。 */
export const OBJ_HREF = '#studium-obj-';

function encodeId(id: string): string {
  return encodeURIComponent(id).replace(/\(/g, '%28').replace(/\)/g, '%29');
}

/** 正文里的【知识点|id】【子句|id】换成 Markdown 链接 `[n](#studium-obj-point-<id>)`。 */
export function linkObjectRefs(text: string): string {
  let out = '';
  let last = 0;
  parseObjectRefs(text).forEach((r, i) => {
    out += `${text.slice(last, r.start)}[${String(i + 1)}](${OBJ_HREF}${r.kind}-${encodeId(r.id)})`;
    last = r.end;
  });
  return out + text.slice(last);
}

/** 链接地址 → 引的是哪个知识点 / 哪一步连接；不是这种链接返回空。 */
export function objectRefOf(href: string | undefined): ObjectRef | undefined {
  if (href?.startsWith(OBJ_HREF) !== true) return undefined;
  const m = /^(point|clause)-(.+)$/.exec(href.slice(OBJ_HREF.length));
  if (m?.[1] === undefined || m[2] === undefined) return undefined;
  try {
    return { kind: m[1] as ObjectRefKind, id: decodeURIComponent(m[2]) };
  } catch {
    // 地址里的编码坏了（不是我们换出来的链接）：当普通链接处理
    return undefined;
  }
}

/** 产出物正文交给 Markdown 前：教材出处与知识点引用都换成链接。 */
export function linkOutputText(text: string): string {
  return linkObjectRefs(linkCitations(text, false));
}

export function refKey(r: ObjectRef): string {
  return `${r.kind}:${r.id}`;
}

/** 核心核对过的知识点引用，按“种类:编号”查。 */
export function refMap(objects: readonly ObjectRefView[]): Map<string, ObjectRefView> {
  return new Map(objects.map((o) => [refKey(o), o]));
}

// ───────────── 版本 ─────────────

export function authorLabel(by: OutputAuthor): string {
  return W.author[by];
}

export type DiffRow = { kind: 'line'; line: DiffLine } | { kind: 'skip'; count: number };

/** 逐行差异：没变的长段只留前后几行，中间折成“…… n 行没变”。 */
export function diffRows(lines: readonly DiffLine[], context = 2): DiffRow[] {
  const keep = lines.map(() => false);
  lines.forEach((l, i) => {
    if (l.op === 'same') return;
    for (let k = Math.max(0, i - context); k <= Math.min(lines.length - 1, i + context); k++) {
      keep[k] = true;
    }
  });
  const out: DiffRow[] = [];
  let skipped = 0;
  lines.forEach((line, i) => {
    if (keep[i] === true) {
      if (skipped > 0) out.push({ kind: 'skip', count: skipped });
      skipped = 0;
      out.push({ kind: 'line', line });
    } else skipped += 1;
  });
  if (skipped > 0) out.push({ kind: 'skip', count: skipped });
  return out;
}

/** 两版的比较总按旧 → 新。 */
export function orderPair(a: number, b: number): [number, number] {
  return a <= b ? [a, b] : [b, a];
}

/** “回到这一版”：把旧版的内容（方法比较是表）基于最新版再存一版。 */
export function restoreRequest(v: VersionView, latest: number): SaveVersionRequest {
  return {
    ...(v.comparison !== undefined ? { comparison: v.comparison } : { text: v.text }),
    note: W.outputRestoreNote(v.n),
    base: latest,
  };
}

/** 保存被拒是因为别人（或老师）刚存了更新的版本。 */
export function isStaleError(e: unknown): boolean {
  return e instanceof Error && e.message.includes('更新的版本');
}

// ───────────── 方法比较的表格稿 ─────────────

/** 编辑用的稿：维度是列、每个方法一行，各维度的内容按列对齐；证据一行一条。 */
export interface ComparisonDraft {
  dims: string[];
  methods: { name: string; boundary: string; values: string[]; evidence: string }[];
  tentative: string;
}

export function toDraft(c: MethodComparison | undefined): ComparisonDraft {
  if (c === undefined) {
    const blank = () => ({ name: '', boundary: '', values: [''], evidence: '' });
    return { dims: [''], methods: [blank(), blank()], tentative: '' };
  }
  return {
    dims: [...c.dimensions],
    methods: c.methods.map((m) => ({
      name: m.name,
      boundary: m.boundary,
      values: c.dimensions.map((d) => m.values[d] ?? ''),
      evidence: m.evidence.join('\n'),
    })),
    tentative: c.tentative ?? '',
  };
}

export function fromDraft(d: ComparisonDraft): MethodComparison {
  const dims = d.dims.map((x) => x.trim());
  const tentative = d.tentative.trim();
  return {
    dimensions: dims,
    methods: d.methods.map((m) => ({
      name: m.name.trim(),
      boundary: m.boundary.trim(),
      values: Object.fromEntries(
        dims.flatMap((dim, i) => {
          const v = (m.values[i] ?? '').trim();
          return v === '' ? [] : [[dim, v]];
        }),
      ),
      evidence: m.evidence
        .split('\n')
        .map((e) => e.trim())
        .filter((e) => e !== ''),
    })),
    ...(tentative !== '' ? { tentative } : {}),
  };
}

/** 存之前先查一遍（核心也查，这里是为了当场说清楚哪里没填）。 */
export function draftProblems(d: ComparisonDraft): string[] {
  const out: string[] = [];
  const dims = d.dims.map((x) => x.trim());
  if (dims.length === 0 || dims.some((x) => x === '') || new Set(dims).size !== dims.length) {
    out.push(W.cmpProblems.dims);
  }
  if (d.methods.length < 2) out.push(W.cmpProblems.methods);
  const names = d.methods.map((m) => m.name.trim());
  if (names.some((n) => n === '') || new Set(names).size !== names.length) {
    out.push(W.cmpProblems.names);
  }
  for (const m of d.methods) {
    if (m.name.trim() !== '' && m.boundary.trim() === '') {
      out.push(W.cmpProblems.boundary(m.name.trim()));
    }
  }
  return out;
}

export function addDim(d: ComparisonDraft): ComparisonDraft {
  return {
    ...d,
    dims: [...d.dims, ''],
    methods: d.methods.map((m) => ({ ...m, values: [...m.values, ''] })),
  };
}

export function removeDim(d: ComparisonDraft, i: number): ComparisonDraft {
  return {
    ...d,
    dims: d.dims.filter((_, k) => k !== i),
    methods: d.methods.map((m) => ({ ...m, values: m.values.filter((_, k) => k !== i) })),
  };
}

export function addMethod(d: ComparisonDraft): ComparisonDraft {
  return {
    ...d,
    methods: [...d.methods, { name: '', boundary: '', values: d.dims.map(() => ''), evidence: '' }],
  };
}

export function removeMethod(d: ComparisonDraft, i: number): ComparisonDraft {
  return { ...d, methods: d.methods.filter((_, k) => k !== i) };
}

// ───────────── 相关文献 ─────────────

/** 作者一栏：逗号、顿号、分号隔开。 */
export function splitAuthors(s: string): string[] {
  return s
    .split(/[,，、;；]/)
    .map((a) => a.trim())
    .filter((a) => a !== '');
}
