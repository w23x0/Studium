// 验收：主对话判为新方向时，在那条消息下开畅谈对话；开场交学习者那条消息与已有方向（有才放）；
// 谈出方向后交回项目（记成项目方向，主对话接着说一句），畅谈对话结束。只经 HTTP 验证。
import { afterEach, describe, expect, it } from 'vitest';
import type { ListSessionsResponse } from '../../src/shared/protocol.ts';
import type { NumberedRecord } from '../../src/shared/records.ts';
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel } from '../../src/core/model/fake.ts';
import { GOAL, goalTalkResponder } from '../helpers/goal-talk.ts';
import { getJson, post, records, TOKEN, waitFor } from '../helpers/http.ts';
import { tempDir } from '../helpers/tmp.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

async function idle(app: App, id: string): Promise<NumberedRecord[]> {
  return waitFor(`${id} 停下`, async () => {
    const r = await getJson<{ records: NumberedRecord[]; running: boolean }>(
      app,
      `/sessions/${id}/records`,
    );
    return r.running ? undefined : r.records;
  });
}

async function openTalk(app: App, mainId: string, text: string) {
  await post(app, `/sessions/${mainId}/messages`, { text });
  const opened = await waitFor('开出畅谈对话', async () => {
    const rs = await records(app, mainId);
    const all = rs.filter((r) => r.record.type === 'task_opened');
    const asked = rs.filter((r) => r.record.type === 'user_message').at(-1);
    const last = all.at(-1);
    return last?.record.type === 'task_opened' && asked && last.line > asked.line
      ? { record: last.record, askedLine: asked.line }
      : undefined;
  });
  const talk = await waitFor('畅谈对话先开口', async () => {
    const rs = await idle(app, opened.record.sessionId);
    return rs.some((r) => r.record.type === 'assistant_message') ? rs : undefined;
  });
  return { ...opened, talk };
}

describe('畅谈对话', () => {
  it('新方向 → 在那条消息下开畅谈对话 → 谈出方向交回项目 → 畅谈结束', async () => {
    const app = await createApp({
      dataRoot: await tempDir(),
      model: new FakeModel({ responder: goalTalkResponder }),
      token: TOKEN,
      port: 0,
    });
    apps.push(app);
    const mainId = await app.studium.ensureMain();

    const first = await openTalk(app, mainId, '我想学力学');
    const talkId = first.record.sessionId;
    expect(first.record.kind).toBe('talk');
    expect(first.record.anchorLine).toBe(first.askedLine);
    const sessions = (await getJson<ListSessionsResponse>(app, '/sessions')).sessions;
    expect(sessions.find((s) => s.sessionId === talkId)).toMatchObject({
      kind: 'talk',
      parent: mainId,
    });
    const opening = first.talk.find((r) => r.record.type === 'program_fact');
    const openingText = opening?.record.type === 'program_fact' ? opening.record.text : '';
    expect(openingText).toContain('我想学力学');
    expect(openingText).not.toContain('已有方向');

    await post(app, `/sessions/${talkId}/messages`, { text: '能自己推导就行' });
    const talkAfter = await waitFor('畅谈交回', async () => {
      const rs = await idle(app, talkId);
      return rs.some((r) => r.record.type === 'talk_ended') ? rs : undefined;
    });
    expect(talkAfter.find((r) => r.record.type === 'talk_ended')?.record).toMatchObject({
      goal: GOAL,
    });
    const main = await waitFor('主对话接着说一句', async () => {
      const rs = await idle(app, mainId);
      const handed = rs.findIndex(
        (r) => r.record.type === 'program_fact' && r.record.text.includes(GOAL),
      );
      return handed >= 0 && rs.slice(handed).some((r) => r.record.type === 'assistant_message')
        ? rs
        : undefined;
    });
    expect(main.filter((r) => r.record.type === 'project_goal').at(-1)?.record).toMatchObject({
      text: GOAL,
    });

    // 畅谈对话已结束，不再收话
    expect((await post(app, `/sessions/${talkId}/messages`, { text: '还有' })).status).toBe(400);

    // 再谈一次：开场带上已有方向
    const second = await openTalk(app, mainId, '我想学点别的');
    expect(second.record.sessionId).not.toBe(talkId);
    const opening2 = second.talk.find((r) => r.record.type === 'program_fact');
    const text2 = opening2?.record.type === 'program_fact' ? opening2.record.text : '';
    expect(text2).toContain('已有方向');
    expect(text2).toContain(GOAL);
  });
});
