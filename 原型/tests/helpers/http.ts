// 验收测试共用：带口令调 HTTP 接口、订阅 SSE、等后台清单跑完。
import type { ServerEvent } from '../../src/shared/protocol.ts';
import type { NumberedRecord } from '../../src/shared/records.ts';
import type { App } from '../../src/core/app.ts';

export const TOKEN = 'test-token-0123456789';

export function call(app: App, path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${app.server.url}/api${path}`, {
    ...init,
    headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
  });
}

export async function getJson<T>(app: App, path: string): Promise<T> {
  const res = await call(app, path);
  return (await res.json()) as T;
}

export async function post(app: App, path: string, body: object = {}): Promise<Response> {
  return call(app, path, { method: 'POST', body: JSON.stringify(body) });
}

export async function records(app: App, sessionId: string): Promise<NumberedRecord[]> {
  return (await getJson<{ records: NumberedRecord[] }>(app, `/sessions/${sessionId}/records`))
    .records;
}

/** 订阅 SSE；返回收到的事件数组（持续追加）与停止函数。 */
export async function subscribe(app: App): Promise<{
  events: ServerEvent[];
  until(pred: (e: ServerEvent) => boolean): Promise<void>;
  stop(): Promise<void>;
}> {
  const res = await fetch(`${app.server.url}/api/events?token=${TOKEN}`);
  const reader = res.body?.getReader();
  if (!reader) throw new Error('SSE 没有响应体');
  const events: ServerEvent[] = [];
  const waiters: { pred: (e: ServerEvent) => boolean; resolve: () => void }[] = [];
  const dec = new TextDecoder();
  let buf = '';
  const state = { stopped: false };
  void (async () => {
    while (!state.stopped) {
      const { value, done } = await reader.read();
      if (done) return;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const frame = buf.slice(0, i);
        buf = buf.slice(i + 2);
        if (!frame.startsWith('data: ')) continue;
        const e = JSON.parse(frame.slice(6)) as ServerEvent;
        events.push(e);
        for (const w of [...waiters]) {
          if (w.pred(e)) {
            waiters.splice(waiters.indexOf(w), 1);
            w.resolve();
          }
        }
      }
    }
  })();
  return {
    events,
    until: (pred) =>
      events.some(pred)
        ? Promise.resolve()
        : new Promise<void>((resolve) => waiters.push({ pred, resolve })),
    stop: async () => {
      state.stopped = true;
      await reader.cancel();
    },
  };
}

/** 等到条件成立（轮询），超时报错。 */
export async function waitFor<T>(
  what: string,
  fn: () => Promise<T | undefined | false>,
  timeoutMs = 5000,
): Promise<T> {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const v = await fn();
    if (v !== undefined && v !== false) return v;
    if (Date.now() > end) throw new Error(`等不到：${what}`);
    await new Promise((r) => setTimeout(r, 20));
  }
}
