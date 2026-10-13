// 左栏（与全部项目页）里的一行：点开；右键或悬停出现的“⋯”菜单——重命名、置顶 / 取消置顶、删除（只从列表藏起来）。
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EllipsisIcon, PencilIcon, PinIcon, PinOffIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { Modal } from '@/components/input/modal';
import { cn } from '@/lib/utils';
import type { SidebarAction } from '../../../shared/sidebar.ts';
import { W } from '../../wording.ts';

const S = W.sidebar;

export interface RowActions {
  pinned: boolean;
  /** 改名框里先填的名字。 */
  currentTitle: string;
  /** 删除前的确认里说清删掉意味着什么。 */
  removeHint: string;
  onAct: (action: SidebarAction, title?: string) => void;
}

/**
 * 行的“⋯”菜单与它弹出的改名框、删除确认。children 是行本身：拿到打开菜单的函数（好接右键）、
 * 菜单开着没有、和“⋯”按钮（放进行里）。
 */
export function RowMenu(props: {
  actions: RowActions;
  label: string;
  children: (row: { openMenu: () => void; menuOpen: boolean; trigger: ReactNode }) => ReactNode;
  triggerClassName?: string;
}) {
  const { actions } = props;
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<'rename' | 'remove' | undefined>();
  const trigger = (
    <MenuTrigger
      aria-label={`${props.label}：${S.more}`}
      data-testid="row-menu"
      className={cn(
        'text-muted-foreground hover:text-foreground hover:bg-accent flex size-6 shrink-0 items-center justify-center rounded-md',
        open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
        props.triggerClassName,
      )}
    >
      <EllipsisIcon className="size-4" />
    </MenuTrigger>
  );
  return (
    <>
      <Menu open={open} onOpenChange={setOpen}>
        {props.children({ openMenu: () => setOpen(true), menuOpen: open, trigger })}
        <MenuContent align="start" side="bottom">
          <MenuItem onClick={() => setDialog('rename')}>
            <PencilIcon />
            {S.rename}
          </MenuItem>
          <MenuItem onClick={() => actions.onAct(actions.pinned ? 'unpin' : 'pin')}>
            {actions.pinned ? <PinOffIcon /> : <PinIcon />}
            {actions.pinned ? S.unpin : S.pin}
          </MenuItem>
          <MenuSeparator />
          <MenuItem destructive onClick={() => setDialog('remove')}>
            <Trash2Icon className="text-destructive" />
            {S.remove}
          </MenuItem>
        </MenuContent>
      </Menu>
      {dialog === 'rename' && (
        <RenameDialog
          initial={actions.currentTitle}
          onClose={() => setDialog(undefined)}
          onSave={(t) => {
            setDialog(undefined);
            actions.onAct('rename', t);
          }}
        />
      )}
      {dialog === 'remove' && (
        <Modal label={S.removeTitle} onClose={() => setDialog(undefined)} className="w-96 p-5">
          <div className="flex flex-col gap-3 text-sm">
            <h2 className="font-medium">{S.removeTitle}</h2>
            <p className="text-muted-foreground">{actions.removeHint}</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDialog(undefined)}>
                {S.cancel}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                data-testid="confirm-remove"
                onClick={() => {
                  setDialog(undefined);
                  actions.onAct('hide');
                }}
              >
                {S.removeGo}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function RenameDialog(props: {
  initial: string;
  onClose: () => void;
  onSave: (title: string) => void;
}) {
  const [text, setText] = useState(props.initial);
  const input = useRef<HTMLInputElement>(null);
  // 菜单关上时会把焦点还给“⋯”：稍等一下再把焦点放进输入框
  useEffect(() => {
    const t = setTimeout(() => input.current?.select(), 30);
    return () => clearTimeout(t);
  }, []);
  const ok = text.trim() !== '';
  return (
    <Modal label={S.renameTitle} onClose={props.onClose} className="w-96 p-5">
      <form
        className="flex flex-col gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          if (ok) props.onSave(text.trim());
        }}
      >
        <h2 className="font-medium">{S.renameTitle}</h2>
        <input
          ref={input}
          aria-label={S.renameTitle}
          className="bg-background focus:border-foreground/30 w-full rounded-lg border px-3 py-1.5 outline-none"
          value={text}
          maxLength={100}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={props.onClose}>
            {S.cancel}
          </Button>
          <Button type="submit" size="sm" disabled={!ok}>
            {S.renameSave}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** 左栏里的一行：图标 · 名字（下面可有一行小字）· 悬停出现的“⋯”。 */
export function SidebarRow(props: {
  active: boolean;
  onClick: () => void;
  icon?: ReactNode;
  title: string;
  sub?: string;
  actions: RowActions;
  testId?: string;
}) {
  return (
    <RowMenu actions={props.actions} label={props.title}>
      {({ openMenu, menuOpen, trigger }) => (
        <div
          data-testid={props.testId}
          className={cn(
            'group flex items-center gap-1 rounded-md pe-1',
            props.active ? 'bg-accent' : menuOpen ? 'bg-accent/60' : 'hover:bg-accent/60',
          )}
          onContextMenu={(e) => {
            e.preventDefault();
            openMenu();
          }}
        >
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left"
            onClick={props.onClick}
          >
            {props.icon}
            <span className="flex min-w-0 flex-col">
              <span className="truncate">{props.title}</span>
              {props.sub !== undefined && props.sub !== '' && (
                <span className="text-muted-foreground truncate text-[0.7rem] leading-tight">
                  {props.sub}
                </span>
              )}
            </span>
          </button>
          {trigger}
        </div>
      )}
    </RowMenu>
  );
}
