// 测（W7 审查补充）：链路评测的两条合上 / 没合上判定先按学习对话结束那行分路，学过的记录对不上判不过；
// “守卫引用的行都是学习者的话”连 understanding 引的行一起查；features.mjs --check 查“每个验收测试都有条目”；
// 只有旧版本文件、没有会话的目录启动后版本文件升到 3，重启不报错。依据：工单 W7 §4.9 判定表、§4.6 “覆盖”一行、§4.4。
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ChainRun } from '../../evals/chain/driver.ts';
import { programChecks, type ProbeResult } from '../../evals/chain/checks.ts';
import { createApp } from '../../src/core/app.ts';
import { FakeModel } from '../../src/core/model/fake.ts';
import { fakeChainModels } from '../../evals/chain/fake.ts';
import { runChain } from '../../evals/chain/run.ts';
import { STUDENTS } from '../../evals/chain/students.ts';
import { DEFAULT_PROFILES } from '../../src/core/model/profiles.ts';
import { getJson, TOKEN } from '../helpers/http.ts';
import { tempDir } from '../helpers/tmp.ts';

const ROOT = join(import.meta.dirname, '../..');
const probe: ProbeResult = {
  profiles: DEFAULT_PROFILES,
  capabilities: [
    { value: 'default', resolved: 'fake', efforts: ['low', 'medium', 'high', 'xhigh', 'max'] },
  ],
};

let base: ChainRun;

beforeAll(async () => {
  const [r] = await runChain({
    students: STUDENTS.filter((s) => s.id === '全懂'),
    k: 1,
    parallel: 1,
    outDir: await tempDir(),
    models: fakeChainModels(),
    probe,
    interjectWaitMs: 2000,
  });
  if (r === undefined) throw new Error('链路没跑出结果');
  base = r.run;
}, 60_000);

async function outcome(run: ChainRun, id: string): Promise<string | undefined> {
  return (await programChecks(run, probe)).find((c) => c.id === id)?.outcome;
}

describe('合上 / 没合上的判定按结束那行分路', () => {
  it('结束那行是合上、学过的记录却是没合上：合上那条判不过', async () => {
    const run = structuredClone(base);
    expect(run.learning?.status).toBe('合上');
    if (run.learning !== undefined) run.learning.status = '没合上';
    expect(await outcome(run, '合上的判定含实际理解与证据强度')).toBe('不过');
    expect(await outcome(run, '没合上没有判定')).toBe('未判');
  });

  it('结束那行是没合上、学过的记录却是合上：没合上那条判不过', async () => {
    const run = structuredClone(base);
    const loop = run.sessions.find((s) => s.sessionId === run.loopId);
    const end = loop?.records.find((r) => r.record.type === 'loop_ended')?.record;
    expect(end?.type).toBe('loop_ended');
    if (end?.type === 'loop_ended') end.closed = false;
    expect(await outcome(run, '没合上没有判定')).toBe('不过');
    expect(await outcome(run, '合上的判定含实际理解与证据强度')).toBe('未判');
  });

  it('结束了却取不到学过的记录：合上那条判不过', async () => {
    const run = structuredClone(base);
    delete run.learning;
    expect(await outcome(run, '合上的判定含实际理解与证据强度')).toBe('不过');
  });
});

describe('守卫引用的行都是学习者的话', () => {
  it('understanding 引了不是学习者的行：判不过', async () => {
    const run = structuredClone(base);
    const loop = run.sessions.find((s) => s.sessionId === run.loopId);
    const opened = loop?.records.find((r) => r.record.type === 'session_opened');
    const verdict = loop?.records.find((r) => r.record.type === 'guard_verdict')?.record;
    expect(verdict?.type === 'guard_verdict' && (verdict.understanding ?? []).length > 0).toBe(
      true,
    );
    if (verdict?.type === 'guard_verdict' && opened !== undefined) {
      for (const u of verdict.understanding ?? []) u.lines = [opened.line];
    }
    expect(await outcome(run, '守卫引用的行都是学习者的话')).toBe('不过');
  });
});

describe('features.mjs --check 查覆盖', () => {
  it('有验收测试没被任何条目引用：报出文件、退出 1', async () => {
    const list = JSON.parse(readFileSync(join(ROOT, '功能清单.json'), 'utf8')) as {
      验证: string;
    }[];
    const left = list.filter((i) => !i.验证.includes('tests/验收/依据可见.test.ts'));
    expect(left.length).toBeLessThan(list.length);
    const file = join(await tempDir(), 'list.json');
    await writeFile(file, JSON.stringify(left));
    const r = spawnSync('node', ['scripts/features.mjs', '--check', '--list', file], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('tests/验收/依据可见.test.ts');
  });
});

describe('数据版本文件跟着升', () => {
  it('只有旧版本文件、还没有会话：启动后改写成 3，有了会话再启动不报错', async () => {
    const root = await tempDir();
    await writeFile(join(root, 'data-version'), '2\n');
    const start = () =>
      createApp({ dataRoot: root, model: new FakeModel(), token: TOKEN, port: 0 });
    const a = await start();
    await getJson(a, '/project');
    expect((await readFile(join(root, 'data-version'), 'utf8')).trim()).toBe('3');
    await a.close();
    const b = await start();
    await b.close();
  });
});
