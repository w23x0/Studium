// 测：链路评测（evals/chain，假模型跑管道）跟上新流程——程序判定里有“合上的判定含实际理解与证据强度”“没合上没有判定”
// “单子是文字”“每张卡前有路线决定”“学习对话在沙盒里”，没有写分析层的判定与步骤；会话种类、判定名、报告都不带旧叫法。
// 依据：工单 W7 §4.9；README §2.1–§2.6。
import { describe, expect, it } from 'vitest';
import { fakeChainModels } from '../../evals/chain/fake.ts';
import { renderReport } from '../../evals/chain/report.ts';
import { runChain } from '../../evals/chain/run.ts';
import { STUDENTS } from '../../evals/chain/students.ts';
import { DEFAULT_PROFILES } from '../../src/core/model/profiles.ts';
import { tempDir } from '../helpers/tmp.ts';

const OLD = /M0[5-9]|M1[0-5]|闭环|写 M09|形成记录/;
const KINDS = ['main', 'talk', 'loop', 'guard', 'nav', 'state', 'pedagogy', 'retrieve', 'output'];
const MUST_PASS = [
  '整条链不崩',
  '该调的工具都调了',
  '学习对话在沙盒里',
  '学习者看不到内部词',
  '守卫判定符合预期',
  '守卫引用的行都是学习者的话',
  '合上的判定含实际理解与证据强度',
  '单子是文字',
  '每张卡前有路线决定',
  '下一张卡不推已学会的',
  '状态记录与教法记录整理跑了且隔离',
];

interface CheckLoose {
  id: string;
  by: string;
  outcome: string;
  detail: string;
}

describe('链路评测跟上新流程', () => {
  it('假模型走完整条链：新判定都在且过，没有分析层，种类与报告不带旧叫法', async () => {
    const dir = await tempDir();
    const probe = {
      profiles: DEFAULT_PROFILES,
      capabilities: [
        { value: 'default', resolved: 'fake', efforts: ['low', 'medium', 'high', 'xhigh', 'max'] },
      ],
    };
    const [r] = await runChain({
      students: STUDENTS.filter((s) => s.id === '全懂'),
      k: 1,
      parallel: 1,
      outDir: dir,
      models: fakeChainModels(),
      probe,
      interjectWaitMs: 2000,
    });
    expect(r?.run.error, '整条链没中断').toBeUndefined();
    const checks = (r?.checks ?? []) as CheckLoose[];
    const byId = new Map(checks.map((c) => [c.id, c]));

    for (const id of MUST_PASS) {
      expect(
        byId.get(id)?.outcome,
        `程序判定“${id}”应过：${byId.get(id)?.detail ?? '（没有这条判定）'}`,
      ).toBe('过');
    }
    expect(byId.get('没合上没有判定')?.outcome, '全懂型合上了：“没合上没有判定”未判').toBe('未判');
    const program = checks.filter((c) => c.by === '程序' && c.outcome === '不过');
    expect(
      program.map((c) => `${c.id}：${c.detail}`),
      '没有不过的程序判定',
    ).toEqual([]);

    for (const c of checks) {
      expect(`${c.id} ${c.detail}`, `判定“${c.id}”不带旧叫法`).not.toMatch(OLD);
    }
    const run = r?.run as unknown as Record<string, unknown> & {
      sessions: { kind: string }[];
    };
    expect(Object.keys(run), '运行结果里不再有分析层的记录').not.toContain('m09');
    for (const s of run.sessions) expect(KINDS, `会话种类 ${s.kind} 应是新名`).toContain(s.kind);
    expect(
      run.sessions.map((s) => s.kind),
      '走过导航',
    ).toContain('nav');

    const report = renderReport({
      runId: 'test',
      command: 'test',
      startedAt: '',
      endedAt: '',
      estimate: '',
      probe,
      studentModel: 'fake',
      judgeModel: 'fake',
      tapesDir: dir,
      root: dir,
      results: r ? [r] : [],
    });
    expect(report, '报告写得出来').toContain('## 全懂型');
    expect(report, '报告不带旧叫法').not.toMatch(OLD);
  }, 60_000);
});
