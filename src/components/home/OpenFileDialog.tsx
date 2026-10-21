/**
 * Open-file dialog: turns a dataset file into a new project in one step.
 *
 * The file runs through the engine worker (parse → detect → convert) under a
 * pre-assigned project id while the dialog shows its phase. Row files then
 * show a summary with the name taken from the file and the dataset type
 * inferred from the converted examples; creating writes the project and its
 * examples atomically and lands on the data grid. Documents (PDF/DOCX/MD/TXT)
 * create an empty project and continue on its Import page's Document tab.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleAlert, FileText, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import type { DatasetType, ImportResult } from '@/engine/types';
import { inferDatasetType } from '@/engine/convert';
import { createProject, createProjectWithExamples } from '@/lib/mutations';
import { importFileToProject, type ImportPhase } from '@/lib/workerClient';
import { fmtBytes, fmtNum, isQuotaError } from '@/lib/utils';
import { PHASE_LABELS } from '@/components/import/fileTypes';
import { Badge, TypeBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Controls';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/Dialog';
import { Input, Label } from '@/components/ui/Input';
import { DatasetTypeField, NO_TARGET_MODEL, TargetModelField } from './ProjectFields';

const SAMPLE_COUNT = 3;
const ERROR_COUNT = 3;

type Stage =
  | { kind: 'loading'; phase: ImportPhase }
  | { kind: 'rows'; projectId: string; result: ImportResult }
  | { kind: 'document'; projectId: string; text: string; title: string }
  | { kind: 'error'; message: string };

/** File name without directory or extension: "support_v2.jsonl" → "support_v2". */
function nameFromFile(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}

