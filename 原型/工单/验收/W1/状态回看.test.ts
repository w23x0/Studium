// （W1 新版，取代旧的同名测试：交卡补 route_decision。）
// 验收：状态回看与学习者解释（M15:42，第二梯队）。学习者能按时间回看自己的状态记录（时间轴：每条带依据、整理出它的那一轮
// 判的阶段、来源档），每条可补一句“我的解释”：只追加、不改原记录；下次整理状态时读到并标为自述。只经 HTTP 验证（假模型）。
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type {
  AddExplanationResponse,
  SourceNoteResponse,
  StateResponse,
  StateTimelineResponse,
} from '../../src/shared/protocol.ts';
import type { NumberedRecord } from '../../src/shared/records.ts';
import { createApp, SAMPLE_DIR, type App } from '../../src/core/app.ts';
import { ACTIONS } from '../../src/core/tape/recorder.ts';
import { replayTape } from '../../src/core/tape/replay.ts';
import { FakeModel, type FakeContext, type FakeStep } from '../../src/core/model/fake.ts';
import { call, getJson, post, records, TOKEN, waitFor } from '../helpers/http.ts';
import { settled } from '../helpers/evidence-flow.ts';
import { DISPLACEMENT_OPTION, learnerLine, roleOf } from '../helpers/roles.ts';
import { toolOf } from '../helpers/scope.ts';
import { tempDir } from '../helpers/tmp.ts';
import { navRoute } from './共用/w1-card.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const EXPLAIN = '其实是昨晚没睡好，不是学不动';

function makeResponder() {
  const stages = ['证据不足', '习惯低谷'];
  let runs = 0;
  return (ctx: FakeContext): FakeStep | undefined => {
    const t = ctx.input.text;
    // 没合上就结束的闭环会让 M05 记一条停车记录（这个会话没有出选择卡的工具）
    if (ctx.spec.tools.some((x) => x.name === 'submit_parking_note')) {
      return {
        calls: [
          {
            name: 'submit_parking_note',
            args: {
              missing: [{ text: '还没学完' }],
              when: '下次进来先做',
              resume_from: '开头',
              basis_lines: [],
            },
          },
        ],
      };
    }
    switch (roleOf(ctx)) {
      case 'm05':
        return {
          calls: [
            {
              name: 'submit_choice_card',
              args: {
                options: [DISPLACEMENT_OPTION],
                recommended: 0,
                route_decision: navRoute(ctx),
              },
            },
          ],
        };
      case 'loop':
        return { text: '我们开始。' };
      case 'm15': {
        if (ctx.input.role !== 'program') return { text: '好' };
        const loopId = /一段学习 (\S+)「/.exec(t)?.[1] ?? '';
        const line = learnerLine(t, '有点累');
        if (line === 0) return { text: '没有新的可记' };
        const stage = stages[Math.min(runs++, stages.length - 1)] ?? '证据不足';
        return {
          calls: [
            {
              name: 'write_state_record',
              args: {
                text: '学习者说有点累',
                source: '自述',
                output_type: '承载读数',
                time_range: '本次会话',
                refs: [{ session: loopId, lines: [line] }],
              },
            },
            {
              name: 'write_current_state',
              args: { text: '今天有点累（自述）', stage, basis_span: '本次会话' },
            },
          ],
        };
      }
      default:
        return undefined;
    }
  };
}

async function openLoop(app: App, mainId: string, nth: number): Promise<string> {
  await post(app, '/cards/request', { projectId: mainId });
  const card = await waitFor('出了新选项', async () => {
    const cards = (await records(app, mainId)).flatMap((r) =>
      r.record.type === 'choice_card' ? [r.record.cardId] : [],
    );
    return cards.length >= nth ? cards.at(-1) : undefined;
  });
  const loopId = (
    (await (await post(app, `/cards/${card}/choose`, { option: 0 })).json()) as {
      loopSessionId: string;
    }
  ).loopSessionId;
  await settled(app, loopId);
  return loopId;
}

async function tiredAndEnd(app: App, loopId: string): Promise<void> {
  await post(app, `/sessions/${loopId}/messages`, { text: '我今天有点累' });
  await settled(app, loopId);
  expect((await post(app, `/sessions/${loopId}/end`)).status).toBe(202);
  await app.studium.settled();
}

