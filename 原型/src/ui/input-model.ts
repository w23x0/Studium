// 显示学习者的话时把公式切段（`math-preview.tsx`）。

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
