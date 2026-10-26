// 活页面的接口（会话/学习对话.md §11）：/api/sessions/<学习 id>/page/…
// 读现状与某一版、学习者在页面上的动作与看得到哪几块、运行时报错、试跑结果、退回。类型在 src/shared/page.ts。
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  PAGE_ROLLBACK_REASONS,
  type PageAction,
  type PageContentResponse,
  type PageStateResponse,
} from '../../shared/page.ts';
import { BadRequestError, type Studium } from '../studium.ts';

const MAX_BODY = 1 << 16;

/** 认出 /api/sessions/:id/page… 就回答并返回真。 */
export async function pageRoute(
  req: IncomingMessage,
  res: ServerResponse,
  parts: string[],
  method: string,
  studium: Studium,
): Promise<boolean> {
  const [, a, id, b, c, d] = parts;
  if (a !== 'sessions' || id === undefined || b !== 'page') return false;
  const pages = studium.pages;
  const n = parts.length;
  if (n === 4 && method === 'GET') {
    send(res, 200, (await pages.state(id)) satisfies PageStateResponse);
    return true;
  }
  if (n === 5 && method === 'GET' && c !== undefined && /^\d+$/.test(c)) {
    const version = Number(c);
    send(res, 200, {
      version,
      blocks: await pages.content(id, version),
    } satisfies PageContentResponse);
    return true;
  }
  if (method !== 'POST') return false;
  const body = (await readJson(req)) as Record<string, unknown>;
  if (n === 5 && c === 'actions') {
    await pages.act(id, {
      version: int(body.version, 'version'),
      actions: actionsOf(body.actions),
      ...(body.awaited === true ? { awaited: true } : {}),
    });
    send(res, 200, {});
    return true;
  }
  if (n === 5 && c === 'view') {
    const visible = body.visible;
    if (!Array.isArray(visible) || !visible.every((v) => typeof v === 'string')) {
      throw new BadRequestError('visible 要是块编号的数组');
    }
    const dwell = body.dwell;
    await pages.view(id, {
      version: int(body.version, 'version'),
      visible,
      ...(typeof dwell === 'object' && dwell !== null
        ? {
            dwell: Object.fromEntries(
              Object.entries(dwell).filter((e): e is [string, number] => typeof e[1] === 'number'),
            ),
          }
        : {}),
    });
    send(res, 200, {});
    return true;
  }
  if (n === 5 && c === 'error') {
    if (typeof body.message !== 'string') throw new BadRequestError('message 要是字符串');
    await pages.error(id, int(body.version, 'version'), body.message);
    send(res, 200, {});
    return true;
  }
  if (n === 6 && c === 'trial' && d !== undefined) {
    pages.trialResult(d, {
      ok: body.ok === true,
      ...(typeof body.error === 'string' ? { error: body.error.slice(0, 2000) } : {}),
    });
    send(res, 200, {});
    return true;
  }
  if (n === 5 && c === 'rollback') {
    const reason = body.reason;
    if (reason !== undefined && !(PAGE_ROLLBACK_REASONS as readonly unknown[]).includes(reason)) {
      throw new BadRequestError(`reason 只能是 ${PAGE_ROLLBACK_REASONS.join(' / ')}`);
    }
    const version = await pages.rollback(
      id,
      int(body.to, 'to'),
      reason as (typeof PAGE_ROLLBACK_REASONS)[number] | undefined,
    );
    send(res, 200, { version });
    return true;
  }
  return false;
}

function int(v: unknown, name: string): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) {
    throw new BadRequestError(`${name} 要是非负整数`);
  }
  return v;
}

function actionsOf(v: unknown): PageAction[] {
  if (!Array.isArray(v) || v.length === 0 || v.length > 50) {
    throw new BadRequestError('actions 要是 1–50 个动作');
  }
  return v.map((x: unknown) => {
    const o = (typeof x === 'object' && x !== null ? x : {}) as Record<string, unknown>;
    if (o.kind === 'toggle' && typeof o.block === 'string' && typeof o.open === 'boolean') {
      return { kind: 'toggle', block: o.block, open: o.open };
    }
    if (o.kind === 'custom' && typeof o.name === 'string' && o.name !== '') {
      return {
        kind: 'custom',
        name: o.name.slice(0, 100),
        ...(o.detail !== undefined ? { detail: o.detail } : {}),
        ...(typeof o.block === 'string' ? { block: o.block } : {}),
      };
    }
    throw new BadRequestError('动作只能是展开 / 折起（toggle）或页面自己定义的（custom）');
  });
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
