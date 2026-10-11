// 验收：对话列表（左栏用）带学习对话的来历——从哪段学习中途岔出去补的（fork）、接着哪段没学完的学的（resume）；
// 别的对话没有来历。来历来自正本开场记录，删掉派生索引重启后照样有。只经 HTTP 验证，模型是假模型。
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel } from '../../src/core/model/fake.ts';
import type {
  ContinueLoopResponse,
  DetourChooseResponse,
  ListSessionsResponse,
  SessionSummary,
} from '../../src/shared/protocol.ts';
import { getJson, post, TOKEN } from '../helpers/http.ts';
import { settled } from '../helpers/evidence-flow.ts';
import {
  detourResponder,
  newDetourState,
  openLoop,
  troubleAndCard,
} from '../helpers/detour-flow.ts';
import { tempDir } from '../helpers/tmp.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

async function start(root: string): Promise<App> {
  const app = await createApp({
    dataRoot: root,
    model: new FakeModel({ responder: detourResponder(newDetourState()) }),
    token: TOKEN,
    port: 0,
  });
  apps.push(app);
  return app;
}

async function sessions(app: App): Promise<Map<string, SessionSummary>> {
  const list = (await getJson<ListSessionsResponse>(app, '/sessions')).sessions;
  return new Map(list.map((s) => [s.sessionId, s]));
}

describe('对话列表带来历', () => {
  it('岔出去补的标 fork 和来自哪段，接着学的标 resume；重建派生索引后还在', async () => {
    const root = await tempDir();
    const app = await start(root);
    const mainId = await app.studium.ensureMain();
    const { loopId } = await openLoop(app, mainId, 1);
    const { cardId } = await troubleAndCard(app, loopId);
    const chose = await post(app, `/sessions/${loopId}/detour`, { cardId, option: 0 });
    const { forkLoopSessionId } = (await chose.json()) as DetourChooseResponse;
    if (forkLoopSessionId === undefined) throw new Error('没开出岔出去的那段');
    await settled(app, forkLoopSessionId);
    // 岔出去的那段没学完就结束 → 接着学它
    await post(app, `/sessions/${forkLoopSessionId}/end`, { note: '先到这' });
    await app.studium.settled();
    const res = await post(app, `/sessions/${forkLoopSessionId}/continue`);
    expect(res.status).toBe(201);
    const { loopSessionId: resumed } = (await res.json()) as ContinueLoopResponse;
    await app.studium.settled();

    const check = async (a: App) => {
      const list = await sessions(a);
      expect(list.get(forkLoopSessionId)?.from).toEqual({ kind: 'fork', loop: loopId });
      expect(list.get(resumed)?.from).toEqual({ kind: 'resume', loop: forkLoopSessionId });
      expect(list.get(loopId)?.from).toBeUndefined();
      expect(list.get(mainId)?.from).toBeUndefined();
    };
    await check(app);

    await app.close();
    apps.splice(0);
    rmSync(join(root, 'index.sqlite'), { force: true });
    await check(await start(root));
  });
});
