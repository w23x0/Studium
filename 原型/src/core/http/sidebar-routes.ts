// 左栏的接口：GET /api/sidebar 读现状（置顶、藏起来的、对话改的名）；POST /api/sidebar 记一条操作。
// 项目改名转给 Studium.renameProject（记进主对话），其余只追加到 <数据>/ui/sidebar.jsonl。类型在 src/shared/sidebar.ts。
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { SidebarResponse } from '../../shared/sidebar.ts';
import type { Hub } from '../hub.ts';
import { parseSidebarAction, type SidebarStore } from '../sidebar.ts';
import { BadRequestError, type Studium } from '../studium.ts';

const MAX_BODY = 1 << 16;

/** 认出 /api/sidebar 就回答并返回真。 */
export async function sidebarRoute(
  req: IncomingMessage,
  res: ServerResponse,
  parts: string[],
  method: string,
  deps: { store: SidebarStore; hub: Hub; studium: Studium },
): Promise<boolean> {
  if (parts[1] !== 'sidebar' || parts.length !== 2) return false;
  if (method === 'GET') {
    send(res, 200, { sidebar: deps.store.view() } satisfies SidebarResponse);
    return true;
  }
  if (method === 'POST') {
    const a = parseSidebarAction(await readJson(req), deps.hub.listSessions());
    if (a.action === 'rename' && a.kind === 'project') {
      await deps.studium.renameProject(a.id, a.title ?? '');
      send(res, 200, { sidebar: deps.store.view() } satisfies SidebarResponse);
    } else {
      send(res, 200, { sidebar: await deps.store.add(a) } satisfies SidebarResponse);
    }
    return true;
  }
  return false;
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
