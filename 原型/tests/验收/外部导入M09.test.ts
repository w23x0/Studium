// 验收：外部导入写 M09——畅谈结束时学习者自己说会的东西作为“自述、未验证”写进 M09；
// 笔记导入后可让模型从笔记里提“学习者写过的点”作为“笔记、未验证”。和闭环证据分档：
// 未验证、不算学会、不进“已合上过”，M05 和闭环读取时能区分档次。只经 HTTP 验证（假模型）。
import { afterEach, describe, expect, it } from 'vitest';
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel, type FakeContext, type FakeStep } from '../../src/core/model/fake.ts';
import type {
  ExternalRecordsResponse,
  NoteImportResponse,
  TocResponse,
} from '../../src/shared/protocol.ts';
import { call, getJson, post, records, TOKEN, waitFor } from '../helpers/http.ts';
import { startLibraryApp } from '../helpers/library.ts';
import { roleOf } from '../helpers/roles.ts';
import { makeNotesDir, toolOf } from '../helpers/scope.ts';
import { tempDir } from '../helpers/tmp.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const q = encodeURIComponent;
const lineOf = (text: string): number => Number(/\[第 (\d+) 行\]/.exec(text)?.[1] ?? 0);

/** 主对话说“想学”开畅谈；畅谈里学习者说“微积分学过”时交回方向（带自述 / 期限，按 mode 变化）。 */
function talkResponder(mode: { known: 'good' | 'badLine' | 'badPoint' | 'none' }) {
  return (ctx: FakeContext): FakeStep | undefined => {
    const has = (n: string) => ctx.spec.tools.some((t) => t.name === n);
    if (has('open_goal_talk')) {
      return ctx.input.role === 'learner' && ctx.input.text.includes('想学')
        ? { calls: [{ name: 'open_goal_talk', args: {} }], text: '我们单独谈谈。' }
        : { text: '好。' };
    }
    if (has('settle_goal')) {
      if (ctx.input.role === 'program') return { text: '你学过什么？' };
      if (!ctx.input.text.includes('微积分学过')) return { text: '再说说？' };
      const line = lineOf(ctx.input.text);
      const known =
        mode.known === 'none'
          ? undefined
          : [
              {
                claim: '学过一元微积分',
                ...(mode.known === 'badPoint' ? { point: '不存在的点' } : { point: 'p-position' }),
                lines: [mode.known === 'badLine' ? 1 : line],
              },
            ];
      return {
        calls: [
          {
            name: 'settle_goal',
            args: {
              goal: '学经典力学',
              project_name: '经典力学',
              deadline: '2026-12-20',
              ...(known ? { known } : {}),
            },
          },
        ],
        text: '定了。',
      };
    }
    if (roleOf(ctx) === 'm05') {
      return {
        calls: [
          {
            name: 'submit_choice_card',
            args: {
              options: [
                {
                  new_point: 'p-displacement',
                  clause: 'c-disp-from-pos',
                  start_points: [{ point: 'p-position', source: '自述' }],
                  route_action: '继续主线',
                  title: '位移',
                  reason: '接着位置学',
                  sources: ['p-displacement'],
                },
                {
                  new_point: 'p-avg-velocity',
                  clause: 'c-avgv-from-disp',
                  start_points: [{ point: 'p-displacement', source: '假定' }],
                  route_action: '继续主线',
                  title: '平均速度',
                  reason: '另一条',
                  sources: ['p-avg-velocity'],
                },
              ],
              recommended: 0,
            },
          },
        ],
      };
    }
    return undefined;
  };
}

async function bootTalk(mode: Parameters<typeof talkResponder>[0]) {
  const fake = new FakeModel({ responder: talkResponder(mode) });
  const app = await createApp({
    dataRoot: await tempDir(),
    model: fake,
    token: TOKEN,
    port: 0,
  });
  apps.push(app);
  const mainId = await app.studium.ensureMain();
  await post(app, `/sessions/${mainId}/messages`, { text: '我想学力学' });
  const talkId = await waitFor('开出畅谈', async () => {
    const r = (await records(app, mainId)).find((x) => x.record.type === 'task_opened');
    return r?.record.type === 'task_opened' ? r.record.sessionId : undefined;
  });
  await waitFor('畅谈先开口', async () =>
    (await records(app, talkId)).some((r) => r.record.type === 'assistant_message'),
  );
  await post(app, `/sessions/${talkId}/messages`, { text: '微积分学过，想学力学' });
  return { app, fake, mainId, talkId };
}

