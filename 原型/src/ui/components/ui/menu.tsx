// 下拉菜单（照 shadcn/ui 的 dropdown-menu，底层 @base-ui/react/menu）：左栏的 ⋯ 菜单与账号菜单用。
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const Menu = MenuPrimitive.Root;
const MenuTrigger = MenuPrimitive.Trigger;
const MenuSubmenu = MenuPrimitive.SubmenuRoot;
const MenuRadioGroup = MenuPrimitive.RadioGroup;

const POPUP =
  'bg-popover text-popover-foreground z-50 min-w-36 origin-(--transform-origin) rounded-xl border p-1 text-sm shadow-md outline-none';

function MenuContent({
  className,
  side = 'bottom',
  align = 'start',
  sideOffset = 4,
  children,
  ...props
}: ComponentProps<typeof MenuPrimitive.Popup> &
  Pick<ComponentProps<typeof MenuPrimitive.Positioner>, 'side' | 'align' | 'sideOffset'>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        side={side}
        align={align}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup className={cn(POPUP, className)} {...props}>
          {children}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

const ITEM =
  "data-highlighted:bg-accent data-highlighted:text-accent-foreground flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 outline-none select-none data-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg:not([class*='text-'])]:text-muted-foreground";

function MenuItem({
  className,
  destructive,
  ...props
}: ComponentProps<typeof MenuPrimitive.Item> & { destructive?: boolean }) {
  return (
    <MenuPrimitive.Item
      className={cn(ITEM, destructive === true && 'text-destructive', className)}
      {...props}
    />
  );
}

function MenuSubmenuTrigger({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.SubmenuTrigger>) {
  return <MenuPrimitive.SubmenuTrigger className={cn(ITEM, className)} {...props} />;
}

function MenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof MenuPrimitive.RadioItem>) {
  return (
    <MenuPrimitive.RadioItem className={cn(ITEM, 'pe-6', className)} {...props}>
      {children}
      <MenuPrimitive.RadioItemIndicator className="ms-auto">✓</MenuPrimitive.RadioItemIndicator>
    </MenuPrimitive.RadioItem>
  );
}

function MenuSeparator({ className }: { className?: string }) {
  return <MenuPrimitive.Separator className={cn('bg-border -mx-1 my-1 h-px', className)} />;
}

export {
  Menu,
  MenuContent,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSubmenu,
  MenuSubmenuTrigger,
  MenuTrigger,
};
