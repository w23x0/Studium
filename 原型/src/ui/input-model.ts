// 输入框的纯转换（批 4）：正在写的公式切段预览、在光标处插入公式、送去转写前要不要缩小。单测覆盖。
import { TRANSCRIBE_MAX_BYTES } from '../shared/protocol.ts';

export type Segment =
  | { kind: 'text'; text: string }
  /** open = 还没写闭合符号（正在写），也照样预览。 */
  | { kind: 'math'; tex: string; display: boolean; open: boolean };

const OPENERS: { open: string; close: string; display: boolean }[] = [
  { open: '$$', close: '$$', display: true },
  { open: '\\[', close: '\\]', display: true },
  { open: '\\(', close: '\\)', display: false },
  { open: '$', close: '$', display: false },
];

/** 把输入框里的文字切成文字段与公式段（`$…$` `$$…$$` `\(…\)` `\[…\]`；`\$` 不算）。 */
export function mathSegments(text: string): Segment[] {
  const out: Segment[] = [];
  let buf = '';
  let i = 0;
  const flush = () => {
    if (buf !== '') out.push({ kind: 'text', text: buf });
    buf = '';
  };
  while (i < text.length) {
    if (text[i] === '\\' && text[i + 1] === '$') {
      buf += '$';
      i += 2;
      continue;
    }
    const op = OPENERS.find((o) => text.startsWith(o.open, i));
    if (op === undefined) {
      buf += text.charAt(i);
      i++;
      continue;
    }
    const from = i + op.open.length;
    const end = findClose(text, from, op.close);
    flush();
    if (end < 0) {
      out.push({ kind: 'math', tex: text.slice(from), display: op.display, open: true });
      return out;
    }
    out.push({ kind: 'math', tex: text.slice(from, end), display: op.display, open: false });
    i = end + op.close.length;
  }
  flush();
  return out;
}

function findClose(text: string, from: number, close: string): number {
  for (let j = from; j < text.length; j++) {
    if (text[j] === '\\' && close !== '\\]' && close !== '\\)') {
      j++;
      continue;
    }
    if (text.startsWith(close, j)) return j;
  }
  return -1;
}

/** 有没有要预览的公式（空公式不算）。 */
export function hasMath(text: string): boolean {
  return mathSegments(text).some((s) => s.kind === 'math' && s.tex.trim() !== '');
}

/** 在选区处插入文字，返回新文字与插入后光标位置。 */
export function insertAt(
  text: string,
  start: number,
  end: number,
  insert: string,
): { text: string; cursor: number } {
  const a = Math.max(0, Math.min(start, text.length));
  const b = Math.max(a, Math.min(end, text.length));
  return { text: text.slice(0, a) + insert + text.slice(b), cursor: a + insert.length };
}

/** 插入一个公式：行内 `$…$`；单独一行 `$$…$$`，前后不在行首 / 行尾时补换行。 */
export function insertFormula(
  text: string,
  start: number,
  end: number,
  latex: string,
  display: boolean,
): { text: string; cursor: number } {
  const tex = latex.trim();
  if (tex === '') return { text, cursor: end };
  if (!display) return insertAt(text, start, end, `$${tex}$`);
  const before = text.slice(0, start);
  const after = text.slice(end);
  const lead = before === '' || before.endsWith('\n') ? '' : '\n';
  const tail = after === '' || after.startsWith('\n') ? '' : '\n';
  return insertAt(text, start, end, `${lead}$$${tex}$$${tail}`);
}

/** 送去转写前要不要先缩小一份副本（原图照传、照存）。 */
export function needsSmallerCopy(size: number): boolean {
  return size > TRANSCRIBE_MAX_BYTES;
}

/** 缩小副本的尺寸：长边不超过 limit，按比例缩。 */
export function scaledSize(
  width: number,
  height: number,
  limit = 2000,
): { width: number; height: number } {
  const long = Math.max(width, height);
  if (long <= limit) return { width, height };
  const k = limit / long;
  return { width: Math.round(width * k), height: Math.round(height * k) };
}
