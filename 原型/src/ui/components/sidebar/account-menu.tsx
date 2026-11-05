// 左栏底部的账号：弹出菜单——额度（W14 §3，打开时问一次）、外观（跟系统 / 浅色 / 深色）、语言（现在只有中文）。
// MinerU 密钥：临时入口，填了写进 书库处理/.env（PDF 导入要用）。没做的（退出登录）不摆出来。
import { useEffect, useState } from 'react';
import { ChevronsUpDownIcon, GlobeIcon, KeyRoundIcon, SunMoonIcon } from 'lucide-react';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSubmenu,
  MenuSubmenuTrigger,
  MenuTrigger,
} from '@/components/ui/menu';
import { cn } from '@/lib/utils';
import { QuotaMenuRow } from '../usage/quota.tsx';
import { api } from '../../api.ts';
import { useTheme, type Theme } from '../../theme.ts';
import { W } from '../../wording.ts';

const S = W.sidebar;

function Avatar() {
  return (
    <span className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-xs">
      {S.account}
    </span>
  );
}

const THEMES: Theme[] = ['system', 'light', 'dark'];

export function AccountMenu(props: { collapsed: boolean }) {
  const [theme, setTheme] = useTheme();
  const [mineru, setMineru] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    api
      .mineruToken()
      .then((r) => setMineru(r.set))
      .catch((e: unknown) => {
        console.error('读 MinerU 密钥状态失败：', e);
      });
  }, []);
  const editMineru = () => {
    const t = window.prompt(S.mineruPrompt);
    if (t === null) return;
    api
      .setMineruToken(t)
      .then((r) => setMineru(r.set))
      .catch((e: unknown) => {
        console.error('存 MinerU 密钥失败：', e);
        window.alert(e instanceof Error ? e.message : String(e));
      });
  };
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
          <QuotaMenuRow />
          <MenuSubmenu>
            <MenuSubmenuTrigger data-testid="theme-menu">
              <SunMoonIcon />
              <span className="flex-1">{S.theme}</span>
              <span className="text-muted-foreground text-xs">{S.themes[theme]}</span>
            </MenuSubmenuTrigger>
            <MenuContent side="right" align="start">
              <MenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as Theme)}>
                {THEMES.map((t) => (
                  <MenuRadioItem key={t} value={t}>
                    {S.themes[t]}
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
            </MenuContent>
          </MenuSubmenu>
          <MenuItem onClick={editMineru}>
            <KeyRoundIcon />
            <span className="flex-1">{S.mineru}</span>
            {mineru !== undefined && (
              <span className="text-muted-foreground text-xs">
                {mineru ? S.mineruSet : S.mineruUnset}
              </span>
            )}
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
        </MenuContent>
      </Menu>
    </>
  );
}
