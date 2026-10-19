import { describe, expect, it } from 'vitest';
import type { DiffLine, VersionView } from '../shared/output.ts';
import {
  addDim,
  addMethod,
  diffRows,
  draftProblems,
  editPositionKey,
  fromDraft,
  isStaleError,
  linkOutputText,
  orderPair,
  parseEditPosition,
  removeDim,
  restoreRequest,
  splitAuthors,
  toDraft,
} from './output-model.ts';

describe('产出物正文里的引用', () => {
  it('教材出处换成链接', () => {
    const t = '速度【教材|力学|ch01/a.md|L3-4】，只看这一段。';
    expect(linkOutputText(t)).toBe('速度[1](#studium-cite-0)，只看这一段。');
  });
});

describe('版本', () => {
  const line = (op: DiffLine['op'], text: string): DiffLine => ({ op, text });

  it('没变的长段折起来，改动前后各留两行', () => {
    const lines = [
      ...Array.from({ length: 6 }, (_, i) => line('same', `a${String(i)}`)),
      line('del', '旧'),
      line('add', '新'),
      ...Array.from({ length: 5 }, (_, i) => line('same', `b${String(i)}`)),
    ];
    const rows = diffRows(lines);
    expect(rows.map((r) => (r.kind === 'skip' ? `…${String(r.count)}` : r.line.text))).toEqual([
      '…4',
      'a4',
      'a5',
      '旧',
      '新',
      'b0',
      'b1',
      '…3',
    ]);
    expect(diffRows([line('same', 'x')])).toEqual([{ kind: 'skip', count: 1 }]);
  });

  it('回到旧版 = 基于最新版再存一版；方法比较存表', () => {
    const v = {
      n: 2,
      text: '旧的',
      comparison: undefined,
    } as unknown as VersionView;
    expect(restoreRequest(v, 5)).toEqual({ text: '旧的', note: '回到第 2 版', base: 5 });
    const c = { dimensions: ['假设'], methods: [] };
    expect(restoreRequest({ ...v, comparison: c }, 5)).toEqual({
      comparison: c,
      note: '回到第 2 版',
      base: 5,
    });
    expect(orderPair(4, 2)).toEqual([2, 4]);
    expect(isStaleError(new Error('这个产出物已经有更新的版本（现在最新是第 3 版）'))).toBe(true);
    expect(isStaleError(new Error('text 不能为空'))).toBe(false);
  });
});

describe('方法比较的表格稿', () => {
  const comparison = {
    dimensions: ['假设', '精度'],
    methods: [
      { name: '牛顿', boundary: '低速', values: { 假设: '绝对时空' }, evidence: ['书 A', '书 B'] },
      { name: '拉格朗日', boundary: '约束系统', values: { 精度: '同' }, evidence: [] },
    ],
    tentative: '还在想',
  };

  it('表 ↔ 稿来回不丢东西；空格去掉、空的格子不存', () => {
    const d = toDraft(comparison);
    expect(d.methods[0]?.values).toEqual(['绝对时空', '']);
    expect(d.methods[0]?.evidence).toBe('书 A\n书 B');
    expect(fromDraft(d)).toEqual(comparison);
    const blank = toDraft(undefined);
    expect(blank.methods).toHaveLength(2);
    expect(fromDraft({ ...d, tentative: '  ' }).tentative).toBeUndefined();
  });

  it('加列、去列时各方法的格子跟着对齐', () => {
    const d = removeDim(addDim(toDraft(comparison)), 0);
    expect(d.dims).toEqual(['精度', '']);
    expect(d.methods[1]?.values).toEqual(['同', '']);
    expect(addMethod(d).methods.at(-1)?.values).toEqual(['', '']);
  });

  it('存之前点出没填的', () => {
    expect(draftProblems(toDraft(comparison))).toEqual([]);
    const bad = toDraft(undefined);
    bad.methods[0] = { name: '甲', boundary: '', values: [''], evidence: '' };
    const problems = draftProblems(bad);
    expect(problems).toHaveLength(3);
    expect(problems.join('')).toContain('「甲」');
  });
});

describe('相关文献', () => {
  it('作者按逗号、顿号、分号隔开', () => {
    expect(splitAuthors(' Kleppner, Kolenkow；张三、 ')).toEqual(['Kleppner', 'Kolenkow', '张三']);
  });
});

describe('编辑位置', () => {
  it('按产出物存；读回时光标收进现在的正文长度，存坏了当没存过', () => {
    expect(editPositionKey('out-1')).not.toBe(editPositionKey('out-2'));
    expect(parseEditPosition('{"start":3,"end":5,"scrollTop":120}', 10)).toEqual({
      start: 3,
      end: 5,
      scrollTop: 120,
    });
    expect(parseEditPosition('{"start":30,"end":40,"scrollTop":0}', 10)).toEqual({
      start: 10,
      end: 10,
      scrollTop: 0,
    });
    expect(parseEditPosition(null, 10)).toBeUndefined();
    expect(parseEditPosition('坏的', 10)).toBeUndefined();
    expect(parseEditPosition('{"start":"x"}', 10)).toEqual({ start: 0, end: 0, scrollTop: 0 });
  });
});
