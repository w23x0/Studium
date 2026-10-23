// 与核心通话：口令从地址栏 ?token= 取一次，存进 sessionStorage。
import type {
  CardResponse,
  DisclosureResponse,
  LoopEvidenceResponse,
  ObjectionResponse,
  ProjectOverviewResponse,
  RecordObjectionRequest,
  SessionModelResponse,
  StateResponse,
  StrategiesResponse,
  ListProjectsResponse,
  ListSessionsResponse,
  ProjectResponse,
  RecordsResponse,
  ServerEvent,
  BooksResponse,
  TocResponse,
  SectionResponse,
  LibrarySearchResponse,
  PageResponse,
  LocateResponse,
  ResolveCitationsResponse,
  SourceReportRequest,
  SourceReportResponse,
  SourceReportsResponse,
  MessageImageInput,
  TranscribeResponse,
  UploadAttachmentResponse,
  ProjectMaterialsResponse,
  ProjectMaterialsRequest,
  ProjectDeadlineResponse,
  NoteImportResponse,
  NotesResponse,
  LoopRelationsResponse,
  TeachingToolsResponse,
  TeachingToolResponse,
  ConfirmationResponse,
  AddReminderRequest,
  RouteDeviationsResponse,
  LearnedResponse,
  LearningResponse,
  ReminderView,
  RemindersResponse,
  ReviewResponse,
  ReviewsResponse,
  TodayView,
  AddExplanationResponse,
  SourceNoteField,
  SourceNoteResponse,
  SourceNotesResponse,
  StateTimelineResponse,
  TicketEditRequest,
  TicketEditResponse,
} from '../shared/protocol.ts';
import type {
  AddLiteratureRequest,
  CompareResponse,
  CreateOutputRequest,
  ListOutputsResponse,
  LiteratureResponse,
  OpenOutputTaskResponse,
  OutputResponse,
  SaveVersionRequest,
  VersionResponse,
} from '../shared/output.ts';
import type { SidebarActionRequest, SidebarResponse } from '../shared/sidebar.ts';
import { SHELVE_NO_NOTE } from './thread-model.ts';

