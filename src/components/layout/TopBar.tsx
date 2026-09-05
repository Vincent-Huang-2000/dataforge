/**
 * Workbench top bar: project identity on the left, global controls on the
 * right (jobs, undo/redo, command palette, theme, GitHub).
 */
import { Moon, Redo2, Search, Sun, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { TypeBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Kbd } from '@/components/ui/Controls';
import { Tip } from '@/components/ui/Tooltip';
import { JobIndicator } from '@/components/layout/JobIndicator';
import { GITHUB_URL, GitHubMark } from '@/components/layout/SiteHeader';
import { useProjectCounts } from '@/lib/hooks';
import { useUiStore } from '@/lib/store';
import { redo, undo, useUndoStore } from '@/lib/undo';
import { fmtNum } from '@/lib/utils';
import type { Project } from '@/engine/types';

/** True on macOS, where the palette shortcut renders as ⌘ instead of Ctrl. */
function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /mac/i.test(navigator.platform || navigator.userAgent);
}

const PALETTE_HINT = isMacPlatform() ? '⌘ K' : 'Ctrl K';

export function TopBar({ project }: { project: Project }) {
  const counts = useProjectCounts();
  const canUndo = useUndoStore((s) => s.undoStack.length > 0);
  const canRedo = useUndoStore((s) => s.redoStack.length > 0);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);

  const themeLabel = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

  const handleUndo = () => {
    void undo().then((label) => {
      if (label) toast(`Undid: ${label}`);
    });
  };
  const handleRedo = () => {
    void redo().then((label) => {
      if (label) toast(`Redid: ${label}`);
    });
  };

  return (
    <header className="border-hairline bg-surface flex h-12 shrink-0 items-center justify-between gap-3 border-b px-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <h1 className="text-ink truncate text-[15px] font-semibold">{project.name}</h1>
        <TypeBadge type={project.datasetType} className="shrink-0" />
        <span className="text-ink-dim shrink-0 font-mono text-xs tabular-nums">
          {fmtNum(counts?.[project.id])} examples
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <JobIndicator />
        <Tip label="Undo (Ctrl+Z)">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Undo"
            disabled={!canUndo}
            onClick={handleUndo}
          >
            <Undo2 />
          </Button>
        </Tip>
        <Tip label="Redo (Ctrl+Shift+Z)">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Redo"
            disabled={!canRedo}
            onClick={handleRedo}
          >
            <Redo2 />
          </Button>
        </Tip>
        <div className="bg-hairline mx-1 h-4 w-px" aria-hidden="true" />
        <Button
          variant="ghost"
          size="sm"
          aria-label="Open command palette"
          onClick={() => setCommandPaletteOpen(true)}
        >
          <Search />
          <Kbd>{PALETTE_HINT}</Kbd>
        </Button>
        <Tip label={themeLabel}>
          <Button
            variant="ghost"
            size="icon"
            aria-label={themeLabel}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun /> : <Moon />}
          </Button>
        </Tip>
        <Tip label="View source on GitHub">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="DataForge on GitHub"
            className="text-ink-dim hover:bg-surface-3 hover:text-ink flex size-7 items-center justify-center rounded-(--radius-control) transition-colors duration-100"
          >
            <GitHubMark className="size-4" />
          </a>
        </Tip>
      </div>
    </header>
  );
}
