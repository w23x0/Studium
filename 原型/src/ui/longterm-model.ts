// 长期功能界面用的纯转换：没按推荐走的日常说法、“今天该做的”里今天先不看的项。单测覆盖。
import type { DeviationView, TodayItem } from '../shared/protocol.ts';
import { W } from './wording.ts';

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
