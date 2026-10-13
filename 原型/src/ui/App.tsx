import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Thread } from '@/components/assistant-ui/thread';
import { TooltipIconButton } from '@/components/assistant-ui/tooltip-icon-button';
import { Button } from '@/components/ui/button';
import {
  ChevronLeftIcon,
  LayoutGridIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
} from '@assistant-ui/react';
import type { ProjectSummary, SessionSummary } from '../shared/protocol.ts';
import type { NumberedRecord } from '../shared/records.ts';
import { api } from './api.ts';
import { crossOf } from './cross-model.ts';
import { ChoiceCardBox, revisitOf } from './components/choice-card.tsx';
import { OutputTaskBar } from './components/outputs/outputs-section.tsx';
import { EvidencePanel } from './components/evidence/panel.tsx';
import { ProjectHome } from './components/project-home.tsx';
import { Sidebar } from './components/sidebar/sidebar.tsx';
import { ProjectsPage } from './components/sidebar/projects-page.tsx';
import { useSidebarView } from './hooks/use-sidebar.ts';
import { useSetting } from './settings.ts';
import { buildSidebar, withTitles } from './sidebar-model.ts';
import {
  LongtermBanner,
  ReviewBanner,
  UnclosedEndBar,
} from './components/longterm/loop-extras.tsx';
import { useReviewIds } from './components/longterm/reviews.tsx';
import { StageCheckBanner, SummarizeButton } from './components/practice/loop-practice.tsx';
import { OpenSessionContext, useOpenSession } from './open-session.ts';
import {
  CurrentSessionContext,
  HighlightContext,
  isWideTarget,
  PanelContext,
  ProjectContext,
  type Focus,
  type PanelApi,
  type PanelTarget,
} from './panel.ts';
import {
  loopSide,
  loopState,
  pendingCard,
  reviewWindow,
  talkEnded,
  toUiMessages,
  type LoopSide,
  type UiMessage,
} from './thread-model.ts';
import { W } from './wording.ts';

/** 右侧面板：开着时显示栈顶，面板里点开的东西压栈、可返回。 */
interface PanelState {
  open: boolean;
  stack: PanelTarget[];
}

