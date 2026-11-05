// 界面上几处共用的小转换：时间写法、要不要高亮。

/** 记录里的时间 → 本地的“月-日 时:分”；不是时间就原样给。 */
export function shortTime(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return at;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 一条消息覆盖的行里有没有要高亮的。 */
export function coversAny(lines: readonly number[], wanted: readonly number[]): boolean {
  return lines.some((l) => wanted.includes(l));
}
