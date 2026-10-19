// 验收（W6，界面纯函数）：守卫判定在依据面板与“我学会的”里显示学习者实际表现出的理解，逐条带证据强度
// （独立程度 × 持久程度）与依据行的原话（docs/设计/会话/守卫.md §4–§5；记录/学过的记录.md「守卫判定」）。
// 模块 src/ui/verdict-model.ts（W6 新建）。
import { describe, expect, it } from 'vitest';
import { strengthLabel, understandingRows } from '../../src/ui/verdict-model.ts';

type VerdictArg = Parameters<typeof understandingRows>[0];
type StrengthArg = Parameters<typeof strengthLabel>[0];

const INTERNAL = ['闭环', '守卫', '出发点', '子句', '新点', '单子', 'M0', 'M1'];

const verdict = {
  closed: true,
  understanding: [
    {
      text: '能用自己的话说出位移只看起点和终点',
      lines: [7, 5],
      independence: '独立',
      durability: '仅当场',
      quotes: [
        { line: 5, at: '2026-10-18T09:00:00Z', text: '位移就是终点减起点' },
        { line: 7, at: '2026-10-18T09:02:00Z', text: '来回走的话位移比路程小' },
        { line: 9, at: '2026-10-18T09:03:00Z', text: '这一行不是这条理解引的' },
      ],
    },
    {
      text: '换成竖直方向也能算位移',
      lines: [11],
      independence: '提示后',
      durability: '含变式',
    },
  ],
} as unknown as VerdictArg;

describe('判定里的实际理解与证据强度', () => {
  it('证据强度：两项各三档，叫法写死', () => {
    const s = (independence: string, durability: string): string =>
      strengthLabel({ independence, durability } as unknown as StrengthArg);
    expect(s('独立', '仅当场')).toBe('自己做出来 · 只在当场');
    expect(s('提示后', '含变式')).toBe('提示后做出来 · 换个问法也行');
    expect(s('答案暴露后', '含延迟')).toBe('看过答案后做出来 · 隔一段时间也行');
  });

  it('逐条：理解原样、证据强度、按行号排的依据原话（只取这条引的行）', () => {
    const rows = understandingRows(verdict);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      text: '能用自己的话说出位移只看起点和终点',
      strength: '自己做出来 · 只在当场',
      lines: [5, 7],
    });
    expect(
      rows[0]?.quotes.map((q) => [q.line, q.text]),
      '原话按行号排、只留这条引的行',
    ).toEqual([
      [5, '位移就是终点减起点'],
      [7, '来回走的话位移比路程小'],
    ]);
    expect(rows[1]).toMatchObject({
      text: '换成竖直方向也能算位移',
      strength: '提示后做出来 · 换个问法也行',
      lines: [11],
      quotes: [],
    });
  });

  it('没写理解（没合上 / 旧判定）给空列表', () => {
    expect(understandingRows({ closed: false } as unknown as VerdictArg)).toEqual([]);
    expect(
      understandingRows({ closed: false, understanding: [] } as unknown as VerdictArg),
    ).toEqual([]);
  });

  it('叫法不露内部词', () => {
    const shown: string[] = [];
    for (const i of ['独立', '提示后', '答案暴露后']) {
      for (const d of ['仅当场', '含变式', '含延迟']) {
        shown.push(strengthLabel({ independence: i, durability: d } as unknown as StrengthArg));
      }
    }
    expect(new Set(shown).size, '九种组合说法各不相同').toBe(9);
    expect(shown.filter((t) => INTERNAL.some((w) => t.includes(w)))).toEqual([]);
  });
});
