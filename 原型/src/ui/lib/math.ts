// 公式预处理（04「实现时要守的」）：
// ① `\(\)` `\[\]` 归一成 `$` `$$`；② 流式中没写完的公式先显示原文，写完再渲染。
// 代码块与行内代码里的内容不动。

type Segment = { code: boolean; text: string };

/** 按代码块 / 行内代码切开，代码段原样保留。 */
function splitCode(text: string): Segment[] {
  const out: Segment[] = [];
  const re = /```[\s\S]*?(?:```|$)|`[^`\n]*`/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push({ code: false, text: text.slice(last, m.index) });
    out.push({ code: true, text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ code: false, text: text.slice(last) });
  return out;
}

function normalizeDelimiters(s: string): string {
  return s
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, body: string) => `$$${body}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, body: string) => `$${body}$`);
}

/** 找最后一个没闭合的 `$` / `$$` 开头位置；都闭合了返回 -1。 */
function unclosedDollar(s: string): { at: number; len: number } | undefined {
  let open: { at: number; len: number } | undefined;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\') {
      i++;
      continue;
    }
    if (s[i] !== '$') continue;
    const len = s[i + 1] === '$' ? 2 : 1;
    if (open === undefined) open = { at: i, len };
    else if (open.len === len) open = undefined;
    i += len - 1;
  }
  return open;
}

export function prepareMath(text: string, streaming: boolean): string {
  const segs = splitCode(text).map((seg) =>
    seg.code ? seg : { code: false, text: normalizeDelimiters(seg.text) },
  );
  if (streaming) {
    const last = segs.findLastIndex((s) => !s.code);
    const seg = segs[last];
    if (seg !== undefined && last === segs.length - 1) {
      let t = seg.text;
      // 还没等到闭合的 \( 或 \[：保留反斜杠，显示原文
      t = t.replace(/\\([([])(?![\s\S]*\\[)\]])/g, '\\\\$1');
      const open = unclosedDollar(t);
      if (open !== undefined) {
        t = `${t.slice(0, open.at)}${'\\$'.repeat(open.len)}${t.slice(open.at + open.len)}`;
      }
      segs[last] = { code: false, text: t };
    }
  }
  return segs.map((s) => s.text).join('');
}
