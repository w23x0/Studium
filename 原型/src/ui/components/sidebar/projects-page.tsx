// 全部项目页（左栏“项目”）：列出所有没删掉的项目（置顶的在前，其余按最近活动），点进项目页；右上角新建项目。
import { useMemo, type ReactNode } from 'react';
import { FolderIcon, PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ProjectSummary, SessionSummary } from '../../../shared/protocol.ts';
import type { SidebarActionRequest, SidebarView } from '../../../shared/sidebar.ts';
import { shortTime } from '../../evidence-model.ts';
import { useActivity } from '../../hooks/use-sidebar.ts';
import { buildSidebar, isPinned } from '../../sidebar-model.ts';
import { W } from '../../wording.ts';
import { rowActions } from './sidebar.tsx';
import { RowMenu } from './sidebar-row.tsx';

const S = W.sidebar;

export function ProjectsPage(props: {
  projects: ProjectSummary[];
  sessions: SessionSummary[];
  view: SidebarView;
  header: ReactNode;
  /** 项目列表读回来了没有（没读回来前不显示空状态）。 */
  loaded: boolean;
  onAct: (req: SidebarActionRequest) => void;
  onOpenProject: (id: string) => void;
  onNewProject: () => void;
}) {
  const activity = useActivity();
  const list = useMemo(() => {
    const d = buildSidebar({
      projects: props.projects,
      sessions: props.sessions,
      view: props.view,
      activity,
    });
    const pinned = (id: string) => isPinned(props.view, { kind: 'project', id });
    return [...d.projects.filter((p) => pinned(p.id)), ...d.projects.filter((p) => !pinned(p.id))];
  }, [props.projects, props.sessions, props.view, activity]);
  return (
    <div data-testid="projects-page" className="flex h-full flex-col">
      {props.header}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 pt-6 pb-16">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl tracking-tight">{S.allProjects}</h1>
            <Button className="ms-auto" size="sm" onClick={props.onNewProject}>
              <PlusIcon />
              {S.newProjectLong}
            </Button>
          </div>
          {list.length === 0 ? (
            props.loaded && (
              <div
                data-testid="projects-empty"
                className="text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center text-sm"
              >
                {S.noProjects}
              </div>
            )
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {list.map((p) => (
                <li key={p.id}>
                  <RowMenu actions={rowActions(p, props.view, props.onAct)} label={p.title}>
                    {({ openMenu, menuOpen, trigger }) => (
                      <div
                        data-testid="project-card"
                        className={cn(
                          'bg-card group flex h-full items-start gap-2 rounded-xl border p-1 shadow-xs transition-colors',
                          menuOpen ? 'border-foreground/20' : 'hover:border-foreground/20',
                        )}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          openMenu();
                        }}
                      >
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 flex-col gap-1 px-3 py-2 text-left"
                          onClick={() => props.onOpenProject(p.id)}
                        >
                          <span className="flex items-center gap-2 font-medium">
                            <FolderIcon className="text-muted-foreground size-4 shrink-0" />
                            <span className="truncate">{p.title}</span>
                            {isPinned(props.view, { kind: 'project', id: p.id }) && (
                              <span className="text-muted-foreground text-xs font-normal">
                                {S.pinned}
                              </span>
                            )}
                          </span>
                          <span className="text-muted-foreground line-clamp-2 text-sm">
                            {p.goal ?? S.noGoalYet}
                          </span>
                          {p.lastAt !== '' && (
                            <span className="text-muted-foreground text-xs">
                              {S.lastActive} {shortTime(p.lastAt)}
                            </span>
                          )}
                        </button>
                        <div className="pt-1.5 pe-1">{trigger}</div>
                      </div>
                    )}
                  </RowMenu>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
