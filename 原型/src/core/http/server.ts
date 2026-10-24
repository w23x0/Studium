// 本地服务：HTTP 收命令、SSE 推事件；只绑本机地址，每个请求都要带口令。
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import type {
  TicketEditRequest,
  LoopRelationsResponse,
  ShelveRequest,
  CreateSessionResponse,
  ErrorResponse,
  ListProjectsResponse,
  ProjectResponse,
  CardResponse,
  ProjectDeadlineRequest,
  ProjectDeadlineResponse,
  ProjectMaterialsRequest,
  AddMaterialRequest,
  ProjectMaterialsResponse,
  DisclosureResponse,
  LearnedResponse,
  LearningResponse,
  LoopEvidenceResponse,
  ConfirmationResponse,
  ObjectionResponse,
  ObjectionsResponse,
  RecordConfirmationRequest,
  TeachingToolResponse,
  TeachingToolsResponse,
  ProjectOverviewResponse,
  RecordObjectionRequest,
  SessionModelResponse,
  StateResponse,
  StrategiesResponse,
  VerdictObjectionRequest,
  ListSessionsResponse,
  RecordsResponse,
  SearchResponse,
  BBox,
  BooksResponse,
  SourceSearchResponse,
  LocateResponse,
  PageResponse,
  ResolveCitationsResponse,
  SectionResponse,
  SourceReportRequest,
  SourceReportResponse,
  SourceReportsResponse,
  TocResponse,
  CopyMaterialRequest,
  ImportTextResponse,
  PickCandidatesRequest,
  ProjectInstructionsRequest,
  ProjectInstructionsResponse,
  RerouteRequest,
  UploadsResponse,
} from '../../shared/protocol.ts';
import { MAX_UPLOAD_BYTES } from '../uploads.ts';
import type { Evidence } from '../evidence.ts';
import { NotFoundError, type Hub } from '../hub.ts';
import { NoOriginalError, NoRendererError } from '../knowledge/originals.ts';
import type { Sources } from '../sources.ts';
import { BadRequestError, type Studium } from '../studium.ts';
import { InputError, type Inputs } from '../inputs.ts';
import { crossRoute, type CrossServices } from './cross-routes.ts';
import { inputsRoute } from './inputs-routes.ts';
import { longtermRoute } from './longterm-routes.ts';
import { outputsRoute } from './outputs-routes.ts';
import { sidebarRoute } from './sidebar-routes.ts';
import type { SidebarStore } from '../sidebar.ts';
import type { Outputs } from '../outputs.ts';

