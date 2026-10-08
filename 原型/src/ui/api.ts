// 与核心通话：口令从地址栏 ?token= 取一次，存进 sessionStorage。
import type {
  ChooseResponse,
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

export const api = {
  listSessions: () => call<ListSessionsResponse>('/sessions'),
  project: () => call<ProjectResponse>('/project'),
  requestCard: () => call<object>('/cards/request', { method: 'POST', body: '{}' }),
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
  events(onEvent: (e: ServerEvent) => void): () => void {
    const es = new EventSource(`/api/events?token=${encodeURIComponent(TOKEN)}`);
    es.onmessage = (m: MessageEvent<string>) => {
      onEvent(JSON.parse(m.data) as ServerEvent);
    };
    return () => {
      es.close();
    };
  },
};
