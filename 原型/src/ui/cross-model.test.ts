import { describe, expect, it } from 'vitest';
import type { SourceNoteView, StateRecordView, StateTimelineEntry } from '../shared/protocol.ts';
import {
  activeFilters,
  crossOf,
  dayGroups,
  dotClass,
  filterParams,
  legend,
  noteRows,
  stageSteps,
} from './cross-model.ts';

function entry(
  id: string,
  at: string,
  stage: string | undefined,
  level: StateRecordView['sourceLevel'] = '自述',
): StateTimelineEntry {
  return {
    record: { id, at, sourceLevel: level } as StateRecordView,
    ...(stage !== undefined ? { stage } : {}),
    explanations: [],
  };
}

describe('来源说明的显示行', () => {
  it('五项按固定顺序，没有的为空，不编', () => {
    const n = {
      book: 'b',
      type: { value: '教材', from: '学习者' },
      scope: { value: '一维运动', from: '模型' },
    } as SourceNoteView;
    const rows = noteRows(n);
    expect(rows.map((r) => r.field)).toEqual(['type', 'level', 'author', 'scope', 'remark']);
    expect(rows.map((r) => r.item?.value)).toEqual([
      '教材',
      undefined,
      undefined,
      '一维运动',
      undefined,
    ]);
  });
});

describe('检索筛选', () => {
  it('空条件不带，数得出几个在起作用', () => {
    expect(filterParams({ type: '', point: undefined, inBook: 'B' })).toEqual({ inBook: 'B' });
    expect(filterParams({ type: '例题', point: 'p-a', inBook: 'B' })).toEqual({
      type: '例题',
      point: 'p-a',
      inBook: 'B',
    });
    expect(activeFilters({})).toBe(0);
    expect(activeFilters({ type: '定义', inBook: 'B' })).toBe(2);
  });
});

describe('状态时间轴', () => {
  const entries = [
    entry('a', '2026-10-01T09:00:00', '证据不足', '自述'),
    entry('b', '2026-10-01T15:00:00', '证据不足', '已确认'),
    entry('c', '2026-10-03T09:00:00', '习惯低谷', '观察'),
    entry('d', '2026-10-04T09:00:00', undefined, '推断'),
  ];

  it('按阶段 / 来源档着色；没标阶段用灰', () => {
    expect(dotClass(entries[0] as StateTimelineEntry, 'stage')).toBe('bg-zinc-400');
    expect(dotClass(entries[2] as StateTimelineEntry, 'stage')).toBe('bg-sky-500');
    expect(dotClass(entries[3] as StateTimelineEntry, 'stage')).toBe('bg-zinc-300');
    expect(dotClass(entries[1] as StateTimelineEntry, 'source')).toBe('bg-primary');
    expect(dotClass(entries[0] as StateTimelineEntry, 'source')).not.toBe(
      dotClass(entries[2] as StateTimelineEntry, 'source'),
    );
  });

  it('图例只列出现过的，且不重复', () => {
    expect(legend(entries, 'stage').map((l) => l.key)).toEqual(['证据不足', '习惯低谷', '']);
    expect(legend(entries, 'source').map((l) => l.key)).toEqual(['自述', '已确认', '观察', '推断']);
  });

  it('按天分组，旧的在前', () => {
    const g = dayGroups(entries);
    expect(g.map((x) => x.entries.map((e) => e.record.id))).toEqual([['a', 'b'], ['c'], ['d']]);
  });

  it('阶段变化只列变了的地方', () => {
    expect(
      stageSteps([
        { at: '1', stage: '证据不足', basisSpan: '' },
        { at: '2', stage: '证据不足', basisSpan: '' },
        { at: '3', stage: '习惯低谷', basisSpan: '' },
      ]),
    ).toEqual([
      { at: '1', from: undefined, to: '证据不足' },
      { at: '3', from: '证据不足', to: '习惯低谷' },
    ]);
    expect(stageSteps([])).toEqual([]);
  });
});

describe('跨领域标记', () => {
  it('单子里有就带出类型与另一边，没有就是空', () => {
    expect(
      crossOf({
        ticket: { crossDomain: { kind: '补习型', otherPoint: '向量点积' } },
      }),
    ).toEqual({ kind: '补习型', otherPoint: '向量点积' });
    expect(crossOf({ ticket: {} })).toBeUndefined();
  });
});
