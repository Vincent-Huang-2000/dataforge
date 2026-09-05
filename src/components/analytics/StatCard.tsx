import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Instrument readout: tech-label title, large mono value, optional sub-line.
 * Used in the analytics stat row; renders as a flat Forge panel.
 */
export function StatCard({
  label,
  value,
  sub,
  className,
  style,
}: {
  label: string;
  value: ReactNode;
  /** Optional secondary line (counts, badges, inline actions). */
  sub?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={cn('panel flex flex-col gap-1.5 p-3', className)} style={style}>
      <h2 className="tech-label">{label}</h2>
      <div className="text-ink font-mono text-[22px] leading-none font-medium tabular-nums">
        {value}
      </div>
      {sub != null && (
        <div className="text-ink-dim mt-auto flex min-h-6 items-center gap-2 text-xs">{sub}</div>
      )}
    </div>
  );
}
