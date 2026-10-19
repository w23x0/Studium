import { describe, expect, it } from 'vitest';
import type { BookSummary, TocEntry } from '../shared/protocol.ts';
import { chapterNumber, chapterTitles, groupBySubject, noteImagePieces } from './scope-model.ts';

const book = (id: string, over: Partial<BookSummary> = {}): BookSummary => ({
  id,
  title: id,
  sections: 1,
  hasOriginal: false,
  ...over,
});

describe('书按学科分组', () => {
  it('学科按名排，没分学科的在后，个人笔记最后', () => {
    const groups = groupBySubject([
      book('笔记-线代', { kind: 'note', subject: '个人笔记' }),
      book('平铺的书'),
      book('KK', { subject: '大学物理/力学' }),
      book('Strang', { subject: '数学/线性代数' }),
      book('Halliday', { subject: '大学物理/力学' }),
    ]);
    expect(groups.map((g) => g.subject)).toEqual([
      '大学物理/力学',
      '数学/线性代数',
      '',
      '个人笔记',
    ]);
    expect(groups[0]?.books.map((b) => b.id)).toEqual(['Halliday', 'KK']);
  });

  it('笔记没写学科也归个人笔记', () => {
    expect(groupBySubject([book('笔记-a', { kind: 'note' })])[0]?.subject).toBe('个人笔记');
  });
});

describe('章名', () => {
  const entry = (chapter: string, kind: string, num: string, title: string): TocEntry => ({
    chapter,
    kind,
    num,
    title,
  });
  it('取每章的章条目，没有就取第一条', () => {
    const t = chapterTitles([
      entry('front', 'front', '', '前言'),
      entry('ch01', 'ch', '1', '运动学'),
      entry('ch01', 'sec', '1.1', '位置'),
      entry('ch02', 'sec', '2.1', '牛顿定律'),
    ]);
    expect(t.get('ch01')).toBe('1 运动学');
    expect(t.get('ch02')).toBe('2.1 牛顿定律');
    expect(t.get('front')).toBe('前言');
  });
  it('章号', () => {
    expect(chapterNumber('ch03')).toBe(3);
    expect(chapterNumber('ch12')).toBe(12);
    expect(chapterNumber('front')).toBeUndefined();
  });
});

describe('笔记里的图片引用', () => {
  it('Markdown 与 Obsidian 写法都拆出来，网址留在文字里', () => {
    expect(
      noteImagePieces('看图 ![受力](img/a%20b.png) 和 ![[c.jpg|300]]，还有 ![](https://x/y.png)'),
    ).toEqual([
      { text: '看图 ' },
      { image: 'img/a b.png', alt: '受力' },
      { text: ' 和 ' },
      { image: 'c.jpg', alt: 'c.jpg' },
      { text: '，还有 ![](https://x/y.png)' },
    ]);
  });
  it('没有图片时原样一段', () => {
    expect(noteImagePieces('$x^2$')).toEqual([{ text: '$x^2$' }]);
    expect(noteImagePieces('')).toEqual([{ text: '' }]);
  });
  it('尖括号包的路径', () => {
    expect(noteImagePieces('![a](<图1.png>)')).toEqual([{ image: '图1.png', alt: 'a' }]);
  });
});