const externals = (app: App) => getJson<ExternalRecordsResponse>(app, '/m09/external');

describe('验收：畅谈里的自述写进 M09（未验证）', () => {
  it('学习者亲口说会的：写成“自述、未验证”，引他的原话行；项目方向与期限一并交回', async () => {
    const { app, mainId, talkId } = await bootTalk({ known: 'good' });
    await waitFor('交回方向', async () =>
      (await records(app, talkId)).some((r) => r.record.type === 'talk_ended'),
    );
    const { records: ext } = await externals(app);
    expect(ext).toHaveLength(1);
    expect(ext[0]).toMatchObject({
      source: '自述',
      status: '未验证',
      claim: '学过一元微积分',
      point: { id: 'p-position', found: true },
      talk: { sessionId: talkId, quotes: ['微积分学过，想学力学'] },
    });
    expect(ext[0]?.basis).toContain('没有验证');
    const line = ext[0]?.talk?.lines[0] ?? 0;
    const said = (await records(app, talkId)).find((r) => r.line === line);
    expect(said?.record.type).toBe('user_message');
    // 期限也随方向交回
    const projects = await getJson<{ projects: { deadline?: string }[] }>(app, '/projects');
    expect(projects.projects[0]?.deadline).toBe('2026-12-20');
    expect(mainId).toBeTruthy();
    await app.studium.settled();
  });

  it('引的不是学习者的行 / 点不存在：整次交回被退回，什么都不写，模型可改后重交', async () => {
    for (const known of ['badLine', 'badPoint'] as const) {
      const { app, mainId, talkId } = await bootTalk({ known });
      await app.studium.settled();
      expect((await externals(app)).records).toEqual([]);
      expect((await records(app, talkId)).some((r) => r.record.type === 'talk_ended')).toBe(false);
      expect((await records(app, mainId)).some((r) => r.record.type === 'project_goal')).toBe(
        false,
      );
      const failed = (await records(app, talkId)).find(
        (r) => r.record.type === 'tool_call' && r.record.isError,
      );
      expect(failed).toBeTruthy();
    }
  });

  it('M05 开场和闭环开场区分档次：外部导入单列、标未验证，不进“已合上过的新点”', async () => {
    const { app, fake, mainId, talkId } = await bootTalk({ known: 'good' });
    await waitFor('交回方向', async () =>
      (await records(app, talkId)).some((r) => r.record.type === 'talk_ended'),
    );
    await app.studium.settled();
    await post(app, '/cards/request', { projectId: mainId });
    const cardId = await waitFor('出了卡', async () => {
      const r = (await records(app, mainId)).find((x) => x.record.type === 'choice_card');
      return r?.record.type === 'choice_card' ? r.record.cardId : undefined;
    });
    const opening = fake.inputs.find((i) => i.text.includes('已合上过的新点'))?.text ?? '';
    expect(opening).toContain('已合上过的新点（M09）：（空');
    expect(opening).toMatch(/外部导入[^\n]*未验证[\s\S]*学过一元微积分/);
    expect(opening).toContain('期限：2026-12-20');

    // 模型查 M09：两档分开写
    const q09 = (await toolOf(app, 'm05', mainId, 'query_m09').run({})).text;
    expect(q09).toContain('闭环形成记录（已验证）');
    expect(q09).toContain('外部导入（未验证');
    expect(q09).toContain('学过一元微积分');

    // 闭环开场：出发点 p-position 的外部导入记录带上，标未验证
    const res = await post(app, `/cards/${cardId}/choose`, { option: 0 });
    const loopId = ((await res.json()) as { loopSessionId: string }).loopSessionId;
    await waitFor('闭环开场', async () => (await records(app, loopId)).length > 2);
    const loopOpening = fake.inputs.find((i) => i.text.includes('本闭环的单子'))?.text ?? '';
    expect(loopOpening).toMatch(/外部导入记录[^\n]*未验证[\s\S]*学过一元微积分/);
    await app.studium.settled();
  });
});

