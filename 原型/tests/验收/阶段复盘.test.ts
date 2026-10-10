// 验收：阶段进展与复盘（M05:29）。只经 HTTP 验证，模型是假模型。
// - 学习者在主对话说“复盘”（模型开复盘对话）或在项目页点复盘：开一个复盘任务对话（畅谈类的另一种活），
//   开场给这段时间的 M09 / 停车场 / M15 当前状态 / 路线偏差；
// - 模型给学习者一段复盘，学习者没有别的要聊时交回主对话一句，对话结束；
// - 只有复盘对话能交回；复盘窗口接着上一次复盘；该做复盘时“今天该做的”里会提示。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type {
  ProjectOverviewResponse,
  ReviewResponse,
  ReviewsResponse,
  TodayView,
} from '../../src/shared/protocol.ts';
import { settled } from '../helpers/evidence-flow.ts';
import { openLoop } from '../helpers/detour-flow.ts';
import { getJson, post, records, waitFor } from '../helpers/http.ts';
import {
  advanceDays,
  hasTool,
  learnAndClose,
  newLong,
  startLong,
} from '../helpers/longterm-flow.ts';
import type { LongState } from '../helpers/longterm-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const REVIEW_TEXT = '这一阶段你学会了位移，下一步可以接平均速度。';
const SUMMARY = '位移学会了，下一步学平均速度。';

/** 复盘对话：开场先说一段复盘；学习者说“好了”就交回；谈方向的对话里试图交回复盘会被退回。 */
function reviewResponder(st: LongState): void {
  st.override = (ctx) => {
    if (
      hasTool(ctx, 'open_review') &&
      ctx.input.role === 'learner' &&
      ctx.input.text.includes('复盘')
    ) {
      return { calls: [{ name: 'open_review', args: {} }], text: '好，我们单独复盘。' };
    }
    if (hasTool(ctx, 'finish_review')) {
      if (ctx.input.role === 'program' && ctx.input.text.includes('阶段复盘')) {
        return { text: REVIEW_TEXT };
      }
      if (ctx.input.text.includes('好了')) {
        return { calls: [{ name: 'finish_review', args: { summary: SUMMARY } }], text: '好。' };
      }
    }
    return undefined;
  };
}

