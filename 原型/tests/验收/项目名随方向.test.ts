// 验收：谈定方向后，项目名自动换成方向对应的名字；正本旧行不改（新名字由新记录 + 派生层得出），
// 重启、删掉派生层后名字还在。只经 HTTP 验证。
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ListProjectsResponse, ListSessionsResponse } from '../../src/shared/protocol.ts';
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel } from '../../src/core/model/fake.ts';
import { GOAL, goalTalkResponder, PROJECT_NAME } from '../helpers/goal-talk.ts';
import { getJson, post, records, TOKEN, waitFor } from '../helpers/http.ts';
import { tempDir } from '../helpers/tmp.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

async function boot(root: string): Promise<App> {
  const a = await createApp({
    dataRoot: root,
    model: new FakeModel({ responder: goalTalkResponder }),
    token: TOKEN,
    port: 0,
  });
  apps.push(a);
  return a;
}

describe('项目名随方向', () => {
  it('谈定方向后项目名自动变；正本第一行不改；重启、重建派生层后还在', async () => {
    const root = await tempDir();
    const a = await boot(root);
    const [project] = (await getJson<ListProjectsResponse>(a, '/projects')).projects;
    if (!project) throw new Error('没有项目');
    const mainId = project.mainSessionId;
    const firstLine = (await readFile(join(root, 'sessions', `${mainId}.jsonl`), 'utf8')).split(
      '\n',
    )[0];

    await post(a, `/sessions/${mainId}/messages`, { text: '我想学力学' });
    const talkId = await waitFor('开出畅谈对话', async () => {
      const rs = await records(a, mainId);
      const opened = rs.find((r) => r.record.type === 'task_opened');
      return opened?.record.type === 'task_opened' ? opened.record.sessionId : undefined;
    });
    await waitFor('畅谈对话先开口', async () =>
      (await records(a, talkId)).some((r) => r.record.type === 'assistant_message'),
    );
    await post(a, `/sessions/${talkId}/messages`, { text: '能自己推导就行' });

    const titleOf = async (app: App) =>
      (await getJson<ListProjectsResponse>(app, '/projects')).projects.find(
        (p) => p.mainSessionId === mainId,
      );
    const renamed = await waitFor('项目名变了', async () => {
      const p = await titleOf(a);
      return p?.title === PROJECT_NAME ? p : undefined;
    });
    expect(renamed.goal).toBe(GOAL);
    const sessions = (await getJson<ListSessionsResponse>(a, '/sessions')).sessions;
    expect(sessions.find((s) => s.sessionId === mainId)?.title).toBe(PROJECT_NAME);

    // 正本只追加：第一行（开会话时的名字）原样不动
    const after = (await readFile(join(root, 'sessions', `${mainId}.jsonl`), 'utf8')).split('\n');
    expect(after[0]).toBe(firstLine);

    await waitFor('后台都停下', async () => {
      const rs = await getJson<{ running: boolean }>(a, `/sessions/${mainId}/records`);
      return !rs.running;
    });
    await a.close();
    apps.splice(0);
    await rm(join(root, 'index.sqlite'));
    const b = await boot(root);
    expect((await titleOf(b))?.title).toBe(PROJECT_NAME);
    const again = (await getJson<ListSessionsResponse>(b, '/sessions')).sessions;
    expect(again.find((s) => s.sessionId === mainId)?.title).toBe(PROJECT_NAME);
  });
});