describe('验收：笔记里的点写进 M09（未验证）', () => {
  it('让模型从笔记里提点：笔记档、未验证、引笔记行段；引错的行段被退回', async () => {
    let file = '';
    const responder = (ctx: FakeContext): FakeStep | undefined => {
      if (!ctx.spec.tools.some((t) => t.name === 'write_note_points')) return undefined;
      return {
        calls: [
          {
            name: 'write_note_points',
            args: {
              points: [
                {
                  claim: '线性组合是数乘之后再相加',
                  grade: '有解释',
                  basis: '笔记里用自己的话写了定义',
                  file,
                  from_line: 1,
                  to_line: 2,
                },
                {
                  claim: '写错了行号的那条',
                  grade: '只抄定义或公式',
                  basis: '不该写进去',
                  file,
                  from_line: 99,
                  to_line: 100,
                },
              ],
            },
          },
        ],
      };
    };
    const { app } = await startLibraryApp({ fake: { responder: (c) => responder(c) } });
    apps.push(app);
    const { dir } = await makeNotesDir();
    const imported = (await (
      await post(app, '/library/notes/import', { path: dir })
    ).json()) as NoteImportResponse;
    const noteBook = imported.note.id;
    const toc = await getJson<TocResponse>(app, `/library/toc?book=${q(noteBook)}`);
    file = toc.entries.find((e) => e.title === '线性组合')?.file ?? '';
    expect(file).toBeTruthy();

    // 整批校验：有一条引错，整次退回（什么都不写）
    expect((await post(app, '/library/notes/extract', { book: noteBook })).status).toBe(202);
    await app.studium.settled();
    expect((await externals(app)).records).toEqual([]);

    // 模型改对后重提
    const fixed = (ctx: FakeContext): FakeStep | undefined => {
      const step = responder(ctx);
      const first = (step?.calls?.[0]?.args.points as unknown[] | undefined)?.[0];
      return first
        ? { calls: [{ name: 'write_note_points', args: { points: [first] } }] }
        : undefined;
    };
    const { app: app2 } = await startLibraryApp({ fake: { responder: fixed } });
    apps.push(app2);
    const again = (await (
      await post(app2, '/library/notes/import', { path: dir })
    ).json()) as NoteImportResponse;
    const noteBook2 = again.note.id;
    const toc2 = await getJson<TocResponse>(app2, `/library/toc?book=${q(noteBook2)}`);
    file = toc2.entries.find((e) => e.title === '线性组合')?.file ?? '';
    await post(app2, '/library/notes/extract', { book: noteBook2 });
    await app2.studium.settled();
    const { records: ext } = await externals(app2);
    expect(ext).toHaveLength(1);
    expect(ext[0]).toMatchObject({
      source: '笔记',
      status: '未验证',
      grade: '有解释',
      note: { book: noteBook2, file, from: 1, to: 2 },
    });
    // 笔记档不进闭环形成记录
    const formations = await getJson<{ records: unknown[] }>(app2, '/m09/records');
    expect(formations.records).toEqual([]);
  });

  it('只能从导入的笔记里提：书库里的书和不存在的都找不到（404）', async () => {
    const { app } = await startLibraryApp();
    apps.push(app);
    const books = await getJson<{ books: { id: string }[] }>(app, '/library/books');
    const book = books.books[0]?.id ?? '';
    expect((await post(app, '/library/notes/extract', { book })).status).toBe(404);
    expect((await post(app, '/library/notes/extract', { book: '没有' })).status).toBe(404);
    expect((await post(app, '/library/notes/extract', {})).status).toBe(400);
    expect((await call(app, '/library/notes')).status).toBe(200);
  });
});
