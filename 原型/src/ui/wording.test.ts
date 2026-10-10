// 界面叫法表里的每一句都不露内部词（与 tests/验收/界面文字.test.ts 用同一份词表）。
import { describe, expect, it } from 'vitest';
import { judgementLine, W } from './wording.ts';

const INTERNAL = [
  '闭环',
  '选择卡',
  '守卫',
  '出发点',
  '子句',
  '新点',
  '单子',
  '方向目标',
  '程序事实',
  'M0',
  'M1',
  'p-',
  'c-',
  'loop',
  'guard',
];

function strings(v: unknown): string[] {
  if (typeof v === 'string') return [v];
  if (typeof v === 'function') {
    const f = v as (...a: unknown[]) => unknown;
    return [
      ...strings(f(true)),
      ...strings(f(false)),
      ...strings(f(3)),
      ...strings(f('learner')),
      ...strings(f('model')),
      ...strings(f('书名', 4)),
    ];
  }
  if (typeof v === 'object' && v !== null) return Object.values(v).flatMap(strings);
  return [];
}

describe('界面叫法', () => {
  it('不含内部词', () => {
    const all = [...strings(W), judgementLine(true), judgementLine(false)];
    expect(all.length).toBeGreaterThan(50);
    expect(all.filter((t) => INTERNAL.some((w) => t.includes(w)))).toEqual([]);
  });
});
