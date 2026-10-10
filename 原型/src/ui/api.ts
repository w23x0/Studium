// 与核心通话：口令从地址栏 ?token= 取一次，存进 sessionStorage。
import type {
  CardResponse,
  ChooseResponse,
  Clause08Response,
  DisclosureResponse,
  FormationsResponse,
  LoopEvidenceResponse,
  ObjectionResponse,
  Point08Response,
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
} from '../shared/protocol.ts';

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

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
  });
  const body = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `请求失败：${String(res.status)}`);
  return body;
}

/** 查询串：值为空的参数不带。 */
function qs(params: Record<string, string | number | undefined>): string {
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
  requestCard: (projectId: string) =>
    call<object>('/cards/request', { method: 'POST', body: JSON.stringify({ projectId }) }),
  choose: (cardId: string, option: number) =>
    call<ChooseResponse>(`/cards/${cardId}/choose`, {
      method: 'POST',
      body: JSON.stringify({ option }),
    }),
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
  records: (id: string) => call<RecordsResponse>(`/sessions/${id}/records`),
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
  point: (id: string) => call<Point08Response>(`/m08/points/${encodeURIComponent(id)}`),
  clause: (id: string) => call<Clause08Response>(`/m08/clauses/${encodeURIComponent(id)}`),
  formations: () => call<FormationsResponse>('/m09/records'),
  strategies: () => call<StrategiesResponse>('/m10/records'),
  state: () => call<StateResponse>('/m15/state'),
  disclosure: () => call<DisclosureResponse>('/disclosure'),
  sessionModel: (id: string) => call<SessionModelResponse>(`/sessions/${id}/model`),
  objectToVerdict: (loopId: string, line: number, text: string) =>
    call<ObjectionResponse>(`/sessions/${loopId}/objections`, {
      method: 'POST',
      body: JSON.stringify({ line, text }),
    }),
  objectToRecord: (req: RecordObjectionRequest) =>
    call<ObjectionResponse>('/objections', { method: 'POST', body: JSON.stringify(req) }),
  // ── 原文与出处 ──
  books: () => call<BooksResponse>('/library/books'),
  toc: (book: string) => call<TocResponse>(`/library/toc?${qs({ book })}`),
  section: (book: string, file: string) =>
    call<SectionResponse>(`/library/section?${qs({ book, file })}`),
  search: (q: string, book?: string, limit?: number) =>
    call<LibrarySearchResponse>(`/library/search?${qs({ q, book, limit })}`),
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
