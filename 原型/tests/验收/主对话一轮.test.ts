// 验收测试：只经 HTTP 接口验证，不看内部实现。改这个目录须产品负责人同意（hooks 会拦）。
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ServerEvent } from '../../src/shared/protocol.ts';
import { Hub } from '../../src/core/hub.ts';
import { startServer, type RunningServer } from '../../src/core/http/server.ts';
import { DataDir } from '../../src/core/log/data-dir.ts';
import { FakeModel } from '../../src/core/model/fake.ts';
import { tempDir } from '../helpers/tmp.ts';

const TOKEN = 'test-token-0123456789';
const running: { server: RunningServer; hub: Hub; dataDir: DataDir }[] = [];

afterEach(async () => {
  for (const r of running.splice(0)) await stop(r);
});

async function stop(r: { server: RunningServer; hub: Hub; dataDir: DataDir }) {
  await r.server.close();
  await r.hub.close();
  await r.dataDir.release();
}

async function boot(root: string) {
  const dataDir = await DataDir.acquire(root);
  const hub = new Hub({ dataDir, model: new FakeModel(), systemPrompts: { main: '提示' } });
  const server = await startServer({ hub, token: TOKEN, port: 0 });
  const r = { server, hub, dataDir };
  running.push(r);
  return r;
}

function call(server: RunningServer, path: string, init: RequestInit = {}, token = TOKEN) {
  return fetch(`${server.url}/api${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  });
}

/** 订阅 SSE，直到某会话的 running 变回 false。 */
async function untilIdle(server: RunningServer, sessionId: string): Promise<ServerEvent[]> {
  const res = await fetch(`${server.url}/api/events?token=${TOKEN}`);
  const reader = res.body?.getReader();
  if (!reader) throw new Error('SSE 没有响应体');
  const events: ServerEvent[] = [];
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) throw new Error('SSE 提前断开');
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const frame = buf.slice(0, i);
      buf = buf.slice(i + 2);
      if (!frame.startsWith('data: ')) continue;
      const e = JSON.parse(frame.slice(6)) as ServerEvent;
      events.push(e);
      if (e.type === 'running' && e.sessionId === sessionId && !e.running) {
        await reader.cancel();
        return events;
      }
    }
  }
}

describe('验收：主对话收发一轮，记录落盘', () => {
  it('开对话 → 发一句 → 收到回复 → 正本文件里有这一轮 → 重启后记录还在', async () => {
    const root = await tempDir();
    const a = await boot(root);

    const created = await call(a.server, '/sessions', { method: 'POST', body: '{}' });
    expect(created.status).toBe(201);
    const { session } = (await created.json()) as { session: { sessionId: string } };

    const idle = untilIdle(a.server, session.sessionId);
    await new Promise((r) => setTimeout(r, 50)); // 让 SSE 先连上
    const sent = await call(a.server, `/sessions/${session.sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text: '牛顿第二定律是什么' }),
    });
    expect(sent.status).toBe(202);
    const events = await idle;
    expect(events.some((e) => e.type === 'delta')).toBe(true);

    const file = await readFile(join(root, 'sessions', `${session.sessionId}.jsonl`), 'utf8');
    const lines = file
      .trimEnd()
      .split('\n')
      .map((l) => JSON.parse(l) as { type: string; text?: string });
    expect(lines.find((l) => l.type === 'user_message')?.text).toBe('牛顿第二定律是什么');
    expect(lines.at(-1)?.type).toBe('assistant_message');

    await stop(a);
    running.splice(0);
    const b = await boot(root);
    const list = (await (await call(b.server, '/sessions')).json()) as {
      sessions: { sessionId: string }[];
    };
    expect(list.sessions.map((s) => s.sessionId)).toContain(session.sessionId);
    const recs = (await (
      await call(b.server, `/sessions/${session.sessionId}/records`)
    ).json()) as {
      records: { line: number; record: { type: string } }[];
    };
    expect(recs.records.map((r) => r.line)).toEqual(lines.map((_, i) => i + 1));
  });

  it('没有口令或口令不对，一律拒绝', async () => {
    const { server } = await boot(await tempDir());
    expect((await call(server, '/sessions', {}, 'wrong-token-000000000')).status).toBe(401);
    expect((await fetch(`${server.url}/api/sessions`)).status).toBe(401);
  });

  it('空消息被拒绝', async () => {
    const { server } = await boot(await tempDir());
    const { session } = (await (
      await call(server, '/sessions', { method: 'POST', body: '{}' })
    ).json()) as {
      session: { sessionId: string };
    };
    const res = await call(server, `/sessions/${session.sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text: '  ' }),
    });
    expect(res.status).toBe(400);
  });
});
