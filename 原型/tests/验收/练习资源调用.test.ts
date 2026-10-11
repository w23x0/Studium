// 验收：练习资源组织与调用（M03:13,14，不入库 M07）。只经 HTTP 验证，模型是假模型。
// - 教学侧和界面都能按书 / 章列书里的习题（M07 习题文件）：程序只给清单，按功能 / 难度选由模型判断；
// - 布置书里的习题时题面由程序按出处行读出（带教材出处标记），模型不能编；
// - 生成的题只存在练习任务自己的记录里，标“生成”，不进 M07。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type { ExercisesResponse } from '../../src/shared/protocol.ts';
import { parseCitations } from '../../src/shared/citation.ts';
import { call, getJson } from '../helpers/http.ts';
import {
  assignGenerated,
  GENERATED,
  newPractice,
  openLoop,
  practiceTask,
  startPractice,
  teach,
} from '../helpers/practice-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const BOOK = '力学入门样例';

async function start() {
  const st = newPractice();
  const s = await startPractice(st);
  apps.push(s.app);
  const { loopId } = await openLoop(s.app, s.mainId, 0);
  return { st, ...s, loopId };
}

describe('练习资源调用', () => {
  it('接口：按书 / 章列习题，只给清单（行号 + 原文）', async () => {
    const { app } = await start();
    const r = await getJson<ExercisesResponse>(app, '/practice/exercises');
    expect(r.books).toHaveLength(1);
    const sec = r.books[0]?.sections[0];
    expect(sec).toMatchObject({ num: '2', chapter: 'ch02', file: 'ch02/prob-2.md' });
    expect(sec?.items.map((i) => i.line)).toEqual([3, 4, 5, 6]);
    expect(sec?.items[1]?.text).toContain('质量 5 千克的箱子');
    expect(parseCitations(sec?.citation ?? '')[0]).toMatchObject({
      book: BOOK,
      file: 'ch02/prob-2.md',
    });
    // 章的写法 ch02 / 2 / 02 都认；没有习题的章是空的
    for (const ch of ['ch02', '2', '02']) {
      const x = await getJson<ExercisesResponse>(app, `/practice/exercises?chapter=${ch}`);
      expect(x.books[0]?.sections).toHaveLength(1);
    }
    expect(
      (await getJson<ExercisesResponse>(app, '/practice/exercises?chapter=ch01')).books,
    ).toHaveLength(0);
    // 书库里没有的书：400 并说明有哪些
    const missing = await call(app, `/practice/exercises?book=${encodeURIComponent('不存在的书')}`);
    expect(missing.status).toBe(400);
    expect(((await missing.json()) as { error: string }).error).toContain(BOOK);
  });

  it('教学侧的 list_exercises 工具给同样的清单', async () => {
    const { app, st, loopId } = await start();
    const rows = await teach(
      app,
      st,
      loopId,
      { calls: [{ name: 'list_exercises', args: { chapter: '2' } }] },
      '想做点题',
    );
    expect(rows[0]?.isError).toBe(false);
    expect(rows[0]?.result).toContain('L4 2. 质量 5 千克的箱子');
    expect(rows[0]?.result).toContain('ch02/prob-2.md');
    const none = await teach(
      app,
      st,
      loopId,
      { calls: [{ name: 'list_exercises', args: { chapter: 'ch01' } }] },
      '再看看',
    );
    expect(none[0]?.result).toContain('没有找到习题');
  });

  it('布置书里的习题：题面由程序按出处行读出，带教材出处标记', async () => {
    const { app, st, loopId } = await start();
    const rows = await teach(
      app,
      st,
      loopId,
      {
        calls: [
          {
            name: 'assign_practice',
            args: {
              ...GENERATED,
              generated_prompt: undefined,
              focus: '加速度和力、质量的关系',
              textbook: { book: BOOK, file: 'ch02/prob-2.md', from: 4 },
              function: '巩固',
              difficulty: '中',
              points: ['p-newton2'],
            },
          },
        ],
      },
      '做书上的题吧',
    );
    expect(rows[0]?.isError).toBe(false);
    const id = /pr-[0-9a-f]{8}/.exec(rows[0]?.result ?? '')?.[0] ?? '';
    const t = await practiceTask(app, loopId, id);
    expect(t.source).toMatchObject({
      kind: 'textbook',
      book: BOOK,
      file: 'ch02/prob-2.md',
      from: 4,
      to: 4,
    });
    expect(t.prompt).toBe(
      '2. 质量 5 千克的箱子受 20 牛的合力，求加速度。合力不变而质量加倍，加速度变为多少？',
    );
    expect(t.source.kind === 'textbook' && t.source.citation).toBe(
      `【教材|${BOOK}|ch02/prob-2.md|L4】`,
    );
    expect(t.points.map((p) => p.id)).toEqual(['p-newton2']);
  });

  it('书、文件、行号对不上的不布置，也不用模型写的题面代替', async () => {
    const { app, st, loopId } = await start();
    const bad = async (textbook: Record<string, unknown>, say: string) => {
      const rows = await teach(
        app,
        st,
        loopId,
        {
          calls: [
            {
              name: 'assign_practice',
              args: { ...GENERATED, generated_prompt: undefined, textbook },
            },
          ],
        },
        say,
      );
      return rows[0];
    };
    expect(
      (await bad({ book: '没有这本书', file: 'ch02/prob-2.md', from: 3 }, '一'))?.isError,
    ).toBe(true);
    expect((await bad({ book: BOOK, file: 'ch09/没有.md', from: 3 }, '二'))?.isError).toBe(true);
    expect((await bad({ book: BOOK, file: 'ch02/prob-2.md', from: 2 }, '三'))?.result).toContain(
      '空',
    );
    expect((await bad({ book: BOOK, file: 'ch02/prob-2.md', from: 5, to: 3 }, '四'))?.isError).toBe(
      true,
    );
    const tasks = await getJson<{ tasks: unknown[] }>(app, `/loops/${loopId}/practice`);
    expect(tasks.tasks).toHaveLength(0);
  });

  it('生成的题只存在任务自己的记录里，标“生成”，不进 M07 习题清单', async () => {
    const { app, st, loopId } = await start();
    const id = await assignGenerated(app, st, loopId);
    const t = await practiceTask(app, loopId, id);
    expect(t.source).toEqual({ kind: 'generated' });
    const r = await getJson<ExercisesResponse>(app, '/practice/exercises');
    const all = JSON.stringify(r);
    expect(all).not.toContain('蚂蚁');
    expect(r.books[0]?.sections).toHaveLength(1);
  });
});
