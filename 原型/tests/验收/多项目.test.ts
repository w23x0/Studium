// 验收测试：只经 HTTP 接口验证。多个项目各有自己的主对话，互不串。
import { afterEach, describe, expect, it } from 'vitest';
import type { ListProjectsResponse, ProjectResponse } from '../../src/shared/protocol.ts';
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel } from '../../src/core/model/fake.ts';
import { tempDir } from '../helpers/tmp.ts';

const TOKEN = 'test-token-0123456789';
const running: App[] = [];

afterEach(async () => {
  for (const r of running.splice(0)) await r.close();
});

async function call(app: App, path: string, init: RequestInit = {}) {
  return fetch(`${app.server.url}/api${path}`, {
    ...init,
    headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
  });
}

describe('多项目', () => {
  it('能开多个项目，各自有独立的主对话，重启后还在', async () => {
    const root = await tempDir();
    const a = await createApp({ dataRoot: root, model: new FakeModel(), token: TOKEN, port: 0 });
    running.push(a);
    const first = ((await (await call(a, '/projects')).json()) as ListProjectsResponse).projects;
    expect(first).toHaveLength(1);

    const created = (await (
      await call(a, '/projects', { method: 'POST', body: JSON.stringify({ title: '线性代数' }) })
    ).json()) as ProjectResponse;
    expect(created.mainSessionId).not.toBe(first[0]?.mainSessionId);

    const list = ((await (await call(a, '/projects')).json()) as ListProjectsResponse).projects;
    expect(list.map((p) => p.title)).toContain('线性代数');
    expect(list).toHaveLength(2);

    // 各项目的主对话记录互不串
    const rec = async (id: string) =>
      ((await (await call(a, `/sessions/${id}/records`)).json()) as { records: unknown[] }).records
        .length;
    const before = await rec(first[0]?.mainSessionId ?? '');
    await call(a, `/sessions/${created.mainSessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text: '你好' }),
    });
    expect(await rec(first[0]?.mainSessionId ?? '')).toBe(before);

    await a.close();
    running.pop();
    const b = await createApp({ dataRoot: root, model: new FakeModel(), token: TOKEN, port: 0 });
    running.push(b);
    expect(
      ((await (await call(b, '/projects')).json()) as ListProjectsResponse).projects,
    ).toHaveLength(2);
  });
});
