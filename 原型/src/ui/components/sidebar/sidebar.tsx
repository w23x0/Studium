// 左栏（布局与交互照 Claude 桌面版）：收起 / 展开 · 搜索 · 新建（现在 = 新建项目）· 项目（全部项目页）·
// 置顶 · 最近（各项目的所有对话按最近活动分组）· 底部账号。项目点进去是项目页，对话树在项目页里，不在这里展开。
import { useMemo, useState, type ReactNode } from 'react';
import {
  BookOpenIcon,
  FolderIcon,
  FoldersIcon,
  MessageCircleIcon,
  MessagesSquareIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PenLineIcon,
  PlusIcon,
  SearchIcon,
} from 'lucide-react';
import { TooltipIconButton } from '@/components/assistant-ui/tooltip-icon-button';
import { cn } from '@/lib/utils';
import type { ProjectSummary, SessionSummary } from '../../../shared/protocol.ts';
import type { SidebarActionRequest, SidebarView } from '../../../shared/sidebar.ts';
import { useActivity } from '../../hooks/use-sidebar.ts';
import { useSetting } from '../../settings.ts';
import {
  buildSidebar,
  chatTitle,
  groupByTime,
  isPinned,
  type ChatItem,
  type ProjectItem,
  type SidebarItem,
} from '../../sidebar-model.ts';
import { W } from '../../wording.ts';
import { AccountMenu } from './account-menu.tsx';
import { SearchDialog } from './search-dialog.tsx';
import { SidebarRow, type RowActions } from './sidebar-row.tsx';

const S = W.sidebar;

/** 中间正在看的东西（左栏据此标出当前那一行）。 */
export interface SidebarActive {
  page: 'chat' | 'overview' | 'projects';
  projectId?: string | undefined;
  current?: string | undefined;
}

export interface SidebarProps {
  projects: ProjectSummary[];
  sessions: SessionSummary[];
  view: SidebarView;
  active: SidebarActive;
  onAct: (req: SidebarActionRequest) => void;
  onOpenProject: (id: string) => void;
  onOpenChat: (id: string) => void;
  onOpenProjects: () => void;
  onNewProject: () => void;
}

const CHAT_ICON: Record<ChatItem['chatKind'], ReactNode> = {
  main: <MessageCircleIcon />,
  talk: <MessagesSquareIcon />,
  loop: <BookOpenIcon />,
  output: <PenLineIcon />,
};

