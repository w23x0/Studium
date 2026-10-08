import { useCallback, useEffect, useMemo, useState } from 'react';
import { Thread } from '@/components/assistant-ui/thread';
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
} from '@assistant-ui/react';
import type { SessionSummary } from '../shared/protocol.ts';
import type { NumberedRecord } from '../shared/records.ts';
import { api } from './api.ts';
import { toUiMessages, type UiMessage } from './thread-model.ts';

export function App() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [current, setCurrent] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const refresh = useCallback(async () => {
    const { sessions } = await api.listSessions();
    setSessions(sessions);
    setCurrent((c) => c ?? sessions[0]?.sessionId);
  }, []);

  useEffect(() => {
    refresh().catch((e: unknown) => {
      setError(String(e));
    });
  }, [refresh]);

  const create = async () => {
    const { session } = await api.createSession();
    setSessions((s) => [session, ...s]);
    setCurrent(session.sessionId);
  };

  return (
    <div className="flex h-screen">
      <aside className="bg-sidebar w-64 shrink-0 border-r p-3">
        <button
          className="bg-primary text-primary-foreground mb-3 w-full rounded-lg px-3 py-2 text-sm"
          onClick={() => {
            create().catch((e: unknown) => {
              setError(String(e));
            });
          }}
        >
          新对话
        </button>
        <ul data-testid="session-list">
          {sessions.map((s) => (
            <li key={s.sessionId}>
              <button
                className={`w-full truncate rounded-md px-2 py-1 text-left text-sm ${
                  s.sessionId === current ? 'bg-accent' : 'hover:bg-accent/60'
                }`}
                onClick={() => {
                  setCurrent(s.sessionId);
                }}
              >
                {s.title} · {new Date(s.openedAt).toLocaleString()}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col">
        {error !== undefined && (
          <div role="alert" className="bg-red-100 px-4 py-2 text-sm text-red-800">
            {error}
          </div>
        )}
        {current === undefined ? (
          <div className="text-muted-foreground m-auto">点“新对话”开始</div>
        ) : (
          <Conversation key={current} sessionId={current} onError={setError} />
        )}
      </main>
    </div>
  );
}

function Conversation({ sessionId, onError }: { sessionId: string; onError: (e: string) => void }) {
  const [records, setRecords] = useState<NumberedRecord[]>([]);
  const [draft, setDraft] = useState('');
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let alive = true;
    const stop = api.events((e) => {
      if (e.sessionId !== sessionId) return;
      if (e.type === 'delta') setDraft((d) => d + e.text);
      if (e.type === 'running') {
        setRunning(e.running);
        if (!e.running) setDraft('');
      }
      if (e.type === 'record') {
        if (e.record.type === 'assistant_message') setDraft('');
        setRecords((rs) =>
          rs.some((r) => r.line === e.line) ? rs : [...rs, { line: e.line, record: e.record }],
        );
      }
    });
    api
      .records(sessionId)
      .then((r) => {
        if (!alive) return;
        // 与 SSE 先到的记录合并，按行号去重
        setRecords((rs) => {
          const byLine = new Map(r.records.map((x) => [x.line, x]));
          for (const x of rs) byLine.set(x.line, x);
          return [...byLine.values()].sort((a, b) => a.line - b.line);
        });
        setRunning(r.running);
      })
      .catch((e: unknown) => {
        onError(String(e));
      });
    return () => {
      alive = false;
      stop();
    };
  }, [sessionId, onError]);

  const messages = useMemo(() => toUiMessages(records, draft), [records, draft]);

  const runtime = useExternalStoreRuntime<UiMessage>({
    messages,
    isRunning: running,
    convertMessage: (m): ThreadMessageLike => ({
      id: m.id,
      role: m.role,
      content: m.text,
      ...(m.role === 'assistant'
        ? {
            status:
              m.id === 'draft'
                ? { type: 'running' as const }
                : m.failed === true
                  ? { type: 'incomplete' as const, reason: 'error' as const }
                  : { type: 'complete' as const, reason: 'stop' as const },
          }
        : {}),
    }),
    onNew: async (m: AppendMessage) => {
      const text = m.content.flatMap((p) => (p.type === 'text' ? [p.text] : [])).join('');
      await api.send(sessionId, text);
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
