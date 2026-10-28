// 左栏底部的账号：弹出菜单——语言（现在只有中文）。没做的（退出登录）不摆出来。
import { ChevronsUpDownIcon, GlobeIcon } from 'lucide-react';
import {
  Menu,
  MenuContent,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSubmenu,
  MenuSubmenuTrigger,
  MenuTrigger,
} from '@/components/ui/menu';
import { cn } from '@/lib/utils';
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
        </MenuContent>
      </Menu>
    </>
  );
}
