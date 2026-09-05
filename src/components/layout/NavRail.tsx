/**
 * Collapsible workbench navigation rail. Expanded state shows labels; collapsed
 * state keeps the compact icon rail and right-side tooltips.
 * Active page = 2px amber edge bar + amber icon.
 */
import { Link, NavLink } from 'react-router-dom';
import {
  ChartColumn,
  ChevronLeft,
  ChevronRight,
  FolderInput,
  House,
  PackageOpen,
  Settings,
  ShieldCheck,
  Sparkles,
  Table2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Tip } from '@/components/ui/Tooltip';
import { BrandMark } from '@/components/layout/SiteHeader';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/lib/store';

const PAGES: { to: string; label: string; icon: LucideIcon }[] = [
  { to: 'data', label: 'Data', icon: Table2 },
  { to: 'import', label: 'Import', icon: FolderInput },
  { to: 'generate', label: 'Generate', icon: Sparkles },
  { to: 'quality', label: 'Quality', icon: ShieldCheck },
  { to: 'analytics', label: 'Analytics', icon: ChartColumn },
  { to: 'export', label: 'Export', icon: PackageOpen },
];

const ITEM = 'relative flex h-11 w-full items-center overflow-hidden transition-colors duration-100';

function PrimaryItem({
  to,
  label,
  icon: Icon,
  isCollapsed,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  isCollapsed: boolean;
}) {
  const link = (
    <NavLink
      to={to}
      aria-label={label}
      className={cn(
        ITEM,
        isCollapsed ? 'justify-center' : 'gap-3 px-4 text-left',
        'text-ink-dim hover:text-ink [&.active]:text-accent',
      )}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              aria-hidden="true"
              className="absolute inset-y-1.5 left-0 w-0.5 bg-accent"
            />
          )}
          <Icon className="size-5 shrink-0" aria-hidden="true" />
          {!isCollapsed && (
            <span className="min-w-0 truncate whitespace-nowrap text-[13px] font-medium">
              {label}
            </span>
          )}
        </>
      )}
    </NavLink>
  );

  return isCollapsed ? (
    <Tip label={label} side="right">
      {link}
    </Tip>
  ) : (
    link
  );
}

function SecondaryItem({
  to,
  label,
  icon: Icon,
  isCollapsed,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  isCollapsed: boolean;
}) {
  const link = (
    <Link
      to={to}
      aria-label={label}
      className={cn(
        ITEM,
        isCollapsed ? 'justify-center' : 'gap-3 px-4 text-left',
        'text-ink-dim hover:text-ink',
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      {!isCollapsed && (
        <span className="min-w-0 truncate whitespace-nowrap text-[13px] font-medium">{label}</span>
      )}
    </Link>
  );

  return isCollapsed ? (
    <Tip label={label} side="right">
      {link}
    </Tip>
  ) : (
    link
  );
}

export function NavRail() {
  const isCollapsed = useUiStore((s) => s.navRailCollapsed);
  const toggleNavRail = useUiStore((s) => s.toggleNavRail);
  const toggleLabel = isCollapsed ? 'Expand navigation' : 'Collapse navigation';

  return (
    <nav
      aria-label="Workbench"
      className={cn(
        'flex shrink-0 flex-col overflow-hidden border-r border-hairline bg-surface transition-[width] duration-200 motion-reduce:transition-none',
        isCollapsed ? 'w-16' : 'w-52',
      )}
    >
      <Tip label={toggleLabel} side="right">
        <button
          type="button"
          aria-label={toggleLabel}
          aria-expanded={!isCollapsed}
          onClick={toggleNavRail}
          className="flex h-12 w-full shrink-0 items-center justify-between gap-2 border-b border-hairline px-3 transition-colors duration-100 hover:bg-surface-2"
        >
          <BrandMark className="size-6 shrink-0" />
          {!isCollapsed && (
            <span className="min-w-0 flex-1 truncate text-left text-sm font-semibold tracking-tight text-ink">
              DataForge Studio
            </span>
          )}
          {isCollapsed ? (
            <ChevronRight className="size-4 shrink-0 text-ink-dim" aria-hidden="true" />
          ) : (
            <ChevronLeft className="size-4 shrink-0 text-ink-dim" aria-hidden="true" />
          )}
        </button>
      </Tip>

      <div className="flex flex-1 flex-col gap-0.5 py-2">
        {PAGES.map((page) => (
          <PrimaryItem key={page.to} {...page} isCollapsed={isCollapsed} />
        ))}
      </div>

      <div className="flex flex-col gap-0.5 border-t border-hairline py-2">
        <SecondaryItem to="/" label="Home" icon={House} isCollapsed={isCollapsed} />
        <SecondaryItem to="/settings" label="Settings" icon={Settings} isCollapsed={isCollapsed} />
      </div>
    </nav>
  );
}
