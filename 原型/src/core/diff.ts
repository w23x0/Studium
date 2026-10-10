// 逐行差异（M14 修订比较）：最长公共子序列，先剥掉相同的头尾。纯函数。
import type { DiffLine } from '../shared/m14.ts';

/** 行数乘积超过这个就不做完整 LCS（只剥头尾，中间整段当作删旧加新）。 */
const MAX_CELLS = 4_000_000;

export function diffLines(a: string, b: string): DiffLine[] {
  const x = a === '' ? [] : a.split('\n');
  const y = b === '' ? [] : b.split('\n');
  let head = 0;
  while (head < x.length && head < y.length && x[head] === y[head]) head++;
  let tail = 0;
  while (
    tail < x.length - head &&
    tail < y.length - head &&
    x[x.length - 1 - tail] === y[y.length - 1 - tail]
  ) {
    tail++;
  }
  const out: DiffLine[] = [];
  for (let i = 0; i < head; i++) {
    out.push({ op: 'same', text: x[i] ?? '', fromLine: i + 1, toLine: i + 1 });
  }
  const midX = x.slice(head, x.length - tail);
  const midY = y.slice(head, y.length - tail);
  out.push(...middle(midX, midY, head));
  for (let k = tail; k > 0; k--) {
    const i = x.length - k;
    const j = y.length - k;
    out.push({ op: 'same', text: x[i] ?? '', fromLine: i + 1, toLine: j + 1 });
  }
  return out;
}

function middle(x: string[], y: string[], offset: number): DiffLine[] {
  const del = (i: number): DiffLine => ({ op: 'del', text: x[i] ?? '', fromLine: offset + i + 1 });
  const add = (j: number): DiffLine => ({ op: 'add', text: y[j] ?? '', toLine: offset + j + 1 });
  if (x.length === 0 || y.length === 0 || x.length * y.length > MAX_CELLS) {
    return [...x.map((_, i) => del(i)), ...y.map((_, j) => add(j))];
  }
  const w = y.length + 1;
  const t = new Uint32Array((x.length + 1) * w);
  for (let i = x.length - 1; i >= 0; i--) {
    for (let j = y.length - 1; j >= 0; j--) {
      t[i * w + j] =
        x[i] === y[j]
          ? (t[(i + 1) * w + j + 1] ?? 0) + 1
          : Math.max(t[(i + 1) * w + j] ?? 0, t[i * w + j + 1] ?? 0);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < x.length && j < y.length) {
    if (x[i] === y[j]) {
      out.push({
        op: 'same',
        text: x[i] ?? '',
        fromLine: offset + i + 1,
        toLine: offset + j + 1,
      });
      i++;
      j++;
    } else if ((t[(i + 1) * w + j] ?? 0) >= (t[i * w + j + 1] ?? 0)) {
      out.push(del(i++));
    } else {
      out.push(add(j++));
    }
  }
  while (i < x.length) out.push(del(i++));
  while (j < y.length) out.push(add(j++));
  return out;
}
