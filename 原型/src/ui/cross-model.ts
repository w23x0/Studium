// 批 10b 界面的纯转换（可单测）：来源说明的显示行、检索筛选的查询串、状态时间轴的着色 / 分天 / 阶段变化、跨领域标记。
import type {
  CrossDomainView,
  NoteItem,
  SourceNoteField,
  SourceNoteView,
  StateTimelineEntry,
  StateTimelineResponse,
} from '../shared/protocol.ts';
import { SOURCE_NOTE_FIELDS } from '../shared/protocol.ts';

export interface NoteRow {
  field: SourceNoteField;
  item: NoteItem | undefined;
}

/** 来源说明里的五项，按固定顺序；没有的 item 为空（界面写“还没说明”，不编）。 */
export function noteRows(n: SourceNoteView): NoteRow[] {
  return SOURCE_NOTE_FIELDS.map((field) => ({ field, item: n[field] }));
}

/** 检索筛选的查询串：空的条件不带。 */
export function filterParams(f: {
  type?: string | undefined;
  point?: string | undefined;
  inBook?: string | undefined;
}): Record<string, string> {
  const out: Record<string, string> = {};
  if (f.type !== undefined && f.type !== '') out.type = f.type;
  if (f.point !== undefined && f.point !== '') out.point = f.point;
  if (f.inBook !== undefined && f.inBook !== '') out.inBook = f.inBook;
  return out;
}

/** 有几个筛选条件在起作用。 */
export function activeFilters(f: Parameters<typeof filterParams>[0]): number {
  return Object.keys(filterParams(f)).length;
}

// ───────────── 状态时间轴 ─────────────

export type ColorMode = 'stage' | 'source';

/** 阶段 → 点的颜色类（Tailwind）。没标阶段 / 认不出的阶段用灰。 */
const STAGE_DOT: Record<string, string> = {
  习惯低谷: 'bg-sky-500',
  堆积型下滑: 'bg-amber-500',
  疲劳退化: 'bg-rose-500',
  阈值型动力低: 'bg-violet-500',
  无明显阶段: 'bg-emerald-500',
  证据不足: 'bg-zinc-400',
};

const SOURCE_DOT: Record<StateTimelineEntry['record']['sourceLevel'], string> = {
  自述: 'bg-sky-500',
  观察: 'bg-emerald-500',
  推断: 'bg-amber-500',
  已确认: 'bg-primary',
};

export function dotClass(entry: StateTimelineEntry, mode: ColorMode): string {
  if (mode === 'source') return SOURCE_DOT[entry.record.sourceLevel];
  return STAGE_DOT[entry.stage ?? ''] ?? 'bg-zinc-300';
}

/** 图例：当前时间轴里出现过的阶段 / 来源档，各配色。 */
export function legend(
  entries: StateTimelineEntry[],
  mode: ColorMode,
): { key: string; dot: string }[] {
  const seen = new Set<string>();
  const out: { key: string; dot: string }[] = [];
  for (const e of entries) {
    const key = mode === 'stage' ? (e.stage ?? '') : e.record.sourceLevel;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ key, dot: dotClass(e, mode) });
  }
  return out;
}

/** 按日期（本地时间的年-月-日）分组，旧的在前。 */
export function dayGroups(
  entries: StateTimelineEntry[],
): { day: string; entries: StateTimelineEntry[] }[] {
  const out: { day: string; entries: StateTimelineEntry[] }[] = [];
  for (const e of entries) {
    const d = new Date(e.record.at);
    const day = Number.isNaN(d.getTime())
      ? e.record.at.slice(0, 10)
      : `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const last = out.at(-1);
    if (last?.day === day) last.entries.push(e);
    else out.push({ day, entries: [e] });
  }
  return out;
}

/** 阶段怎么变的：只列相邻两次整理阶段不同的地方（第一次整理算“起始”）。 */
export function stageSteps(
  stages: StateTimelineResponse['stages'],
): { at: string; from: string | undefined; to: string }[] {
  const out: { at: string; from: string | undefined; to: string }[] = [];
  let prev: string | undefined;
  for (const s of stages) {
    if (s.stage !== prev) out.push({ at: s.at, from: prev, to: s.stage });
    prev = s.stage;
  }
  return out;
}

// ───────────── 跨领域 ─────────────

/** 选项上的跨领域标记（单子里带的）：只带类型与另一边是什么。 */
export function crossOf(o: {
  ticket: { crossDomain?: { kind: CrossDomainView['kind']; otherPoint: string } };
}): { kind: CrossDomainView['kind']; otherPoint: string } | undefined {
  const c = o.ticket.crossDomain;
  return c === undefined ? undefined : { kind: c.kind, otherPoint: c.otherPoint };
}
