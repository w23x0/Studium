// 与核心通话：口令从地址栏 ?token= 取一次，存进 localStorage（每台设备带一次口令，关页面也不丢）。
import type {
  ListProjectsResponse,
  ListSessionsResponse,
  ProjectResponse,
  RecordsResponse,
  ServerEvent,
  MaterialListResponse,
  TocResponse,
  SectionResponse,
  SourceSearchResponse,
  PageResponse,
  LocateResponse,
  ResolveCitationsResponse,
  SourceReportRequest,
  SourceReportResponse,
  SourceReportsResponse,
  ProjectMaterialsResponse,
  UploadsResponse,
  SourceNoteField,
  SourceNoteResponse,
  SourceNotesResponse,
  MineruTokenBody,
} from '../shared/protocol.ts';
import type {
  Engine,
  EngineSettings,
  ConnectionInput,
  ConversationModelSettings,
  ModelSelection,
} from '../shared/model-settings.ts';
import type { MessageQuote } from '../shared/records.ts';
import type { QuotaResponse, UsageResponse } from '../shared/usage.ts';
import type { SidebarActionRequest, SidebarResponse } from '../shared/sidebar.ts';
import type {
  ComponentActionRequest,
  ComponentErrorRequest,
  OldComponentsResponse,
  PageTrialResult,
} from '../shared/screen.ts';

function token(): string {
  const fromUrl = new URLSearchParams(location.search).get('token');
  if (fromUrl !== null) {
    try {
      localStorage.setItem('studium-token', fromUrl);
    } catch {
      // 存不了（隐私窗口等）就只在这一页里有效
    }
    history.replaceState(null, '', location.pathname + location.hash);
    return fromUrl;
  }
  try {
    // 旧版存在 sessionStorage：同一标签页里升级后不用重新带口令
    return localStorage.getItem('studium-token') ?? sessionStorage.getItem('studium-token') ?? '';
  } catch {
    return '';
  }
}

const TOKEN = token();

/** 带口令调一个接口（练习等分出去的接口文件也用它）。 */
export async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
  });
  const body = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `请求失败：${String(res.status)}`);
  return body;
}

/** 查询串：值为空的参数不带。 */
export function qs(params: Record<string, string | number | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) u.set(k, String(v));
  return u.toString();
}

/** 给 <img src> 用的地址：带上口令（图片请求带不了请求头）。 */
export function withToken(url: string): string {
  return `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(TOKEN)}`;
}

const listeners = new Set<(e: ServerEvent) => void>();
let source: EventSource | undefined;

