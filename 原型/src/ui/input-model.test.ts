import { describe, expect, it } from 'vitest';
import { TRANSCRIBE_MAX_BYTES } from '../shared/protocol.ts';
import {
  hasMath,
  insertAt,
  insertFormula,
  mathSegments,
  needsSmallerCopy,
  scaledSize,
} from './input-model.ts';

describe('正在写的公式切段', () => {
  it('切出行内、单独一行与两种括号写法', () => {
    expect(mathSegments('设 $v=at$，则 $$x=\\frac12at^2$$ 且 \\(a\\) 与 \\[b\\]')).toEqual([
      { kind: 'text', text: '设 ' },
      { kind: 'math', tex: 'v=at', display: false, open: false },
      { kind: 'text', text: '，则 ' },
      { kind: 'math', tex: 'x=\\frac12at^2', display: true, open: false },
      { kind: 'text', text: ' 且 ' },
      { kind: 'math', tex: 'a', display: false, open: false },
      { kind: 'text', text: ' 与 ' },
      { kind: 'math', tex: 'b', display: true, open: false },
    ]);
  });

  it('还没闭合的公式也预览；\\$ 不算公式', () => {
    expect(mathSegments('价格 \\$5，公式 $\\sqrt{x')).toEqual([
      { kind: 'text', text: '价格 $5，公式 ' },
      { kind: 'math', tex: '\\sqrt{x', display: false, open: true },
    ]);
    expect(hasMath('没有公式')).toBe(false);
    expect(hasMath('空的 $$')).toBe(false);
    expect(hasMath('有 $x$')).toBe(true);
  });
});

describe('在光标处插入', () => {
  it('替换选区', () => {
    expect(insertAt('abcd', 1, 3, 'X')).toEqual({ text: 'aXd', cursor: 2 });
  });

  it('行内公式用 $…$；单独一行补换行', () => {
    expect(insertFormula('设 ，', 2, 2, ' v=at ', false)).toEqual({
      text: '设 $v=at$，',
      cursor: 8,
    });
    expect(insertFormula('前文后文', 2, 2, 'x^2', true).text).toBe('前文\n$$x^2$$\n后文');
    expect(insertFormula('', 0, 0, 'x', true).text).toBe('$$x$$');
    expect(insertFormula('abc', 1, 1, '  ', false)).toEqual({ text: 'abc', cursor: 1 });
  });
});

describe('送去转写前的缩小副本', () => {
  it('超过上限才缩小；长边缩到上限', () => {
    expect(needsSmallerCopy(TRANSCRIBE_MAX_BYTES)).toBe(false);
    expect(needsSmallerCopy(TRANSCRIBE_MAX_BYTES + 1)).toBe(true);
    expect(scaledSize(4000, 3000)).toEqual({ width: 2000, height: 1500 });
    expect(scaledSize(800, 600)).toEqual({ width: 800, height: 600 });
  });
});
