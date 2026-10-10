// 教材出处标记的格式（src/shared/citation.ts）：写出来的能读回来，读不对的不乱认。
import { describe, expect, it } from 'vitest';
import { formatCitation, parseBookLineRef, parseCitations } from '../src/shared/citation.ts';

describe('出处标记', () => {
  it('写出的标记能读回来', () => {
    const m = formatCitation({ book: 'Strang (Ed 5)', file: 'ch03/sec-3.1.md', from: 12, to: 18 });
    expect(m).toBe('【教材|Strang (Ed 5)|ch03/sec-3.1.md|L12-18】');
    expect(parseCitations(`见${m}。`)).toEqual([
      expect.objectContaining({
        book: 'Strang (Ed 5)',
        file: 'ch03/sec-3.1.md',
        from: 12,
        to: 18,
        raw: m,
        start: 1,
      }),
    ]);
    expect(formatCitation({ book: 'b', file: 'f.md', from: 5 })).toBe('【教材|b|f.md|L5】');
  });

  it('宽容的写法：没有 L、全角竖线、长横线、行段写反', () => {
    const t = '【教材｜b｜f.md｜ 7 – 9 】和【教材|b|f.md|L9-7】';
    expect(parseCitations(t).map((c) => [c.from, c.to])).toEqual([
      [7, 9],
      [7, 9],
    ]);
  });

  it('不是出处的不认：缺字段、行号不是数字', () => {
    expect(parseCitations('【教材|b|f.md】【教材|b|f.md|Lx】【教材||f.md|L1】')).toEqual([]);
  });

  it('书名里有竖线的写不成标记', () => {
    expect(() => formatCitation({ book: 'a|b', file: 'f.md', from: 1 })).toThrow();
  });

  it('选择卡里的“书名/文件:行号”：要书名，用已知书名切开', () => {
    const books = ['力学', '力学入门样例'];
    expect(parseBookLineRef('力学入门样例/ch01/sec-1.2.md:3-4', books)).toEqual({
      book: '力学入门样例',
      file: 'ch01/sec-1.2.md',
      from: 3,
      to: 4,
    });
    expect(parseBookLineRef('ch01/sec-1.2.md:3', books)).toBeUndefined();
    expect(parseBookLineRef('力学/ch01/a.md:7', books)).toMatchObject({ book: '力学', from: 7 });
    expect(parseBookLineRef('【教材|力学|a.md|L2】', books)).toMatchObject({
      book: '力学',
      from: 2,
    });
  });
});