export const api = {
  modelSettings: () => call<EngineSettings>('/settings/models'),
  setEngine: (engine: Engine) =>
    call<EngineSettings>('/settings/models', { method: 'PUT', body: JSON.stringify({ engine }) }),
  setConnection: (engine: Engine, input: ConnectionInput) =>
    call<EngineSettings>(`/settings/models/${engine}/connection`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  accountAction: (engine: Engine, action: 'login' | 'logout' | 'cancel') =>
    call<EngineSettings>(`/settings/models/${engine}/${action}`, { method: 'POST' }),
  conversationModel: (id: string) =>
    call<ConversationModelSettings>(`/sessions/${id}/model-settings`),
  setConversationModel: (id: string, engine: Engine, selection: ModelSelection, revision: string) =>
    call<ConversationModelSettings>(`/sessions/${id}/model-settings`, {
      method: 'PUT',
      body: JSON.stringify({ engine, selection, revision }),
    }),
  listSessions: () => call<ListSessionsResponse>('/sessions'),
  // ── 额度与使用情况（W14） ──
  quota: () => call<QuotaResponse>('/quota'),
  usage: (projectId: string) => call<UsageResponse>(`/projects/${projectId}/usage`),
  projects: () => call<ListProjectsResponse>('/projects'),
  createProject: (title?: string) =>
    call<ProjectResponse>('/projects', {
      method: 'POST',
      body: JSON.stringify(title !== undefined ? { title } : {}),
    }),
  // ── 左栏：置顶、从列表删掉（只藏起来）、改名 ──
  sidebar: () => call<SidebarResponse>('/sidebar'),
  sidebarAct: (req: SidebarActionRequest) =>
    call<SidebarResponse>('/sidebar', { method: 'POST', body: JSON.stringify(req) }),
  records: (id: string) => call<RecordsResponse>(`/sessions/${id}/records`),
  /** 不是竖流开的旧学习只读看：每个组件最后一版。 */
  oldComponents: (loopId: string) => call<OldComponentsResponse>(`/sessions/${loopId}/screens`),
  /** 生成中途停止（W12 §4.4）。 */
  stop: (id: string) => call<object>(`/sessions/${id}/stop`, { method: 'POST', body: '{}' }),
  /** 停下后改自己刚发的那句、重新生成（W12 §4.4）。 */
  editLast: (id: string, text: string) =>
    call<object>(`/sessions/${id}/edit`, { method: 'POST', body: JSON.stringify({ text }) }),
  /** 学习者结束一个讨论串（W19，只是收起，说话就重开）。 */
  endThread: (id: string) => call<object>(`/sessions/${id}/end`, { method: 'POST', body: '{}' }),
  /** 删一个讨论串（W12 §4.3）。 */
  deleteThread: (id: string) =>
    call<object>(`/sessions/${id}/delete`, { method: 'POST', body: '{}' }),
  // ── 学习页：组件（会话/学习对话.md §11） ──
  screenAction: (loopId: string, body: ComponentActionRequest) =>
    call<object>(`/sessions/${loopId}/screens/action`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  screenError: (loopId: string, body: ComponentErrorRequest) =>
    call<object>(`/sessions/${loopId}/screens/error`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  screenTrial: (loopId: string, trialId: string, body: PageTrialResult | { received: true }) =>
    call<object>(`/sessions/${loopId}/screens/trial/${trialId}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  send: (
    id: string,
    text: string,
    /** 竖流学习页：选中页面上几处再说的（10-29 #74；11-05 #92 起可多处）。 */
    quotes?: MessageQuote[],
  ) =>
    call<object>(`/sessions/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        text,
        ...(quotes !== undefined && quotes.length > 0 ? { quotes } : {}),
      }),
    }),
  // ── 设置：新开的学习用哪种学习页（10-29 #74）──
  mineruToken: () => call<MineruTokenBody>('/settings/mineru-token'),
  setMineruToken: (token: string) =>
    call<MineruTokenBody>('/settings/mineru-token', {
      method: 'PUT',
      body: JSON.stringify({ token }),
    }),
  // ── 依据可见 ──
  // ── 资料的来源说明 ──
  sourceNotes: () => call<SourceNotesResponse>('/sources/source-notes'),
  sourceNote: (material: string) =>
    call<SourceNoteResponse>(`/sources/source-notes?${qs({ material })}`),
  addSourceNote: (material: string, field: SourceNoteField, text: string) =>
    call<SourceNoteResponse>('/sources/source-notes', {
      method: 'POST',
      body: JSON.stringify({ material, field, text }),
    }),
  // ── 原文与出处 ──
  /** 各项目的资料；给了项目就标出哪些是这个项目的。 */
  materialList: (project?: string) =>
    call<MaterialListResponse>(`/sources/materials?${qs({ project })}`),
  toc: (material: string) => call<TocResponse>(`/sources/toc?${qs({ material })}`),
  section: (material: string, file: string) =>
    call<SectionResponse>(`/sources/section?${qs({ material, file })}`),
  /** 给了项目：默认只搜本项目资料；all = 查全部项目的。 */
  search: (q: string, material?: string, limit?: number, project?: string, all?: boolean) =>
    call<SourceSearchResponse>(
      `/sources/search?${qs({ q, material, limit, project, all: all === true ? 1 : undefined })}`,
    ),
  page: (material: string, page: number) =>
    call<PageResponse>(`/sources/page?${qs({ material, page })}`),
  locate: (material: string, file: string, from: number, to: number) =>
    call<LocateResponse>(`/sources/locate?${qs({ material, file, from, to })}`),
  citations: (text: string) =>
    call<ResolveCitationsResponse>('/sources/citations', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  reports: (material: string, file: string) =>
    call<SourceReportsResponse>(`/sources/reports?${qs({ material, file })}`),
  report: (req: SourceReportRequest) =>
    call<SourceReportResponse>('/sources/reports', { method: 'POST', body: JSON.stringify(req) }),
  // ── 资料范围：项目资料 ──
  materials: (projectId: string) =>
    call<ProjectMaterialsResponse>(`/projects/${projectId}/materials`),
  // ── 导入入口（工单 W9、W11）：上传、改判、改归属、重试、删、外部导入、项目说明 ──
  /** 上传一批文件（文件夹按相对路径传）；核心收下后分流，回这次每份分到了哪。 */
  upload: async (projectId: string, files: { file: File; path: string }[]) => {
    const form = new FormData();
    for (const f of files) form.append('files', f.file, f.file.name);
    form.append('paths', JSON.stringify(files.map((f) => f.path)));
    const res = await fetch(`/api/projects/${projectId}/uploads`, {
      method: 'POST',
      headers: { authorization: `Bearer ${TOKEN}` },
      body: form,
    });
    const body = (await res.json()) as UploadsResponse & { error?: string };
    if (!res.ok) throw new Error(body.error ?? `上传失败：${String(res.status)}`);
    return body;
  },
  reroute: (projectId: string, upload: string, file: string, to: '资料' | '学过的') =>
    call<UploadsResponse>(`/projects/${projectId}/uploads/reroute`, {
      method: 'POST',
      body: JSON.stringify({ upload, file, to }),
    }),
  /** 改一份资料归谁（W11 §2）：回本项目上传的现状。 */
  setMaterialOwner: (projectId: string, material: string, owner: 'learner' | 'project') =>
    call<UploadsResponse>(
      `/projects/${projectId}/materials/${encodeURIComponent(material)}/owner`,
      { method: 'POST', body: JSON.stringify({ owner }) },
    ),
  // ── 学过的记录 ──
  /** 订阅事件：整页共用一条事件连接（浏览器对同一地址的长连接数有限），最后一个退订时关掉。 */
  events(onEvent: (e: ServerEvent) => void): () => void {
    listeners.add(onEvent);
    if (source === undefined) {
      source = new EventSource(`/api/events?token=${encodeURIComponent(TOKEN)}`);
      source.onmessage = (m: MessageEvent<string>) => {
        const e = JSON.parse(m.data) as ServerEvent;
        for (const l of [...listeners]) l(e);
      };
    }
    return () => {
      listeners.delete(onEvent);
      if (listeners.size === 0) {
        source?.close();
        source = undefined;
      }
    };
  },
};
