// 验收：SQLite 派生层删掉后，从正本重建出同样的会话列表与检索结果。
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel } from '../../src/core/model/fake.ts';
import { tempDir } from '../helpers/tmp.ts';

const TOKEN = 'test-token-0123456789';
const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

async function boot(root: string) {
  const a = await createApp({ dataRoot: root, model: new FakeModel(), token: TOKEN, port: 0 });
  apps.push(a);
  return a;
}

async function get(a: App, path: string): Promise<unknown> {
  const res = await fetch(`${a.server.url}/api${path}`, {
    headers: { authorization: `Bearer ${TOKEN}` },
  });
  return res.json();
}

describe('验收：派生层删掉能重建', () => {
  it('删掉 index.sqlite 再启动，会话列表与检索结果不变', async () => {
    const root = await tempDir();
    const a = await boot(root);
    const res = await fetch(`${a.server.url}/api/sessions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${TOKEN}` },
      body: '{}',
    });
    const { session } = (await res.json()) as { session: { sessionId: string } };
    const { done } = await a.hub.send(session.sessionId, '动量守恒');
    await done;
    const listBefore = await get(a, '/sessions');
    const searchBefore = await get(a, `/search?q=${encodeURIComponent('动量')}`);
    await a.close();
    apps.splice(0);

    await rm(join(root, 'index.sqlite'));
    const b = await boot(root);
    expect(await get(b, '/sessions')).toEqual(listBefore);
    expect(await get(b, `/search?q=${encodeURIComponent('动量')}`)).toEqual(searchBefore);
    expect((searchBefore as { hits: unknown[] }).hits.length).toBeGreaterThan(0);
  });
});