export interface ServerOptions {
  hub: Hub;
  studium: Studium;
  /** 依据可见的只读视图（批 1a）。 */
  evidence: Evidence;
  /** 原文与出处（批 2a）：资料浏览、检索、原件页面、教材出处、资料报错。 */
  sources: Sources;
  /** 输入（批 4）：图片原样保存与转写。 */
  inputs: Inputs;
  /** 知识产出物（批 8）。 */
  outputs: Outputs;
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
      else if (err instanceof InputError) send(res, err.status, { error: err.message });
      else throw err;
    }
  }

  async function route(
    req: IncomingMessage,
    res: ServerResponse,
    parts: string[],
    method: string,
  ): Promise<void> {
    const { hub, studium, evidence, sources } = opts;
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
    if (
      await inputsRoute(
        req,
        res,
        new URL(req.url ?? '/', 'http://localhost'),
        parts,
        method,
        opts.inputs,
      )
    )
      return;
    if (
      await longtermRoute(
        req,
        res,
        new URL(req.url ?? '/', 'http://localhost'),
        parts,
        method,
        studium,
      )
    )
      return;
    if (
      await outputsRoute(
        req,
        res,
        new URL(req.url ?? '/', 'http://localhost'),
        parts,
        method,
        opts.outputs,
      )
    )
      return;
    if (
      method === 'GET' &&
      (await readRoute(res, new URL(req.url ?? '/', 'http://localhost'), parts, evidence))
    )
      return;
    if (method === 'POST' && parts[1] === 'objections' && parts.length === 2) {
      const body = (await readJson(req)) as Partial<RecordObjectionRequest>;
      if (body.kind !== 'pedagogy' && body.kind !== 'state') {
        throw new BadRequest('kind 要是 state 或 pedagogy');
      }
      if (typeof body.recordId !== 'string' || typeof body.text !== 'string') {
        throw new BadRequest('recordId 与 text 要是字符串');
      }
      const o = await studium.objectToRecord(body.kind, body.recordId, body.text);
      send(res, 201, { objection: { ...o, inLoop: false } } satisfies ObjectionResponse);
      return;
    }
    if (
      method === 'POST' &&
      parts[1] === 'state' &&
      parts[2] === 'confirmations' &&
      parts.length === 3
    ) {
      const body = (await readJson(req)) as Partial<RecordConfirmationRequest>;
      if (typeof body.recordId !== 'string') throw new BadRequest('recordId 要是字符串');
      if (body.verdict !== 'confirm' && body.verdict !== 'deny') {
        throw new BadRequest('verdict 要是 confirm 或 deny');
      }
      if (body.note !== undefined && typeof body.note !== 'string') {
        throw new BadRequest('note 要是字符串');
      }
      const c = await studium.confirmRecord(body.recordId, body.verdict, body.note);
      send(res, 201, { confirmation: c } satisfies ConfirmationResponse);
      return;
    }
    if (method === 'GET' && parts[1] === 'project' && parts.length === 2) {
      send(res, 200, { mainSessionId: await studium.ensureMain() } satisfies ProjectResponse);
      return;
    }
    if (parts[1] === 'projects' && parts.length === 5 && parts[2] !== undefined) {
      // 工单 W9：从别的项目拿、重试、改判、删导入
      const mainId = parts[2];
      const what = `${parts[3] ?? ''}/${parts[4] ?? ''}`;
      if (method === 'POST' && what === 'materials/copy') {
        const b = (await readJson(req)) as Partial<CopyMaterialRequest>;
        if (typeof b.fromProject !== 'string' || typeof b.material !== 'string') {
          throw new BadRequest('fromProject 与 material 要是字符串');
        }
        send(res, 200, await studium.copyMaterial(mainId, b.fromProject, b.material));
        return;
      }
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
      if (method === 'POST' && what === 'imports/remove') {
        const b = (await readJson(req)) as { id?: unknown };
        if (typeof b.id !== 'string') throw new BadRequest('id 要是字符串');
        await studium.removeImport(mainId, b.id);
        send(res, 200, {});
        return;
      }
    }
    if (parts[1] === 'projects' && parts.length === 4 && parts[2] !== undefined) {
      const mainId = parts[2];
      if (parts[3] === 'uploads' && method === 'GET') {
        send(res, 200, { items: await studium.uploadsOf(mainId) } satisfies UploadsResponse);
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
      if (parts[3] === 'deadline' && method === 'GET') {
        send(res, 200, (await studium.deadlineView(mainId)) satisfies ProjectDeadlineResponse);
        return;
      }
      if (parts[3] === 'deadline' && method === 'POST') {
        const body = (await readJson(req)) as Partial<ProjectDeadlineRequest>;
        if (body.deadline !== null && typeof body.deadline !== 'string') {
          throw new BadRequest('deadline 要是 YYYY-MM-DD 字符串，或 null 清掉');
        }
        if (body.note !== undefined && typeof body.note !== 'string') {
          throw new BadRequest('note 要是字符串');
        }
        send(
          res,
          200,
          (await studium.setDeadline(
            mainId,
            body.deadline,
            body.note,
          )) satisfies ProjectDeadlineResponse,
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
          note?: unknown;
          images?: unknown;
        };
        const note = typeof body.note === 'string' ? body.note : '学习者在界面上点了按钮';
        switch (action) {
          case 'messages': {
            // 附了图：转写文字带来源标注并进消息（inputs.ts）；没附图就是原来的纯文字
            const m = opts.inputs.compose(body.text, body.images);
            if (m.images.length > 0) await studium.learnerSays(id, m.text, m.images);
            else await studium.learnerSays(id, m.text);
            send(res, 202, {});
            return;
          }
          case 'close-request':
            await hub.opened(id);
            await studium.assertNotShelved(id);
            background('申请收口', () => studium.requestClose(id, 'learner', note));
            send(res, 202, {});
            return;
          case 'objections': {
            const b = body as Partial<VerdictObjectionRequest>;
            if (typeof b.line !== 'number' || typeof b.text !== 'string') {
              throw new BadRequest('line 要是数字、text 要是字符串');
            }
            const r = await studium.objectToVerdict(id, b.line, b.text);
            send(res, 201, {
              objection: {
                ...r.objection,
                inLoop: r.inLoop,
                ...(r.line !== undefined ? { line: r.line } : {}),
              },
            } satisfies ObjectionResponse);
            return;
          }
          case 'ticket-edit': {
            // 学习者改这次学习的单子（工单 W6 §4.1）：合格回改后的整张单子
            const b = body as Partial<TicketEditRequest>;
            send(res, 200, await studium.editTicket(id, b));
            return;
          }
          case 'confirm-close':
            await studium.confirmClose(id, note);
            send(res, 202, {});
            return;
          case 'end':
            await studium.endUnclosed(id, note);
            send(res, 202, {});
            return;
          case 'shelve': {
            const b = body as Partial<ShelveRequest>;
            const why = typeof b.note === 'string' && b.note.trim() !== '' ? b.note : note;
            await studium.shelveLoop(id, why);
            send(res, 202, {});
            return;
          }
          case 'resume':
            await studium.resumeLoop(id);
            send(res, 202, {});
            return;
          case 'candidates': {
            // 找资料对话里勾候选、存所选（工单 W9 §4.5）
            const b = body as Partial<PickCandidatesRequest>;
            if (
              typeof b.forLine !== 'number' ||
              !Array.isArray(b.picked) ||
              !b.picked.every((x) => typeof x === 'number')
            ) {
              throw new BadRequest('forLine 要是数字、picked 要是数字数组');
            }
            await studium.pickCandidates(id, b.forLine, b.picked);
            send(res, 200, {});
            return;
          }
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
        case 'books': {
          const books = await src.books();
          const project = q.get('project');
          if (project !== null && project !== '') {
            const chosen = new Set((await studium.selectedBooks(project)).map((m) => m.book));
            books.books = books.books.map((b) => ({ ...b, selected: chosen.has(b.id) }));
          }
          send(res, 200, books satisfies BooksResponse);
          return true;
        }
        case 'toc':
          send(res, 200, (await src.toc(str('book'))) satisfies TocResponse);
          return true;
        case 'section':
          send(
            res,
            200,
            (await src.section(
              str('book'),
              str('file'),
              int('from'),
              int('to'),
            )) satisfies SectionResponse,
          );
          return true;
        case 'search': {
          // project 给了：只搜本项目的资料；all=1 或明确给 book 时不限项目（学习者自己浏览用）
          const project = q.get('project');
          const book = q.get('book') ?? undefined;
          const scope =
            project !== null &&
            project !== '' &&
            (book === undefined || book === '') &&
            q.get('all') !== '1'
              ? await studium.scopeOf(project)
              : undefined;
          send(
            res,
            200,
            (await src.search(str('q'), book, int('limit'), scope)) satisfies SourceSearchResponse,
          );
          return true;
        }
        case 'page':
          send(res, 200, (await src.page(str('book'), need('page'))) satisfies PageResponse);
          return true;
        case 'page/image': {
          const png = await src.image(str('book'), need('page'), parseBBox(q.get('bbox')));
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
              str('book'),
              str('file'),
              from,
              int('to') ?? from,
            )) satisfies LocateResponse,
          );
          return true;
        }
        case 'reports': {
          const reports = src.reports({
            ...(q.get('book') ? { book: str('book') } : {}),
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

  /** 依据可见的只读接口（GET）；认出路径就回答并返回真。 */
  async function readRoute(
    res: ServerResponse,
    url: URL,
    parts: string[],
    ev: Evidence,
  ): Promise<boolean> {
    const [, a, b, c] = parts;
    const n = parts.length;
    const q = url.searchParams;
    if (a === 'loops' && c === 'evidence' && n === 4 && b !== undefined) {
      send(res, 200, { loop: await ev.loop(b) } satisfies LoopEvidenceResponse);
    } else if (a === 'cards' && n === 3 && b !== undefined) {
      send(res, 200, { card: await ev.card(b) } satisfies CardResponse);
    } else if (a === 'projects' && c === 'loop-relations' && n === 4 && b !== undefined) {
      send(res, 200, {
        mainSessionId: b,
        relations: await ev.loopRelations(b),
      } satisfies LoopRelationsResponse);
    } else if (a === 'projects' && c === 'overview' && n === 4 && b !== undefined) {
      // 批 6：项目概览带“今天该做的”，没合上的那次带谁在接着学
      const overview = await ev.overview(b);
      overview.today = await opts.studium.longterm.todayView(b);
      for (const brief of overview.groups.unclosed) {
        const by = await opts.studium.longterm.resumedBy(b, brief.sessionId);
        if (by.length > 0) {
          brief.resumedBy = by.map((x) => ({
            loopSessionId: x.loopSessionId,
            title: x.title,
            status: !x.ended ? 'in_progress' : x.closed === true ? 'closed' : 'unclosed',
          }));
        }
      }
      send(res, 200, { overview } satisfies ProjectOverviewResponse);
    } else if (a === 'learned' && n === 2) {
      // 学过的记录：不给 project 就是全部（按人，不按项目划界）
      send(
        res,
        200,
        (await opts.studium.learned.list(q.get('project') ?? undefined)) satisfies LearnedResponse,
      );
    } else if (a === 'learned' && b === 'imports' && n === 4 && parts[3] !== undefined) {
      // 一条外部导入的 md 全文（项目页“我导入的学过的”点开看）
      const id = decodeURIComponent(parts[3]);
      const one = (await opts.studium.learned.imports()).find((x) => x.id === id);
      if (one === undefined) throw new NotFoundError(`没有这条导入：${id}`);
      send(res, 200, {
        import: one,
        text: (await opts.studium.learned.importText(one)) ?? '',
      } satisfies ImportTextResponse);
    } else if (a === 'learned' && n === 3 && b !== undefined) {
      send(res, 200, {
        learning: await opts.studium.learned.one(decodeURIComponent(b)),
      } satisfies LearningResponse);
    } else if (a === 'pedagogy' && b === 'records' && n === 3) {
      const records = await ev.strategies(q.get('loop') ?? undefined);
      send(res, 200, { records } satisfies StrategiesResponse);
    } else if (a === 'state' && b === 'records' && n === 3) {
      send(res, 200, (await ev.state()) satisfies StateResponse);
    } else if (a === 'objections' && n === 2) {
      // 只认这三种指向；别的回 400，不悄悄给空列表
      const kind = q.get('kind') ?? undefined;
      if (kind !== undefined && !['guard_verdict', 'pedagogy', 'state'].includes(kind)) {
        throw new BadRequest('kind 要是 guard_verdict、state 或 pedagogy');
      }
      const objections = ev.objections(kind, q.get('record') ?? undefined);
      send(res, 200, { objections } satisfies ObjectionsResponse);
    } else if (a === 'teaching-tools' && n === 2) {
      send(res, 200, (await ev.teachingTools()) satisfies TeachingToolsResponse);
    } else if (a === 'teaching-tools' && n === 3 && b !== undefined) {
      send(res, 200, (await ev.teachingTool(decodeURIComponent(b))) satisfies TeachingToolResponse);
    } else if (a === 'disclosure' && n === 2) {
      send(res, 200, ev.disclosure() satisfies DisclosureResponse);
    } else {
      return false;
    }
    return true;
  }

  function background(what: string, fn: () => Promise<unknown>): void {
    opts.studium.background(what, fn);
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
