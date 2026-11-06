// 本地服务：HTTP 收命令、SSE 推事件；只绑本机地址，每个请求都要带口令。
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { timingSafeEqual } from 'node:crypto';
import type {
  ErrorResponse,
  ListProjectsResponse,
  ProjectResponse,
  ProjectMaterialsRequest,
  AddMaterialRequest,
  ProjectMaterialsResponse,
  SessionModelResponse,
  ListSessionsResponse,
  RecordsResponse,
  SearchResponse,
  BBox,
  MaterialListResponse,
  SourceSearchResponse,
  LocateResponse,
  PageResponse,
  ResolveCitationsResponse,
  SectionResponse,
  SourceReportRequest,
  SourceReportResponse,
  SourceReportsResponse,
  TocResponse,
  SetMaterialOwnerRequest,
  ProjectInstructionsRequest,
  ProjectInstructionsResponse,
  RerouteRequest,
  UploadsResponse,
} from '../../shared/protocol.ts';
import type { MessageQuote } from '../../shared/records.ts';
import type { QuotaResponse, UsageResponse } from '../../shared/usage.ts';
import { MAX_UPLOAD_BYTES } from '../uploads.ts';
import { NotFoundError, type Hub } from '../hub.ts';
import { NoOriginalError, NoRendererError } from '../knowledge/originals.ts';
import type { Sources } from '../sources.ts';
import { BadRequestError, type Studium } from '../studium.ts';
import { crossRoute, type CrossServices } from './cross-routes.ts';
import { modelRoute } from './model-routes.ts';
import type { ModelSettings } from '../model/settings.ts';
import { screenRoute } from './screen-routes.ts';
import { sidebarRoute } from './sidebar-routes.ts';
import type { SidebarStore } from '../sidebar.ts';

