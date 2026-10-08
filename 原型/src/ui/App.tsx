import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Thread } from '@/components/assistant-ui/thread';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
} from '@assistant-ui/react';
import type { SessionSummary } from '../shared/protocol.ts';
import type { ChoiceCard, NumberedRecord } from '../shared/records.ts';
import { api } from './api.ts';
import { loopState, pendingCard, toUiMessages, type UiMessage } from './thread-model.ts';

export function App() {
  const [mainId, setMainId] = useState<string | undefined>();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [current, setCurrent] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const fail = useCallback((e: unknown) => {
    setError(e instanceof Error ? e.message : String(e));
  }, []);

  const refresh = useCallback(async () => {
    const [{ mainSessionId }, { sessions }] = await Promise.all([
      api.project(),
      api.listSessions(),
    ]);
    setMainId(mainSessionId);
    setSessions(sessions);
    setCurrent((c) => c ?? mainSessionId);
  }, []);

  useEffect(() => {
    refresh().catch(fail);
    // 新开的会话（闭环对话等）出现时刷新列表
    return api.events((e) => {
      if (e.type === 'record' && e.record.type === 'session_opened') refresh().catch(fail);
    });
  }, [refresh, fail]);

  const loops = sessions.filter((s) => s.kind === 'loop');

  return (
    <div className="flex h-screen">
      <aside className="bg-sidebar flex w-64 shrink-0 flex-col gap-1 border-r p-3 text-sm">
        <div className="text-muted-foreground px-2 pb-2 font-serif text-lg">Studium</div>
        {mainId !== undefined && (
          <SideItem active={current === mainId} onClick={() => setCurrent(mainId)}>
            主对话
          </SideItem>
        )}
        <div className="text-muted-foreground mt-4 px-2 pb-1 text-xs">闭环</div>
        <ul data-testid="session-list" className="flex flex-col gap-0.5">
          {loops.length === 0 && <li className="text-muted-foreground px-2 text-xs">还没有</li>}
          {loops.map((s) => (
            <li key={s.sessionId}>
              <SideItem active={s.sessionId === current} onClick={() => setCurrent(s.sessionId)}>
                {s.title}
              </SideItem>
            </li>
          ))}
        </ul>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col">
        {error !== undefined && (
          <div
            role="alert"
            className="flex justify-between bg-red-100 px-4 py-2 text-sm text-red-800"
          >
            {error}
            <button onClick={() => setError(undefined)}>关闭</button>
          </div>
        )}
        {current !== undefined && (
          <Conversation
            key={current}
            sessionId={current}
            isMain={current === mainId}
            onError={fail}
            onOpenLoop={(id) => {
              refresh()
                .then(() => setCurrent(id))
                .catch(fail);
            }}
          />
        )}
      </main>
    </div>
  );
}

function SideItem(props: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      className={cn(
        'w-full truncate rounded-md px-2 py-1.5 text-left',
        props.active ? 'bg-accent' : 'hover:bg-accent/60',
      )}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

function Conversation(props: {
  sessionId: string;
  isMain: boolean;
  onError: (e: unknown) => void;
  onOpenLoop: (id: string) => void;
}) {
  const { sessionId, isMain, onError } = props;
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
      .catch(onError);
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

  const state = isMain ? undefined : loopState(records);
  const footer = isMain ? (
    <MainBar records={records} running={running} onError={onError} onOpenLoop={props.onOpenLoop} />
  ) : (
    <LoopBar sessionId={sessionId} records={records} running={running} onError={onError} />
  );

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread
        welcome={isMain ? '想学什么？说说你的方向，或点“下一步”。' : '闭环开始中…'}
        footer={footer}
        disabled={state?.kind === 'ended'}
      />
    </AssistantRuntimeProvider>
  );
}

function MainBar(props: {
  records: NumberedRecord[];
  running: boolean;
  onError: (e: unknown) => void;
  onOpenLoop: (id: string) => void;
}) {
  const card = pendingCard(props.records);
  const [busy, setBusy] = useState(false);
  if (card) return <CardView card={card} onError={props.onError} onOpenLoop={props.onOpenLoop} />;
  return (
    <div className="flex justify-end">
      <Button
        variant="outline"
        size="sm"
        disabled={busy || props.running}
        onClick={() => {
          setBusy(true);
          api
            .requestCard()
            .catch(props.onError)
            .finally(() => setBusy(false));
        }}
      >
        {busy ? '正在出选择卡…' : '下一步（出选择卡）'}
      </Button>
    </div>
  );
}

function CardView(props: {
  card: ChoiceCard;
  onError: (e: unknown) => void;
  onOpenLoop: (id: string) => void;
}) {
  const [busy, setBusy] = useState<number | undefined>();
  return (
    <div data-testid="choice-card" className="bg-card rounded-2xl border p-3 shadow-sm">
      <div className="text-muted-foreground mb-2 text-xs">选择卡 · 选一个开始下一个闭环</div>
      <div className="flex flex-col gap-2">
        {props.card.options.map((o, i) => (
          <button
            key={i}
            disabled={busy !== undefined}
            className={cn(
              'hover:bg-accent/60 rounded-xl border px-3 py-2 text-left disabled:opacity-60',
              i === props.card.recommended && 'border-primary',
            )}
            onClick={() => {
              setBusy(i);
              api
                .choose(props.card.cardId, i)
                .then((r) => props.onOpenLoop(r.loopSessionId))
                .catch(props.onError)
                .finally(() => setBusy(undefined));
            }}
          >
            <div className="font-medium">
              {o.title}
              {i === props.card.recommended && (
                <span className="text-primary ms-2 text-xs">推荐</span>
              )}
              {busy === i && <span className="text-muted-foreground ms-2 text-xs">正在开…</span>}
            </div>
            <div className="text-muted-foreground text-sm">{o.reason}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function LoopBar(props: {
  sessionId: string;
  records: NumberedRecord[];
  running: boolean;
  onError: (e: unknown) => void;
}) {
  const state = loopState(props.records);
  const act = (fn: () => Promise<unknown>) => {
    fn().catch(props.onError);
  };
  if (state.kind === 'ended') {
    return (
      <div className="text-muted-foreground text-center text-sm">
        {state.closed ? '这个闭环已合上。' : '这个闭环没合上就结束了。'}下一张选择卡在主对话里。
      </div>
    );
  }
  if (state.kind === 'awaiting_confirm') {
    return (
      <div className="bg-card flex items-center justify-between gap-3 rounded-2xl border p-3 text-sm">
        <span>守卫判定这个闭环合上了。确认结束吗？</span>
        <Button size="sm" onClick={() => act(() => api.confirmClose(props.sessionId))}>
          确认结束
        </Button>
      </div>
    );
  }
  return (
    <div className="flex justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={props.running || state.closeRequested}
        onClick={() => act(() => api.requestClose(props.sessionId))}
      >
        {state.closeRequested ? '守卫判定中…' : '我觉得懂了（申请收口）'}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={props.running}
        onClick={() => act(() => api.endUnclosed(props.sessionId))}
      >
        结束（没合上）
      </Button>
    </div>
  );
}
