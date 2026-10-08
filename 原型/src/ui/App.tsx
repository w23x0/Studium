import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
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
      <aside className="w-64 shrink-0 border-r border-black/10 bg-[var(--panel)] p-3">
        <button
          className="mb-3 w-full rounded-lg bg-[var(--accent)] px-3 py-2 text-white"
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
                  s.sessionId === current ? 'bg-black/10' : 'hover:bg-black/5'
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
          <div className="m-auto text-[var(--muted)]">点“新对话”开始</div>
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
    convertMessage: (m): ThreadMessageLike => ({ id: m.id, role: m.role, content: m.text }),
    onNew: async (m: AppendMessage) => {
      const text = m.content.flatMap((p) => (p.type === 'text' ? [p.text] : [])).join('');
      await api.send(sessionId, text);
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root className="flex h-full flex-col">
        <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            <ThreadPrimitive.Messages>
              {({ message }) =>
                message.role === 'user' ? (
                  <MessagePrimitive.Root
                    data-testid="user-message"
                    className="ml-auto max-w-[80%] whitespace-pre-wrap rounded-2xl bg-[var(--panel)] px-4 py-2"
                  >
                    <MessagePrimitive.Parts />
                  </MessagePrimitive.Root>
                ) : (
                  <MessagePrimitive.Root
                    data-testid="assistant-message"
                    className="whitespace-pre-wrap leading-7"
                  >
                    <MessagePrimitive.Parts />
                  </MessagePrimitive.Root>
                )
              }
            </ThreadPrimitive.Messages>
          </div>
        </ThreadPrimitive.Viewport>
        <ComposerPrimitive.Root className="mx-auto mb-4 flex w-full max-w-3xl gap-2 rounded-2xl border border-black/15 bg-white p-2">
          <ComposerPrimitive.Input
            aria-label="输入"
            placeholder="说点什么…"
            className="flex-1 resize-none bg-transparent px-2 py-1 outline-none"
          />
          <ComposerPrimitive.Send className="rounded-lg bg-[var(--accent)] px-3 py-1 text-white disabled:opacity-40">
            发送
          </ComposerPrimitive.Send>
        </ComposerPrimitive.Root>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}
