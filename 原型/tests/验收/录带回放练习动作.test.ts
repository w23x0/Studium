// 验收：录带记下批 9 的学习者练习动作（交作答——写一段 / 认刚才说的几句、要提示、先不做了、请老师归纳），
// 空目录里只凭录带回放能重做它们：问题清单为空（含录的那次报的错，回放报同样的错），
// 各会话的记录与练习状态、归纳与录的那次一致（会话 id、时间、随机编号除外）。
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { afterEach, describe, expect, it } from 'vitest';
import type {
  ListSessionsResponse,
  PracticeSummariesResponse,
  PracticeTasksResponse,
} from '../../src/shared/protocol.ts';
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel } from '../../src/core/model/fake.ts';
import { ACTIONS } from '../../src/core/tape/recorder.ts';
import { normalizeForCompare } from '../../src/core/tape/ids.ts';
import { replayTape } from '../../src/core/tape/replay.ts';
import { getJson, post, records, TOKEN } from '../helpers/http.ts';
import { settled } from '../helpers/evidence-flow.ts';
import { detourResponder } from '../helpers/detour-flow.ts';
import {
  assignGenerated,
  newPractice,
  openLoop,
  runTask,
  teach,
} from '../helpers/practice-flow.ts';
import { tempDir } from '../helpers/tmp.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

/** 抹掉每次都不同的东西：时间、会话 id、程序生成的编号（含练习、反馈、归纳的编号）。 */
function norm(text: string): string {
  return normalizeForCompare(text).replace(/\b(pr|pf|ps)-[0-9a-f]{8}\b/g, '⟦$1⟧');
}

async function fingerprint(app: App): Promise<Record<string, string[]>> {
  const sessions = (await getJson<ListSessionsResponse>(app, '/sessions')).sessions;
  const out: Record<string, string[]> = {};
  const practice: string[] = [];
  for (const s of sessions) {
    const rs = await records(app, s.sessionId);
    const body = rs
      .map(({ record: r }) => {
        if ('text' in r) return `${r.type}|${norm(r.text)}`;
        if (r.type === 'tool_call') return `tool|${r.name}|${String(r.isError)}|${norm(r.result)}`;
        if (r.type === 'practice_done') return `${r.type}|${r.outcome}|${r.by}|${r.note}`;
        if (r.type === 'practice_hint') return `${r.type}|${r.by}`;
        return r.type;
      })
      .join('\n');
    (out[s.kind] ??= []).push(body);
    if (s.kind === 'loop') {
      const tasks = (await getJson<PracticeTasksResponse>(app, `/loops/${s.sessionId}/practice`))
        .tasks;
      practice.push(
        ...tasks.map(
          (t) =>
            `${t.focus}|${t.status}|提示要了${String(t.hintsAsked)}|交了${String(t.submissions.length)}|${t.submissions.map((x) => x.via).join(',')}`,
        ),
      );
    }
  }
  out.practice = practice;
  for (const k of Object.keys(out)) out[k]?.sort();
  const summaries = (await getJson<PracticeSummariesResponse>(app, '/practice/summaries'))
    .summaries;
  out.summaries = summaries.map((x) => `${x.requestedBy}|${x.text}|${String(x.tasks.length)}`);
  return out;
}

