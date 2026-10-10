// 验收：学习者在产出物页上直接开“写产出”对话（不经主对话）：会话类是“写产出”、挂在产出物所在项目下、与产出物绑定；
// 开场交给模型产出物现状与学习者想写的；产出物列表上看得到最新版是谁写的、开过哪些写产出对话。只经 HTTP 验证。
import { afterEach, describe, expect, it } from 'vitest';
import type {
  ListOutputsResponse,
  OpenOutputTaskResponse,
  OutputResponse,
} from '../../src/shared/m14.ts';
import type { NumberedRecord } from '../../src/shared/records.ts';
import type { App } from '../../src/core/app.ts';
import type { FakeContext, FakeStep } from '../../src/core/model/fake.ts';
import { getJson, post, records, waitFor } from '../helpers/http.ts';
import { createOutput, saveVersion, startOutputsApp } from '../helpers/outputs.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

function responder(ctx: FakeContext): FakeStep | undefined {
  if (ctx.spec.tools.some((t) => t.name === 'save_output_version')) {
    return { text: '这次想改哪里？' };
  }
  return undefined;
}

async function idle(app: App, id: string): Promise<NumberedRecord[]> {
  return waitFor(`${id} 停下`, async () => {
    const r = await getJson<{ records: NumberedRecord[]; running: boolean }>(
      app,
      `/sessions/${id}/records`,
    );
    return r.running ? undefined : r.records;
  });
}

describe('从产出物页开写产出对话', () => {
  it('开出的对话是写产出类、挂在项目下、绑定产出物；开场交产出物现状与想写的', async () => {
    const { app, mainId } = await startOutputsApp({ responder });
    apps.push(app);
    const out = await createOutput(app, mainId, { title: '速度笔记', kind: '笔记整理' });
    await saveVersion(app, out.id, { text: '平均速度是位移除以时间。', note: '第一版' });

    const res = await post(app, `/outputs/${out.id}/tasks`, { brief: '补一个例子' });
    expect(res.status).toBe(201);
    const { sessionId } = (await res.json()) as OpenOutputTaskResponse;

    const sessions = (
      await getJson<{ sessions: { sessionId: string; kind: string; parent?: string }[] }>(
        app,
        '/sessions',
      )
    ).sessions;
    expect(sessions.find((s) => s.sessionId === sessionId)).toMatchObject({
      kind: 'output',
      parent: mainId,
    });
    const rs = await idle(app, sessionId);
    const opening = rs.find((r) => r.record.type === 'program_fact');
    const text = opening?.record.type === 'program_fact' ? opening.record.text : '';
    expect(text).toContain('速度笔记');
    expect(text).toContain('已有 1 版');
    expect(text).toContain('补一个例子');
    expect(rs.some((r) => r.record.type === 'assistant_message')).toBe(true);

    const detail = (await getJson<OutputResponse>(app, `/outputs/${out.id}`)).output;
    expect(detail.tasks.map((t) => t.sessionId)).toEqual([sessionId]);
    // 主对话里不凭空多一句话（这个对话不挂在学习者的哪句话下）
    expect((await records(app, mainId)).some((r) => r.record.type === 'task_opened')).toBe(false);
  });

  it('产出物列表带最新版是谁写的、开过的写产出对话；没有的产出物 404，brief 不是字符串 400', async () => {
    const { app, mainId } = await startOutputsApp({ responder });
    apps.push(app);
    const empty = await createOutput(app, mainId, { title: '空的', kind: '推导' });
    const out = await createOutput(app, mainId, {
      title: '有一版的',
      kind: '小论文',
      text: '正文',
    });
    const { sessionId } = (await (
      await post(app, `/outputs/${out.id}/tasks`, {})
    ).json()) as OpenOutputTaskResponse;
    await idle(app, sessionId);
    const list = (await getJson<ListOutputsResponse>(app, `/projects/${mainId}/outputs`)).outputs;
    expect(list.find((o) => o.id === out.id)).toMatchObject({
      latestBy: '学习者',
      taskSessions: [sessionId],
    });
    const e = list.find((o) => o.id === empty.id);
    expect(e?.latestBy).toBeUndefined();
    expect(e?.taskSessions).toEqual([]);

    expect((await post(app, '/outputs/out-nope/tasks', {})).status).toBe(404);
    expect((await post(app, `/outputs/${out.id}/tasks`, { brief: 3 })).status).toBe(400);
  });
});
