// 左栏底部的账号：弹出菜单——外观（跟系统 / 浅色 / 深色）、学习页（竖流 / 区域图，10-29 #74 试验）、语言（现在只有中文）。
// 没做的（退出登录）不摆出来。
import { useEffect, useState } from 'react';
import { ChevronsUpDownIcon, GlobeIcon, LayoutListIcon, SunMoonIcon } from 'lucide-react';
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
import { LEARN_PAGE_MODES, type LearnPageMode } from '../../../shared/protocol.ts';
import { api } from '../../api.ts';
import { useTheme, type Theme } from '../../theme.ts';
import { W } from '../../wording.ts';
import { WP } from '../../wording-page.ts';

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
  const [mode, setMode] = useState<LearnPageMode | undefined>(undefined);
  useEffect(() => {
    api
      .learnPageSetting()
      .then((r) => setMode(r.mode))
      .catch((e: unknown) => {
        console.error('读学习页设置失败：', e);
      });
  }, []);
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
          <MenuSubmenu>
            <MenuSubmenuTrigger data-testid="learn-page-mode">
              <LayoutListIcon />
              <span className="flex-1">{WP.modeTitle}</span>
              {mode !== undefined && (
                <span className="text-muted-foreground text-xs">
                  {WP.modes[mode].replace(/（.*）/, '')}
                </span>
              )}
            </MenuSubmenuTrigger>
            <MenuContent side="right" align="start">
              <MenuRadioGroup
                value={mode ?? ''}
                onValueChange={(v) => {
                  const m = v as LearnPageMode;
                  api
                    .setLearnPageSetting(m)
                    .then((r) => setMode(r.mode))
                    .catch((e: unknown) => {
                      console.error('改学习页设置失败：', e);
                    });
                }}
              >
                {LEARN_PAGE_MODES.map((m) => (
                  <MenuRadioItem key={m} value={m}>
                    {WP.modes[m]}
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
              <div className="text-muted-foreground px-2 py-1 text-xs">{WP.modeHint}</div>
            </MenuContent>
          </MenuSubmenu>
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