function token(): string {
  const fromUrl = new URLSearchParams(location.search).get('token');
  if (fromUrl !== null) {
    sessionStorage.setItem('studium-token', fromUrl);
    history.replaceState(null, '', location.pathname);
    return fromUrl;
  }
  return sessionStorage.getItem('studium-token') ?? '';
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
  listSessions: () => call<ListSessionsResponse>('/sessions'),
  projects: () => call<ListProjectsResponse>('/projects'),
  createProject: () => call<ProjectResponse>('/projects', { method: 'POST', body: '{}' }),
  // ── 左栏：置顶、从列表删掉（只藏起来）、改名 ──
  sidebar: () => call<SidebarResponse>('/sidebar'),
  sidebarAct: (req: SidebarActionRequest) =>
    call<SidebarResponse>('/sidebar', { method: 'POST', body: JSON.stringify(req) }),
  requestClose: (id: string) =>
    call<object>(`/sessions/${id}/close-request`, { method: 'POST', body: '{}' }),
  confirmClose: (id: string) =>
    call<object>(`/sessions/${id}/confirm-close`, {
      method: 'POST',
      body: JSON.stringify({ note: '学习者在界面上确认结束' }),
    }),
  endUnclosed: (id: string) =>
    call<object>(`/sessions/${id}/end`, {
      method: 'POST',
      body: JSON.stringify({ note: '学习者在界面上点了“结束（没合上）”' }),
    }),
  // ── 学到一半：先放一放、恢复 ──
  shelve: (loopId: string, note?: string) =>
    call<object>(`/sessions/${loopId}/shelve`, {
      method: 'POST',
      body: JSON.stringify({
        note: note !== undefined && note.trim() !== '' ? note.trim() : SHELVE_NO_NOTE,
      }),
    }),
  resume: (loopId: string) =>
    call<object>(`/sessions/${loopId}/resume`, { method: 'POST', body: '{}' }),
  loopRelations: (mainId: string) =>
    call<LoopRelationsResponse>(`/projects/${mainId}/loop-relations`),
  records: (id: string) => call<RecordsResponse>(`/sessions/${id}/records`),
  /** 改这次学习的单子（记录/单子与路线.md「单子」：可见可改）。 */
  editTicket: (id: string, body: TicketEditRequest) =>
    call<TicketEditResponse>(`/sessions/${id}/ticket-edit`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  send: (id: string, text: string, images?: MessageImageInput[]) =>
    call<object>(`/sessions/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify(images !== undefined && images.length > 0 ? { text, images } : { text }),
    }),
  // ── 输入：图片原样上传、转写 ──
  uploadImage: async (blob: Blob, name?: string, derivedFrom?: string) => {
    const res = await fetch(`/api/attachments?${qs({ name, derivedFrom })}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${TOKEN}`, 'content-type': blob.type },
      body: blob,
    });
    const body = (await res.json()) as UploadAttachmentResponse & { error?: string };
    if (!res.ok) throw new Error(body.error ?? `上传失败：${String(res.status)}`);
    return body.attachment;
  },
  transcribe: (attachmentId: string) =>
    call<TranscribeResponse>(`/attachments/${attachmentId}/transcribe`, {
      method: 'POST',
      body: '{}',
    }),
  /** 原图地址（给 <img src>）。 */
  imageUrl: (attachmentId: string) => withToken(`/api/attachments/${attachmentId}`),
  // ── 依据可见 ──
  overview: (mainId: string) => call<ProjectOverviewResponse>(`/projects/${mainId}/overview`),
  loopEvidence: (loopId: string) => call<LoopEvidenceResponse>(`/loops/${loopId}/evidence`),
  card: (cardId: string) => call<CardResponse>(`/cards/${cardId}`),
  strategies: () => call<StrategiesResponse>('/pedagogy/records'),
  state: () => call<StateResponse>('/state/records'),
  // ── 批 10b：来源说明、状态回看 ──
  sourceNotes: () => call<SourceNotesResponse>('/library/source-notes'),
  sourceNote: (book: string) => call<SourceNoteResponse>(`/library/source-notes?${qs({ book })}`),
  addSourceNote: (book: string, field: SourceNoteField, text: string) =>
    call<SourceNoteResponse>('/library/source-notes', {
      method: 'POST',
      body: JSON.stringify({ book, field, text }),
    }),
  stateTimeline: () => call<StateTimelineResponse>('/state/timeline'),
  addExplanation: (recordId: string, text: string) =>
    call<AddExplanationResponse>(`/state/records/${encodeURIComponent(recordId)}/explanations`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  disclosure: () => call<DisclosureResponse>('/disclosure'),
  sessionModel: (id: string) => call<SessionModelResponse>(`/sessions/${id}/model`),
  objectToVerdict: (loopId: string, line: number, text: string) =>
    call<ObjectionResponse>(`/sessions/${loopId}/objections`, {
      method: 'POST',
      body: JSON.stringify({ line, text }),
    }),
  objectToRecord: (req: RecordObjectionRequest) =>
    call<ObjectionResponse>('/objections', { method: 'POST', body: JSON.stringify(req) }),
  // ── 教法（批 7）：教学工具、对状态的确认 / 否认 ──
  teachingTools: () => call<TeachingToolsResponse>('/teaching-tools'),
  teachingTool: (name: string) =>
    call<TeachingToolResponse>(`/teaching-tools/${encodeURIComponent(name)}`),
  confirmState: (recordId: string, verdict: 'confirm' | 'deny', note?: string) =>
    call<ConfirmationResponse>('/state/confirmations', {
      method: 'POST',
      body: JSON.stringify(
        note !== undefined && note.trim() !== ''
          ? { recordId, verdict, note: note.trim() }
          : { recordId, verdict },
      ),
    }),
  // ── 原文与出处 ──
  /** 书库里的书与笔记；给了项目就标出哪些是项目资料。 */
  books: (project?: string) => call<BooksResponse>(`/library/books?${qs({ project })}`),
  toc: (book: string) => call<TocResponse>(`/library/toc?${qs({ book })}`),
  section: (book: string, file: string) =>
    call<SectionResponse>(`/library/section?${qs({ book, file })}`),
  /** 给了项目：默认只搜项目资料；all = 查全部。 */
  search: (q: string, book?: string, limit?: number, project?: string, all?: boolean) =>
    call<LibrarySearchResponse>(
      `/library/search?${qs({ q, book, limit, project, all: all === true ? 1 : undefined })}`,
    ),
  page: (book: string, page: number) => call<PageResponse>(`/library/page?${qs({ book, page })}`),
  locate: (book: string, file: string, from: number, to: number) =>
    call<LocateResponse>(`/library/locate?${qs({ book, file, from, to })}`),
  citations: (text: string) =>
    call<ResolveCitationsResponse>('/library/citations', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  reports: (book: string, file: string) =>
    call<SourceReportsResponse>(`/library/reports?${qs({ book, file })}`),
  report: (req: SourceReportRequest) =>
    call<SourceReportResponse>('/library/reports', { method: 'POST', body: JSON.stringify(req) }),
  // ── 资料范围：项目资料、期限、个人笔记、外部导入 ──
  materials: (projectId: string) =>
    call<ProjectMaterialsResponse>(`/projects/${projectId}/materials`),
  changeMaterials: (projectId: string, req: ProjectMaterialsRequest) =>
    call<ProjectMaterialsResponse>(`/projects/${projectId}/materials`, {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  deadline: (projectId: string) => call<ProjectDeadlineResponse>(`/projects/${projectId}/deadline`),
  setDeadline: (projectId: string, deadline: string | null, note?: string) =>
    call<ProjectDeadlineResponse>(`/projects/${projectId}/deadline`, {
      method: 'POST',
      body: JSON.stringify(note !== undefined ? { deadline, note } : { deadline }),
    }),
  notes: () => call<NotesResponse>('/library/notes'),
  importNote: (path: string, title?: string) =>
    call<NoteImportResponse>('/library/notes/import', {
      method: 'POST',
      body: JSON.stringify(title !== undefined && title !== '' ? { path, title } : { path }),
    }),
  /** 笔记里引用的图片（给 <img src>）。 */
  noteAssetUrl: (book: string, ref: string) =>
    withToken(`/api/library/note-asset?${qs({ book, ref })}`),
  // ── 我的产出（批 8b） ──
  outputs: (projectId: string) => call<ListOutputsResponse>(`/projects/${projectId}/outputs`),
  output: (id: string) => call<OutputResponse>(`/outputs/${encodeURIComponent(id)}`),
  createOutput: (projectId: string, req: CreateOutputRequest) =>
    call<OutputResponse>(`/projects/${projectId}/outputs`, {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  saveVersion: (id: string, req: SaveVersionRequest) =>
    call<VersionResponse>(`/outputs/${encodeURIComponent(id)}/versions`, {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  version: (id: string, n: number) =>
    call<VersionResponse>(`/outputs/${encodeURIComponent(id)}/versions/${String(n)}`),
  compareVersions: (id: string, from: number, to: number) =>
    call<CompareResponse>(`/outputs/${encodeURIComponent(id)}/compare?${qs({ from, to })}`),
  addLiterature: (id: string, req: AddLiteratureRequest) =>
    call<LiteratureResponse>(`/outputs/${encodeURIComponent(id)}/literature`, {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  openOutputTask: (id: string, brief?: string) =>
    call<OpenOutputTaskResponse>(`/outputs/${encodeURIComponent(id)}/tasks`, {
      method: 'POST',
      body: JSON.stringify(
        brief !== undefined && brief.trim() !== '' ? { brief: brief.trim() } : {},
      ),
    }),
  // ── 长期功能（批 6） ──
  /** 学过的记录：按层读每次学习（上层单子 / 中层判定）与外部导入。 */
  learned: (project?: string) => call<LearnedResponse>(`/learned?${qs({ project })}`),
  learning: (loopId: string) => call<LearningResponse>(`/learned/${encodeURIComponent(loopId)}`),
  today: (projectId: string) => call<TodayView>(`/projects/${projectId}/today`),
  reminders: (projectId: string, open?: boolean) =>
    call<RemindersResponse>(
      `/projects/${projectId}/reminders?${qs({ open: open === true ? 1 : undefined })}`,
    ),
  addReminder: (projectId: string, req: AddReminderRequest) =>
    call<{ reminder: ReminderView }>(`/projects/${projectId}/reminders`, {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  closeReminder: (projectId: string, id: string, outcome: 'done' | 'dismissed') =>
    call<{ reminder: ReminderView }>(`/projects/${projectId}/reminders/${id}`, {
      method: 'POST',
      body: JSON.stringify({ outcome }),
    }),
  /** 路线偏差：从已有记录现算（没选推荐项、没合上就结束、中途改线）。 */
  deviations: (projectId: string) =>
    call<RouteDeviationsResponse>(`/projects/${projectId}/deviations`),
  /** 开一段阶段复盘；since（YYYY-MM-DD）不给 = 从上次复盘起。 */
  startReview: (projectId: string, since?: string) =>
    call<ReviewResponse>(`/projects/${projectId}/review`, {
      method: 'POST',
      body: JSON.stringify(since !== undefined && since !== '' ? { since } : {}),
    }),
  reviews: (projectId: string) => call<ReviewsResponse>(`/projects/${projectId}/reviews`),
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
