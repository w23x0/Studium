// 验收：学习者在 M08 候选区的动作（提建议、审计、更正）进录带，空目录里只凭录带回放能重做，结果与录的那次一致。
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { createApp } from '../../src/core/app.ts';
import { FakeModel } from '../../src/core/model/fake.ts';
import { ACTIONS } from '../../src/core/tape/recorder.ts';
import { replayTape } from '../../src/core/tape/replay.ts';
import type { Point08Response } from '../../src/shared/protocol.ts';
import { getJson, post, TOKEN } from '../helpers/http.ts';
import { candidates, correct, correctionsOf, suggestFix } from '../helpers/m08-review-flow.ts';
import { tempDir } from '../helpers/tmp.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

describe('M08 候选区的动作进录带', () => {
  it('提建议、审计、更正都记进录带，回放重做出同样的候选、审计、更正', async () => {
    const tape = join(await tempDir(), 'run.tape.jsonl');
    const a = await createApp({
      dataRoot: await tempDir(),
      model: new FakeModel(),
      token: TOKEN,
      port: 0,
      tape,
    });
    const c = await suggestFix(a, { kind: 'point', id: 'p-displacement' }, '该写成矢量');
    await post(a, `/m08/candidates/${c.id}/audits`, { opinion: '对', verdict: '建议晋升' });
    await correct(a, {
      target: { kind: 'point', id: 'p-displacement' },
      fields: { sentence: '位移是有方向的量。' },
      reason: '漏了矢量',
      basis: { kind: 'candidate', id: c.id },
    });
    await a.close();

    const names = (await readFile(tape, 'utf8'))
      .split('\n')
      .filter((l) => l.trim() !== '')
      .map((l) => JSON.parse(l) as { t: string; name?: string })
      .filter((l) => l.t === 'action')
      .map((l) => l.name);
    for (const n of ['m08review.suggest', 'm08review.audit', 'm08review.correct']) {
      expect(ACTIONS as readonly string[]).toContain(n);
      expect(names).toContain(n);
    }

    const root = await tempDir();
    const report = await replayTape(tape, { dataRoot: root });
    expect(report.problems).toEqual([]);

    const b = await createApp({
      dataRoot: root,
      model: new FakeModel(),
      token: TOKEN,
      port: 0,
    });
    apps.push(b);
    const list = await candidates(b);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ text: '该写成矢量', verdict: '建议晋升' });
    expect(await correctionsOf(b)).toHaveLength(1);
    expect((await getJson<Point08Response>(b, '/m08/points/p-displacement')).point.sentence).toBe(
      '位移是有方向的量。',
    );
  });
});
