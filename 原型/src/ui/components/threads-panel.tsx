// 讨论串：项目对话右边一栏（照 Claude 桌面版的讨论串），列这个项目开出去的任务对话。
// 等你 → 进行中 → 已结束（默认收起）；分组规则在 threads-model.ts 的表里。
import { useState, type ReactNode } from 'react';
import {
  BookOpenIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CompassIcon,
  LibraryIcon,
  MessagesSquareIcon,
  PenLineIcon,
  XIcon,
} from 'lucide-react';
import { TooltipIconButton } from '@/components/assistant-ui/tooltip-icon-button';
import { cn } from '@/lib/utils';
import type { SessionSummary } from '../../shared/protocol.ts';
import { shortTime } from '../evidence-model.ts';
import { threadGroups, type ThreadGroup, type ThreadRow } from '../threads-model.ts';
import { W } from '../wording.ts';

const T = W.threads;

const ICON: Partial<Record<SessionSummary['kind'], ReactNode>> = {
  talk: <MessagesSquareIcon />,
  loop: <BookOpenIcon />,
  nav: <CompassIcon />,
  find: <LibraryIcon />,
  output: <PenLineIcon />,
};

export function ThreadsPanel(props: {
  projectId: string;
  sessions: readonly SessionSummary[];
  current: string | undefined;
  onOpen: (id: string) => void;
  onClose: () => void;
}) {
  const groups = threadGroups(props.sessions, props.projectId);
  const total = groups.waiting.length + groups.running.length + groups.ended.length;
  return (
    <div data-testid="threads-panel" className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center px-3 text-sm">
        <span className="font-medium">{T.title}</span>
        <TooltipIconButton
          tooltip={T.close}
          className="text-muted-foreground ms-auto size-7"
          onClick={props.onClose}
        >
          <XIcon />
        </TooltipIconButton>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 pb-4 text-sm">
        {total === 0 && <p className="text-muted-foreground px-2 text-xs">{T.empty}</p>}
        <Group group="waiting" rows={groups.waiting} {...props} />
        <Group group="running" rows={groups.running} {...props} />
        <Group group="ended" rows={groups.ended} foldable {...props} />
      </div>
    </div>
  );
}

function Group(props: {
  group: ThreadGroup;
  rows: ThreadRow[];
  foldable?: boolean;
  current: string | undefined;
  onOpen: (id: string) => void;
}) {
  const [shown, setShown] = useState(props.foldable !== true);
  if (props.rows.length === 0) return null;
  const head = `${T[props.group]} · ${String(props.rows.length)}`;
  return (
    <section data-testid={`threads-${props.group}`} className="flex flex-col gap-0.5">
      {props.foldable === true ? (
        <button
          type="button"
          aria-expanded={shown}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 pb-1 text-xs"
          onClick={() => setShown((x) => !x)}
        >
          {head}
          {shown ? (
            <ChevronDownIcon className="size-3.5" />
          ) : (
            <ChevronRightIcon className="size-3.5" />
          )}
        </button>
      ) : (
        <div className="text-muted-foreground px-2 pb-1 text-xs">{head}</div>
      )}
      {shown && (
        <ul className="flex flex-col gap-0.5">
          {props.rows.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                data-testid="thread-row"
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left [&_svg]:size-3.5 [&_svg]:shrink-0',
                  props.current === r.id ? 'bg-accent' : 'hover:bg-accent/60',
                  props.group === 'ended' && 'text-muted-foreground',
                )}
                onClick={() => props.onOpen(r.id)}
              >
                <span className="text-muted-foreground flex">{ICON[r.kind]}</span>
                <span className="min-w-0 flex-1 truncate">{r.title}</span>
                {r.tag !== undefined && (
                  <span className="text-muted-foreground shrink-0 text-[0.7rem]">{r.tag}</span>
                )}
                <span className="text-muted-foreground/70 shrink-0 text-[0.7rem]">
                  {shortTime(r.at).slice(0, 5)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