export function App() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectId, setProjectId] = useState<string | undefined>();
  const [rawSessions, setSessions] = useState<SessionSummary[]>([]);
  const [current, setCurrent] = useState<string | undefined>();
  /** 中间显示对话、项目概览（项目页），还是全部项目页。 */
  const [page, setPage] = useState<'chat' | 'overview' | 'projects'>('chat');
  const [panel, setPanel] = useState<PanelState>({ open: false, stack: [{ kind: 'home' }] });
  const [focus, setFocus] = useState<Focus | undefined>();
  const [error, setError] = useState<string | undefined>();
  const fail = useCallback((e: unknown) => {
    setError(e instanceof Error ? e.message : String(e));
  }, []);
  const sidebar = useSidebarView(fail);
  const [devMode] = useSetting('devMode');
  /** 对话改过的名字叠上去（左栏“重命名”）。 */
  const sessions = useMemo(
    () => withTitles(rawSessions, sidebar.view.titles),
    [rawSessions, sidebar.view.titles],
  );

  const refresh = useCallback(async () => {
    const [{ projects }, { sessions }] = await Promise.all([api.projects(), api.listSessions()]);
    setProjects(projects);
    setSessions(sessions);
    setProjectId((p) => p ?? projects[0]?.mainSessionId);
    setCurrent((c) => c ?? projects[0]?.mainSessionId);
    return sessions;
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

  // 当前项目被从列表删掉（藏起来）了：换到第一个还在的项目；一个都没有就去全部项目页
  useEffect(() => {
    if (!sidebar.loaded || projectId === undefined) return;
    if (!sidebar.view.hidden.some((h) => h.kind === 'project' && h.id === projectId)) return;
    const next = buildSidebar({ projects, sessions: rawSessions, view: sidebar.view }).projects[0];
    if (next !== undefined) {
      setProjectId(next.id);
      setCurrent(next.id);
    } else {
      setPage('projects');
    }
  }, [sidebar.loaded, sidebar.view, projectId, projects, rawSessions]);

  const project = projects.find((p) => p.mainSessionId === projectId);
  const reviewIds = useReviewIds(projectId);
  const isReview = useCallback((id: string) => reviewIds.has(id), [reviewIds]);
  const tasks = sessions
    .filter(
      (s) =>
        (s.kind === 'loop' || s.kind === 'talk' || s.kind === 'output') && s.parent === projectId,
    )
    .sort((a, b) => a.openedAt.localeCompare(b.openedAt));
  const currentSession = sessions.find((s) => s.sessionId === current);
  const titleOf = useCallback(
    (id: string) => sessions.find((s) => s.sessionId === id)?.title,
    [sessions],
  );
  const openProject = (id: string) => {
    setProjectId(id);
    setCurrent(id);
    setPage('chat');
  };
  /** 左栏点项目：进项目页。 */
  const openProjectHome = (id: string) => {
    setProjectId(id);
    setCurrent(id);
    setPage('overview');
  };
  const newProject = () => {
    api
      .createProject()
      .then(async (r) => {
        await refresh();
        openProject(r.mainSessionId);
      })
      .catch(fail);
  };
  const showSession = useCallback((id: string, list: SessionSummary[]) => {
    const s = list.find((x) => x.sessionId === id);
    // 别的项目里的对话：连项目一起切过去
    if (s?.kind === 'main') setProjectId(id);
    else if (s?.parent !== undefined) setProjectId(s.parent);
    setCurrent(id);
    setPage('chat');
  }, []);
  const open = useCallback(
    (id: string) => {
      // 新开的对话可能还不在列表里：先刷新再切过去
      refresh()
        .then((list) => showSession(id, list))
        .catch(fail);
    },
    [refresh, fail, showSession],
  );

  const currentRef = useRef({ current, page });
  currentRef.current = { current, page };
  const seq = useRef(0);
  const panelApi = useMemo<PanelApi>(
    () => ({
      show: (t) =>
        setPanel((p) => {
          if (!p.open) return { open: true, stack: [{ kind: 'home' }, t] };
          const top = p.stack.at(-1);
          if (JSON.stringify(top) === JSON.stringify(t)) return p;
          return { open: true, stack: [...p.stack.slice(-19), t] };
        }),
      replace: (t) =>
        setPanel((p) => ({
          open: true,
          stack:
            p.open && p.stack.length > 1 ? [...p.stack.slice(0, -1), t] : [{ kind: 'home' }, t],
        })),
      jump: (sessionId, lines, scroll = true) => {
        seq.current += 1;
        setFocus({ sessionId, lines, seq: seq.current, scroll });
        const now = currentRef.current;
        if (scroll && (now.current !== sessionId || now.page !== 'chat')) open(sessionId);
      },
    }),
    [open],
  );

  const loopId = currentSession?.kind === 'loop' && page === 'chat' ? current : undefined;
  const togglePanel = () =>
    setPanel((p) =>
      p.open
        ? { ...p, open: false }
        : {
            open: true,
            stack:
              loopId !== undefined
                ? [{ kind: 'home' }, { kind: 'loop', loopId }]
                : [{ kind: 'home' }],
          },
    );
  // 开发者模式关掉时不给打开面板的按钮（对话里的出处照样能在面板里打开）
  const panelButton = devMode && (
    <TooltipIconButton
      tooltip={panel.open ? W.panelClose : W.panelOpen}
      data-testid="panel-toggle"
      className="ms-auto size-8"
      onClick={togglePanel}
    >
      {panel.open ? <PanelRightCloseIcon /> : <PanelRightOpenIcon />}
    </TooltipIconButton>
  );

  return (
    <OpenSessionContext.Provider value={open}>
      <PanelContext.Provider value={panelApi}>
        <ProjectContext.Provider value={projectId}>
          <div className="flex h-screen">
            <Sidebar
              projects={projects}
              sessions={rawSessions}
              view={sidebar.view}
              active={{ page, projectId, current }}
              onAct={(req) => void sidebar.act(req)}
              onOpenProject={openProjectHome}
              onOpenChat={open}
              onOpenProjects={() => setPage('projects')}
              onNewProject={newProject}
            />
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
              {page === 'projects' && (
                <ProjectsPage
                  projects={projects}
                  sessions={rawSessions}
                  view={sidebar.view}
                  header={
                    <header className="flex h-12 shrink-0 items-center gap-2 px-4 text-sm">
                      {panelButton}
                    </header>
                  }
                  onAct={(req) => void sidebar.act(req)}
                  onOpenProject={openProjectHome}
                  onNewProject={newProject}
                />
              )}
              {projectId !== undefined && page === 'overview' && (
                <ProjectHome
                  key={projectId}
                  projectId={projectId}
                  tasks={tasks}
                  header={
                    <header className="flex h-12 shrink-0 items-center gap-2 px-4 text-sm">
                      <span className="truncate font-medium">{W.projectHome}</span>
                      {panelButton}
                    </header>
                  }
                  onOpenChat={() => {
                    setCurrent(projectId);
                    setPage('chat');
                  }}
                  onError={fail}
                />
              )}
              {current !== undefined && projectId !== undefined && page === 'chat' && (
                <Conversation
                  key={current}
                  sessionId={current}
                  kind={currentSession?.kind ?? (current === projectId ? 'main' : 'loop')}
                  title={
                    current === projectId ? (project?.title ?? '') : (currentSession?.title ?? '')
                  }
                  projectId={projectId}
                  projectTitle={project?.title ?? ''}
                  titleOf={titleOf}
                  isReview={isReview}
                  focus={focus?.sessionId === current ? focus : undefined}
                  headerExtra={panelButton}
                  onOverview={() => setPage('overview')}
                  onError={fail}
                  onBack={() => setCurrent(projectId)}
                  onProject={() => setPage('overview')}
                />
              )}
            </main>
            {panel.open && (
              <aside
                className={cn(
                  'bg-sidebar/60 flex shrink-0 flex-col border-s',
                  // 看书（原文、原件页面）时面板放宽，看与改产出物时更宽，像 Claude 的 artifact 面板
                  panel.stack.at(-1)?.kind === 'output'
                    ? 'w-[min(56rem,56vw)]'
                    : isWideTarget(panel.stack.at(-1) ?? { kind: 'home' })
                      ? 'w-[min(44rem,50vw)]'
                      : 'w-[min(28rem,40vw)]',
                )}
              >
                <EvidencePanel
                  target={panel.stack.at(-1) ?? { kind: 'home' }}
                  canBack={panel.stack.length > 1}
                  onBack={() => setPanel((p) => ({ ...p, stack: p.stack.slice(0, -1) }))}
                  onClose={() => setPanel((p) => ({ ...p, open: false }))}
                  loopId={loopId}
                />
              </aside>
            )}
          </div>
        </ProjectContext.Provider>
      </PanelContext.Provider>
    </OpenSessionContext.Provider>
  );
}

function Conversation(props: {
  sessionId: string;
  kind: SessionSummary['kind'];
  title: string;
  projectId: string;
  projectTitle: string;
  titleOf: (id: string) => string | undefined;
  isReview: (id: string) => boolean;
  focus: Focus | undefined;
  headerExtra: ReactNode;
  onOverview: () => void;
  onError: (e: unknown) => void;
  onBack: () => void;
  /** 顶部的项目名：回项目页。 */
  onProject: () => void;
}) {
  const { sessionId, kind, onError, titleOf, isReview, focus } = props;
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
    () => toUiMessages(records, draft, { running, titleOf, isReview }),
    [records, draft, running, titleOf, isReview],
  );

  // 从依据面板跳过来：滚到被引用的那句（记录还没读回来时等读回来再滚）
  const scrolled = useRef(0);
  useEffect(() => {
    if (focus?.scroll !== true || scrolled.current === focus.seq) return;
    const first = focus.lines[0];
    if (first === undefined) return;
    const el = document.querySelector(`[data-lines~="${String(first)}"]`);
    if (!el) return;
    scrolled.current = focus.seq;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [focus, messages.length]);

  const runtime = useExternalStoreRuntime<UiMessage>({
    messages,
    // 不把“模型在答”告诉输入框：答到一半也能接着说（中途插话），“正在答”由最后一条占位显示
    isRunning: false,
    convertMessage: (m): ThreadMessageLike => ({
      id: m.id,
      role: m.role,
      content: m.text,
      metadata: {
        custom: {
          line: m.line,
          ...(m.lines ? { lines: m.lines } : {}),
          ...(m.link ? { link: m.link } : {}),
          ...(m.verdict ? { verdict: m.verdict } : {}),
          ...(m.objection ? { objection: m.objection } : {}),
          ...(m.images ? { images: m.images } : {}),
          ...(m.detour ? { detour: m.detour } : {}),
          ...(m.practice ? { practice: m.practice } : {}),
        },
      },
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

  const side = useMemo(() => (kind === 'loop' ? loopSide(records) : undefined), [kind, records]);
  const review = kind === 'talk' ? reviewWindow(records) : undefined;
  const ended =
    kind === 'loop' ? loopState(records).kind === 'ended' : kind === 'talk' && talkEnded(records);
  const footer =
    kind === 'main' ? (
      <MainBar projectId={props.projectId} records={records} running={running} onError={onError} />
    ) : kind === 'output' ? (
      <OutputTaskBar sessionId={sessionId} projectId={props.projectId} />
    ) : kind === 'talk' ? (
      ended ? (
        <EndedBar
          text={review !== undefined ? W.reviewEnded : '方向谈好了。'}
          onBack={props.onBack}
          backLabel={props.projectTitle}
        />
      ) : undefined
    ) : (
      <LoopBar
        sessionId={sessionId}
        records={records}
        side={side ?? NO_SIDE}
        titleOf={titleOf}
        running={running}
        onError={onError}
        onBack={props.onBack}
        projectId={props.projectId}
        projectTitle={props.projectTitle}
      />
    );
  const header = (
    <div className="shrink-0">
      <header className="flex h-12 shrink-0 items-center gap-2 px-4 text-sm">
        {!isMain && (
          <>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1"
              data-testid="crumb-project"
              onClick={props.onProject}
            >
              <ChevronLeftIcon className="size-4" />
              {props.projectTitle}
            </button>
            <span className="text-muted-foreground">/</span>
          </>
        )}
        <span className="truncate font-medium">{props.title}</span>
        {isMain && (
          <Button
            variant="ghost"
            size="xs"
            className="text-muted-foreground"
            onClick={props.onOverview}
          >
            <LayoutGridIcon />
            {W.projectHome}
          </Button>
        )}
        {props.headerExtra}
      </header>
      {side !== undefined && (
        <LoopBanner side={side} titleOf={titleOf} loopId={sessionId} projectId={props.projectId} />
      )}
      {review !== undefined && <ReviewBanner window={review} />}
    </div>
  );

  return (
    <CurrentSessionContext.Provider value={sessionId}>
      <HighlightContext.Provider value={focus?.lines ?? NO_LINES}>
        <AssistantRuntimeProvider runtime={runtime}>
          <Thread
            header={header}
            welcome={
              isMain
                ? '想学什么？说说你的打算，或点“下一步学什么”。'
                : kind === 'talk'
                  ? review !== undefined
                    ? W.reviewWelcome
                    : '我们聊聊你想学什么。'
                  : kind === 'output'
                    ? W.outputChatWelcome
                    : '马上开始…'
            }
            footer={footer}
            disabled={ended}
            placeholder={
              side?.shelved !== undefined
                ? W.shelvedPlaceholder
                : running
                  ? '可以随时插话…'
                  : '回复…'
            }
            onSend={async (text, images) => {
              await api.send(sessionId, text, images);
            }}
          />
        </AssistantRuntimeProvider>
      </HighlightContext.Provider>
    </CurrentSessionContext.Provider>
  );
}

const NO_LINES: readonly number[] = [];
const NO_SIDE: LoopSide = { openDetour: false };

/**
 * 学习对话顶部的一行：这段是从哪段岔出来补什么的（可点回去）；或这段正在等岔出去的那段学完回来（可跳过去）。
 */
function LoopBanner(props: {
  side: LoopSide;
  titleOf: (id: string) => string | undefined;
  loopId: string;
  projectId: string;
}) {
  const { side, titleOf } = props;
  const open = useOpenSession();
  return (
    <div className="flex flex-col gap-1 px-4 pb-2 text-sm empty:hidden">
      <LongtermBanner
        side={side}
        loopId={props.loopId}
        projectId={props.projectId}
        titleOf={titleOf}
      />
      {side.stageCheck === true && <StageCheckBanner />}
      {side.fork !== undefined && (
        <div
          data-testid="fork-origin"
          className="text-muted-foreground bg-muted/50 flex flex-wrap items-center gap-1 rounded-lg px-3 py-1.5"
        >
          {W.forkFrom}
          <button
            type="button"
            className="text-foreground decoration-primary/40 hover:decoration-primary underline underline-offset-4"
            onClick={() => side.fork && open(side.fork.fromLoop)}
          >
            《{titleOf(side.fork.fromLoop) ?? W.thatPart}》
          </button>
          {W.forkBanner[side.fork.kind](side.fork.what)}
        </div>
      )}
      {side.waiting !== undefined && (
        <div
          data-testid="waiting-fork"
          className="bg-primary/5 border-primary/30 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-1.5"
        >
          {W.waitingBanner[side.waiting.kind](
            side.waiting.what !== ''
              ? side.waiting.what
              : (titleOf(side.waiting.forkLoopSessionId) ?? W.thatPart),
          )}
          <Button
            variant="outline"
            size="xs"
            className="ms-auto"
            onClick={() => side.waiting && open(side.waiting.forkLoopSessionId)}
          >
            {W.goThere}
          </Button>
        </div>
      )}
    </div>
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
  if (card)
    return (
      <ChoiceCardBox
        cardId={card.cardId}
        recommended={card.recommended}
        options={card.options.map((o) => ({
          title: o.title,
          reason: o.reason,
          revisit: revisitOf(o),
          cross: crossOf(o),
          stageCheck: o.ticket.stageCheck === true,
        }))}
        onError={props.onError}
      />
    );
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
        {busy ? '正在想下一步…' : W.nextStep}
      </Button>
    </div>
  );
}

function LoopBar(props: {
  sessionId: string;
  records: NumberedRecord[];
  side: LoopSide;
  titleOf: (id: string) => string | undefined;
  running: boolean;
  onError: (e: unknown) => void;
  onBack: () => void;
  projectId: string;
  projectTitle: string;
}) {
  const { side } = props;
  const state = loopState(props.records);
  const open = useOpenSession();
  const [shelving, setShelving] = useState(false);
  const act = (fn: () => Promise<unknown>) => {
    fn().catch(props.onError);
  };
  if (state.kind === 'ended') {
    // 岔出来的那段学完（或停下）：回到原来那段
    if (side.fork !== undefined) {
      const from = side.fork.fromLoop;
      return (
        <EndedBar
          text={W.forkEnded(state.closed)}
          backLabel={`《${props.titleOf(from) ?? W.thatPart}》`}
          onBack={() => open(from)}
        />
      );
    }
    if (!state.closed) {
      return (
        <UnclosedEndBar
          loopId={props.sessionId}
          projectId={props.projectId}
          projectTitle={props.projectTitle}
          onBack={props.onBack}
          onError={props.onError}
        />
      );
    }
    return (
      <EndedBar
        text="这部分学完了，下一步在项目里。"
        backLabel={props.projectTitle}
        onBack={props.onBack}
      />
    );
  }
  if (side.shelved !== undefined) {
    return (
      <div
        data-testid="shelved-bar"
        className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 text-sm"
      >
        <span>
          {W.shelvedBar}
          {side.shelved.note !== undefined && (
            <span className="text-muted-foreground ms-2">
              {W.shelvedNote}：{side.shelved.note}
            </span>
          )}
        </span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={props.running}
            onClick={() => act(() => api.endUnclosed(props.sessionId))}
          >
            {W.endInstead}
          </Button>
          <Button
            size="sm"
            disabled={props.running}
            onClick={() => act(() => api.resume(props.sessionId))}
          >
            {W.resume}
          </Button>
        </div>
      </div>
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
  if (shelving) {
    return (
      <ShelveForm
        onCancel={() => setShelving(false)}
        onShelve={(note) =>
          api.shelve(props.sessionId, note).then(
            () => setShelving(false),
            (e: unknown) => {
              props.onError(e);
            },
          )
        }
      />
    );
  }
  return (
    <div className="flex justify-end gap-2">
      <SummarizeButton loopId={props.sessionId} disabled={props.running} />
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
        data-testid="shelve"
        disabled={props.running || state.closeRequested}
        onClick={() => setShelving(true)}
      >
        {W.shelve}
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

/** “先放一放”：可写一句为什么，再放下。 */
function ShelveForm(props: { onCancel: () => void; onShelve: (note: string) => Promise<void> }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="bg-card flex flex-col gap-2 rounded-2xl border p-3 text-sm">
      <div className="text-muted-foreground text-xs">{W.shelveHint}</div>
      <input
        className="bg-background focus:border-foreground/30 w-full rounded-lg border px-3 py-1.5 outline-none"
        placeholder={W.shelvePlaceholder}
        aria-label={W.shelvePlaceholder}
        value={note}
        autoFocus
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={props.onCancel}>
          {W.shelveCancel}
        </Button>
        <Button
          size="sm"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void props.onShelve(note).finally(() => setBusy(false));
          }}
        >
          {W.shelveGo}
        </Button>
      </div>
    </div>
  );
}
