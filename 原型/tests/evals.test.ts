// 行为评测的管道本身（不是评测本身）：假老师好时全过；坏老师的失败模式被对应判定抓到。
import { describe, expect, it } from 'vitest';
import { CASES } from '../evals/cases.ts';
import { fakeModels } from '../evals/fake-world.ts';
import { runEvals } from '../evals/run.ts';

describe('行为评测管道', () => {
  it('好的假老师：每条 2 次全过', async () => {
    const results = await runEvals({ cases: CASES, k: 2, models: fakeModels() });
    expect(results.filter((r) => !r.pass).map((r) => [r.id, r.runs])).toEqual([]);
    expect(results.every((r) => r.runs.length === 2)).toBe(true);
  });

  it('坏的假老师：替学习者答、一轮多问、露内部词都被抓到', async () => {
    const results = await runEvals({ cases: CASES, k: 1, models: fakeModels({ badTutor: true }) });
    const failed = results.filter((r) => !r.pass).map((r) => r.id);
    expect(failed).toEqual(
      expect.arrayContaining(['不替学习者做那一步', '一轮停在一个问题', '不露内部词']),
    );
  });
});
