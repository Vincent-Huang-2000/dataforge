/**
 * Dataset workbench — /p/:projectId/data.
 *
 * Layout: FilterBar on top, BulkActionBar when a selection exists, then the
 * virtualized DataGrid with a resizable right-docked inspector that can maximize.
 * Filter state lives in component state and mirrors into URL params
 * (split, type, q, flagged, issues) so views are shareable; the selected
 * example travels in the `ex` param.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useFilteredDataset, useProject, type ExampleFilters } from '@/lib/hooks';
import { addExample } from '@/lib/mutations';
import { DEFAULT_INSPECTOR_DOCK_WIDTH, useUiStore } from '@/lib/store';
import { withUndo } from '@/lib/undo';
import { cn, fmtNum } from '@/lib/utils';
import { BulkActionBar } from '@/components/dataset/BulkActionBar';
import { DataGrid } from '@/components/dataset/DataGrid';
import { FilterBar } from '@/components/dataset/FilterBar';
import { InspectorPanel } from '@/components/inspector/InspectorPanel';

const PAGE = { offset: 0, limit: 100_000 };

const MIN_INSPECTOR_WIDTH = 384;
const MAX_INSPECTOR_WIDTH = 960;
const MIN_GRID_WIDTH = 516;
const SPLITTER_WIDTH = 8;

function clampInspectorWidth(width: number, maximum: number): number {
  const safeWidth = Number.isFinite(width) ? width : DEFAULT_INSPECTOR_DOCK_WIDTH;
  return Math.round(Math.min(Math.max(safeWidth, MIN_INSPECTOR_WIDTH), maximum));
}

const DEFAULT_FILTERS: ExampleFilters = {
  split: 'all',
  type: 'all',
  search: '',
  flaggedOnly: false,
  withIssuesOnly: false,
};

function filtersFromParams(params: URLSearchParams): ExampleFilters {
  const split = params.get('split');
  const type = params.get('type');
  return {
    split: split === 'train' || split === 'validation' || split === 'test' ? split : 'all',
    type: type === 'sft' || type === 'preference' || type === 'kto' || type === 'rl' ? type : 'all',
    search: params.get('q') ?? '',
    flaggedOnly: params.get('flagged') === '1',
    withIssuesOnly: params.get('issues') === '1',
  };
}

function writeFiltersToParams(prev: URLSearchParams, f: ExampleFilters): URLSearchParams {
  const next = new URLSearchParams(prev);
  const apply = (key: string, value: string | null) => {
    if (value) next.set(key, value);
    else next.delete(key);
  };
  apply('split', f.split && f.split !== 'all' ? f.split : null);
  apply('type', f.type && f.type !== 'all' ? f.type : null);
  apply('q', f.search?.trim() ? f.search : null);
  apply('flagged', f.flaggedOnly ? '1' : null);
  apply('issues', f.withIssuesOnly ? '1' : null);
  return next;
}

export function DatasetPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const project = useProject(projectId);

  const [filters, setFilters] = useState<ExampleFilters>(() => filtersFromParams(searchParams));
  const [searchInput, setSearchInput] = useState(() => searchParams.get('q') ?? '');

  const selectionCount = useUiStore((s) => s.selection.size);
  const clearSelection = useUiStore((s) => s.clearSelection);
  const inspectorDockWidth = useUiStore((s) => s.inspectorDockWidth);
  const setInspectorDockWidth = useUiStore((s) => s.setInspectorDockWidth);
  const [isInspectorMaximized, setInspectorMaximized] = useState(false);
  const [layoutWidth, setLayoutWidth] = useState<number | null>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const inspectorWidthRef = useRef(inspectorDockWidth);

  const maximumInspectorWidth = Math.max(
    MIN_INSPECTOR_WIDTH,
    Math.min(
      MAX_INSPECTOR_WIDTH,
      layoutWidth === null ? MAX_INSPECTOR_WIDTH : layoutWidth - MIN_GRID_WIDTH - SPLITTER_WIDTH,
    ),
  );
  const [inspectorWidth, setInspectorWidth] = useState(() =>
    clampInspectorWidth(inspectorDockWidth, maximumInspectorWidth),
  );

  const setClampedInspectorWidth = useCallback(
    (width: number) => {
      const next = clampInspectorWidth(width, maximumInspectorWidth);
      inspectorWidthRef.current = next;
      setInspectorWidth(next);
      return next;
    },
    [maximumInspectorWidth],
  );

  useEffect(() => {
    const element = layoutRef.current;
    if (!element) return;
    const updateWidth = () => setLayoutWidth(element.clientWidth);
    updateWidth();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (dragRef.current) return;
    setClampedInspectorWidth(inspectorDockWidth);
  }, [inspectorDockWidth, setClampedInspectorWidth]);

  const handleSplitterPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragRef.current = { startX: event.clientX, startWidth: inspectorWidthRef.current };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handleSplitterPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    setClampedInspectorWidth(drag.startWidth + drag.startX - event.clientX);
  };

  const finishSplitterDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setInspectorDockWidth(inspectorWidthRef.current);
  };

  const handleSplitterKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 80 : 24;
    let next: number | null = null;
    if (event.key === 'ArrowLeft') next = inspectorWidth + step;
    else if (event.key === 'ArrowRight') next = inspectorWidth - step;
    else if (event.key === 'Home') next = MIN_INSPECTOR_WIDTH;
    else if (event.key === 'End') next = maximumInspectorWidth;
    if (next === null) return;
    event.preventDefault();
    setInspectorDockWidth(setClampedInspectorWidth(next));
  };

  // One scan serves the whole page: rows feed totals, ids feed the inspector.
  const data = useFilteredDataset(projectId, filters, PAGE);
  const filteredIds = data?.ids;

  // A selection from another project must never feed bulk actions here.
  useEffect(() => {
    clearSelection();
  }, [projectId, clearSelection]);

  // Drop selected ids that no longer match the current data (deleted rows or
  // changed filters) so bulk actions never touch invisible examples.
  useEffect(() => {
    if (!filteredIds) return;
    const { selection, setSelection } = useUiStore.getState();
    if (selection.size === 0) return;
    const existing = new Set(filteredIds);
    const pruned = new Set([...selection].filter((id) => existing.has(id)));
    if (pruned.size !== selection.size) setSelection(pruned);
  }, [filteredIds]);

  // Mirror filter state into the URL (preserving ?ex) so views are shareable.
  useEffect(() => {
    setSearchParams((prev) => writeFiltersToParams(prev, filters), { replace: true });
  }, [filters, setSearchParams]);

  // Debounce free-text search before it hits the live query.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((prev) => (prev.search === searchInput ? prev : { ...prev, search: searchInput }));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const patchFilters = useCallback((patch: Partial<ExampleFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setFilters({ ...DEFAULT_FILTERS });
  }, []);

  const exampleId = searchParams.get('ex');

  // Replace, never push: Back should leave the page, not walk through every
  // example inspected along the way.
  const openExample = useCallback(
    (id: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('ex', id);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const closeInspector = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('ex');
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  const handleNewExample = useCallback(async () => {
    if (!projectId || !project) return;
    // A stale filter or search query would hide the new row (and drop it from
    // the inspector's prev/next chain), so start from a clean view.
    clearFilters();
    let newId: string | null = null;
    try {
      await withUndo('New example', [], async () => {
        newId = await addExample(projectId, project.datasetType);
        return [newId];
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create example');
      return;
    }
    if (newId) openExample(newId);
  }, [projectId, project, clearFilters, openExample]);

  if (!projectId) return null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="sr-only">Dataset</h1>
      <div
        className="shrink-0"
        aria-hidden={isInspectorMaximized || undefined}
        inert={isInspectorMaximized || undefined}
      >
        <FilterBar
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          filters={filters}
          onPatch={patchFilters}
          onClear={clearFilters}
          onNewExample={handleNewExample}
          filteredCount={data?.total}
          totalCount={data?.projectTotal}
        />
        {selectionCount > 0 && <BulkActionBar />}
      </div>
      <div ref={layoutRef} className="relative flex min-h-0 flex-1">
        <div
          className="flex min-w-0 flex-1"
          aria-hidden={isInspectorMaximized || undefined}
          inert={isInspectorMaximized || undefined}
        >
          <DataGrid
            data={data}
            activeId={exampleId}
            onOpen={openExample}
            onClearFilters={clearFilters}
            onNewExample={handleNewExample}
          />
        </div>
        {exampleId && (
          <>
            {!isInspectorMaximized && (
              <div
                role="separator"
                aria-label="Resize example inspector"
                aria-orientation="vertical"
                aria-valuemin={MIN_INSPECTOR_WIDTH}
                aria-valuemax={maximumInspectorWidth}
                aria-valuenow={inspectorWidth}
                tabIndex={0}
                className="group relative z-30 hidden w-2 shrink-0 cursor-col-resize touch-none outline-none lg:block"
                onPointerDown={handleSplitterPointerDown}
                onPointerMove={handleSplitterPointerMove}
                onPointerUp={finishSplitterDrag}
                onPointerCancel={finishSplitterDrag}
                onKeyDown={handleSplitterKeyDown}
                onDoubleClick={() => {
                  setInspectorDockWidth(setClampedInspectorWidth(DEFAULT_INSPECTOR_DOCK_WIDTH));
                }}
              >
                <span
                  aria-hidden="true"
                  className="bg-hairline group-hover:bg-accent group-focus-visible:bg-accent absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors"
                />
              </div>
            )}
            <aside
              aria-label="Example inspector"
              className={cn(
                'border-hairline bg-surface h-full min-h-0 shrink-0 overflow-hidden border-l',
                isInspectorMaximized
                  ? 'fixed inset-0 z-50 !w-full border-l-0 shadow-2xl shadow-black/50'
                  : 'max-lg:fixed max-lg:inset-0 max-lg:z-40 max-lg:!w-full max-lg:border-l-0 max-lg:shadow-2xl max-lg:shadow-black/50',
              )}
              style={isInspectorMaximized ? undefined : { width: inspectorWidth }}
            >
              <InspectorPanel
                exampleId={exampleId}
                onClose={closeInspector}
                filteredIds={filteredIds}
                onNavigate={openExample}
                isMaximized={isInspectorMaximized}
                onToggleMaximize={() => setInspectorMaximized((maximized) => !maximized)}
              />
            </aside>
          </>
        )}
      </div>
      {data && data.total > data.rows.length && (
        <p
          className="border-hairline text-ink-faint border-t px-3 py-1.5 text-[11px]"
          aria-hidden={isInspectorMaximized || undefined}
        >
          Showing the first {fmtNum(data.rows.length)} matches.
        </p>
      )}
    </div>
  );
}
