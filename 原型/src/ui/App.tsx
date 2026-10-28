// 外壳：左栏 · 中间一页（全部项目 / 新建项目 / 项目页 / 某个对话）· 右边：讨论串（在项目的对话里）或依据面板。
// 现在在哪写进地址（#/…），刷新、后退回原处；窄屏时左栏变抽屉、面板盖满全屏（界面说明 §1.1、§1.5）。
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TooltipIconButton } from '@/components/assistant-ui/tooltip-icon-button';
import { ListTreeIcon, PanelRightCloseIcon, PanelRightOpenIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectSummary, SessionSummary } from '../shared/protocol.ts';
import { api } from './api.ts';
import { Conversation } from './components/conversation.tsx';
import { EvidencePanel } from './components/evidence/panel.tsx';
import { LearnPage } from './components/learn/learn-page.tsx';
import { PageTrials } from './components/learn/trials.tsx';
import { ProjectHome } from './components/project-home.tsx';
import { NewProject } from './components/sidebar/new-project.tsx';
import { Sidebar } from './components/sidebar/sidebar.tsx';
import { ProjectsPage } from './components/sidebar/projects-page.tsx';
import { ThreadsPanel } from './components/threads-panel.tsx';
import { TopBar } from './components/top-bar.tsx';
import { useSidebarView } from './hooks/use-sidebar.ts';
import { LayoutContext, useNarrow } from './layout.ts';
import { useSetting } from './settings.ts';
import { buildSidebar, withTitles } from './sidebar-model.ts';
import { useReviewIds } from './components/longterm/reviews.tsx';
import { OpenSessionContext } from './open-session.ts';
import {
  isWideTarget,
  PanelContext,
  ProjectContext,
  type Focus,
  type PanelApi,
  type PanelTarget,
} from './panel.ts';
import { formatRoute, parseRoute, sameRoute, type Route } from './route.ts';
import { W } from './wording.ts';

/** 这些记录到了要重读会话列表：新开对话、方向与项目名，以及会改讨论串分组的（见派生层 markOf）。 */
const REFRESH_ON = new Set<string>([
  'session_opened',
  'project_goal',
  'project_title',
  'guard_verdict',
  'loop_ended',
  'loop_shelved',
  'loop_resumed',
  'close_requested',
  'talk_ended',
  'thread_closed',
  'thread_reopened',
  'thread_title',
  'find_candidates',
  'candidates_picked',
  'choice_card',
]);

/** 右侧面板：开着时显示栈顶，面板里点开的东西压栈、可返回。 */
interface PanelState {
  open: boolean;
  stack: PanelTarget[];
}

