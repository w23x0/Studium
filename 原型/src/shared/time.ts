// 给人和模型看的时间一律用本机本地时间（界面说明 §1.4）：记录里存的是 UTC 的 ISO 串，显示前换算。

/** ISO 时间 → 本地“YYYY-MM-DD HH:MM”；解析不了原样返回。 */
export function localMinute(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${String(d.getFullYear())}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
