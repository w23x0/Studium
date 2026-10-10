// 跨段学习的长期功能（批 6）界面用的纯转换：我学会的现状筛选与排序、一个知识点的经过、
// 每段学习的分析版本、没按推荐走的日常说法、“今天该做的”里今天先不看的项。单测覆盖。
import type {
  DeviationView,
  FormationView,
  PointViewEntry,
  TimelineView,
  TodayItem,
  ViewStatus,
} from '../shared/protocol.ts';
import { W } from './wording.ts';

export type ViewSort = 'recent' | 'oldest';

/** 我学会的：按搜索词、状态筛，按最近 / 最久没碰排。核心给的顺序是最近碰过的在前。 */
export function filterView(
  entries: PointViewEntry[],
  opt: { q?: string; status?: ViewStatus | ''; sort?: ViewSort },
): PointViewEntry[] {
  const q = opt.q?.trim().toLowerCase() ?? '';
  const out = entries.filter(
    (e) =>
      (opt.status === undefined || opt.status === '' || e.status === opt.status) &&
      (q === '' ||
        [e.point.name, e.summary, ...e.keywords].some((s) => s.toLowerCase().includes(q))),
  );
  const byTouched = (a: PointViewEntry, b: PointViewEntry) =>
    a.lastTouchedAt.localeCompare(b.lastTouchedAt);
  return opt.sort === 'oldest' ? out.sort(byTouched) : out.sort((a, b) => byTouched(b, a));
}

/** 各状态有几个（筛选按钮上的数）。 */
export function statusCounts(entries: PointViewEntry[]): Map<ViewStatus, number> {
  const m = new Map<ViewStatus, number>();
  for (const e of entries) m.set(e.status, (m.get(e.status) ?? 0) + 1);
  return m;
}

/** 一句话摘要：核心对“只在别的学习里当已会的用过”写的占位话换成日常说法。 */
export function entrySummary(e: PointViewEntry): string {
  if (e.summary.startsWith('（在别的') && e.summary.includes('用过')) return W.summaryAsBase;
  return e.summary;
}

/** 档次的日常说法；不认得的照原样。 */
export function levelText(level: string | undefined): string | undefined {
  if (level === undefined || level.trim() === '') return undefined;
  return W.levels[level.trim()] ?? level;
}

export type HistoryKind = keyof typeof W.historyEvent;

/** 一个知识点经过的一步：学会 / 复习 / 复检 / 在别的学习里用上 / 提取失败 / 降档 / 重新掌握。 */
export interface HistoryEvent {
  at: string;
  kind: HistoryKind;
  loopSessionId: string;
  /** 形成记录那一步：记录 id 与当时的证据强度。 */
  recordId?: string;
  strength?: string;
  /** 时间版本记录那一步。 */
  timeline?: TimelineView;
}

/** 这条形成记录里某个点的证据强度。 */
function strengthOf(f: FormationView, point: string): string {
  if (f.evidence === undefined) return f.evidenceStrength;
  if (f.newPoint.id === point) {
    return `${f.evidence.newPoint.time}、${f.evidence.newPoint.independence}`;
  }
  const s = f.evidence.startPoints.find((x) => x.point === point);
  return s !== undefined ? `${s.time}、${s.independence}` : f.evidenceStrength;
}

/**
 * 一个知识点的经过（旧在前）：每段学习取最新一版分析，时间用这段学习第一次写分析的时间
 * （重做分析不改“什么时候学会的”）；加上提取失败 / 降档 / 重新掌握。
 */