export function App() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [rawSessions, setSessions] = useState<SessionSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  /** 中间显示什么；地址里有就照地址（刷新回原处），没有等项目读回来再定。 */
  const [route, setRoute] = useState<Route | undefined>(() => parseRoute(window.location.hash));
  const [panel, setPanel] = useState<PanelState>({ open: false, stack: [{ kind: 'home' }] });
  const [focus, setFocus] = useState<Focus | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [navOpen, setNavOpen] = useState(false);
  const narrow = useNarrow();
  const [threadsWide, setThreadsWide] = useSetting('threadsOpen');
  /** 窄屏时讨论串盖满全屏，只在点了按钮时开（不记住）。 */
  const [threadsNarrow, setThreadsNarrow] = useState(false);
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

  const routeRef = useRef(route);
  routeRef.current = route;
  const go = useCallback((r: Route) => {
    // 换了项目、去全部项目或新建：旁边面板里的东西不再相干，先关上
    const pid = (x: Route | undefined) => (x !== undefined && 'projectId' in x ? x.projectId : '');
    if (pid(routeRef.current) !== pid(r)) setPanel((p) => ({ ...p, open: false }));
    setRoute(r);
    setNavOpen(false);
    setThreadsNarrow(false);
  }, []);

  // 地址 ↔ 现在在哪：页面换了写进地址（留一条历史）；后退、手改地址时照地址换页
  useEffect(() => {
    if (route === undefined) return;
    const now = parseRoute(window.location.hash);
    if (now === undefined || !sameRoute(now, route)) window.location.hash = formatRoute(route);
  }, [route]);
  useEffect(() => {
    const onHash = () => {
      const r = parseRoute(window.location.hash);
      if (r === undefined) return;
      const pid = (x: Route | undefined) =>
        x !== undefined && 'projectId' in x ? x.projectId : '';
      if (pid(routeRef.current) !== pid(r)) setPanel((p) => ({ ...p, open: false }));
      setNavOpen(false);
      setRoute((cur) => (cur !== undefined && sameRoute(cur, r) ? cur : r));
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const refresh = useCallback(async () => {
    const [{ projects }, { sessions }] = await Promise.all([api.projects(), api.listSessions()]);
    setProjects(projects);
    setSessions(sessions);
    setLoaded(true);
    // 地址里没写在哪：有项目就进第一个项目的对话，一个都没有就去全部项目页（空状态）
    setRoute((r) => {
      if (r !== undefined) return r;
      const first = projects[0]?.mainSessionId;
      return first !== undefined
        ? { page: 'chat', projectId: first, current: first }
        : { page: 'projects' };
    });
    return sessions;
  }, []);

  useEffect(() => {
    refresh().catch(fail);
    // 新开的对话、新谈定的方向、项目改名、讨论串的状态变了时刷新
    return api.events((e) => {
      if (e.type === 'record' && REFRESH_ON.has(e.record.type)) refresh().catch(fail);
    });
  }, [refresh, fail]);

  const projectId = route !== undefined && 'projectId' in route ? route.projectId : undefined;
  const current = route?.page === 'chat' ? route.current : undefined;
  const page = route?.page;

  // 当前项目被从列表删掉（藏起来）了：换到第一个还在的项目；一个都没有就去全部项目页
  useEffect(() => {
    if (!sidebar.loaded || projectId === undefined) return;
    if (!sidebar.view.hidden.some((h) => h.kind === 'project' && h.id === projectId)) return;
    const next = buildSidebar({ projects, sessions: rawSessions, view: sidebar.view }).projects[0];
    go(
      next !== undefined
        ? { page: 'chat', projectId: next.id, current: next.id }
        : { page: 'projects' },
    );
  }, [sidebar.loaded, sidebar.view, projectId, projects, rawSessions, go]);

  // 地址里的项目或对话不存在（删了、换了数据目录、手输错了）：项目没了回全部项目页，对话没了回这个项目的项目对话
  useEffect(() => {
    if (!loaded || route === undefined || !('projectId' in route)) return;
    if (!projects.some((p) => p.mainSessionId === route.projectId)) {
      go({ page: 'projects' });
      return;
    }
    if (
      route.page === 'chat' &&
      route.current !== route.projectId &&
      !rawSessions.some((s) => s.sessionId === route.current)
    ) {
      go({ page: 'chat', projectId: route.projectId, current: route.projectId });
    }
  }, [loaded, route, projects, rawSessions, go]);

  const project = projects.find((p) => p.mainSessionId === projectId);
  const reviewIds = useReviewIds(projectId);
  const isReview = useCallback((id: string) => reviewIds.has(id), [reviewIds]);
  const tasks = sessions
    .filter(
      (s) =>
        (s.kind === 'loop' ||
          s.kind === 'talk' ||
          s.kind === 'output' ||
          s.kind === 'find' ||
          s.kind === 'nav') &&
        s.parent === projectId,
    )
    .sort((a, b) => a.openedAt.localeCompare(b.openedAt));
  const currentSession = sessions.find((s) => s.sessionId === current);
  const titleOf = useCallback(
    (id: string) => sessions.find((s) => s.sessionId === id)?.title,
    [sessions],
  );
  /** 面包屑点项目名：进项目页。 */
  const openProjectHome = (id: string) => go({ page: 'overview', projectId: id });
  const openMain = (id: string) => go({ page: 'chat', projectId: id, current: id });
  const showSession = useCallback(
    (id: string, list: SessionSummary[]) => {
      const s = list.find((x) => x.sessionId === id);
      // 别的项目里的对话：连项目一起切过去
      const pid = s?.kind === 'main' ? id : (s?.parent ?? projectId);
      if (pid === undefined) return;
      go({ page: 'chat', projectId: pid, current: id });
    },
    [go, projectId],
  );
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
  // 开发者模式关掉时不给打开面板的按钮（对话里的出处、判断的“为什么”照样能在面板里打开）
  const panelButton = devMode && (
    <TooltipIconButton
      tooltip={panel.open ? W.panelClose : W.panelOpen}
      data-testid="panel-toggle"
      className="size-8"
      onClick={togglePanel}
    >
      {panel.open ? <PanelRightCloseIcon /> : <PanelRightOpenIcon />}
    </TooltipIconButton>
  );
  const top = panel.stack.at(-1) ?? { kind: 'home' };
  // 讨论串：在项目的对话里才有；依据面板开着时让位给它
  const inChat = page === 'chat' && projectId !== undefined;
  const threadsOpen = narrow ? threadsNarrow : threadsWide;
  const setThreadsOpen = narrow ? setThreadsNarrow : setThreadsWide;
  const threadsShown = inChat && threadsOpen && !panel.open;
  const threadsButton = inChat && !threadsShown && (
    <TooltipIconButton
      tooltip={W.threads.open}
      data-testid="threads-toggle"
      className="size-8"
      onClick={() => {
        setPanel((p) => ({ ...p, open: false }));
        setThreadsOpen(true);
      }}
    >
      <ListTreeIcon />
    </TooltipIconButton>
  );
  const chatHeaderExtra = (
    <>
      {threadsButton}
      {panelButton}
    </>
  );

  const sidebarEl = (
    <Sidebar
      projects={projects}
      sessions={rawSessions}
      view={sidebar.view}
      active={{ page: page ?? 'projects', projectId, current }}
      onAct={(req) => void sidebar.act(req)}
      onOpenProject={openMain}
      onOpenChat={open}
      onOpenProjects={() => go({ page: 'projects' })}
      onNewProject={() => go({ page: 'new' })}
      drawer={narrow}
    />
  );

  return (
    <LayoutContext.Provider value={{ narrow, openNav: () => setNavOpen(true) }}>
      <OpenSessionContext.Provider value={open}>
        <PanelContext.Provider value={panelApi}>
          <ProjectContext.Provider value={projectId}>
            <div className="flex h-dvh">
              {!narrow && sidebarEl}
              {narrow && navOpen && (
                <div className="fixed inset-0 z-40 flex" data-testid="nav-drawer">
                  {sidebarEl}
                  <button
                    type="button"
                    aria-label={W.sidebar.collapse}
                    className="flex-1 bg-black/30"
                    onClick={() => setNavOpen(false)}
                  />
                </div>
              )}
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
                    loaded={loaded}
                    header={
                      <TopBar crumbs={[{ label: W.sidebar.allProjects }]} right={panelButton} />
                    }
                    onAct={(req) => void sidebar.act(req)}
                    onOpenProject={openMain}
                    onNewProject={() => go({ page: 'new' })}
                  />
                )}
                {page === 'new' && (
                  <NewProject
                    header={
                      <TopBar
                        crumbs={[
                          { label: W.sidebar.allProjects, onClick: () => go({ page: 'projects' }) },
                          { label: W.sidebar.newProjectLong },
                        ]}
                      />
                    }
                    onCreated={(id) => {
                      refresh()
                        .then(() => openMain(id))
                        .catch(fail);
                    }}
                    onError={fail}
                  />
                )}
                {projectId !== undefined && page === 'overview' && project !== undefined && (
                  <ProjectHome
                    key={projectId}
                    projectId={projectId}
                    tasks={tasks}
                    panelOpen={panel.open && !narrow}
                    header={
                      <TopBar
                        crumbs={[
                          { label: W.sidebar.allProjects, onClick: () => go({ page: 'projects' }) },
                          { label: project.title },
                        ]}
                        right={panelButton}
                      />
                    }
                    onOpenChat={() => openMain(projectId)}
                    onNextStep={() => {
                      openMain(projectId);
                      api.send(projectId, W.askNext).catch(fail);
                    }}
                    onRename={(title) =>
                      void sidebar.act({ kind: 'project', id: projectId, action: 'rename', title })
                    }
                    onError={fail}
                  />
                )}
                {current !== undefined &&
                  projectId !== undefined &&
                  page === 'chat' &&
                  // 列表读回来、认得出是哪种对话再画（不把还没认出的当学习对话显示）
                  project !== undefined &&
                  (current === projectId || currentSession !== undefined) &&
                  (currentSession?.kind === 'loop' ? (
                    // 学习对话按屏幕跑（W10）；旧版开的学习对话交回消息流只看
                    <LearnPage
                      key={current}
                      sessionId={current}
                      title={currentSession.title}
                      projectId={projectId}
                      projectTitle={project.title}
                      titleOf={titleOf}
                      headerExtra={chatHeaderExtra}
                      onError={fail}
                      onBackToMain={() => openMain(projectId)}
                      onProject={() => openProjectHome(projectId)}
                      oldLoop={
                        <Conversation
                          key={current}
                          sessionId={current}
                          kind="loop"
                          parent={currentSession.parent}
                          title={currentSession.title}
                          projectId={projectId}
                          projectTitle={project.title}
                          hasGoal={project.goal !== undefined}
                          titleOf={titleOf}
                          isReview={isReview}
                          focus={focus?.sessionId === current ? focus : undefined}
                          headerExtra={chatHeaderExtra}
                          onError={fail}
                          onBackToMain={() => openMain(projectId)}
                          onProject={() => openProjectHome(projectId)}
                        />
                      }
                    />
                  ) : (
                    <Conversation
                      key={current}
                      sessionId={current}
                      kind={currentSession?.kind ?? 'main'}
                      parent={currentSession?.parent}
                      title={currentSession?.title ?? ''}
                      projectId={projectId}
                      projectTitle={project.title}
                      hasGoal={project.goal !== undefined}
                      titleOf={titleOf}
                      isReview={isReview}
                      focus={focus?.sessionId === current ? focus : undefined}
                      headerExtra={chatHeaderExtra}
                      onError={fail}
                      onBackToMain={() => openMain(projectId)}
                      onProject={() => openProjectHome(projectId)}
                    />
                  ))}
              </main>
              {threadsShown && (
                <aside
                  className={cn(
                    'bg-sidebar flex shrink-0 flex-col',
                    narrow ? 'fixed inset-0 z-50' : 'w-72 border-s',
                  )}
                >
                  <ThreadsPanel
                    projectId={projectId}
                    sessions={sessions}
                    current={current}
                    onOpen={(id) => {
                      setThreadsNarrow(false);
                      open(id);
                    }}
                    onClose={() => setThreadsOpen(false)}
                  />
                </aside>
              )}
              {panel.open && (
                <aside
                  className={cn(
                    'bg-sidebar flex shrink-0 flex-col',
                    narrow
                      ? 'fixed inset-0 z-50'
                      : cn(
                          'border-s',
                          // 看书（原文、原件页面）时面板放宽，看与改产出物时更宽，像 Claude 的 artifact 面板
                          top.kind === 'output'
                            ? 'w-[min(56rem,56vw)]'
                            : isWideTarget(top)
                              ? 'w-[min(44rem,50vw)]'
                              : 'w-[min(28rem,40vw)]',
                        ),
                  )}
                >
                  <EvidencePanel
                    target={top}
                    // 首页目录只在开发者模式：不是开发者模式时退到第一项为止
                    canBack={panel.stack.length > (devMode ? 1 : 2)}
                    onBack={() => setPanel((p) => ({ ...p, stack: p.stack.slice(0, -1) }))}
                    onClose={() => setPanel((p) => ({ ...p, open: false }))}
                    loopId={loopId}
                  />
                </aside>
              )}
            </div>
          </ProjectContext.Provider>
          {/* 组件的新一版先在这里看不见地试跑（会话/页面子代理.md「怎么改」） */}
          <PageTrials />
        </PanelContext.Provider>
      </OpenSessionContext.Provider>
    </LayoutContext.Provider>
  );
}
