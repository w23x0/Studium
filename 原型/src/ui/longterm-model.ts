// 旧数据（阶段复盘）界面用的纯转换：日期。

/** 记录时间 → 本地日期 YYYY-MM-DD（已是日期的原样给）。 */
export function dayOf(at: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(at)) return at;
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return at;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${String(d.getFullYear())}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
