// 每页顶上一条：左边面包屑（项目名永远去项目页），右边是这一页的小按钮（界面说明 §1.1）。
// 窄屏时最左边多一个打开左栏的按钮。
import { Fragment, type ReactNode } from 'react';
import { MenuIcon } from 'lucide-react';
import { TooltipIconButton } from '@/components/assistant-ui/tooltip-icon-button';
import { useLayout } from '../layout.ts';
import { W } from '../wording.ts';

export interface Crumb {
  label: string;
  /** 不给 = 当前页（不可点）。 */
  onClick?: () => void;
  testId?: string;
}

export function TopBar(props: { crumbs: Crumb[]; right?: ReactNode }) {
  const layout = useLayout();
  return (
    <header className="flex h-12 shrink-0 items-center gap-1.5 px-3 text-sm md:px-4">
      {layout.narrow && (
        <TooltipIconButton
          tooltip={W.sidebar.expand}
          data-testid="open-nav"
          className="size-8"
          onClick={layout.openNav}
        >
          <MenuIcon />
        </TooltipIconButton>
      )}
      <nav aria-label={W.whereAmI} className="flex min-w-0 items-center gap-1.5">
        {props.crumbs.map((c, i) => (
          <Fragment key={`${String(i)}:${c.label}`}>
            {i > 0 && <span className="text-muted-foreground/60">/</span>}
            {c.onClick !== undefined ? (
              <button
                type="button"
                data-testid={c.testId}
                className="text-muted-foreground hover:text-foreground max-w-[14rem] truncate"
                onClick={c.onClick}
              >
                {c.label}
              </button>
            ) : (
              <span data-testid={c.testId} className="truncate font-medium">
                {c.label}
              </span>
            )}
          </Fragment>
        ))}
      </nav>
      <div className="ms-auto flex items-center gap-1">{props.right}</div>
    </header>
  );
}
