// 讨论串：项目对话右边一栏（照 Claude 桌面版的讨论串），列这个项目开出去的任务对话。
// 等你 → 进行中 → 停着 → 已结束（默认收起）；分组规则在 threads-model.ts 的表里。每行只有标题和一个小状态，
// 行尾一个菜单，里面有删除（删前确认一次，W12 §4.3；主对话不带删除工具，只在这里删）。
import { useState, type ReactNode } from 'react';
import {
  BookOpenIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EllipsisIcon,
  LibraryIcon,
  MessagesSquareIcon,
  PenLineIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import { TooltipIconButton } from '@/components/assistant-ui/tooltip-icon-button';
import { Button } from '@/components/ui/button';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/menu';
import { Modal } from '@/components/input/modal';
import { cn } from '@/lib/utils';
import { api } from '../api.ts';
import type { SessionSummary } from '../../shared/protocol.ts';
import { threadGroups, type ThreadGroup, type ThreadRow } from '../threads-model.ts';
import { W } from '../wording.ts';

const T = W.threads;

const ICON: Partial<Record<SessionSummary['kind'], ReactNode>> = {
  talk: <MessagesSquareIcon />,
  loop: <BookOpenIcon />,
  find: <LibraryIcon />,
  output: <PenLineIcon />,
};

export function ThreadsPanel(props: {
  projectId: string;
  sessions: readonly SessionSummary[];
  current: string | undefined;
  onOpen: (id: string) => void;
  onClose: () => void;
  /** 删掉之后（正开着的那个被删了要回项目对话）。 */
  onDeleted: (id: string) => void;
  onError: (e: unknown) => void;
}) {
  const groups = threadGroups(props.sessions, props.projectId);
  const total =
    groups.waiting.length + groups.running.length + groups.paused.length + groups.ended.length;
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
        <Group group="paused" rows={groups.paused} {...props} />
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
  onDeleted: (id: string) => void;
  onError: (e: unknown) => void;
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
            <li
              key={r.id}
              className={cn(
                'group flex items-center rounded-md pe-1',
                props.current === r.id ? 'bg-accent' : 'hover:bg-accent/60',
              )}
            >
              <button
                type="button"
                data-testid="thread-row"
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left [&_svg]:size-3.5 [&_svg]:shrink-0',
                  props.group === 'ended' && 'text-muted-foreground',
                )}
                onClick={() => props.onOpen(r.id)}
              >
                <span className="text-muted-foreground flex">{ICON[r.kind]}</span>
                <span className="min-w-0 flex-1 truncate">{r.title}</span>
                {r.tag !== undefined && (
                  <span className="text-muted-foreground shrink-0 text-[0.7rem]">{r.tag}</span>
                )}
              </button>
              <ThreadMenu row={r} onDeleted={props.onDeleted} onError={props.onError} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** 一行的菜单：删除（删前确认一次；删了界面上不再显示，别的对话也读不到；不做撤销）。 */
function ThreadMenu(props: {
  row: ThreadRow;
  onDeleted: (id: string) => void;
  onError: (e: unknown) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Menu>
        <MenuTrigger
          aria-label={`${props.row.title}：${T.more}`}
          data-testid="thread-menu"
          className="text-muted-foreground hover:text-foreground flex size-6 shrink-0 items-center justify-center rounded-md opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100"
        >
          <EllipsisIcon className="size-4" />
        </MenuTrigger>
        <MenuContent align="end" side="bottom">
          <MenuItem destructive onClick={() => setConfirming(true)}>
            <Trash2Icon className="text-destructive" />
            {T.delete}
          </MenuItem>
        </MenuContent>
      </Menu>
      {confirming && (
        <Modal label={T.deleteTitle} onClose={() => setConfirming(false)} className="w-96 p-5">
          <div className="flex flex-col gap-3 text-sm">
            <h2 className="font-medium">{T.deleteTitle}</h2>
            <p className="text-muted-foreground">{T.deleteHint(props.row.title)}</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                {T.cancel}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                data-testid="confirm-delete-thread"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  api
                    .deleteThread(props.row.id)
                    .then(() => {
                      setConfirming(false);
                      props.onDeleted(props.row.id);
                    })
                    .catch(props.onError)
                    .finally(() => setBusy(false));
                }}
              >
                {T.deleteGo}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
