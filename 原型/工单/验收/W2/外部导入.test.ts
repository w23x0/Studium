// 验收（W2）：外部导入（docs/设计/记录/学过的记录.md「外部导入」；工单 README §2.5 Import）。
// 由程序在导入时写原样指针，存 <数据>/learned/imports.jsonl，与学习记录分开、标未验证，不经模型分析：
// 畅谈：settle_goal 的 known[] = { text, lines[] }（学习者的行）→ 每条一个 channel: 畅谈 的导入；
// 笔记：POST /library/notes/import 成功后写一条 channel: 笔记 的导入。模型“提点”（notes/extract）删掉。只经 HTTP，假模型。
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type { FakeContext, FakeStep } from '../../src/core/model/fake.ts';
import { post, records, waitFor } from '../helpers/http.ts';
import { tempDir } from '../helpers/tmp.ts';
import { boot, learned, newFlow, settled, type Loose } from './共用/w2-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const ownLine = (text: string): number => Number(/\[第 (\d+) 行\]/.exec(text)?.[1] ?? 0);

/** 主对话说“想学”开畅谈；畅谈里学习者说“学过”时交回方向，known 按 mode 给。 */
function talkExtra(mode: 'good' | 'badLine') {
  return (ctx: FakeContext): FakeStep | undefined => {
    const has = (n: string) => ctx.spec.tools.some((t) => t.name === n);
    if (has('open_goal_talk') && ctx.input.role === 'learner' && ctx.input.text.includes('想学')) {
      return { calls: [{ name: 'open_goal_talk', args: {} }], text: '我们单独谈谈。' };
    }
    if (!has('settle_goal')) return undefined;
    if (ctx.input.role === 'program') return { text: '你以前学过什么？' };
    if (!ctx.input.text.includes('学过')) return { text: '再说说？' };
    const line = ownLine(ctx.input.text);
    return {
      calls: [
        {
          name: 'settle_goal',
          args: {
            goal: '学经典力学，到能自己推导运动学公式',
            project_name: '经典力学',
            known: [
              { text: '学过一元微积分', lines: [mode === 'badLine' ? 1 : line] },
              { text: '会求导', lines: [line] },
            ],
          },
        },
      ],
      text: '定了。',
    };
  };
}

async function bootTalk(mode: 'good' | 'badLine') {
  const flow = newFlow();
  flow.extra = talkExtra(mode);
  const { app, mainId, root } = await boot(flow);
  apps.push(app);
  await post(app, `/sessions/${mainId}/messages`, { text: '我想学力学' });
  const talkId = await waitFor('开出畅谈', async () => {
    const r = (await records(app, mainId)).find((x) => x.record.type === 'task_opened');
    return r?.record.type === 'task_opened' ? r.record.sessionId : undefined;
  });
  await settled(app, talkId);
  await post(app, `/sessions/${talkId}/messages`, { text: '微积分学过，会求导，想学力学' });
  await settled(app, talkId);
  await app.studium.settled();
  return { app, mainId, talkId, root };
}

describe('外部导入：畅谈渠道', () => {
  it('known 每条一个“畅谈”导入：原样指针（会话 id + 学习者的行），标未验证，不带点、不带模型的说法', async () => {
    const { app, talkId, root } = await bootTalk('good');
    expect(
      (await records(app, talkId)).some((r) => r.record.type === 'talk_ended'),
      '方向交回了',
    ).toBe(true);
    const said = (await records(app, talkId)).find(
      (r) => r.record.type === 'user_message' && r.record.text.includes('学过'),
    );
    const { imports } = await learned(app);
    expect(imports, '两条 known → 两条导入').toHaveLength(2);
    for (const x of imports) {
      expect(x, '畅谈导入 = 指向学习者原话行的指针，标未验证').toMatchObject({
        channel: '畅谈',
        ref: { session: talkId, lines: [said?.line] },
        unverified: true,
      });
      expect(typeof x.id, '有编号').toBe('string');
      expect(typeof x.at, '有时间').toBe('string');
      expect(Object.keys(x).sort(), '只存指针，不存“点亮了什么”').toEqual(
        ['at', 'channel', 'id', 'ref', 'unverified'].sort(),
      );
    }
    const file = join(root, 'learned', 'imports.jsonl');
    expect(existsSync(file), '存在 <数据>/learned/imports.jsonl').toBe(true);
    expect((await readFile(file, 'utf8')).trim().split('\n'), '一行一条，只追加').toHaveLength(2);
    expect(existsSync(join(root, 'knowledge', 'm09')), '不再有 M09 存放处').toBe(false);
  });

  it('known 引的不是学习者的行：整次交回被退回，什么都不写', async () => {
    const { app, talkId, mainId } = await bootTalk('badLine');
    expect((await learned(app)).imports, '没有导入').toEqual([]);
    expect(
      (await records(app, talkId)).some((r) => r.record.type === 'talk_ended'),
      '畅谈没结束',
    ).toBe(false);
    expect(
      (await records(app, mainId)).some((r) => r.record.type === 'project_goal'),
      '方向没写进项目',
    ).toBe(false);
    expect(
      (await records(app, talkId)).some(
        (r) => r.record.type === 'tool_call' && r.record.name === 'settle_goal' && r.record.isError,
      ),
      'settle_goal 被工具退回',
    ).toBe(true);
  });
});

describe('外部导入：笔记渠道', () => {
  it('导入笔记成功后程序写一条“笔记”导入，指向那份笔记；模型提点的接口没有了', async () => {
    const { app, root } = await boot(newFlow());
    apps.push(app);
    const dir = join(await tempDir(), '线性代数笔记');
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, '01向量.md'),
      '# 向量\n\n向量可以相加，也可以数乘。\n\n## 线性组合\n\n线性组合就是数乘之后再相加。\n',
    );
    const res = await post(app, '/library/notes/import', { path: dir });
    expect(res.status, '笔记导入照旧可用').toBe(201);
    const note = ((await res.json()) as { note: { id: string } }).note;

    const { imports, learnings } = await learned(app);
    expect(imports, '导入后有一条笔记导入').toHaveLength(1);
    expect(imports[0], '笔记导入 = 指向那份笔记，标未验证').toMatchObject({
      channel: '笔记',
      ref: { note: note.id },
      unverified: true,
    });
    expect(learnings, '外部导入与学习记录分开存，不算一次学习').toEqual([]);
    expect(existsSync(join(root, 'learned', 'imports.jsonl')), '写进导入存放处').toBe(true);

    // 导入失败（路径不存在）不写导入
    const bad = await post(app, '/library/notes/import', { path: join(dir, '没有') });
    expect(bad.status, '路径不存在：导入失败').not.toBe(201);
    expect((await learned(app)).imports, '失败的导入不写记录').toHaveLength(1);

    // 模型从笔记里“提点”取消
    expect(
      (await post(app, '/library/notes/extract', { book: note.id })).status,
      'POST /library/notes/extract 已删',
    ).toBe(404);
    await app.studium.settled();
    const extracted = (await learned(app)).imports.filter((x: Loose) => x.channel !== '笔记');
    expect(extracted, '没有别的渠道的导入').toEqual([]);
  });
});