describe('阶段复盘', () => {
  it('点复盘：开复盘对话，开场给这段时间的 M09 / 停车场 / 状态；说完交回主对话一句', async () => {
    const st = newLong();
    reviewResponder(st);
    const { app, mainId, fake } = await startLong(st);
    apps.push(app);
    const a = await openLoop(app, mainId, 0);
    await learnAndClose(app, a.loopId);
    const b = await openLoop(app, mainId, 1);
    await post(app, `/sessions/${b.loopId}/end`, { note: '先到这' });
    await app.studium.settled();
    advanceDays(st, 3);

    const res = await post(app, `/projects/${mainId}/review`);
    expect(res.status).toBe(201);
    const r = (await res.json()) as ReviewResponse;
    await settled(app, r.reviewSessionId);

    const recs = await records(app, r.reviewSessionId);
    expect(recs[0]?.record).toMatchObject({
      type: 'session_opened',
      kind: 'talk',
      parent: mainId,
      review: { since: r.since, until: r.until },
    });
    // 主对话里有入口
    expect(
      (await records(app, mainId)).some(
        (x) => x.record.type === 'task_opened' && x.record.sessionId === r.reviewSessionId,
      ),
    ).toBe(true);
    // 开场：动过的闭环、M09 形成记录、停车场、学习者状态、路线偏差
    const opening =
      fake.inputs.find(
        (i) => i.spec.session?.id === r.reviewSessionId && i.text.includes('阶段复盘'),
      )?.text ?? '';
    expect(opening).toContain(a.loopId);
    expect(opening).toContain('p-displacement');
    expect(opening).toContain('停车场');
    expect(opening).toContain(b.loopId);
    expect(opening).toContain('学习者的状态（M15');
    expect(opening).toContain('路线偏差');
    // 模型给了一段复盘（学习者看得到）
    const after = await records(app, r.reviewSessionId);
    expect(
      after.some((x) => x.record.type === 'assistant_message' && x.record.text === REVIEW_TEXT),
    ).toBe(true);

    // 学习者追问时对话继续；说“好了”才交回
    await post(app, `/sessions/${r.reviewSessionId}/messages`, { text: '还有别的建议吗' });
    await settled(app, r.reviewSessionId);
    expect(
      (await records(app, r.reviewSessionId)).some((x) => x.record.type === 'talk_ended'),
    ).toBe(false);
    await post(app, `/sessions/${r.reviewSessionId}/messages`, { text: '好了' });
    await waitFor('复盘交回', async () =>
      (await records(app, r.reviewSessionId)).some((x) => x.record.type === 'talk_ended'),
    );
    await app.studium.settled();
    const ended = (await records(app, r.reviewSessionId)).find(
      (x) => x.record.type === 'talk_ended',
    );
    expect(ended?.record).toMatchObject({
      goal: SUMMARY,
      review: { since: r.since, until: r.until },
    });
    // 交回主对话一句；复盘对话结束，不能再说话
    expect(
      (await records(app, mainId)).some(
        (x) => x.record.type === 'program_fact' && x.record.text.includes(SUMMARY),
      ),
    ).toBe(true);
    expect(
      (await post(app, `/sessions/${r.reviewSessionId}/messages`, { text: '再问' })).status,
    ).toBe(400);
    const list = (await getJson<ReviewsResponse>(app, `/projects/${mainId}/reviews`)).reviews;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ sessionId: r.reviewSessionId, summary: SUMMARY });

    // 下一次复盘从上一次的终点接着回看
    advanceDays(st, 1);
    const second = (await (await post(app, `/projects/${mainId}/review`)).json()) as ReviewResponse;
    expect(second.since).toBe(r.until);
  });

  it('学习者在主对话说“复盘”，模型开复盘对话；起点可以指定；起点晚于现在被拒', async () => {
    const st = newLong();
    reviewResponder(st);
    const { app, mainId } = await startLong(st);
    apps.push(app);
    await post(app, `/sessions/${mainId}/messages`, { text: '帮我复盘一下吧' });
    const talkId = await waitFor('复盘对话开出', async () => {
      const r = (await records(app, mainId)).find((x) => x.record.type === 'task_opened');
      return r?.record.type === 'task_opened' ? r.record.sessionId : undefined;
    });
    const opened = (await records(app, talkId))[0]?.record;
    expect(opened).toMatchObject({ kind: 'talk', title: '阶段复盘' });
    expect((await post(app, `/projects/${mainId}/review`, { since: '2026-02-30' })).status).toBe(
      400,
    );
    expect((await post(app, `/projects/${mainId}/review`, { since: '2999-01-01' })).status).toBe(
      400,
    );
    const ok = await post(app, `/projects/${mainId}/review`, { since: '2026-09-01' });
    expect(ok.status).toBe(201);
    expect(((await ok.json()) as ReviewResponse).since.slice(0, 10)).toBe('2026-09-01');
  });

  it('谈方向的对话里不能用复盘交回', async () => {
    const st = newLong();
    st.override = (ctx) => {
      if (hasTool(ctx, 'open_goal_talk')) {
        return ctx.input.role === 'learner'
          ? { calls: [{ name: 'open_goal_talk', args: {} }], text: '单独谈。' }
          : { text: '好。' };
      }
      if (hasTool(ctx, 'finish_review') && ctx.input.role === 'program') {
        return { calls: [{ name: 'finish_review', args: { summary: '不该成' } }] };
      }
      return undefined;
    };
    const { app, mainId } = await startLong(st);
    apps.push(app);
    await post(app, `/sessions/${mainId}/messages`, { text: '想学力学' });
    const talkId = await waitFor('畅谈开出', async () => {
      const r = (await records(app, mainId)).find((x) => x.record.type === 'task_opened');
      return r?.record.type === 'task_opened' ? r.record.sessionId : undefined;
    });
    await settled(app, talkId);
    const call = (await records(app, talkId)).flatMap((r) =>
      r.record.type === 'tool_call' ? [r.record] : [],
    )[0];
    expect(call).toMatchObject({ name: 'finish_review', isError: true });
    expect((await records(app, talkId)).some((r) => r.record.type === 'talk_ended')).toBe(false);
  });

  it('隔了两周、又收尾了几个闭环：今天该做的里提示该复盘了', async () => {
    const st = newLong();
    const { app, mainId } = await startLong(st);
    apps.push(app);
    const a = await openLoop(app, mainId, 0);
    await learnAndClose(app, a.loopId);
    const b = await openLoop(app, mainId, 1);
    await post(app, `/sessions/${b.loopId}/end`, { note: '到这' });
    await app.studium.settled();
    let today = await getJson<TodayView>(app, `/projects/${mainId}/today`);
    expect(today.items.some((i) => i.kind === 'review')).toBe(false);
    advanceDays(st, 15);
    today = await getJson<TodayView>(app, `/projects/${mainId}/today`);
    expect(today.items.find((i) => i.kind === 'review')).toMatchObject({ endedLoops: 2 });
    const o = (await getJson<ProjectOverviewResponse>(app, `/projects/${mainId}/overview`))
      .overview;
    expect(o.today?.items.some((i) => i.kind === 'review')).toBe(true);
  });
});
