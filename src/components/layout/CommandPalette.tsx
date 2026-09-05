/**
 * Global command palette (Ctrl/Cmd+K) — navigation, project switching and
 * quick actions. Built on cmdk inside the standard Dialog primitive; the
 * dialog chrome is hidden via className so the search input is the first row
 * (keeps the Radix a11y title/description without the visible header).
 */
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Command } from 'cmdk';
import { useMatch, useNavigate } from 'react-router-dom';
import {
  ChartColumn,
  Folder,
  FolderInput,
  House,
  Moon,
  PackageOpen,
  Plus,
  Redo2,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Table2,
  Undo2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { TypeBadge } from '@/components/ui/Badge';
import { Kbd } from '@/components/ui/Controls';
import { useProjects } from '@/lib/hooks';
import { useUiStore } from '@/lib/store';
import { redo, undo, useUndoStore } from '@/lib/undo';
import { cn } from '@/lib/utils';

const PROJECT_PAGES: { route: string; label: string; icon: LucideIcon }[] = [
  { route: 'data', label: 'Data', icon: Table2 },
  { route: 'import', label: 'Import', icon: FolderInput },
  { route: 'generate', label: 'Generate', icon: Sparkles },
  { route: 'quality', label: 'Quality', icon: ShieldCheck },
  { route: 'analytics', label: 'Analytics', icon: ChartColumn },
  { route: 'export', label: 'Export', icon: PackageOpen },
];

function GroupHeading({ children }: { children: string }) {
  return <span className="tech-label block px-2.5 pt-2 pb-1">{children}</span>;
}

function PaletteItem({
  value,
  keywords,
  disabled,
  onSelect,
  children,
}: {
  value: string;
  keywords?: string[];
  disabled?: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <Command.Item
      value={value}
      keywords={keywords}
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        'text-ink-dim flex cursor-default items-center gap-2.5 rounded-(--radius-control) px-2.5 py-1.5 text-sm select-none',
        'data-[selected=true]:bg-surface-3 data-[selected=true]:text-ink data-[disabled=true]:opacity-45',
        '[&_svg]:text-ink-faint [&_svg]:size-4 [&_svg]:shrink-0',
      )}
    >
      {children}
    </Command.Item>
  );
}

export function CommandPalette() {
  const open = useUiStore((s) => s.commandPaletteOpen);
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const projects = useProjects();
  const undoStack = useUndoStore((s) => s.undoStack);
  const redoStack = useUndoStore((s) => s.redoStack);
  const navigate = useNavigate();
  const match = useMatch('/p/:projectId/*');
  const projectId = match?.params.projectId;
  const [search, setSearch] = useState('');

  const lastUndo = undoStack[undoStack.length - 1]?.label;
  const lastRedo = redoStack[redoStack.length - 1]?.label;
  const otherProjects = projects?.filter((p) => p.id !== projectId) ?? [];

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setSearch('');
  };

  const run = (action: () => void) => {
    handleOpenChange(false);
    action();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        title="Command palette"
        description="Jump to a page, switch projects, or run an action"
        className={cn(
          'bg-surface-2 top-[15%] max-w-lg translate-y-0 overflow-hidden',
          '[&>.panel-header]:hidden',
          '[&>div:last-child]:max-h-none [&>div:last-child]:overflow-visible [&>div:last-child]:p-0',
        )}
      >
        <Command label="Command palette" loop>
          <div className="border-hairline flex items-center gap-2 border-b px-3">
            <Search className="text-ink-faint size-4 shrink-0" aria-hidden="true" />
            <Command.Input
              autoFocus
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command or search…"
              className="text-ink placeholder:text-ink-faint h-10 w-full bg-transparent text-sm outline-none"
            />
          </div>

          <Command.List className="max-h-80 overflow-y-auto overscroll-contain p-1.5">
            <Command.Empty className="text-ink-faint py-10 text-center text-[13px]">
              No matches for "{search}".
            </Command.Empty>

            <Command.Group heading={<GroupHeading>Navigate</GroupHeading>}>
              {projectId &&
                PROJECT_PAGES.map((page) => (
                  <PaletteItem
                    key={page.route}
                    value={`nav-${page.route}`}
                    keywords={[page.label]}
                    onSelect={() => run(() => navigate(`/p/${projectId}/${page.route}`))}
                  >
                    <page.icon aria-hidden="true" />
                    <span>{page.label}</span>
                  </PaletteItem>
                ))}
              <PaletteItem
                value="nav-home"
                keywords={['home', 'projects']}
                onSelect={() => run(() => navigate('/'))}
              >
                <House aria-hidden="true" />
                <span>Home</span>
              </PaletteItem>
              <PaletteItem
                value="nav-settings"
                keywords={['settings', 'preferences', 'providers', 'api keys']}
                onSelect={() => run(() => navigate('/settings'))}
              >
                <Settings aria-hidden="true" />
                <span>Settings</span>
              </PaletteItem>
            </Command.Group>

            {otherProjects.length > 0 && (
              <Command.Group heading={<GroupHeading>Projects</GroupHeading>}>
                {otherProjects.map((project) => (
                  <PaletteItem
                    key={project.id}
                    value={`project-${project.id}`}
                    keywords={[project.name]}
                    onSelect={() => run(() => navigate(`/p/${project.id}/data`))}
                  >
                    <Folder aria-hidden="true" />
                    <span className="truncate">{project.name}</span>
                    <TypeBadge type={project.datasetType} className="ml-auto shrink-0" />
                  </PaletteItem>
                ))}
              </Command.Group>
            )}

            <Command.Group heading={<GroupHeading>Actions</GroupHeading>}>
              <PaletteItem
                value="action-new-project"
                keywords={['new', 'create', 'project']}
                onSelect={() => run(() => navigate('/?new=1'))}
              >
                <Plus aria-hidden="true" />
                <span>New project</span>
              </PaletteItem>
              <PaletteItem
                value="action-toggle-theme"
                keywords={['theme', 'dark', 'light', 'toggle']}
                onSelect={() => run(() => setTheme(theme === 'dark' ? 'light' : 'dark'))}
              >
                {theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
                <span>Switch to {theme === 'dark' ? 'light' : 'dark'} theme</span>
              </PaletteItem>
              <PaletteItem
                value="action-undo"
                keywords={['undo']}
                disabled={!lastUndo}
                onSelect={() =>
                  run(() => {
                    void undo().then((label) => {
                      if (label) toast(`Undid: ${label}`);
                    });
                  })
                }
              >
                <Undo2 aria-hidden="true" />
                <span className="truncate">{lastUndo ? `Undo: ${lastUndo}` : 'Undo'}</span>
                <span className="ml-auto shrink-0">
                  <Kbd>Ctrl Z</Kbd>
                </span>
              </PaletteItem>
              <PaletteItem
                value="action-redo"
                keywords={['redo']}
                disabled={!lastRedo}
                onSelect={() =>
                  run(() => {
                    void redo().then((label) => {
                      if (label) toast(`Redid: ${label}`);
                    });
                  })
                }
              >
                <Redo2 aria-hidden="true" />
                <span className="truncate">{lastRedo ? `Redo: ${lastRedo}` : 'Redo'}</span>
                <span className="ml-auto shrink-0">
                  <Kbd>Ctrl ⇧ Z</Kbd>
                </span>
              </PaletteItem>
            </Command.Group>
          </Command.List>

          <div className="border-hairline text-ink-faint flex items-center gap-4 border-t px-3 py-2 text-xs">
            <span className="flex items-center gap-1.5">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> Navigate
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>↵</Kbd> Run
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>Esc</Kbd> Close
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