export function OpenFileDialog({ file, onClose }: { file: File | null; onClose: () => void }) {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>({ kind: 'loading', phase: 'parsing' });
  const [name, setName] = useState('');
  const [datasetType, setDatasetType] = useState<DatasetType>('sft');
  const [targetModelId, setTargetModelId] = useState(NO_TARGET_MODEL);
  const [creating, setCreating] = useState(false);

  // Every new file starts a fresh pipeline; closing the dialog discards it.
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    const projectId = crypto.randomUUID();
    setStage({ kind: 'loading', phase: 'parsing' });
    setName(nameFromFile(file.name));
    setDatasetType('sft');
    setTargetModelId(NO_TARGET_MODEL);
    setCreating(false);

    importFileToProject(file, projectId, (phase) => {
      if (!cancelled) setStage({ kind: 'loading', phase });
    })
      .then((outcome) => {
        if (cancelled) return;
        if (outcome.kind === 'document') {
          setStage({ kind: 'document', projectId, text: outcome.text, title: outcome.title });
        } else {
          setStage({ kind: 'rows', projectId, result: outcome.result });
          setDatasetType(inferDatasetType(outcome.result.examples));
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setStage({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

  const exampleCount = stage.kind === 'rows' ? stage.result.examples.length : 0;
  const canCreate =
    !creating &&
    name.trim().length > 0 &&
    (stage.kind === 'document' || (stage.kind === 'rows' && exampleCount > 0));

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!canCreate || (stage.kind !== 'rows' && stage.kind !== 'document')) return;
    setCreating(true);
    const input = {
      id: stage.projectId,
      name: name.trim(),
      datasetType,
      targetModelId: targetModelId === NO_TARGET_MODEL ? null : targetModelId,
    };
    try {
      if (stage.kind === 'rows') {
        const project = await createProjectWithExamples(input, stage.result.examples);
        toast.success(`Opened "${project.name}" with ${fmtNum(exampleCount)} examples`);
        onClose();
        navigate(`/p/${project.id}/data`);
      } else {
        const project = await createProject(input);
        toast.success(`Project "${project.name}" created`);
        onClose();
        // ImportPage picks the document up from router state.
        navigate(`/p/${project.id}/import`, {
          state: { doc: { text: stage.text, title: stage.title } },
        });
      }
    } catch (err) {
      toast.error(
        isQuotaError(err)
          ? 'Not enough browser storage. Free space in Settings, then retry.'
          : err instanceof Error
            ? err.message
            : 'Failed to open the file',
      );
      setCreating(false);
    }
  };

  return (
    <Dialog open={file !== null} onOpenChange={(o) => !o && !creating && onClose()}>
      <DialogContent
        title="Open file"
        description="Creates a new project from the file. Stored in this browser only."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {file && (
            <div className="border-hairline bg-surface-2 flex items-center gap-2.5 rounded-(--radius-control) border px-3 py-2">
              <FileText className="text-ink-faint size-4 shrink-0" aria-hidden />
              <span className="text-ink min-w-0 truncate font-mono text-[13px]">{file.name}</span>
              <span className="text-ink-faint ml-auto shrink-0 font-mono text-xs tabular-nums">
                {fmtBytes(file.size)}
              </span>
            </div>
          )}

          {stage.kind === 'loading' && (
            <p className="text-ink-dim flex items-center gap-2 text-[13px]">
              <Spinner className="size-3.5" />
              {PHASE_LABELS[stage.phase]}…
            </p>
          )}

          {stage.kind === 'error' && (
            <p className="text-danger flex items-start gap-1.5 text-[13px]">
              <CircleAlert className="mt-px size-4 shrink-0" aria-hidden />
              <span className="min-w-0 break-words">{stage.message}</span>
            </p>
          )}

          {stage.kind === 'rows' && <RowsSummary result={stage.result} />}

          {stage.kind === 'document' && (
            <p className="text-ink-dim text-[13px] leading-relaxed">
              Document with{' '}
              <span className="text-ink font-mono tabular-nums">{fmtNum(stage.text.length)}</span>{' '}
              characters. After creating the project you choose how to turn it into examples:
              extract Q&amp;A, keep it as pretraining text, or generate examples with a model.
            </p>
          )}

          {(stage.kind === 'rows' || stage.kind === 'document') && (
            <>
              <div>
                <Label htmlFor="of-name">Project name</Label>
                <Input
                  id="of-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={120}
                  required
                />
              </div>
              <DatasetTypeField
                idPrefix="of"
                value={datasetType}
                onChange={setDatasetType}
                hint={
                  stage.kind === 'rows'
                    ? 'Detected from the converted examples.'
                    : 'Choose PT to keep the text as raw pretraining chunks.'
                }
              />
              <TargetModelField idPrefix="of" value={targetModelId} onChange={setTargetModelId} />
            </>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={onClose} disabled={creating}>
              {stage.kind === 'error' ? 'Close' : 'Cancel'}
            </Button>
            {stage.kind !== 'error' && (
              <Button type="submit" variant="solid" disabled={!canCreate}>
                {creating && <Spinner className="border-accent-ink/30 border-t-accent-ink" />}
                {stage.kind === 'rows' && exampleCount > 0
                  ? `Create project with ${fmtNum(exampleCount)} examples`
                  : 'Create project'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RowsSummary({ result }: { result: ImportResult }) {
  const { examples, schema, skipped, errors } = result;

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{schema.format}</Badge>
        <span className="text-ink-dim font-mono text-xs tabular-nums">
          {Math.round(schema.confidence * 100)}% confidence
        </span>
        <span className="text-ink ml-auto font-mono text-[13px] tabular-nums">
          {fmtNum(examples.length)} examples
          <span className="text-ink-faint"> · {fmtNum(skipped)} skipped</span>
        </span>
      </div>

      {schema.warnings.length > 0 && (
        <ul className="flex flex-col gap-1">
          {schema.warnings.map((w) => (
            <li key={w} className="text-warn flex items-start gap-1.5 text-[13px]">
              <TriangleAlert className="mt-px size-4 shrink-0" aria-hidden />
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}

      {errors.length > 0 && (
        <ul className="border-danger/30 flex flex-col gap-0.5 border-l pl-3">
          {errors.slice(0, ERROR_COUNT).map((e, i) => (
            <li key={i} className="text-ink-dim truncate font-mono text-xs" title={e}>
              {e}
            </li>
          ))}
          {errors.length > ERROR_COUNT && (
            <li className="text-ink-faint font-mono text-xs tabular-nums">
              +{fmtNum(errors.length - ERROR_COUNT)} more errors
            </li>
          )}
        </ul>
      )}

      {examples.length > 0 ? (
        <ul className="border-hairline divide-hairline/60 divide-y rounded-(--radius-control) border">
          {examples.slice(0, SAMPLE_COUNT).map((e) => {
            const msg = e.messages.find((m) => m.role === 'user') ?? e.messages[0];
            return (
              <li key={e.id} className="flex min-w-0 items-center gap-2 px-2 py-1.5">
                <TypeBadge type={e.type} className="shrink-0" />
                <span className="text-ink min-w-0 truncate text-[13px]">
                  {msg?.content.slice(0, 200) || (
                    <span className="text-ink-faint italic">no user turn</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-warn flex items-start gap-1.5 text-[13px]">
          <TriangleAlert className="mt-px size-4 shrink-0" aria-hidden />
          Nothing converted. Check the source format.
        </p>
      )}
    </div>
  );
}