describe('录带记下练习动作', () => {
  it('交作答、要提示、先不做了、请老师归纳进录带，空目录回放重做出同样的结果', async () => {
    const root = await tempDir();
    const tape = join(await tempDir(), 'run.tape.jsonl');
    const st = newPractice();
    const base = detourResponder(st.detour);
    const a = await createApp({
      dataRoot: root,
      model: new FakeModel({ responder: (ctx) => st.override?.(ctx) ?? base(ctx) }),
      token: TOKEN,
      port: 0,
      now: () => st.clock.now,
      tape,
    });
    apps.push(a);
    const mainId = await a.studium.ensureMain();
    const { loopId } = await openLoop(a, mainId, 0);

    // 第一道：要一次提示，写一段作答交上去（经接口），老师反馈、做完
    const first = await assignGenerated(a, st, loopId);
    expect((await post(a, `/loops/${loopId}/practice/${first}/hint`)).status).toBe(201);
    await settled(a, loopId);
    await runTaskTail(a, st, loopId, first, '位移是 2 米，只看起点和终点');

    // 第二道走完；请老师归纳（两道都做完了）
    const second = await runTask(a, st, loopId, '位移是 3 米');
    await teach(
      a,
      st,
      loopId,
      {
        calls: [
          {
            name: 'write_practice_summary',
            args: {
              task_ids: [first, second.taskId],
              text: '先定起点终点再相减。',
              evidence: [{ task_id: second.taskId, line: second.answerLine }],
              requested_by_learner: true,
            },
          },
        ],
      },
      undefined,
      async () => {
        expect((await post(a, `/loops/${loopId}/practice/summarize`, {})).status).toBe(202);
      },
    );

    // 第三道不给提示：要提示被拒（录带记下这次报错）；把刚才说的一句认作作答；然后先不做了
    const third = await assignGenerated(a, st, loopId, { hints_allowed: false });
    expect((await post(a, `/loops/${loopId}/practice/${third}/hint`)).status).toBe(400);
    await teach(a, st, loopId, { text: '你先想想。' }, '我想位移是 4 米吧');
    const said =
      (await records(a, loopId)).filter((x) => x.record.type === 'user_message').at(-1)?.line ?? 0;
    expect(
      (await post(a, `/loops/${loopId}/practice/${third}/submit`, { lines: [said] })).status,
    ).toBe(201);
    expect(
      (await post(a, `/loops/${loopId}/practice/${third}/abandon`, { note: '今天先到这' })).status,
    ).toBe(200);
    await a.studium.settled();

    const before = await fingerprint(a);
    expect(before.practice).toHaveLength(3);
    expect(before.summaries).toEqual(['learner|先定起点终点再相减。|2']);
    await a.close();
    apps.splice(0);

    // 这些动作都进了录带
    const lines = (await readFile(tape, 'utf8'))
      .split('\n')
      .filter((l) => l.trim() !== '')
      .map((l) => JSON.parse(l) as { t: string; name?: string; seq?: number });
    const names = lines.filter((l) => l.t === 'action').map((l) => l.name);
    for (const n of [
      'practice.submit',
      'practice.askHint',
      'practice.abandon',
      'practice.requestSummary',
    ]) {
      expect(ACTIONS as readonly string[]).toContain(n);
      expect(names).toContain(n);
    }
    expect(lines.some((l) => l.t === 'action_error')).toBe(true);

    const replayRoot = await tempDir();
    const report = await replayTape(tape, { dataRoot: replayRoot });
    expect(report.problems).toEqual([]);

    const b = await createApp({
      dataRoot: replayRoot,
      model: new FakeModel(),
      token: TOKEN,
      port: 0,
    });
    apps.push(b);
    await b.studium.ensureMain();
    expect(await fingerprint(b)).toEqual(before);
  });
});

/** 一道题的后半：经接口写一段作答交上去，老师反馈、做完。 */
async function runTaskTail(
  app: App,
  st: ReturnType<typeof newPractice>,
  loopId: string,
  taskId: string,
  answer: string,
): Promise<void> {
  await teach(app, st, loopId, { text: '收到。' }, undefined, async () => {
    const res = await post(app, `/loops/${loopId}/practice/${taskId}/submit`, { text: answer });
    expect(res.status).toBe(201);
  });
  await teach(
    app,
    st,
    loopId,
    {
      calls: [
        {
          name: 'give_practice_feedback',
          args: {
            task_id: taskId,
            text: '对，位移只看起点和终点。',
            errors: [],
          },
        },
      ],
    },
    '我再想想',
  );
  await teach(
    app,
    st,
    loopId,
    {
      calls: [
        {
          name: 'finish_practice',
          args: { task_id: taskId, outcome: 'completed', note: '算对了' },
        },
      ],
    },
    '好了',
  );
}
