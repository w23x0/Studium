// 本地服务：HTTP 收命令、SSE 推事件；只绑本机地址，每个请求都要带口令。
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import type {
  CreateSessionResponse,
  ErrorResponse,
  ListSessionsResponse,
  RecordsResponse,
  SearchResponse,
  SendMessageRequest,
} from '../../shared/protocol.ts';
import { BusyError, NotFoundError, type Hub } from '../hub.ts';

export interface ServerOptions {
  hub: Hub;
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
    if (parts[1] !== 'sessions') {
      send(res, 404, { error: '没有这个接口' });
      return;
    }
    const id = parts[2];
    try {
      if (id === undefined) {
        if (method === 'GET') {
          send(res, 200, {
            sessions: opts.hub.listSessions(),
          } satisfies ListSessionsResponse);
          return;
        }
        if (method === 'POST') {
          const session = await opts.hub.createSession('main');
          send(res, 201, { session } satisfies CreateSessionResponse);
          return;
        }
      } else if (parts[3] === 'records' && parts.length === 4 && method === 'GET') {
        const records = await opts.hub.records(id);
        send(res, 200, { records, running: opts.hub.isRunning(id) } satisfies RecordsResponse);
        return;
      } else if (parts[3] === 'messages' && parts.length === 4 && method === 'POST') {
        const body = (await readJson(req)) as Partial<SendMessageRequest>;
        if (typeof body.text !== 'string' || body.text.trim() === '') {
          send(res, 400, { error: 'text 不能为空' });
          return;
        }
        await opts.hub.send(id, body.text);
        send(res, 202, {});
        return;
      }
      send(res, 404, { error: '没有这个接口' });
    } catch (err) {
      if (err instanceof NotFoundError) send(res, 404, { error: err.message });
      else if (err instanceof BusyError) send(res, 409, { error: err.message });
      else if (err instanceof BadRequest) send(res, 400, { error: err.message });
      else throw err;
    }
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
