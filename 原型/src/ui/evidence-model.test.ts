import { describe, expect, it } from 'vitest';
import { coversAny, segmentLines, shortTime, sourceText, splitLineRefs } from './evidence-model.ts';

describe('splitLineRefs', () => {
  it('把 L12、L3-5、第 7 行拆成可跳转的片段', () => {
    expect(splitLineRefs('见 L12，另见 L3-5 与第 7 行。')).toEqual([
      { text: '见 ' },
      { line: 12, text: '（那句原话）' },
      { text: '，另见 ' },
      { line: 3, to: 5, text: '（那几句原话）' },
      { text: ' 与' },
      { line: 7, text: '（那句原话）' },
      { text: '。' },
    ]);
  });

  it('没有引用时原样一段', () => {
    expect(splitLineRefs('答得完整')).toEqual([{ text: '答得完整' }]);
  });
});

describe('sourceText', () => {
  it('知识点取名字，不露编号', () => {
    const t = sourceText({
      raw: 'p-x',
      kind: 'm08_point',
      resolved: true,
      label: '点 p-x「位移」',
      detail: '终点减起点',
    });
    expect(t).toEqual({ kind: '书里的知识点', title: '位移', detail: '终点减起点' });
  });

  it('连接取箭头那段；对话行查不到时写明', () => {
    expect(
      sourceText({
        raw: 'c-1',
        kind: 'm08_clause',
        resolved: true,
        label: '子句 c-1：位置 → 位移',
      }).title,
    ).toBe('位置 → 位移');
    expect(
      sourceText({ raw: 's:4', kind: 'loop_line', resolved: false, label: 'x', line: 4 }),
    ).toEqual({ kind: '之前对话里的话', title: '对话里的一句', detail: '查不到原文' });
  });

  it('书里的一处：标题去掉“书里”，查到的给原文，查不到的写明', () => {
    expect(
      sourceText({
        raw: '力学/ch01/a.md:3',
        kind: 'book_line',
        resolved: true,
        label: '书里《力学》 1.2 速度 p.3 第 3 行',
        detail: '平均速度',
      }),
    ).toEqual({ kind: '书里的一处', title: '《力学》 1.2 速度 p.3 第 3 行', detail: '平均速度' });
    expect(
      sourceText({ raw: 'a.md:3', kind: 'book_line', resolved: false, label: '书里 a.md 第 3 行' })
        .detail,
    ).toBe('查不到原文');
  });

  it('给学习者看的部分不含编号与内部词', () => {
    const t = sourceText({
      raw: 'r1',
      kind: 'm09_record',
      resolved: true,
      label: '形成记录 r1（闭环 L）',
      detail: '位移只看起点终点',
    });
    expect(JSON.stringify(t)).not.toMatch(/闭环|形成记录|r1/);
  });
});

describe('其他', () => {
  it('shortTime 不是时间就原样', () => {
    expect(shortTime('x')).toBe('x');
    expect(shortTime('2026-10-10T08:05:00')).toBe('10-10 08:05');
  });

  it('segmentLines 展开范围', () => {
    expect(segmentLines({ line: 3, to: 5 })).toEqual([3, 4, 5]);
    expect(segmentLines({ line: 7 })).toEqual([7]);
  });

  it('coversAny', () => {
    expect(coversAny([4, 5], [5])).toBe(true);
    expect(coversAny([4], [5])).toBe(false);
  });
});
