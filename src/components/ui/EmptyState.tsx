import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Empty/zero states are the ONE place the Forge allows atmosphere:
 * brushed-metal texture + ember glow. Data surfaces stay flat.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'texture-brushed border-hairline flex flex-col items-center justify-center gap-2 rounded-(--radius-panel) border border-dashed px-8 py-14 text-center',
        className,
      )}
    >
      <div className="border-ember-600/40 bg-ember-500/10 mb-1 flex size-10 items-center justify-center rounded-full border">
        <Icon className="text-ember-400 size-4.5" />
      </div>
      <h3 className="text-ink text-sm font-semibold">{title}</h3>
      {description && (
        <p className="text-ink-dim max-w-sm text-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