export interface ServerOptions {
  models?: ModelSettings;
  hub: Hub;
  studium: Studium;
  /** 原文与出处（批 2a）：资料浏览、检索、原件页面、教材出处、资料报错。 */
  sources: Sources;
  /** 资料的来源说明、状态回看（批 10b）。 */
  cross: CrossServices;
  /** 左栏的界面操作（置顶、从列表删掉、对话改名）。 */
  sidebar: SidebarStore;
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
    if (url.pathname.startsWith(`${PAGE_LIB}/`)) {
      await servePageLib(res, url.pathname.slice(PAGE_LIB.length + 1));
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
      if (err instanceof NotFoundError || err instanceof NoOriginalError)
        send(res, 404, { error: err.message });
      else if (err instanceof NoRendererError) send(res, 501, { error: err.message });
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
    const { hub, studium, sources } = opts;
    if (await modelRoute(req, res, parts, method, hub, opts.models)) return;
    if (
      await crossRoute(
        req,
        res,
        new URL(req.url ?? '/', 'http://localhost'),
        parts,
        method,
        studium,
        opts.cross,
      )
    )
      return;
    if (parts[1] === 'sources' && (await sourcesRoute(req, res, parts, method, sources, studium)))
      return;
    if (await sidebarRoute(req, res, parts, method, { store: opts.sidebar, hub, studium })) return;
    if (await screenRoute(req, res, parts, method, studium)) return;
    if (method === 'GET' && (await readRoute(res, parts))) return;
    if (
      parts[1] === 'projects' &&
      parts.length === 6 &&
      parts[2] !== undefined &&
      parts[3] === 'materials' &&
      parts[4] !== undefined &&
      parts[5] === 'owner' &&
      method === 'POST'
    ) {
      // 改一份资料归谁（W11 §2）：{ owner: 'learner' | 'project', projects? }
      const b = (await readJson(req)) as Partial<SetMaterialOwnerRequest>;
      if (b.owner !== 'learner' && b.owner !== 'project') {
        throw new BadRequest('owner 要是 learner 或 project');
      }
      if (
        b.projects !== undefined &&
        !(Array.isArray(b.projects) && b.projects.every((x) => typeof x === 'string'))
      ) {
        throw new BadRequest('projects 要是字符串数组');
      }
      await studium.setMaterialOwner(
        parts[2],
        decodeURIComponent(parts[4]),
        b.owner,
        b.projects,
        'learner',
      );
      send(res, 200, { items: await studium.uploadsOf(parts[2]) } satisfies UploadsResponse);
      return;
    }
    if (parts[1] === 'projects' && parts.length === 5 && parts[2] !== undefined) {
      // 工单 W9：重试、改判、删导入
      const mainId = parts[2];
      const what = `${parts[3] ?? ''}/${parts[4] ?? ''}`;
      if (method === 'POST' && what === 'materials/retry') {
        const b = (await readJson(req)) as { material?: unknown };
        if (typeof b.material !== 'string') throw new BadRequest('material 要是字符串');
        send(res, 200, await studium.retryMaterial(mainId, b.material));
        return;
      }
      if (method === 'POST' && what === 'uploads/reroute') {
        const b = (await readJson(req)) as Partial<RerouteRequest>;
        if (typeof b.upload !== 'string' || typeof b.file !== 'string') {
          throw new BadRequest('upload 与 file 要是字符串');
        }
        if (b.to !== '资料' && b.to !== '学过的') throw new BadRequest('to 要是 资料 或 学过的');
        await studium.reroute(mainId, b.upload, b.file, b.to);
        send(res, 200, { items: await studium.uploadsOf(mainId) } satisfies UploadsResponse);
        return;
      }
    }
    if (parts[1] === 'projects' && parts.length === 4 && parts[2] !== undefined) {
      const mainId = parts[2];
      if (parts[3] === 'uploads' && method === 'GET') {
        send(res, 200, { items: await studium.uploadsOf(mainId) } satisfies UploadsResponse);
        return;
      }
      if (parts[3] === 'usage' && method === 'GET') {
        send(res, 200, (await hub.usage(mainId)) satisfies UsageResponse);
        return;
      }
      if (parts[3] === 'uploads' && method === 'POST') {
        // multipart：files 一个或多个；paths（可选）= 同序的相对路径 JSON 数组（文件夹按相对路径传）
        const files = await readUpload(req);
        send(res, 201, { items: await studium.upload(mainId, files) } satisfies UploadsResponse);
        return;
      }
      if (parts[3] === 'instructions' && method === 'GET') {
        send(res, 200, (await studium.instructions(mainId)) satisfies ProjectInstructionsResponse);
        return;
      }
      if (parts[3] === 'instructions' && method === 'PUT') {
        const b = (await readJson(req)) as Partial<ProjectInstructionsRequest>;
        if (typeof b.text !== 'string') throw new BadRequest('text 要是字符串');
        send(
          res,
          200,
          (await studium.setInstructions(mainId, b.text)) satisfies ProjectInstructionsResponse,
        );
        return;
      }
      if (parts[3] === 'materials' && method === 'GET') {
        send(res, 200, (await studium.materials(mainId)) satisfies ProjectMaterialsResponse);
        return;
      }
      if (parts[3] === 'materials' && method === 'POST') {
        const body = (await readJson(req)) as Partial<ProjectMaterialsRequest> &
          Partial<AddMaterialRequest>;
        // 加一份资料（工单 W8 §4.2）：{ kind, origin, title?, commit? }，后台处理，状态随处理更新
        if (body.kind !== undefined) {
          send(
            res,
            200,
            (await studium.addMaterial(mainId, body)) satisfies ProjectMaterialsResponse,
          );
          return;
        }
        const v = body.remove;
        if (v !== undefined && !(Array.isArray(v) && v.every((x) => typeof x === 'string'))) {
          throw new BadRequest('remove 要是字符串数组');
        }
        send(
          res,
          200,
          (await studium.changeMaterials(mainId, body)) satisfies ProjectMaterialsResponse,
        );
        return;
      }
    }
    if (parts[1] === 'projects' && parts.length === 2) {
      if (method === 'GET') {
        send(res, 200, { projects: await studium.listProjects() } satisfies ListProjectsResponse);
        return;
      }
      if (method === 'POST') {
        const body = (await readJson(req)) as { title?: unknown };
        const id = await studium.createProject(
          typeof body.title === 'string' ? body.title : undefined,
        );
        send(res, 201, { mainSessionId: id } satisfies ProjectResponse);
        return;
      }
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
    if (id !== undefined && parts.length === 4) {
      if (action === 'model' && method === 'GET') {
        send(res, 200, { model: await hub.modelInfo(id) } satisfies SessionModelResponse);
        return;
      }
      if (action === 'records' && method === 'GET') {
        const records = await hub.records(id);
        send(res, 200, { records, running: hub.isRunning(id) } satisfies RecordsResponse);
        return;
      }
      if (method === 'POST') {
        // 请求体是 JSON null 时当作什么都没给（各动作自己报缺什么）
        const body = ((await readJson(req)) ?? {}) as {
          text?: unknown;
          replyTo?: unknown;
          quote?: unknown;
          quotes?: unknown;
        };
        switch (action) {
          case 'messages': {
            if (typeof body.text !== 'string' || body.text.trim() === '') {
              throw new BadRequest('text 不能为空');
            }
            // 学习页：在某一块下面回的（W10，会话/学习对话.md §11.3 学习者回话）
            const r = body.replyTo as { key?: unknown; pointer?: unknown } | undefined;
            const replyTo =
              typeof r?.key === 'string' && typeof r.pointer === 'string'
                ? { key: r.key.slice(0, 100), pointer: r.pointer.slice(0, 200) }
                : undefined;
            // 竖流学习页：选中页面上几处再说的（10-29 #74；11-05 #92 起可多处，旧界面发的单个 quote 照收）
            const raw = Array.isArray(body.quotes)
              ? (body.quotes as unknown[])
              : body.quote !== undefined && body.quote !== null
                ? [body.quote]
                : [];
            const quotes = raw
              .slice(0, 20)
              .map(parseQuote)
              .filter((q): q is MessageQuote => q !== undefined);
            await studium.learnerSays(
              id,
              body.text,
              replyTo,
              quotes.length > 0 ? quotes : undefined,
            );
            send(res, 202, {});
            return;
          }
          case 'stop':
            // 学习者在生成中途点了停止（W12 §4.4）
            await studium.stopTurn(id);
            send(res, 202, {});
            return;
          case 'edit': {
            // 停下后改自己刚发的那句、重新生成（W12 §4.4）
            if (typeof body.text !== 'string') throw new BadRequest('text 要是字符串');
            await studium.editLast(id, body.text);
            send(res, 202, {});
            return;
          }
          case 'delete':
            // 学习者删一个讨论串（W12 §4.3）：删前界面确认过一次
            await studium.deleteThread(id);
            send(res, 200, {});
            return;
          case 'end':
            // 学习者在讨论串栏“⋯”里点结束（W19，照 Claude 项目的讨论串）
            await studium.endThread(id);
            send(res, 200, {});
            return;
        }
      }
    }
    send(res, 404, { error: '没有这个接口' });
  }

  /** 原文与出处的接口（/api/sources/…）；认出路径就回答并返回真。 */
  async function sourcesRoute(
    req: IncomingMessage,
    res: ServerResponse,
    parts: string[],
    method: string,
    src: Sources,
    studium: Studium,
  ): Promise<boolean> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const q = url.searchParams;
    const what = parts.slice(2).join('/');
    const str = (name: string): string => {
      const v = q.get(name);
      if (v === null || v === '') throw new BadRequest(`缺少参数 ${name}`);
      return v;
    };
    const int = (name: string): number | undefined => {
      const v = q.get(name);
      if (v === null || v === '') return undefined;
      const n = Number(v);
      if (!Number.isInteger(n)) throw new BadRequest(`${name} 要是整数`);
      return n;
    };
    const need = (name: string): number => {
      const n = int(name);
      if (n === undefined) throw new BadRequest(`缺少参数 ${name}`);
      return n;
    };
    if (method === 'GET') {
      switch (what) {
        case 'materials': {
          const list = await src.materials();
          const project = q.get('project');
          if (project !== null && project !== '') {
            // 本项目能读的（按归属）标出来
            const chosen = new Set(await studium.scopeOf(project));
            list.materials = list.materials.map((b) => ({ ...b, selected: chosen.has(b.id) }));
          }
          send(res, 200, list satisfies MaterialListResponse);
          return true;
        }
        case 'toc':
          send(res, 200, (await src.toc(str('material'))) satisfies TocResponse);
          return true;
        case 'section':
          send(
            res,
            200,
            (await src.section(
              str('material'),
              str('file'),
              int('from'),
              int('to'),
            )) satisfies SectionResponse,
          );
          return true;
        case 'search': {
          // project 给了：只搜本项目能读的资料；all=1 或明确给 material 时不限项目（学习者自己浏览用）
          const project = q.get('project');
          const material = q.get('material') ?? undefined;
          const scope =
            project !== null &&
            project !== '' &&
            (material === undefined || material === '') &&
            q.get('all') !== '1'
              ? await studium.scopeOf(project)
              : undefined;
          send(
            res,
            200,
            (await src.search(
              str('q'),
              material,
              int('limit'),
              scope,
            )) satisfies SourceSearchResponse,
          );
          return true;
        }
        case 'page':
          send(res, 200, (await src.page(str('material'), need('page'))) satisfies PageResponse);
          return true;
        case 'page/image': {
          const png = await src.image(str('material'), need('page'), parseBBox(q.get('bbox')));
          res.writeHead(200, {
            'content-type': 'image/png',
            'cache-control': 'private, max-age=3600',
          });
          res.end(png);
          return true;
        }
        case 'locate': {
          const from = need('from');
          send(
            res,
            200,
            (await src.locate(
              str('material'),
              str('file'),
              from,
              int('to') ?? from,
            )) satisfies LocateResponse,
          );
          return true;
        }
        case 'reports': {
          const reports = src.reports({
            ...(q.get('material') ? { book: str('material') } : {}),
            ...(q.get('file') ? { file: str('file') } : {}),
          });
          send(res, 200, { reports } satisfies SourceReportsResponse);
          return true;
        }
      }
      return false;
    }
    if (method === 'POST' && what === 'citations') {
      const body = (await readJson(req)) as { text?: unknown };
      if (typeof body.text !== 'string') throw new BadRequest('text 要是字符串');
      send(res, 200, {
        citations: await src.citations(body.text),
      } satisfies ResolveCitationsResponse);
      return true;
    }
    if (method === 'POST' && what === 'reports') {
      const body = (await readJson(req)) as Partial<SourceReportRequest>;
      send(res, 201, { report: await src.report(body) } satisfies SourceReportResponse);
      return true;
    }
    return false;
  }

