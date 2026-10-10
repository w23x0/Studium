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
  send: (id: string, text: string) =>
    call<object>(`/sessions/${id}/messages`, { method: 'POST', body: JSON.stringify({ text }) }),
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
