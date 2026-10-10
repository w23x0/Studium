import { describe, expect, it } from 'vitest';
import type { CitationView, SourceReport } from '../shared/protocol.ts';
import {
  asBBox,
  bookLineTarget,
  boxStyle,
  citationIndex,
  citationLabel,
  citationTarget,
  cropBox,
  linkCitations,
  markTerms,
  mathPieces,
  paragraphs,
  reportsFor,
  unionBox,
} from './source-model.ts';

const view = (over: Partial<CitationView>): CitationView => ({
  raw: '【教材|书|ch01/a.md|L3-4】',
  start: 0,
  end: 10,
  book: '书',
  file: 'ch01/a.md',
  from: 3,
  to: 4,
  resolved: true,
  ...over,
});

describe('回复里的出处标记', () => {
  it('换成按顺序编号的出处链接，链接认得回第几个', () => {
    const t =
      '位移是矢量【教材|力学|ch01/sec-1.1.md|L5-9】，速度也是【教材｜力学｜ch01/sec-1.2.md｜L3】。';
    const out = linkCitations(t, false);
    expect(out).toBe('位移是矢量[1](#studium-cite-0)，速度也是[2](#studium-cite-1)。');
    expect(citationIndex('#studium-cite-1')).toBe(1);
    expect(citationIndex('https://example.com')).toBeUndefined();
    expect(citationIndex(undefined)).toBeUndefined();
  });

  it('流式中末尾没写完的标记先藏起来；写完了的、写错的照样留着', () => {
    expect(linkCitations('见书【教材|力学|ch01', true)).toBe('见书');
    expect(linkCitations('见书【', true)).toBe('见书');
    expect(linkCitations('见书【教材|力学|ch01', false)).toBe('见书【教材|力学|ch01');
    expect(linkCitations('【注】这里', true)).toBe('【注】这里');
  });

  it('小标签：书名 · 第几页；没有原件页退到印的页码', () => {
    expect(
      citationLabel(
        view({ bookTitle: '力学', location: { line: 3, page: 12, bbox: [0, 0, 1, 1] } }),
      ),
    ).toBe('力学 · 第 12 页');
    expect(citationLabel(view({ bookTitle: '力学', pdfPages: { from: 7, to: 9 } }))).toBe(
      '力学 · 第 7 页',
    );
    expect(citationLabel(view({ bookTitle: '力学', pages: 'p.3' }))).toBe('力学 · p.3');
    expect(citationLabel(view({}))).toBe('书');
  });

  it('点开：对得上的带原件位置，对不上的带原因', () => {
    expect(citationTarget(view({ location: { line: 3, page: 12, bbox: [1, 2, 3, 4] } }))).toEqual({
      kind: 'source',
      book: '书',
      file: 'ch01/a.md',
      from: 3,
      to: 4,
      page: 12,
      bbox: [1, 2, 3, 4],
    });
    expect(citationTarget(view({ resolved: false, problem: '行号超出' })).problem).toBe('行号超出');
  });
});

describe('原文', () => {
  it('按空行分段，记起止行号；公式块里的空行不切', () => {
    const lines = ['# 标题', '', '第一段', '接着', '', '$$', 'a', '', 'b', '$$', '', '末段'].map(
      (text, i) => ({ n: i + 1, text }),
    );
    expect(paragraphs(lines).map((p) => [p.from, p.to])).toEqual([
      [1, 1],
      [3, 4],
      [6, 10],
      [12, 12],
    ]);
  });

  it('切出行内公式与独立公式，\\$ 不算', () => {
    expect(mathPieces('速度 $v$ 与 $$a=b$$ 价格 \\$5')).toEqual([
      { text: '速度 ' },
      { math: 'v', display: false },
      { text: ' 与 ' },
      { math: 'a=b', display: true },
      { text: ' 价格 \\$5' },
    ]);
  });

  it('报错挂到交叠的段上', () => {
    const r = { from: 4, to: 6 } as SourceReport;
    expect(reportsFor([r], { from: 1, to: 3 })).toEqual([]);
    expect(reportsFor([r], { from: 6, to: 8 })).toEqual([r]);
  });
});

describe('原件位置框', () => {
  it('千分比换成百分比样式', () => {
    expect(boxStyle([100, 250, 900, 300])).toEqual({
      left: '10%',
      top: '25%',
      width: '80%',
      height: '5%',
    });
  });

  it('局部截图放宽到整行、夹在页内；多个框合成外框', () => {
    expect(cropBox([200, 10, 500, 990])).toEqual([60, 0, 940, 1000]);
    expect(unionBox([])).toBeUndefined();
    expect(
      unionBox([
        [10, 20, 30, 40],
        [5, 25, 50, 35],
      ]),
    ).toEqual([5, 20, 50, 40]);
    expect(asBBox([1, 2, 3])).toBeUndefined();
    expect(asBBox([1, 2, 3, 4])).toEqual([1, 2, 3, 4]);
  });
});

describe('检索与选项出处', () => {
  it('摘录里标出检索词（不分大小写、词里的特殊字符照字面）', () => {
    expect(markTerms('Force 与 force(x)', 'force (x)')).toEqual([
      { text: 'Force', hit: true },
      { text: ' 与 ', hit: false },
      { text: 'force', hit: true },
      { text: '(x)', hit: true },
    ]);
  });

  it('回查到原文的“书里的一处”能点开，查不到的不能', () => {
    const base = { raw: 'r', kind: 'book_line' as const, label: '书里 x' };
    expect(
      bookLineTarget({ ...base, resolved: true, book: '力学', file: 'a.md', from: 3, to: 5 }),
    ).toEqual({ kind: 'source', book: '力学', file: 'a.md', from: 3, to: 5 });
    expect(bookLineTarget({ ...base, resolved: false, book: '力学', file: 'a.md', from: 3 })).toBe(
      undefined,
    );
  });
});
