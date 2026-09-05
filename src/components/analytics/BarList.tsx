import type { ReactNode } from 'react';
import { cn, fmtNum } from '@/lib/utils';

export interface BarListItem {
  /** Stable row key; falls back to the row index. */
  key?: string;
  label: ReactNode;
  value: number;
  /** Pre-formatted value cell; defaults to fmtNum(value). */
  display?: string;
  /** Per-row bar color class (e.g. "bg-heat-cold"); defaults to ember accent. */
  barClassName?: string;
}

/**
 * Horizontal bar list: [label | thin bar scaled to max | mono value].
 * CSS-only — flat bars on surface-3 tracks in the Forge style.
 */
export function BarList({
  items,
  labelClassName,
  className,
}: {
  items: BarListItem[];
  /** Width/typography override for the label column (default w-24). */
  labelClassName?: string;
  className?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {items.map((item, i) => (
        <div key={item.key ?? i} className="flex items-center gap-3">
          <div className={cn('text-ink-dim w-24 shrink-0 truncate text-[13px]', labelClassName)}>
            {item.label}
          </div>
          <div className="bg-surface-3 h-1.5 min-w-0 flex-1 overflow-hidden rounded-full">
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-300',
                item.barClassName ?? 'bg-ember-500',
              )}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
          <div className="text-ink w-14 shrink-0 text-right font-mono text-[13px] tabular-nums">
            {item.display ?? fmtNum(item.value)}
          </div>
        </div>
      ))}
    </div>
  );
}
