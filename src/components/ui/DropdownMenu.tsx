import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils';

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;
export const DropdownMenuSeparator = () => (
  <DropdownPrimitive.Separator className="bg-hairline my-1 h-px" />
);

export function DropdownMenuContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        sideOffset={4}
        align="end"
        className={cn('panel bg-surface-2 z-50 min-w-44 py-1 shadow-xl shadow-black/40', className)}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  destructive,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownPrimitive.Item> & { destructive?: boolean }) {
  return (
    <DropdownPrimitive.Item
      className={cn(
        'flex cursor-default items-center gap-2 px-3 py-2 text-[13px] outline-none select-none',
        '[&_svg]:text-ink-faint [&_svg]:size-4',
        destructive
          ? 'text-danger data-[highlighted]:bg-danger/10 [&_svg]:text-danger'
          : 'text-ink-dim data-[highlighted]:bg-surface-3 data-[highlighted]:text-ink',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ children }: { children: React.ReactNode }) {
  return <div className="tech-label px-3 pt-2 pb-1">{children}</div>;
}
