// 学习页上改过的文字原地标出改了什么（11-04 STM32 项目真用，学习者要“旧的划一道横线，新的写在后面”）：
// 从第一版到现在按行比，删掉的行划线、新加的行接在后面；一行换一行、只改了中间一段时，只划那一段（行内用 ~~ ~~）。

export type TextChange =
  { kind: 'same'; text: string } | { kind: 'del'; text: string } | { kind: 'ins'; text: string };

/** 第一版 before → 现在 after：按行比出的一串段落，同类相邻的并成一段。 */
export function textChanges(before: string, after: string): TextChange[] {
  const a = before.split('\n');
  const b = after.split('\n');
  // 最长公共子序列（页面上一块文字几十到一两百行，平方够用）；表摊平成一维，at(i, j) = a[i..] 与 b[j..] 的长度
  const n = a.length;
  const m = b.length;
  const table = new Int32Array((n + 1) * (m + 1));
  const at = (i: number, j: number): number => table[i * (m + 1) + j] ?? 0;
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i * (m + 1) + j] =
        a[i] === b[j] ? at(i + 1, j + 1) + 1 : Math.max(at(i + 1, j), at(i, j + 1));
    }
  }
  const rows: { kind: TextChange['kind']; line: string }[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    const x = a[i];
    const y = b[j];
    if (x !== undefined && x === y) {
      rows.push({ kind: 'same', line: x });
      i++;
      j++;
    } else if (x !== undefined && (y === undefined || at(i + 1, j) >= at(i, j + 1))) {
      rows.push({ kind: 'del', line: x });
      i++;
    } else {
      rows.push({ kind: 'ins', line: y ?? '' });
      j++;
    }
  }

  const out: TextChange[] = [];
  for (const r of rows) {
    const last = out.at(-1);
    if (last?.kind === r.kind) last.text += `\n${r.line}`;
    else out.push({ kind: r.kind, text: r.line });
  }
  return inlineOneLine(out);
}

/** 删一行、加一行，且两行开头结尾大半相同：并成一段“same”，中间改的那段用 ~~ ~~ 划掉、新的紧跟在后面。 */
function inlineOneLine(parts: TextChange[]): TextChange[] {
  const out: TextChange[] = [];
  for (let k = 0; k < parts.length; k++) {
    const d = parts[k];
    if (d === undefined) continue;
    const s = parts[k + 1];
    if (d.kind === 'del' && s?.kind === 'ins' && !d.text.includes('\n') && !s.text.includes('\n')) {
      const merged = inlineMark(d.text, s.text);
      if (merged !== undefined) {
        out.push({ kind: 'same', text: merged });
        k++;
        continue;
      }
    }
    out.push(d);
  }
  // 并完再把相邻的 same 接起来
  const joined: TextChange[] = [];
  for (const p of out) {
    const last = joined.at(-1);
    if (last?.kind === 'same' && p.kind === 'same') last.text += `\n${p.text}`;
    else joined.push({ ...p });
  }
  return joined;
}

const WORDISH = /[A-Za-z0-9.]/;
// 落在这些记号中间就会弄坏 Markdown / 公式 / 代码，碰到就整行划
const RISKY = /[$`*_~[\]<>|\\]/;

function inlineMark(oldLine: string, newLine: string): string | undefined {
  let p = 0;
  while (p < oldLine.length && p < newLine.length && oldLine[p] === newLine[p]) p++;
  let s = 0;
  while (
    s < oldLine.length - p &&
    s < newLine.length - p &&
    oldLine[oldLine.length - 1 - s] === newLine[newLine.length - 1 - s]
  ) {
    s++;
  }
  // 不在英文词、数字中间切开（144 → 143 整个数划掉，不只划最后一位）
  while (p > 0 && WORDISH.test(oldLine[p - 1] ?? '') && WORDISH.test(oldLine[p] ?? '')) p--;
  while (
    s > 0 &&
    WORDISH.test(oldLine[oldLine.length - s] ?? '') &&
    WORDISH.test(oldLine[oldLine.length - s - 1] ?? '')
  ) {
    s--;
  }
  const prefix = oldLine.slice(0, p);
  const suffix = oldLine.slice(oldLine.length - s);
  const gone = oldLine.slice(p, oldLine.length - s);
  const added = newLine.slice(p, newLine.length - s);
  const shorter = Math.min(oldLine.length, newLine.length);
  if (gone.trim() === '' || gone.trim() !== gone) return undefined;
  if (prefix.length + suffix.length < shorter * 0.3) return undefined;
  if (RISKY.test(gone) || RISKY.test(added)) return undefined;
  for (const c of ['$', '`', '*']) {
    if (prefix.split(c).length % 2 === 0) return undefined;
  }
  // ~~ 两边各加一个发丝空格（U+200A，算空白）：中文紧挨着标点时，GFM 的删除线按“左右侧”规则认不出来
  return `${prefix}\u200a~~${gone}~~\u200a${added}${suffix}`;
}
