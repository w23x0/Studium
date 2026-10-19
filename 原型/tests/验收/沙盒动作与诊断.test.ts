// 验收（W4）：学习对话在沙盒里的每个动作由程序当场记成 sandbox_action（actor 模型，程序按路径打 tag）；
// 诊断 = 工作区里追加的 诊断.md；越界写被拒且没写出；run 只记不执行；守卫的输入按“谁做的”过滤，读不到诊断与沙盒动作。
// 设计：会话/学习对话.md §2、§4；记录/对话与事件记录.md §3；会话/守卫.md §2；记录/读写权限.md「红线」。
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { getJson, post } from '../helpers/http.ts';
import {
  cardStep,
  learnerLine,
  openLearning,
  programInputs,
  roleOf,
  sandboxActions,
  settled,
  say,
  start,
  step,
  verdictStep,
} from './共用/w4-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const DIAG1 = '诊断甲：还不知道学习者会不会区分位置与位移';
const DIAG2 = '诊断乙：学习者自己说出终点减起点，待换情境验证';
const RUN_MARK = '沙盒命令标记qx7';

async function exists(p: string): Promise<boolean> {
  return access(p).then(
    () => true,
    () => false,
  );
}

describe('沙盒动作与诊断', () => {
  it('诊断进工作区并记成带标签的沙盒动作；越界写被拒；守卫读不到诊断与沙盒动作', async () => {
    let outside = '';
    const { app, fake, dataRoot, world } = await start((ctx, w) => {
      switch (roleOf(ctx.spec)) {
        case 'nav':
          return cardStep(w);
        case 'loop':
          if (ctx.input.role === 'program' && ctx.turn === 0) {
            return step({
              sandbox: [
                { op: 'append', path: '诊断.md', content: `${DIAG1}\n` },
                { op: 'write', path: '../外面.md', content: '不该写出去' },
                { op: 'write', path: outside, content: '不该写出去' },
                { op: 'write', path: '只读/学过的记录/改不了.md', content: '不该写进只读区' },
                { op: 'run', command: `echo ${RUN_MARK}` },
                { op: 'read', path: '只读/本次对话.md' },
              ],
              text: '我们开始，你说说位移是什么？',
            });
          }
          if (ctx.input.text.includes('终点减起点')) {
            return step({
              sandbox: [{ op: 'append', path: '诊断.md', content: `${DIAG2}\n` }],
              calls: [{ name: 'request_close', args: { reason: '学习者自己说清了' } }],
              text: '我请守卫看一下。',
            });
          }
          return { text: '好。' };
        case 'guard':
          return verdictStep(true, learnerLine(ctx.input.text, '终点减起点'));
        default:
          return { text: '好。' };
      }
    });
    apps.push(app);
    outside = join(dataRoot, '外面2.md');

    const loopId = await openLearning(app, world.mainId);
    await say(app, loopId, '位移就是终点减起点，和走了多远无关');
    await app.studium.settled();
    const recs = await settled(app, loopId);
    const acts = sandboxActions(recs);
    const root = join(dataRoot, 'sandbox', loopId);

    // 诊断：两次追加，都打“诊断”标签、带写进去的内容；文件里两段都在
    const diag = acts.filter((a) => a.tag === '诊断');
    expect(diag, '两次写诊断都记成带“诊断”标签的沙盒动作').toHaveLength(2);
    for (const a of diag) {
      expect(a.actor, '沙盒动作标明是模型做的').toBe('model');
      expect(a.op).toBe('write');
      expect(a.path, '工作区里的路径相对工作区').toBe('诊断.md');
      expect(a.ok).toBe(true);
    }
    expect(diag.map((a) => a.content ?? '').join(''), '记录带写进去的内容').toContain(DIAG1);
    expect(diag.map((a) => a.content ?? '').join('')).toContain(DIAG2);
    const file = await readFile(join(root, '工作区', '诊断.md'), 'utf8');
    expect(file, '诊断.md 是追加的').toContain(DIAG1);
    expect(file).toContain(DIAG2);

    // 越界写：记 ok:false，文件没写出
    const refused = acts.filter((a) => a.op === 'write' && !a.ok);
    expect(refused.length, '三次越界写都被拒').toBe(3);
    expect(await exists(join(root, '外面.md')), '工作区外（..）没写出').toBe(false);
    expect(await exists(outside), '工作区外（绝对路径）没写出').toBe(false);
    expect(await exists(join(root, '只读', '学过的记录', '改不了.md')), '只读区没写进去').toBe(
      false,
    );

    // run 只记不执行；读本次对话
    const run = acts.find((a) => a.op === 'run');
    expect(run?.command, '命令照记').toContain(RUN_MARK);
    expect(run?.ok).toBe(true);
    const read = acts.find((a) => a.op === 'read');
    expect(read?.path, '读本次对话用虚拟路径').toBe('只读/本次对话.md');
    expect(read?.ok).toBe(true);

    // 守卫：输入里没有诊断、没有沙盒动作，只有对话
    const guardInput = programInputs(fake, 'submit_verdict').join('\n');
    expect(guardInput, '守卫读得到学习者的话').toContain('位移就是终点减起点');
    expect(guardInput, '守卫读不到诊断').not.toContain(DIAG1);
    expect(guardInput, '守卫读不到诊断').not.toContain(DIAG2);
    expect(guardInput, '守卫读不到沙盒动作').not.toContain(RUN_MARK);
    expect(guardInput, '守卫读不到沙盒动作').not.toContain('诊断.md');

    // 申请收口照常：判合上 → 学习者确认 → 结束
    const verdict = recs.find((r) => r.record.type === 'guard_verdict');
    expect(verdict?.record.type === 'guard_verdict' && verdict.record.closed, '守卫判合上').toBe(
      true,
    );
    expect((await post(app, `/sessions/${loopId}/confirm-close`)).status).toBe(202);
    await app.studium.settled();
    const ended = (await settled(app, loopId)).find((r) => r.record.type === 'loop_ended');
    expect(ended?.record.type === 'loop_ended' && ended.record.closed, '合上结束').toBe(true);

    // 依据可见：这次学习的诊断来自沙盒里的 诊断.md
    const ev = await getJson<{ loop: { diagnoses: { text: string }[] } }>(
      app,
      `/loops/${loopId}/evidence`,
    );
    const texts = ev.loop.diagnoses.map((d) => d.text).join('\n');
    expect(texts, '证据视图里的诊断是写进 诊断.md 的内容').toContain(DIAG1);
    expect(texts).toContain(DIAG2);
  });
});
