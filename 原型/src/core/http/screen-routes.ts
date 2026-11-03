// 学习页的接口（会话/学习对话.md §11）：/api/sessions/<学习 id>/screens/…
// 旧的区域图学习只读看的组件、学习者在组件上的操作、组件运行时报错、试跑结果。类型在 src/shared/screen.ts。
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { MineruTokenBody } from '../../shared/protocol.ts';
import type { OldComponentsResponse } from '../../shared/screen.ts';
import { BadRequestError, type Studium } from '../studium.ts';

const MAX_BODY = 1 << 16;

/** 认出 /api/sessions/:id/screens… 就回答并返回真。 */
export async function screenRoute(
  req: IncomingMessage,
  res: ServerResponse,
  parts: string[],
  method: string,
  studium: Studium,
): Promise<boolean> {
  const [, a, id, b, c, d] = parts;
  // MinerU 密钥（临时入口）：只回配了没有，不回密钥本身
  if (a === 'settings' && id === 'mineru-token' && parts.length === 3) {
    if (method === 'PUT') {
      const body = ((await readJson(req)) ?? {}) as Record<string, unknown>;
      if (typeof body.token !== 'string') throw new BadRequestError('token 要是字符串');
      await studium.setMineruToken(body.token.slice(0, 4096));
    } else if (method !== 'GET') return false;
    send(res, 200, { set: await studium.mineruTokenSet() } satisfies MineruTokenBody);
    return true;
  }
  if (a !== 'sessions' || id === undefined || b !== 'screens') return false;
  const screens = studium.screens;
  const n = parts.length;
  if (n === 4 && method === 'GET') {
    send(res, 200, (await screens.oldComponents(id)) satisfies OldComponentsResponse);
    return true;
  }
  if (method !== 'POST') return false;
  const body = ((await readJson(req)) ?? {}) as Record<string, unknown>;
  if (n === 5 && c === 'action') {
    const text = str(body.text, 'text').slice(0, 1000);
    await screens.act(id, {
      component: str(body.component, 'component'),
      text,
      awaited: body.awaited === true,
      state: body.state === true,
    });
    send(res, 200, {});
    return true;
  }
  if (n === 5 && c === 'error') {
    await screens.error(
      id,
      str(body.component, 'component'),
      int(body.version, 'version'),
      str(body.message, 'message'),
    );
    send(res, 200, {});
    return true;
  }
  if (n === 6 && c === 'trial' && d !== undefined) {
    // 浏览器先说一声收到了（开始跑），跑完再交结果
    if (body.received === true) {
      screens.trialReceived(d);
      send(res, 200, {});
      return true;
    }
    screens.trialResult(d, {
      ok: body.ok === true,
      ...(typeof body.error === 'string' ? { error: body.error.slice(0, 2000) } : {}),
    });
    send(res, 200, {});
    return true;
  }
  return false;
}

function str(v: unknown, name: string): string {
  if (typeof v !== 'string' || v.trim() === '') throw new BadRequestError(`${name} 要是非空字符串`);
  return v;
}

function int(v: unknown, name: string): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) {
    throw new BadRequestError(`${name} 要是非负整数`);
  }
  return v;
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > MAX_BODY) throw new BadRequestError('请求体太大');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (err) {
    throw new BadRequestError(`请求体不是 JSON（${err instanceof Error ? err.message : ''}）`);
  }
}

function send(res: ServerResponse, status: number, body: object): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}
