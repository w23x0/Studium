// 验收（W4）：导航派出的检索子代理进只读沙盒（学过的记录渲染、资料），只挂 submit_findings 一个我们的工具；
// 它在沙盒里读以往学习的对话渲染，沙盒动作照样记进它自己的正本。
// 设计：会话/导航.md「检索子代理」；记录/读写权限.md「执行方式」「权限表」；工单 README §2.7。
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { post, waitFor } from '../helpers/http.ts';
import {
  cardStep,
  lineOfLearner,
  openLearning,
  roleOf,
  sandboxActions,
  sandboxOf,
  say,
  settled,
  start,
  step,
} from './共用/w4-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

describe('检索子代理的沙盒', () => {
  it('只挂 submit_findings；只读沙盒里有学过的记录与资料；读以往学习的对话渲染被记下', async () => {
    const past = { loopId: '', line: 0 };
    let retrieved = false;
    const { app, fake, dataRoot, world } = await start((ctx, w) => {
      switch (roleOf(ctx.spec)) {
        case 'nav':
          if (past.line > 0 && !retrieved && ctx.input.role === 'program') {
            retrieved = true;
            return {
              calls: [
                {
                  name: 'retrieve',
                  args: { question: '上次学位移时学习者卡在哪', loops: [past.loopId] },
                },
                ...(cardStep(w).calls ?? []),
              ],
            };
          }
          return cardStep(w);
        case 'retrieve':
          return step({
            sandbox: [{ op: 'read', path: `只读/学过的记录/${past.loopId}-对话.md` }],
            calls: [
              {
                name: 'submit_findings',
                args: {
                  findings: [
                    { text: '学习者把位置当成位移', ref: `${past.loopId}:${String(past.line)}` },
                  ],
                },
              },
            ],
          });
        default:
          return { text: '好。' };
      }
    });
    apps.push(app);

    // 以往一次学习：说了一句就结束（没合上）
    past.loopId = await openLearning(app, world.mainId);
    const recs = await say(app, past.loopId, '位移就是我现在的位置');
    past.line = lineOfLearner(recs, '位移就是我现在的位置');
    expect((await post(app, `/sessions/${past.loopId}/end`, { note: '先停' })).status).toBe(202);
    await app.studium.settled();

    // 没合上之后导航出卡（必要时学习者再要一张），导航派检索子代理
    await post(app, '/cards/request', { projectId: world.mainId });
    const spec = await waitFor('开了检索子代理', () =>
      Promise.resolve(fake.opened.find((s) => s.tools.some((t) => t.name === 'submit_findings'))),
    );
    await app.studium.settled();

    expect(
      spec.tools.map((t) => t.name),
      '检索子代理只挂 submit_findings',
    ).toEqual(['submit_findings']);
    const sb = sandboxOf(spec);
    expect(sb, '检索子代理有沙盒').toBeDefined();
    expect(sb?.network, '不联网').toBe(false);
    const names = (sb?.readOnly ?? []).map((r) => r.name);
    expect(names, '只读里有学过的记录').toContain('学过的记录');
    expect(
      names.some((n) => n.startsWith('资料/')),
      '只读里有资料',
    ).toBe(true);

    // 以往学习的渲染在它的沙盒里，带行号
    const id = spec.session?.id ?? '';
    const lower = await readFile(
      join(dataRoot, 'sandbox', id, '只读', '学过的记录', `${past.loopId}-对话.md`),
      'utf8',
    );
    expect(lower, '以往学习的对话渲染带行号').toMatch(
      new RegExp(`L${String(past.line)} 学习者[^\\n]*位移就是我现在的位置`),
    );

    // 它的沙盒动作记进它自己的正本
    const acts = sandboxActions(await settled(app, id));
    const read = acts.find((a) => a.op === 'read');
    expect(read?.path, '读的是以往学习的对话渲染').toBe(`只读/学过的记录/${past.loopId}-对话.md`);
    expect(read?.ok).toBe(true);
    expect(read?.actor).toBe('model');
  }, 15_000);
});