export function pointHistory(
  point: string,
  formations: FormationView[],
  timeline: TimelineView[],
): HistoryEvent[] {
  const firstAt = new Map<string, string>();
  for (const f of formations) {
    const at = firstAt.get(f.loopSessionId);
    if (at === undefined || f.at < at) firstAt.set(f.loopSessionId, f.at);
  }
  const out: HistoryEvent[] = [];
  for (const f of formations) {
    if (!f.latest) continue;
    const asNew = f.newPoint.id === point;
    if (!asNew && !f.startPoints.some((p) => p.id === point)) continue;
    out.push({
      at: firstAt.get(f.loopSessionId) ?? f.at,
      kind: asNew ? (f.revisit?.kind ?? 'learned') : 'base',
      loopSessionId: f.loopSessionId,
      recordId: f.id,
      strength: strengthOf(f, point),
    });
  }
  for (const t of timeline) {
    if (t.point.id !== point) continue;
    out.push({ at: t.at, kind: t.kind, loopSessionId: t.loopSessionId, timeline: t });
  }
  // 同一时刻：学会在前，时间版本记录在后（与核心折叠的先后一致）
  const rank = (e: HistoryEvent) => (e.timeline !== undefined ? 1 : 0);
  return out.sort((a, b) => a.at.localeCompare(b.at) || rank(a) - rank(b));
}

/** 一段学习对这个知识点写过的几版分析（旧版在前），以及最新的一版。 */
export interface AnalysisGroup {
  loopSessionId: string;
  versions: FormationView[];
  latest: FormationView;
}

/** 以这个知识点为要学的那几段学习的分析，最近学的在前。 */
export function analysisGroups(point: string, formations: FormationView[]): AnalysisGroup[] {
  const byLoop = new Map<string, FormationView[]>();
  for (const f of formations) {
    if (f.newPoint.id !== point) continue;
    byLoop.set(f.loopSessionId, [...(byLoop.get(f.loopSessionId) ?? []), f]);
  }
  const out: AnalysisGroup[] = [];
  for (const [loopSessionId, list] of byLoop) {
    const versions = [...list].sort((a, b) => a.version - b.version);
    const latest = versions.find((v) => v.latest) ?? versions.at(-1);
    if (latest !== undefined) out.push({ loopSessionId, versions, latest });
  }
  const first = (g: AnalysisGroup) => g.versions[0]?.at ?? '';
  return out.sort((a, b) => first(b).localeCompare(first(a)));
}

/** 记录时间 → 本地日期 YYYY-MM-DD（已是日期的原样给）。 */
export function dayOf(at: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(at)) return at;
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return at;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${String(d.getFullYear())}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 日期加几天（YYYY-MM-DD，按日历日算）。 */
export function addDays(date: string, days: number): string {
  const t = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(t)) return date;
  return new Date(t + days * 86_400_000).toISOString().slice(0, 10);
}

/** 路线偏差 → 给学习者看的一句日常话（只说事实）。 */
export function deviationLine(
  d: DeviationView,
  titleOf?: (id: string) => string | undefined,
): string {
  const rec = d.recommended?.title ?? W.thatPart;
  const chosen = d.chosen?.title ?? W.thatPart;
  switch (d.kind) {
    case 'not_recommended':
      return W.devNotRecommended(rec, chosen);
    case 'ended_unclosed': {
      const title =
        (d.loopSessionId !== undefined ? titleOf?.(d.loopSessionId) : undefined) ??
        d.chosen?.title ??
        W.thatPart;
      const f = d.facts;
      const facts =
        f !== undefined
          ? `（${W.devEndedFacts(f.learnerMessages, f.minutes)}${f.quickDrop === true ? `，${W.devQuick}` : ''}）`
          : '';
      return `${W.devEnded(title)}${facts}`;
    }
    case 'detour_choice':
      return d.recommended !== undefined &&
        d.chosen !== undefined &&
        d.recommended.option !== d.chosen.option
        ? W.devDetour(rec, chosen)
        : W.devDetourSame(chosen);
  }
}

/** “今天该做的”里一项的键：提醒按 id，期限与复盘各一个（今天先不看时按它记）。 */
export function todayKey(item: TodayItem): string {
  return item.kind === 'reminder' ? `reminder:${item.reminder.id}` : item.kind;
}

/** 今天先不看的项存在本机浏览器里，按项目与日期分开（第二天自动重新出现）。 */
export function todaySkipStorageKey(projectId: string, date: string): string {
  return `studium-today-later:${projectId}:${date}`;
}

export function visibleToday(items: TodayItem[], later: readonly string[]): TodayItem[] {
  return items.filter((i) => !later.includes(todayKey(i)));
}
