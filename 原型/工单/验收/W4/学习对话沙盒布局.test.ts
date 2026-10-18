// 验收（W4）：开学习时程序准备沙盒（工单 README §2.6 布局），每轮前刷新只读渲染；学习对话只有两个命令；
// 开场只给目标 + 单子 + 沙盒说明（阶段验收写明）。设计：会话/学习对话.md §2、§3；记录/读写权限.md「执行方式」。
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { post, records } from '../helpers/http.ts';
import {
  cardStep,
  lineOfLearner,
  openLearning,
  programInputs,
  roleOf,
  sandboxOf,
  say,
  specOf,
  start,
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

async function isDir(p: string): Promise<boolean> {
  return (await stat(p).catch(() => undefined))?.isDirectory() === true;
}

async function isFile(p: string): Promise<boolean> {
  return (await stat(p).catch(() => undefined))?.isFile() === true;
}

describe('学习对话的沙盒', () => {
  it('沙盒按布局存在；只读渲染有以往学习与本次对话（带行号）；工具恰好两个；开场有单子与沙盒说明', async () => {
    const { app, fake, dataRoot, world } = await start(
      (ctx, w) => {
        switch (roleOf(ctx.spec)) {
          case 'nav':
            return cardStep(w);
          case 'loop':
            return { text: '我们开始。' };
          default:
            return { text: '好。' };
        }
      },
      async (root) => {
        await mkdir(join(root, 'teaching-tools'), { recursive: true });
        await writeFile(join(root, 'teaching-tools', '我的老办法.md'), OWN);
      },
    );
    apps.push(app);

    // 第一次学习：说一句，没合上就结束
    const first = await openLearning(app, world.mainId);
    const firstRecs = await say(app, first, '位置就是坐标轴上的一个数');
    const firstLine = lineOfLearner(firstRecs, '位置就是坐标轴上的一个数');
    const end = await post(app, `/sessions/${first}/end`, { note: '今天先到这里，想换个题' });
    expect(end.status, '结束没合上').toBe(202);
    await app.studium.settled();

    // 第二次学习：说一句，等这一轮跑完（这一轮前已刷新渲染）
    const second = await openLearning(app, world.mainId);
    const secondRecs = await say(app, second, '位移是终点减起点');
    const secondLine = lineOfLearner(secondRecs, '位移是终点减起点');

    const root = join(dataRoot, 'sandbox', second);
    expect(await isDir(join(root, '工作区')), '工作区目录').toBe(true);
    for (const d of ['学过的记录', '教学工具', '状态记录', '教法记录']) {
      expect(await isDir(join(root, '只读', d)), `只读/${d} 目录`).toBe(true);
    }

    // 以往那次学习：上层（带会话 id、结束原话）+ 下层对话原文（带行号）
    const upper = await readFile(join(root, '只读', '学过的记录', `${first}.md`), 'utf8');
    expect(upper, '以往学习的文件写明会话 id').toContain(first);
    expect(upper, '没合上那次的上层有结束原话').toContain('今天先到这里');
    const lower = await readFile(join(root, '只读', '学过的记录', `${first}-对话.md`), 'utf8');
    expect(lower, '以往学习的对话原文带行号').toMatch(
      new RegExp(`L${String(firstLine)} 学习者[^\\n]*位置就是坐标轴上的一个数`),
    );
    expect(
      await isFile(join(root, '只读', '学过的记录', `${second}.md`)),
      '本次学习不进“学过的记录”',
    ).toBe(false);

    // 本次对话：每轮前刷新，带行号
    const now = await readFile(join(root, '只读', '本次对话.md'), 'utf8');
    expect(now, '本次对话带行号且含刚说的话').toMatch(
      new RegExp(`L${String(secondLine)} 学习者[^\\n]*位移是终点减起点`),
    );

    // 教学工具：官方的与学习者自己的都放进来
    expect(await isFile(join(root, '只读', '教学工具', '提取练习.md')), '官方教学工具').toBe(true);
    expect(
      await isFile(join(root, '只读', '教学工具', '我的老办法.md')),
      '学习者自己的教学工具',
    ).toBe(true);

    // 学习对话的 spec：有沙盒、工作区与只读目录对得上、不联网；工具恰好两个命令
    const spec = specOf(fake, second);
    expect(spec, '学习对话开过模型对话').toBeDefined();
    const sb = spec ? sandboxOf(spec) : undefined;
    expect(sb?.workdir, '工作区路径').toBe(join(root, '工作区'));
    expect(sb?.network, '默认不联网').toBe(false);
    const names = (sb?.readOnly ?? []).map((r) => r.name);
    for (const n of ['学过的记录', '教学工具', '状态记录', '教法记录', '本次对话.md']) {
      expect(names, `只读里有 ${n}`).toContain(n);
    }
    expect(
      names.some((n) => n.startsWith('资料/')),
      '只读里有资料（每本书一项）',
    ).toBe(true);
    expect(spec?.tools.map((t) => t.name).sort(), '学习对话只有两个命令').toEqual([
      'end_loop_unclosed',
      'request_close',
    ]);

    // 开场：单子 + 沙盒说明；不是阶段验收
    const opening = programInputs(fake, 'request_close').find((t) => t.includes('p-displacement'));
    expect(opening, '开场里有单子').toBeDefined();
    expect(opening, '开场说明诊断写在哪').toContain('诊断.md');
    expect(opening, '开场说明工作区').toContain('工作区');
    expect(opening, '开场说明只读的学过的记录').toContain('只读/学过的记录');
    expect(opening, '普通学习不说阶段验收').not.toContain('阶段验收');

    // 阶段验收：开场写明
    const stage = await openLearning(app, world.mainId, 1);
    const stageRecs = await records(app, stage);
    const stageOpening = stageRecs.find((r) => r.record.type === 'program_fact');
    expect(
      stageOpening?.record.type === 'program_fact' ? stageOpening.record.text : '',
      '阶段验收的开场写明',
    ).toContain('阶段验收');
  });
});
