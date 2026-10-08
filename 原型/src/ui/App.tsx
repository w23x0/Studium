import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Thread } from '@/components/assistant-ui/thread';
import { Button } from '@/components/ui/button';
import { ChevronLeftIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
} from '@assistant-ui/react';
import type { ProjectSummary, SessionSummary } from '../shared/protocol.ts';
import type { ChoiceCard, NumberedRecord } from '../shared/records.ts';
import { api } from './api.ts';
import { OpenSessionContext, useOpenSession } from './open-session.ts';
import { loopState, pendingCard, talkEnded, toUiMessages, type UiMessage } from './thread-model.ts';

export function App() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectId, setProjectId] = useState<string | undefined>();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [current, setCurrent] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const fail = useCallback((e: unknown) => {
    setError(e instanceof Error ? e.message : String(e));
  }, []);

  const refresh = useCallback(async () => {
    const [{ projects }, { sessions }] = await Promise.all([api.projects(), api.listSessions()]);
    setProjects(projects);
    setSessions(sessions);
    setProjectId((p) => p ?? projects[0]?.mainSessionId);
    setCurrent((c) => c ?? projects[0]?.mainSessionId);
  }, []);

  useEffect(() => {
    refresh().catch(fail);
    // 新开的对话、新谈定的方向、项目改名时刷新
    return api.events((e) => {
      if (
        e.type === 'record' &&
        (e.record.type === 'session_opened' ||
          e.record.type === 'project_goal' ||
          e.record.type === 'project_title')
      )
        refresh().catch(fail);
    });
  }, [refresh, fail]);

  const project = projects.find((p) => p.mainSessionId === projectId);
  const tasks = sessions
    .filter((s) => (s.kind === 'loop' || s.kind === 'talk') && s.parent === projectId)
    .sort((a, b) => a.openedAt.localeCompare(b.openedAt));
  const currentSession = sessions.find((s) => s.sessionId === current);
  const titleOf = useCallback(
    (id: string) => sessions.find((s) => s.sessionId === id)?.title,
    [sessions],
  );
  const openProject = (id: string) => {
    setProjectId(id);
    setCurrent(id);
  };
  const open = useCallback(
    (id: string) => {
      // 新开的对话可能还不在列表里：先刷新再切过去
      refresh()
        .then(() => setCurrent(id))
        .catch(fail);
    },
    [refresh, fail],
  );

  return (
    <OpenSessionContext.Provider value={open}>
      <div className="flex h-screen">
        <aside className="bg-sidebar flex w-64 shrink-0 flex-col gap-1 border-r p-3 text-sm">
          <div className="px-2 pt-1 pb-3 font-serif text-xl tracking-tight">Studium</div>
          <button
            type="button"
            className="hover:bg-accent/60 flex items-center gap-2 rounded-lg px-2 py-1.5 text-left"
            onClick={() => {
              api
                .createProject()
                .then(async (r) => {
                  await refresh();
                  openProject(r.mainSessionId);
                })
                .catch(fail);
            }}
          >
            <span className="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-full text-xs">
              ＋
            </span>
            新项目
          </button>
          <div className="text-muted-foreground mt-4 px-2 pb-1 text-xs">项目</div>
          <ul data-testid="project-list" className="flex flex-col gap-0.5 overflow-y-auto">
            {projects.map((p) => (
              <li key={p.mainSessionId}>
                <SideItem
                  active={p.mainSessionId === projectId}
                  onClick={() => openProject(p.mainSessionId)}
                >
                  {p.title}
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
          {current !== undefined && projectId !== undefined && (
            <Conversation
              key={current}
              sessionId={current}
              kind={currentSession?.kind ?? (current === projectId ? 'main' : 'loop')}
              title={current === projectId ? (project?.title ?? '') : (currentSession?.title ?? '')}
              projectId={projectId}
              projectTitle={project?.title ?? ''}
              titleOf={titleOf}
              onError={fail}
              onBack={() => setCurrent(projectId)}
            />
          )}
        </main>
        <aside className="bg-sidebar hidden w-64 shrink-0 flex-col gap-1 border-s p-3 text-sm lg:flex">
          <div className="text-muted-foreground px-2 pt-1 pb-1 text-xs">想学的方向</div>
          <div className="px-2 pb-4 leading-relaxed">
            {project?.goal ?? '还没谈定。在项目里说说你想学什么。'}
          </div>
          <SideItem
            active={current === projectId}
            onClick={() => projectId && setCurrent(projectId)}
          >
            {project?.title ?? '项目'}
          </SideItem>
          <div className="text-muted-foreground mt-3 px-2 pb-1 text-xs">对话</div>
          <ul data-testid="session-list" className="flex flex-col gap-0.5 overflow-y-auto">
            {tasks.length === 0 && <li className="text-muted-foreground px-2 text-xs">还没有</li>}
            {tasks.map((s) => (
              <li key={s.sessionId}>
                <SideItem active={s.sessionId === current} onClick={() => setCurrent(s.sessionId)}>
                  {s.title}
                </SideItem>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </OpenSessionContext.Provider>
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
  kind: SessionSummary['kind'];
  title: string;
  projectId: string;
  projectTitle: string;
  titleOf: (id: string) => string | undefined;
  onError: (e: unknown) => void;
  onBack: () => void;
}) {
  const { sessionId, kind, onError, titleOf } = props;
  const isMain = kind === 'main';
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

  const messages = useMemo(
    () => toUiMessages(records, draft, { running, titleOf }),
    [records, draft, running, titleOf],
  );

  const runtime = useExternalStoreRuntime<UiMessage>({
    messages,
    // 不把“模型在答”告诉输入框：答到一半也能接着说（中途插话），“正在答”由最后一条占位显示
    isRunning: false,
    convertMessage: (m): ThreadMessageLike => ({
      id: m.id,
      role: m.role,
      content: m.text,
      ...(m.link ? { metadata: { custom: { link: m.link } } } : {}),
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

  const ended =
    kind === 'loop' ? loopState(records).kind === 'ended' : kind === 'talk' && talkEnded(records);
  const footer =
    kind === 'main' ? (
      <MainBar projectId={props.projectId} records={records} running={running} onError={onError} />
    ) : kind === 'talk' ? (
      ended ? (
        <EndedBar text="方向谈好了。" onBack={props.onBack} backLabel={props.projectTitle} />
      ) : undefined
    ) : (
      <LoopBar
        sessionId={sessionId}
        records={records}
        running={running}
        onError={onError}
        onBack={props.onBack}
        projectTitle={props.projectTitle}
      />
    );
  const header = (
    <header className="flex h-12 shrink-0 items-center gap-2 px-4 text-sm">
      {!isMain && (
        <>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1"
            onClick={props.onBack}
          >
            <ChevronLeftIcon className="size-4" />
            {props.projectTitle}
          </button>
          <span className="text-muted-foreground">/</span>
        </>
      )}
      <span className="truncate font-medium">{props.title}</span>
    </header>
  );

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread
        header={header}
        welcome={
          isMain
            ? '想学什么？说说你的打算，或点“下一步学什么”。'
            : kind === 'talk'
              ? '我们聊聊你想学什么。'
              : '马上开始…'
        }
        footer={footer}
        disabled={ended}
        placeholder={running ? '可以随时插话…' : '回复…'}
      />
    </AssistantRuntimeProvider>
  );
}

function EndedBar(props: { text: string; backLabel: string; onBack: () => void }) {
  return (
    <div className="text-muted-foreground flex items-center justify-center gap-3 text-sm">
      {props.text}
      <Button variant="outline" size="sm" onClick={props.onBack}>
        回到{props.backLabel || '项目'}
      </Button>
    </div>
  );
}

function MainBar(props: {
  projectId: string;
  records: NumberedRecord[];
  running: boolean;
  onError: (e: unknown) => void;
}) {
  const card = pendingCard(props.records);
  const [busy, setBusy] = useState(false);
  if (card) return <CardView card={card} onError={props.onError} />;
  return (
    <div className="flex justify-end">
      <Button
        variant="outline"
        size="sm"
        disabled={busy || props.running}
        onClick={() => {
          setBusy(true);
          api
            .requestCard(props.projectId)
            .catch(props.onError)
            .finally(() => setBusy(false));
        }}
      >
        {busy ? '正在想下一步…' : '下一步学什么'}
      </Button>
    </div>
  );
}

function CardView(props: { card: ChoiceCard; onError: (e: unknown) => void }) {
  const [busy, setBusy] = useState<number | undefined>();
  const open = useOpenSession();
  return (
    <div data-testid="choice-card" className="bg-card rounded-2xl border p-3 shadow-sm">
      <div className="text-muted-foreground mb-2 text-xs">接下来学哪个？挑一个开始</div>
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
                .then((r) => open(r.loopSessionId))
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
  onBack: () => void;
  projectTitle: string;
}) {
  const state = loopState(props.records);
  const act = (fn: () => Promise<unknown>) => {
    fn().catch(props.onError);
  };
  if (state.kind === 'ended') {
    return (
      <EndedBar
        text={state.closed ? '这部分学完了，下一步在项目里。' : '先学到这里，下一步在项目里。'}
        backLabel={props.projectTitle}
        onBack={props.onBack}
      />
    );
  }
  if (state.kind === 'awaiting_confirm') {
    return (
      <div className="bg-card flex items-center justify-between gap-3 rounded-2xl border p-3 text-sm">
        <span>看起来这部分你已经掌握了。就学到这里吗？</span>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => act(() => api.confirmClose(props.sessionId))}>
            学完了
          </Button>
        </div>
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
        {state.closeRequested ? '正在看你掌握得怎么样…' : '我觉得懂了'}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={props.running}
        onClick={() => act(() => api.endUnclosed(props.sessionId))}
      >
        先到这里
      </Button>
    </div>
  );
}