export function Sidebar(props: SidebarProps) {
  const [collapsed, setCollapsed] = useSetting('sidebarCollapsed');
  const [searching, setSearching] = useState(false);
  const activity = useActivity();
  const data = useMemo(
    () =>
      buildSidebar({
        projects: props.projects,
        sessions: props.sessions,
        view: props.view,
        activity,
      }),
    [props.projects, props.sessions, props.view, activity],
  );
  const search = searching && (
    <SearchDialog
      data={data}
      onClose={() => setSearching(false)}
      onOpenProject={(id) => {
        setSearching(false);
        props.onOpenProject(id);
      }}
      onOpenChat={(id) => {
        setSearching(false);
        props.onOpenChat(id);
      }}
    />
  );

  if (collapsed) {
    return (
      <aside
        data-testid="sidebar"
        data-collapsed="true"
        className="bg-sidebar flex w-12 shrink-0 flex-col items-center gap-1 border-r py-3"
      >
        <RailButton tip={S.expand} testId="sidebar-toggle" onClick={() => setCollapsed(false)}>
          <PanelLeftOpenIcon />
        </RailButton>
        <div className="h-2" />
        <RailButton tip={S.search} testId="sidebar-search" onClick={() => setSearching(true)}>
          <SearchIcon />
        </RailButton>
        <RailButton tip={S.newProjectLong} testId="sidebar-new" onClick={props.onNewProject}>
          <PlusIcon />
        </RailButton>
        <RailButton
          tip={S.allProjects}
          testId="sidebar-projects"
          active={props.active.page === 'projects'}
          onClick={props.onOpenProjects}
        >
          <FoldersIcon />
        </RailButton>
        <div className="mt-auto">
          <AccountMenu collapsed />
        </div>
        {search}
      </aside>
    );
  }

  const groups = groupByTime(data.recents, new Date());
  return (
    <aside
      data-testid="sidebar"
      className="bg-sidebar flex w-64 shrink-0 flex-col gap-1 border-r p-3 text-sm"
    >
      <div className="flex items-center px-2 pt-1 pb-3">
        <span className="font-serif text-xl tracking-tight">Studium</span>
        <TooltipIconButton
          tooltip={S.collapse}
          side="right"
          data-testid="sidebar-toggle"
          className="text-muted-foreground ms-auto size-7"
          onClick={() => setCollapsed(true)}
        >
          <PanelLeftCloseIcon />
        </TooltipIconButton>
      </div>
      <NavItem testId="sidebar-search" icon={<SearchIcon />} onClick={() => setSearching(true)}>
        {S.search}
      </NavItem>
      <NavItem testId="sidebar-new" icon={<PlusIcon />} onClick={props.onNewProject}>
        {S.newProject}
      </NavItem>
      <NavItem
        testId="sidebar-projects"
        icon={<FoldersIcon />}
        active={props.active.page === 'projects'}
        onClick={props.onOpenProjects}
      >
        {S.projects}
      </NavItem>
      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {data.pinned.length > 0 && (
          <Section title={S.pinned} testId="sidebar-pinned">
            {data.pinned.map((it) => (
              <li key={`${it.kind}:${it.id}`}>
                <Row item={it} {...props} />
              </li>
            ))}
          </Section>
        )}
        <Section title={S.recents} testId="sidebar-recents">
          {groups.length === 0 && (
            <li className="text-muted-foreground px-2 py-1 text-xs">{S.noRecents}</li>
          )}
          {groups.map((g) => (
            <li key={g.bucket} className="flex flex-col gap-0.5">
              <div className="text-muted-foreground/80 px-2 pt-1 text-[0.7rem]">
                {S.buckets[g.bucket]}
              </div>
              <ul className="flex flex-col gap-0.5">
                {g.items.map((c) => (
                  <li key={c.id}>
                    <Row item={c} {...props} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </Section>
      </div>
      <div className="border-t pt-2">
        <AccountMenu collapsed={false} />
      </div>
      {search}
    </aside>
  );
}

/** 一行的“⋯”菜单要做的事：项目与对话各自记到左栏操作里。 */
export function rowActions(
  item: SidebarItem,
  view: SidebarView,
  onAct: (req: SidebarActionRequest) => void,
): RowActions {
  return {
    pinned: isPinned(view, { kind: item.kind, id: item.id }),
    currentTitle: item.kind === 'project' ? item.title : chatTitle(item),
    removeHint: item.kind === 'project' ? S.removeProjectHint : S.removeChatHint,
    onAct: (action, title) =>
      onAct({ kind: item.kind, id: item.id, action, ...(title !== undefined ? { title } : {}) }),
  };
}

function Row(props: SidebarProps & { item: SidebarItem }) {
  const { item, active } = props;
  if (item.kind === 'project') return <ProjectRow {...props} item={item} />;
  return (
    <SidebarRow
      testId="sidebar-chat"
      active={active.page === 'chat' && active.current === item.id}
      icon={<KindIcon>{CHAT_ICON[item.chatKind]}</KindIcon>}
      title={chatTitle(item)}
      sub={item.projectTitle}
      actions={rowActions(item, props.view, props.onAct)}
      onClick={() => props.onOpenChat(item.id)}
    />
  );
}

function ProjectRow(props: SidebarProps & { item: ProjectItem }) {
  const { item } = props;
  return (
    <SidebarRow
      testId="sidebar-project"
      active={props.active.page === 'overview' && props.active.projectId === item.id}
      icon={
        <KindIcon>
          <FolderIcon />
        </KindIcon>
      }
      title={item.title}
      actions={rowActions(item, props.view, props.onAct)}
      onClick={() => props.onOpenProject(item.id)}
    />
  );
}

function KindIcon(props: { children: ReactNode }) {
  return (
    <span className="text-muted-foreground flex shrink-0 [&_svg]:size-3.5">{props.children}</span>
  );
}

function Section(props: { title: string; testId: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-muted-foreground px-2 pb-1 text-xs">{props.title}</div>
      <ul data-testid={props.testId} className="flex flex-col gap-0.5">
        {props.children}
      </ul>
    </div>
  );
}

function NavItem(props: {
  icon: ReactNode;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
  testId: string;
}) {
  return (
    <button
      type="button"
      data-testid={props.testId}
      className={cn(
        'flex items-center gap-2 rounded-lg px-2 py-1.5 text-left [&_svg]:size-4',
        props.active === true ? 'bg-accent' : 'hover:bg-accent/60',
      )}
      onClick={props.onClick}
    >
      <span className="text-muted-foreground flex">{props.icon}</span>
      {props.children}
    </button>
  );
}

function RailButton(props: {
  tip: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
  testId: string;
}) {
  return (
    <TooltipIconButton
      tooltip={props.tip}
      side="right"
      data-testid={props.testId}
      className={cn('size-8 [&_svg]:size-4', props.active === true && 'bg-accent')}
      onClick={props.onClick}
    >
      {props.children}
    </TooltipIconButton>
  );
}
