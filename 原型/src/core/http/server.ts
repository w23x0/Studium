// 本地服务：HTTP 收命令、SSE 推事件；只绑本机地址，每个请求都要带口令。
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import type {
  ChooseRequest,
  ChooseResponse,
  CreateSessionResponse,
  ErrorResponse,
  ProjectResponse,
  ListSessionsResponse,
  RecordsResponse,
  SearchResponse,
} from '../../shared/protocol.ts';
import { NotFoundError, type Hub } from '../hub.ts';
import { BadRequestError, type Studium } from '../studium.ts';

export interface ServerOptions {
  hub: Hub;
  studium: Studium;
  token: string;
  host?: string;
  port: number;
  /** 构建好的界面目录；不给就只提供 API。 */
  uiDir?: string;
}

export interface RunningServer {
  url: string;
  port: number;
  close(): Promise<void>;
}

const MAX_BODY = 1 << 20;

export async function startServer(opts: ServerOptions): Promise<RunningServer> {
  const host = opts.host ?? '127.0.0.1';
  const sseClients = new Set<ServerResponse>();
  const server: Server = createServer((req, res) => {
    handle(req, res).catch((err: unknown) => {
      console.error(err);
      if (!res.headersSent) send(res, 500, { error: '核心内部错误，详见核心日志' });
      else res.end();
    });
  });

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (!hostAllowed(req.headers.host, actualPort())) {
      send(res, 403, { error: 'Host 不是本机地址' });
      return;
    }
    if (!url.pathname.startsWith('/api/')) {
      await serveStatic(res, url.pathname);
      return;
    }
    if (!authorized(req, url, opts.token)) {
      send(res, 401, { error: '口令不对；从核心启动时打印的地址打开页面' });
      return;
    }
    const parts = url.pathname.split('/').filter(Boolean); // ['api', ...]
    const method = req.method ?? 'GET';

    if (method === 'GET' && parts[1] === 'events' && parts.length === 2) {
      openSse(res);
      return;
    }
    if (method === 'GET' && parts[1] === 'search' && parts.length === 2) {
      const q = url.searchParams.get('q') ?? '';
      if (q.trim() === '') {
        send(res, 400, { error: 'q 不能为空' });
        return;
      }
      send(res, 200, { hits: opts.hub.search(q) } satisfies SearchResponse);
      return;
    }
    try {
      await route(req, res, parts, method);
    } catch (err) {
      if (err instanceof NotFoundError) send(res, 404, { error: err.message });
      else if (err instanceof BadRequest || err instanceof BadRequestError)
        send(res, 400, { error: err.message });
      else throw err;
    }
  }

  async function route(
    req: IncomingMessage,
    res: ServerResponse,
    parts: string[],
    method: string,
  ): Promise<void> {
    const { hub, studium } = opts;
    if (method === 'GET' && parts[1] === 'project' && parts.length === 2) {
      send(res, 200, { mainSessionId: await studium.ensureMain() } satisfies ProjectResponse);
      return;
    }
    if (method === 'POST' && parts[1] === 'cards' && parts[2] === 'request' && parts.length === 3) {
      background('出选择卡', () => studium.requestCard('学习者在界面上点了“下一步”'));
      send(res, 202, {});
      return;
    }
    if (method === 'POST' && parts[1] === 'cards' && parts[3] === 'choose' && parts.length === 4) {
      const body = (await readJson(req)) as Partial<ChooseRequest>;
      if (typeof body.option !== 'number') throw new BadRequest('option 要是数字');
      const loopSessionId = await studium.choose(parts[2] ?? '', body.option);
      send(res, 201, { loopSessionId } satisfies ChooseResponse);
      return;
    }
    if (parts[1] !== 'sessions') {
      send(res, 404, { error: '没有这个接口' });
      return;
    }
    const id = parts[2];
    const action = parts[3];
    if (id === undefined && method === 'GET') {
      send(res, 200, { sessions: hub.listSessions() } satisfies ListSessionsResponse);
      return;
    }
    if (id === undefined && method === 'POST') {
      // 一个项目一条主对话：已有就返回它
      const main = await hub.opened(await studium.ensureMain());
      send(res, 201, {
        session: {
          sessionId: main.sessionId,
          kind: main.kind,
          title: main.title,
          openedAt: main.at,
        },
      } satisfies CreateSessionResponse);
      return;
    }
    if (id !== undefined && parts.length === 4) {
      if (action === 'records' && method === 'GET') {
        const records = await hub.records(id);
        send(res, 200, { records, running: hub.isRunning(id) } satisfies RecordsResponse);
        return;
      }
      if (method === 'POST') {
        const body = (await readJson(req)) as { text?: unknown; note?: unknown };
        const note = typeof body.note === 'string' ? body.note : '学习者在界面上点了按钮';
        switch (action) {
          case 'messages': {
            if (typeof body.text !== 'string' || body.text.trim() === '') {
              throw new BadRequest('text 不能为空');
            }
            await studium.learnerSays(id, body.text);
            send(res, 202, {});
            return;
          }
          case 'close-request':
            await hub.opened(id);
            background('申请收口', () => studium.requestClose(id, 'learner', note));
            send(res, 202, {});
            return;
          case 'confirm-close':
            await studium.confirmClose(id, note);
            send(res, 202, {});
            return;
          case 'end':
            await studium.endUnclosed(id, note);
            send(res, 202, {});
            return;
        }
      }
    }
    send(res, 404, { error: '没有这个接口' });
  }

  function background(what: string, fn: () => Promise<unknown>): void {
    fn().catch((err: unknown) => {
      console.error(`${what}失败：`, err);
    });
  }

  function openSse(res: ServerResponse): void {
    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store',
      connection: 'keep-alive',
    });
    res.write(': ok\n\n');
    sseClients.add(res);
    res.on('close', () => sseClients.delete(res));
  }

  const unsubscribe = opts.hub.subscribe((e) => {
    const frame = `data: ${JSON.stringify(e)}\n\n`;
    for (const c of sseClients) c.write(frame);
  });

  async function serveStatic(res: ServerResponse, pathname: string): Promise<void> {
    if (opts.uiDir === undefined) {
      send(res, 404, { error: '界面未构建；运行 npm start' });
      return;
    }
    const rel = normalize(pathname === '/' ? '/index.html' : pathname).replace(/^(\.\.[/\\])+/, '');
    const file = join(opts.uiDir, rel);
    if (!file.startsWith(opts.uiDir)) {
      send(res, 403, { error: '路径越界' });
      return;
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      // 前端路由：不认识的路径都回 index.html
      const index = await readFile(join(opts.uiDir, 'index.html'));
      res.writeHead(200, { 'content-type': MIME['.html'] });
      res.end(index);
    }
  }

  function actualPort(): number {
    const a = server.address();
    return typeof a === 'object' && a !== null ? a.port : opts.port;
  }

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(opts.port, host, () => {
      resolve();
    });
  });
  const port = actualPort();
  return {
    port,
    url: `http://${host}:${String(port)}`,
    close: async () => {
      unsubscribe();
      for (const c of sseClients) c.end();
      await new Promise<void>((r) => {
        server.close(() => {
          r();
        });
      });
    },
  };
}

class BadRequest extends Error {}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

function send(res: ServerResponse, status: number, body: object | ErrorResponse): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function hostAllowed(host: string | undefined, port: number): boolean {
  // 挡 DNS 重绑定：只认本机地址
  return host === `127.0.0.1:${String(port)}` || host === `localhost:${String(port)}`;
}

function authorized(req: IncomingMessage, url: URL, token: string): boolean {
  const header = req.headers.authorization;
  const given = header?.startsWith('Bearer ') ? header.slice(7) : url.searchParams.get('token');
  if (given === null || given.length !== token.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(token));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > MAX_BODY) throw new BadRequest('请求体太大');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new BadRequest('请求体不是 JSON');
  }
}