/** 第 nth 个 M15 整理会话的开场。 */
async function m15Opening(app: App, nth: number): Promise<string> {
  const s = await waitFor(
    `第 ${String(nth)} 个整理状态的会话`,
    async () =>
      (
        await getJson<{ sessions: { sessionId: string; kind: string; openedAt: string }[] }>(
          app,
          '/sessions',
        )
      ).sessions
        .filter((x) => x.kind === 'm15')
        .sort(
          (a, b) => a.openedAt.localeCompare(b.openedAt) || a.sessionId.localeCompare(b.sessionId),
        )[nth - 1],
  );
  const recs = await settled(app, s.sessionId);
  const open = recs.find((r: NumberedRecord) => r.record.type === 'program_fact');
  return open?.record.type === 'program_fact' ? open.record.text : '';
}

describe('验收：状态回看与学习者解释', () => {
  it('时间轴：按时间排，每条带依据、阶段、来源档；没有记录时是空的', async () => {
    const dataRoot = await tempDir();
    const app = await createApp({
      dataRoot,
      model: new FakeModel({ responder: makeResponder() }),
      token: TOKEN,
      port: 0,
    });
    apps.push(app);
    const mainId = await app.studium.ensureMain();
    const empty = await getJson<StateTimelineResponse>(app, '/m15/timeline');
    expect(empty.entries).toEqual([]);
    expect(empty.stages).toEqual([]);

    const loop1 = await openLoop(app, mainId, 1);
    await tiredAndEnd(app, loop1);
    const loop2 = await openLoop(app, mainId, 2);
    await tiredAndEnd(app, loop2);

    const tl = await getJson<StateTimelineResponse>(app, '/m15/timeline');
    expect(tl.entries).toHaveLength(2);
    const ats = tl.entries.map((e) => e.record.at);
    expect([...ats].sort()).toEqual(ats);
    // 每条的阶段是整理出它的那一轮判的阶段
    expect(tl.entries.map((e) => e.stage)).toEqual(['证据不足', '习惯低谷']);
    expect(tl.stages.map((s) => s.stage)).toEqual(['证据不足', '习惯低谷']);
    // 依据原话和来源档在记录里
    const first = tl.entries[0]?.record;
    expect(first?.sourceLevel).toBe('自述');
    expect(first?.refs[0]?.quotes[0]?.text).toContain('有点累');
    // 回看是只读视图：不影响“我的状态”
    expect((await getJson<StateResponse>(app, '/m15/state')).records).toHaveLength(2);
  });

  it('我的解释：只追加、不改原记录；回看里带着；下次整理读到并标为自述；坏请求被拒', async () => {
    const dataRoot = await tempDir();
    const fake = new FakeModel({ responder: makeResponder() });
    const app = await createApp({ dataRoot, model: fake, token: TOKEN, port: 0 });
    apps.push(app);
    const mainId = await app.studium.ensureMain();
    const loop1 = await openLoop(app, mainId, 1);
    await tiredAndEnd(app, loop1);
    const rec = (await getJson<StateResponse>(app, '/m15/state')).records[0];
    const id = rec?.id ?? '';
    const file = join(dataRoot, 'knowledge', 'm15', 'records.jsonl');
    const before = await readFile(file, 'utf8');

    const res = await post(app, `/m15/records/${id}/explanations`, { text: `  ${EXPLAIN}  ` });
    expect(res.status).toBe(201);
    const ex = ((await res.json()) as AddExplanationResponse).explanation;
    expect(ex).toMatchObject({ recordId: id, text: EXPLAIN });
    // 原记录一个字节都没动；解释另存
    expect(await readFile(file, 'utf8')).toBe(before);
    expect(
      await readFile(join(dataRoot, 'knowledge', 'm15', 'explanations.jsonl'), 'utf8'),
    ).toContain(EXPLAIN);
    // 再补一句也是追加
    await post(app, `/m15/records/${id}/explanations`, { text: '今天也没吃早饭' });
    const tl = await getJson<StateTimelineResponse>(app, '/m15/timeline');
    expect(tl.entries[0]?.explanations.map((e) => e.text)).toEqual([EXPLAIN, '今天也没吃早饭']);
    expect(tl.entries[0]?.record.text).toBe('学习者说有点累');

    // 模型查状态时看得到，并明说是学习者自述、原记录没改
    const q = await toolOf(app, 'm05', mainId, 'query_state').run({ detail: true });
    expect(q.text).toContain(EXPLAIN);
    expect(q.text).toContain('学习者补充的解释（自述，原记录没改');

    // 下次整理：开场带着这条解释，并说明怎么处理
    const loop2 = await openLoop(app, mainId, 2);
    await tiredAndEnd(app, loop2);
    const opening = await m15Opening(app, 2);
    expect(opening).toContain(EXPLAIN);
    expect(opening).toContain(id);
    expect(opening).toContain('学习者自述');
    // 没有新解释时开场里不再重复
    const loop3 = await openLoop(app, mainId, 3);
    await tiredAndEnd(app, loop3);
    expect(await m15Opening(app, 3)).not.toContain(EXPLAIN);

    expect((await post(app, `/m15/records/${id}/explanations`, { text: '   ' })).status).toBe(400);
    expect((await post(app, `/m15/records/${id}/explanations`, {})).status).toBe(400);
    expect((await post(app, '/m15/records/st-不存在/explanations', { text: 'x' })).status).toBe(
      400,
    );
    expect((await call(app, '/m15/records/x/explanations')).status).toBe(404);
  });

  it('只补了解释、没有新对话，也会触发下一次整理', async () => {
    const dataRoot = await tempDir();
    const app = await createApp({
      dataRoot,
      model: new FakeModel({ responder: makeResponder() }),
      token: TOKEN,
      port: 0,
    });
    apps.push(app);
    const mainId = await app.studium.ensureMain();
    const loop1 = await openLoop(app, mainId, 1);
    await tiredAndEnd(app, loop1);
    const id = (await getJson<StateResponse>(app, '/m15/state')).records[0]?.id ?? '';
    // 没有新对话、没有新解释：不整理
    app.studium.organizeStateLater('测试：什么都没变');
    await app.studium.settled();
    expect(
      (await getJson<{ sessions: { kind: string }[] }>(app, '/sessions')).sessions.filter(
        (s) => s.kind === 'm15',
      ),
    ).toHaveLength(1);
    // 补了解释就整理
    await post(app, `/m15/records/${id}/explanations`, { text: EXPLAIN });
    app.studium.organizeStateLater('测试：学习者补了解释');
    await app.studium.settled();
    expect(await m15Opening(app, 2)).toContain(EXPLAIN);
  });

  it('补解释、补来源说明这两个学习者动作进录带，空目录回放能重做', async () => {
    const root = await tempDir();
    const tape = join(await tempDir(), 'run.tape.jsonl');
    const library = join(SAMPLE_DIR, '书库');
    const a = await createApp({
      dataRoot: root,
      model: new FakeModel({ responder: makeResponder() }),
      token: TOKEN,
      port: 0,
      library,
      tape,
    });
    apps.push(a);
    const mainId = await a.studium.ensureMain();
    const loop1 = await openLoop(a, mainId, 1);
    await tiredAndEnd(a, loop1);
    const id = (await getJson<StateResponse>(a, '/m15/state')).records[0]?.id ?? '';
    expect((await post(a, `/m15/records/${id}/explanations`, { text: EXPLAIN })).status).toBe(201);
    expect(
      (
        await post(a, '/library/source-notes', {
          book: '力学入门样例',
          field: 'scope',
          text: '只讲一维运动',
        })
      ).status,
    ).toBe(201);
    await a.studium.settled();
    await a.close();
    apps.splice(0);

    const names = (await readFile(tape, 'utf8'))
      .split('\n')
      .filter((l) => l.trim() !== '')
      .map((l) => JSON.parse(l) as { t: string; name?: string })
      .filter((l) => l.t === 'action')
      .map((l) => l.name);
    for (const n of ['addStateExplanation', 'addSourceNote']) {
      expect(ACTIONS as readonly string[]).toContain(n);
      expect(names).toContain(n);
    }
    const replayRoot = await tempDir();
    const report = await replayTape(tape, { dataRoot: replayRoot, library });
    expect(report.problems).toEqual([]);
    const b = await createApp({
      dataRoot: replayRoot,
      model: new FakeModel(),
      token: TOKEN,
      port: 0,
      library,
    });
    apps.push(b);
    const tl = await getJson<StateTimelineResponse>(b, '/m15/timeline');
    expect(tl.entries[0]?.explanations.map((e) => e.text)).toEqual([EXPLAIN]);
    const note = (
      await getJson<SourceNoteResponse>(
        b,
        `/library/source-notes?book=${encodeURIComponent('力学入门样例')}`,
      )
    ).note;
    expect(note.scope?.value).toBe('只讲一维运动');
  });
});
