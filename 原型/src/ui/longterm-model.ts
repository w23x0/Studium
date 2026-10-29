// 长期功能界面用的纯转换：日期、路线偏差的日常说法。
import type { RouteDeviationView } from '../shared/protocol.ts';

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

/** 路线偏差 → 给学习者看的一句日常话（现算的三类，只说事实）。 */
export function deviationLine(d: RouteDeviationView): string {
  return `${dayOf(d.at)} ${d.kind}：${d.text}`;
}
