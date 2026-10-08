// 链路评测的管道本身（不是评测本身）：假系统、假学生、假判分走完整条链，程序判定都能出结果；
// 假系统露内部词时被对应判定抓到并归给系统。真模型跑法见 evals/chain/cli.ts（npm run eval:real）。
import { describe, expect, it } from 'vitest';
import type { ProbeResult } from '../evals/chain/checks.ts';
import { fakeChainModels } from '../evals/chain/fake.ts';
import { renderReport } from '../evals/chain/report.ts';
import { runChain } from '../evals/chain/run.ts';
import { STUDENTS } from '../evals/chain/students.ts';
import { DEFAULT_PROFILES } from '../src/core/model/profiles.ts';
import { tempDir } from './helpers/tmp.ts';

const PROBE: ProbeResult = {
  profiles: DEFAULT_PROFILES,
  capabilities: [
    { value: 'default', resolved: 'fake', efforts: ['low', 'medium', 'high', 'xhigh', 'max'] },
  ],
};
const FULL = STUDENTS.filter((s) => s.id === '全懂');

describe('链路评测管道', () => {
  it('假模型走完整条链：程序判定都过，报告写得出来', async () => {
    const dir = await tempDir();
    const [r] = await runChain({
      students: FULL,
      k: 1,
      parallel: 1,
      outDir: dir,
      models: fakeChainModels(),
      probe: PROBE,
      interjectWaitMs: 2000,
    });
    expect(r?.run.error).toBeUndefined();
    const failed = (r?.checks ?? [])
      .filter((c) => c.outcome === '不过')
      .map((c) => [c.id, c.detail]);
    expect(failed).toEqual([]);
    expect(r?.run.m09).toHaveLength(1);
    expect(r?.checks.find((c) => c.id === '守卫判定符合预期')?.outcome).toBe('过');
    expect(r?.run.interjection?.line).toBeGreaterThan(0);
    const report = renderReport({
      runId: 'test',
      command: 'test',
      startedAt: r?.run.startedAt ?? '',
      endedAt: r?.run.endedAt ?? '',
      estimate: '',
      probe: PROBE,
      studentModel: 'fake',
      judgeModel: 'fake',
      tapesDir: dir,
      root: dir,
      results: r ? [r] : [],
    });
    expect(report).toContain('## 全懂型');
  }, 60_000);

  it('假系统在学习对话里露内部词：被抓到并归给系统', async () => {
    const dir = await tempDir();
    const [r] = await runChain({
      students: FULL,
      k: 1,
      parallel: 1,
      outDir: dir,
      models: fakeChainModels({ leak: true }),
      probe: PROBE,
      interjectWaitMs: 2000,
    });
    const leak = r?.checks.find((c) => c.id === '学习者看不到内部词');
    expect(leak?.outcome).toBe('不过');
    expect(leak?.attribution).toBe('系统·提示词');
  }, 60_000);
});
