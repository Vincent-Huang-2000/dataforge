/**
 * Home — the project launcher. Hero wordmark, storage-persistence banner,
 * project grid, and entry points for new/opened/demo projects. A dataset file
 * dropped anywhere on the page goes through the same Open file dialog.
 */
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Anvil, FlaskConical, FolderOpen, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_MODEL_ID } from '@/engine/registry';
import { bulkAddExamples } from '@/lib/db';
import { buildDemoExamples } from '@/lib/demoData';
import { useProjectCounts, useProjects } from '@/lib/hooks';
import { createProject } from '@/lib/mutations';
import { cn, fmtNum } from '@/lib/utils';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { ACCEPT_EXTENSIONS } from '@/components/import/fileTypes';
import { NewProjectDialog } from '@/components/home/NewProjectDialog';
import { OpenFileDialog } from '@/components/home/OpenFileDialog';
import { ProjectCard } from '@/components/home/ProjectCard';
import { StorageBanner } from '@/components/home/StorageBanner';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Controls';
import { EmptyState } from '@/components/ui/EmptyState';

export function HomePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const projects = useProjects();
  const counts = useProjectCounts();
  const [newOpen, setNewOpen] = useState(false);
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [openFile, setOpenFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragOver, setDragOver] = useState(false);

  // Deep link: /#/?new=1 opens the create dialog (used by the shell + docs).
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setNewOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const totalExamples = counts ? Object.values(counts).reduce((sum, n) => sum + n, 0) : undefined;

  const loadDemo = async () => {
    if (creatingDemo) return;
    setCreatingDemo(true);
    try {
      const project = await createProject({
        name: 'Demo: DataForge tour',
        description:
          'A guided sample covering SFT, DPO, KTO and RL examples. Reasoning traces and tool calls included.',
        datasetType: 'sft',
        targetModelId: DEFAULT_MODEL_ID,
      });
      await bulkAddExamples(buildDemoExamples(project.id));
      toast.success('Demo project ready');
      navigate(`/p/${project.id}/data`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create the demo project');
      setCreatingDemo(false);
    }
  };

  // Drops are ignored (but still swallowed, so the browser never navigates to
  // the file) while another dialog or the demo build is in flight.
  const dropEnabled = !newOpen && openFile === null && !creatingDemo;
  const isFileDrag = (e: DragEvent) => e.dataTransfer.types.includes('Files');

  const openFiles = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;
    if (files.length > 1) toast.info(`One file at a time. Opening "${files[0].name}".`);
    setOpenFile(files[0]);
  };

  const actionButtons = (
    <>
      <Button variant="solid" onClick={() => setNewOpen(true)} disabled={creatingDemo}>
        <Plus /> New project
      </Button>
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={creatingDemo}
      >
        <FolderOpen /> Open file
      </Button>
      <Button variant="outline" onClick={loadDemo} disabled={creatingDemo}>
        {creatingDemo ? <Spinner /> : <FlaskConical />} Load demo project
      </Button>
    </>
  );

  return (
    <div
      className="min-h-screen"
      onDragEnter={(e) => {
        if (!dropEnabled || !isFileDrag(e)) return;
        dragDepth.current += 1;
        setDragOver(true);
      }}
      onDragLeave={() => {
        if (dragDepth.current === 0) return;
        dragDepth.current -= 1;
        if (dragDepth.current === 0) setDragOver(false);
      }}
      onDragOver={(e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = dropEnabled ? 'copy' : 'none';
      }}
      onDrop={(e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
        dragDepth.current = 0;
        setDragOver(false);
        if (dropEnabled) openFiles(e.dataTransfer.files);
      }}
    >
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl space-y-5 px-4 pt-5 pb-16">
        <StorageBanner />

        <section className="texture-brushed animate-rise border-hairline rounded-(--radius-panel) border px-6 py-10 text-center">
          <h1 className="text-ink text-2xl font-semibold tracking-tight">DataForge Studio</h1>
          <p className="text-ink-dim mx-auto mt-2 max-w-md text-sm leading-relaxed">
            The fine-tuning dataset workbench. 100% local. Your data never leaves this browser.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="border-hairline bg-surface/70 inline-flex items-center gap-2 rounded-(--radius-control) border px-2.5 py-1">
              <span className="tech-label">Projects</span>
              <span className="text-ink font-mono text-[13px] tabular-nums">
                {fmtNum(projects?.length)}
              </span>
            </span>
            <span className="border-hairline bg-surface/70 inline-flex items-center gap-2 rounded-(--radius-control) border px-2.5 py-1">
              <span className="tech-label">Examples</span>
              <span className="text-ink font-mono text-[13px] tabular-nums">
                {fmtNum(totalExamples)}
              </span>
            </span>
          </div>
        </section>

        {projects && projects.length === 0 ? (
          <EmptyState
            icon={Anvil}
            title="Forge your first dataset"
            description="Create a project, open a dataset file or load the demo to start building instruction, preference and RL training data, entirely in your browser."
            className="animate-rise"
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                {actionButtons}
              </div>
            }
          />
        ) : projects ? (
          <section className="animate-rise space-y-3" aria-label="Projects">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="tech-label">Projects · {fmtNum(projects.length)}</h2>
              <div className="flex items-center gap-2">{actionButtons}</div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p, i) => (
                <div
                  key={p.id}
                  className="animate-rise"
                  style={{ animationDelay: `${Math.min(i, 9) * 35}ms` }}
                >
                  <ProjectCard project={p} exampleCount={counts?.[p.id]} />
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_EXTENSIONS.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-label="Dataset file to open"
        onChange={(e) => {
          openFiles(e.target.files);
          e.target.value = ''; // allow picking the same file again
        }}
      />

      <div
        aria-hidden="true"
        className={cn(
          'border-accent bg-ember-500/5 pointer-events-none fixed inset-3 z-40 flex items-center justify-center rounded-(--radius-panel) border-2 border-dashed transition-opacity duration-100',
          dragOver && dropEnabled ? 'opacity-100' : 'opacity-0',
        )}
      >
        <p className="bg-surface text-ink border-hairline rounded-(--radius-control) border px-4 py-2 text-sm font-medium shadow-lg">
          Drop to open as a new project
        </p>
      </div>

      <NewProjectDialog open={newOpen} onOpenChange={setNewOpen} />
      <OpenFileDialog file={openFile} onClose={() => setOpenFile(null)} />
    </div>
  );
}
