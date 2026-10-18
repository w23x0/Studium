// 验收（W4）：教学工具是沙盒里的可读文件，读了哪份由程序从沙盒动作取（tag 教学工具:<文件名>），不靠模型自报；
// 教法记录整理的开场读得到用过哪份与诊断；整理出的教法记录放进下一次学习的沙盒。
// 设计：记录/教法记录与教学工具.md「教学工具」「用了什么：程序照记」；会话/后台整理.md「教法记录整理」；会话/学习对话.md §7。
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type { TeachingToolsResponse } from '../../src/shared/protocol.ts';
import { getJson, post, records, waitFor } from '../helpers/http.ts';
import {
  cardStep,
  learnerLine,
  openLearning,
  programInputs,
  roleOf,
  sandboxActions,
  say,
  settled,
  start,
  step,
  verdictStep,
} from './共用/w4-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const OWN = `# 我的老办法

- 适用条件：学习者想用生活里的例子讲给别人听时
- 来源：学习者自己
- 状态：学习者自己写的

## 做法
让学习者讲给一个外行听。

## 怎么引出证据
外行听不懂的地方就是还没想清的地方。

## 注意边界
不替学习者讲。
`;

const DIAG = '诊断：先让学习者自己提取，再看要不要讲';
const BASIS = '学习者独立说清了位移只看起点终点';
const STRATEGY = '先让学习者提取、不急着讲';

describe('教法记录与教学工具', () => {
  it('读教学工具文件被程序记下；教法记录整理看得到用过哪份与诊断；记录进下一次学习的沙盒', async () => {
    const { app, fake, dataRoot, world } = await start(
      (ctx, w) => {
        const line = learnerLine(ctx.input.text, '终点减起点');
        switch (roleOf(ctx.spec)) {
          case 'nav':
            return cardStep(w);
          case 'loop':
            if (ctx.input.role === 'program' && ctx.turn === 0) {
              return step({
                sandbox: [
                  { op: 'read', path: '只读/教学工具/提取练习.md' },
                  { op: 'read', path: '只读/教学工具/我的老办法.md' },
                  { op: 'read', path: '只读/教学工具/不存在的工具.md' },
                  { op: 'append', path: '诊断.md', content: `${DIAG}\n` },
                ],
                text: '我们开始，你先说说位移是什么？',
              });
            }
            return { text: '好。' };
          case 'guard':
            return verdictStep(true, line, BASIS);
          case 'pedagogy': {
            if (ctx.input.role !== 'program') return { text: '好' };
            const record = {
              conditions: '状态未知',
              strategies: STRATEGY,
              followed_by: '学习者独立说清',
            };
            return {
              calls: [
                { name: 'write_strategy_record', args: { ...record, evidence_lines: [9999] } },
                { name: 'write_strategy_record', args: { ...record, evidence_lines: [line] } },
              ],
            };
          }
          default:
            return { text: '好。' };
        }
      },
      async (root) => {
        await mkdir(join(root, 'teaching-tools'), { recursive: true });
        await writeFile(join(root, 'teaching-tools', '我的老办法.md'), OWN);
        await writeFile(join(root, 'teaching-tools', '坏文件.md'), '随手写的，没有格式');
      },
    );
    apps.push(app);

    // 界面读的列表照旧
    const list = await getJson<TeachingToolsResponse>(app, '/teaching-tools');
    expect(
      list.tools.map((t) => t.name),
      '官方教学工具照旧列出',
    ).toContain('提取练习');
    expect(list.tools.find((t) => t.name === '我的老办法')?.origin).toBe('学习者自己');
    expect(list.problems.join('\n'), '坏文件照旧报出').toContain('坏文件');

    // 第一次学习：开场读了两份教学工具（一份不存在），写了诊断；学习者说清，合上
    const first = await openLearning(app, world.mainId);
    await say(app, first, '位移就是终点减起点');
    await post(app, `/sessions/${first}/close-request`);
    await waitFor('守卫判定', async () =>
      (await records(app, first)).some((r) => r.record.type === 'guard_verdict'),
    );
    expect((await post(app, `/sessions/${first}/confirm-close`)).status).toBe(202);
    await app.studium.settled();

    // 程序按路径打标签：读成功的两份 ok，不存在的那份 ok:false
    const acts = sandboxActions(await settled(app, first));
    const tools = acts.filter((a) => a.tag?.startsWith('教学工具:') === true);
    expect(
      tools.filter((a) => a.ok).map((a) => a.tag),
      '读了哪份由程序从沙盒动作记下',
    ).toEqual(['教学工具:提取练习.md', '教学工具:我的老办法.md']);
    expect(tools.find((a) => a.tag === '教学工具:不存在的工具.md')?.ok, '读不到的记 ok:false').toBe(
      false,
    );

    // 依据视图：用过的教学工具按文件名、指回行号
    const ev = await getJson<{
      loop: { teachingToolsUsed: { name: string; line: number }[] };
    }>(app, `/loops/${first}/evidence`);
    expect(
      ev.loop.teachingToolsUsed.map((u) => u.name),
      '用过的教学工具（去掉读失败的）',
    ).toEqual(['提取练习.md', '我的老办法.md']);

    // 教法记录整理的开场：看得到用过哪份、诊断、判定依据、学习者的话
    const opening = programInputs(fake, 'write_strategy_record')[0] ?? '';
    expect(opening, '开场列用过的教学工具').toContain('提取练习.md');
    expect(opening).toContain('我的老办法.md');
    expect(opening, '读失败的不算用过').not.toContain('不存在的工具.md');
    expect(opening, '开场有诊断（来自沙盒里的 诊断.md）').toContain(DIAG);
    expect(opening, '开场有守卫判定').toContain(BASIS);
    expect(opening, '开场有对话原文').toContain('位移就是终点减起点');

    // 记录引用的行须在这段学习里：9999 被退回，正确的那条记下
    const pedagogy = fake.opened.find((s) =>
      s.tools.some((t) => t.name === 'write_strategy_record'),
    );
    const writes = (await settled(app, pedagogy?.session?.id ?? '')).flatMap((r) =>
      r.record.type === 'tool_call' && r.record.name === 'write_strategy_record'
        ? [r.record.isError]
        : [],
    );
    expect(writes, '引用不在这段学习里的行被退回').toEqual([true, false]);

    // 下一次学习：沙盒里的教法记录有这条
    const second = await openLearning(app, world.mainId);
    const dir = join(dataRoot, 'sandbox', second, '只读', '教法记录');
    const files = await readdir(dir);
    const text = (await Promise.all(files.map((f) => readFile(join(dir, f), 'utf8')))).join('\n');
    expect(text, '下一次学习的沙盒里读得到教法记录').toContain(STRATEGY);
  });
});