  /** 只读接口（GET）；认出路径就回答并返回真。W19 起一次学习的依据面板、学过的记录面板撤掉，只剩额度。 */
  async function readRoute(res: ServerResponse, parts: string[]): Promise<boolean> {
    if (parts[1] === 'quota' && parts.length === 2) {
      send(res, 200, (await opts.hub.quota()) satisfies QuotaResponse);
      return true;
    }
    return false;
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

  /**
   * 组件里能用的本机库（KaTeX）：组件跑在不联网、来源不透明的小窗里，只能从这里取；
   * 字体要跨来源，所以带 CORS 头。不要口令（同界面的静态文件）。
   */
  async function servePageLib(res: ServerResponse, rel: string): Promise<void> {
    const clean = normalize(rel).replace(/^(\.\.[/\\])+/, '');
    if (!clean.startsWith('katex/')) {
      send(res, 404, { error: '没有这个库' });
      return;
    }
    const file = join(KATEX_DIST, clean.slice('katex/'.length));
    if (!file.startsWith(KATEX_DIST)) {
      send(res, 403, { error: '路径越界' });
      return;
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, {
        'content-type': MIME[extname(file)] ?? 'application/octet-stream',
        'access-control-allow-origin': '*',
        'cache-control': 'max-age=86400',
      });
      res.end(body);
    } catch {
      send(res, 404, { error: '没有这个文件' });
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

/** 组件能用的本机库的地址前缀（界面拼组件小窗时用同一个，见 src/ui/page-frame.ts）。 */
const PAGE_LIB = '/page-lib';
const KATEX_DIST = join(dirname(fileURLToPath(import.meta.resolve('katex/package.json'))), 'dist');

/** ?bbox=x0,y0,x1,y1（千分比，0–1000）；没给返回空。 */
function parseBBox(v: string | null): BBox | undefined {
  if (v === null || v === '') return undefined;
  const n = v.split(',').map(Number);
  const [a, b, c, d] = n;
  if (
    n.length !== 4 ||
    n.some((x) => !Number.isFinite(x)) ||
    a === undefined ||
    b === undefined ||
    c === undefined ||
    d === undefined ||
    c <= a ||
    d <= b
  ) {
    throw new BadRequest('bbox 要是 x0,y0,x1,y1 四个数（0–1000），且右下大于左上');
  }
  return [a, b, c, d];
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

function send(res: ServerResponse, status: number, body: object | ErrorResponse): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function hostAllowed(host: string | undefined, port: number): boolean {
  // 挡 DNS 重绑定：只认本机地址，加上手机经 `tailscale serve` 来的 ts.net 名字
  // （ts.net 的解析归 Tailscale 管，外人没法把它指到本机）
  if (host?.endsWith('.ts.net') === true) return true;
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

/** 读 multipart 上传：files 一个或多个；paths 是同序的相对路径（浏览器传文件夹时文件名里可能没有目录）。 */
async function readUpload(req: IncomingMessage): Promise<{ path: string; data: Buffer }[]> {
  const type = req.headers['content-type'] ?? '';
  if (!type.startsWith('multipart/form-data'))
    throw new BadRequest('要用 multipart/form-data 传文件');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > MAX_UPLOAD_BYTES) {
      throw new BadRequest(`一次上传最多 ${String(MAX_UPLOAD_BYTES / 1024 / 1024)} MB；分几次传`);
    }
    chunks.push(chunk);
  }
  let form: FormData;
  try {
    form = await new Response(Buffer.concat(chunks), {
      headers: { 'content-type': type },
    }).formData();
  } catch {
    throw new BadRequest('上传的内容读不出来');
  }
  const files = form.getAll('files').filter((f): f is File => typeof f !== 'string');
  const rawPaths = form.get('paths');
  let paths: unknown = [];
  if (typeof rawPaths === 'string') {
    try {
      paths = JSON.parse(rawPaths);
    } catch {
      throw new BadRequest('paths 要是 JSON 数组');
    }
  }
  return Promise.all(
    files.map(async (f, i) => {
      const p = Array.isArray(paths) && typeof paths[i] === 'string' ? paths[i] : f.name;
      return { path: p, data: Buffer.from(await f.arrayBuffer()) };
    }),
  );
}

/** 学习者选中的一处（学习页发来的）：某一行里的一段原文（带前后几个字），或一个组件；什么都没有的不算。 */
function parseQuote(raw: unknown): MessageQuote | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const q = raw as {
    line?: unknown;
    text?: unknown;
    component?: unknown;
    before?: unknown;
    after?: unknown;
  };
  const text =
    typeof q.text === 'string' && q.text.trim() !== '' ? q.text.slice(0, 4000) : undefined;
  const component =
    typeof q.component === 'string' && q.component.trim() !== ''
      ? q.component.slice(0, 100)
      : undefined;
  if (text === undefined && component === undefined) return undefined;
  return {
    ...(typeof q.line === 'number' && Number.isInteger(q.line) ? { line: q.line } : {}),
    ...(text !== undefined ? { text } : {}),
    ...(component !== undefined ? { component } : {}),
    ...(text !== undefined && typeof q.before === 'string' && q.before !== ''
      ? { before: q.before.slice(-40) }
      : {}),
    ...(text !== undefined && typeof q.after === 'string' && q.after !== ''
      ? { after: q.after.slice(0, 40) }
      : {}),
  };
}
