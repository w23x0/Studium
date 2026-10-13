// 左栏底部的账号：弹出菜单——设置（开发者模式开关）、语言（现在只有中文）、退出登录（还没做）。
import { useState } from 'react';
import { ChevronsUpDownIcon, GlobeIcon, LogOutIcon, SettingsIcon } from 'lucide-react';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSubmenu,
  MenuSubmenuTrigger,
  MenuTrigger,
} from '@/components/ui/menu';
import { Modal } from '@/components/input/modal';
import { cn } from '@/lib/utils';
import { useSetting } from '../../settings.ts';
import { W } from '../../wording.ts';

const S = W.sidebar;

function Avatar() {
  return (
    <span className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-xs">
      {S.account}
    </span>
  );
}

export function AccountMenu(props: { collapsed: boolean }) {
  const [settings, setSettings] = useState(false);
  return (
    <>
      <Menu>
        <MenuTrigger
          data-testid="account-menu"
          aria-label={S.accountMenu}
          className={cn(
            'hover:bg-accent/60 data-popup-open:bg-accent/60 flex items-center gap-2 rounded-lg text-left',
            props.collapsed ? 'justify-center p-1' : 'w-full px-2 py-1.5',
          )}
        >
          <Avatar />
          {!props.collapsed && (
            <>
              <span className="flex-1 truncate">{S.accountMenu}</span>
              <ChevronsUpDownIcon className="text-muted-foreground size-4" />
            </>
          )}
        </MenuTrigger>
        <MenuContent side="top" align="start" className="min-w-52">
          <MenuItem data-testid="open-settings" onClick={() => setSettings(true)}>
            <SettingsIcon />
            {S.settings}
          </MenuItem>
          <MenuSubmenu>
            <MenuSubmenuTrigger>
              <GlobeIcon />
              <span className="flex-1">{S.language}</span>
              <span className="text-muted-foreground text-xs">{S.chinese}</span>
            </MenuSubmenuTrigger>
            <MenuContent side="right" align="start">
              <MenuRadioGroup value="zh">
                <MenuRadioItem value="zh">{S.chinese}</MenuRadioItem>
              </MenuRadioGroup>
            </MenuContent>
          </MenuSubmenu>
          <MenuSeparator />
          <MenuItem disabled>
            <LogOutIcon />
            <span className="flex-1">{S.logout}</span>
            <span className="text-muted-foreground text-xs">{S.notYet}</span>
          </MenuItem>
        </MenuContent>
      </Menu>
      {settings && <SettingsDialog onClose={() => setSettings(false)} />}
    </>
  );
}

function SettingsDialog(props: { onClose: () => void }) {
  const [dev, setDev] = useSetting('devMode');
  return (
    <Modal label={S.settings} onClose={props.onClose} className="w-[min(28rem,92vw)] p-5">
      <div className="flex flex-col gap-4 text-sm">
        <h2 className="font-medium">{S.settings}</h2>
        <label className="flex items-start gap-3">
          <span className="flex flex-1 flex-col gap-0.5">
            <span>{S.devMode}</span>
            <span className="text-muted-foreground text-xs">{S.devModeHint}</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            data-testid="dev-mode"
            className="accent-primary mt-0.5 size-4"
            checked={dev}
            onChange={(e) => setDev(e.target.checked)}
          />
        </label>
      </div>
    </Modal>
  );
}
