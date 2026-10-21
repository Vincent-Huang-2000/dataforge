/**
 * Create-project dialog: name, description, dataset type, optional target
 * model (vendor-grouped, filterable). Creating navigates to the project's
 * Import surface so empty projects land where data comes in.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { DatasetType } from '@/engine/types';
import { createProject } from '@/lib/mutations';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Controls';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/Dialog';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { DatasetTypeField, NO_TARGET_MODEL, TargetModelField } from './ProjectFields';

export function NewProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [datasetType, setDatasetType] = useState<DatasetType>('sft');
  const [targetModelId, setTargetModelId] = useState(NO_TARGET_MODEL);
  const [creating, setCreating] = useState(false);

  // Fresh form every time the dialog opens.
  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setDatasetType('sft');
      setTargetModelId(NO_TARGET_MODEL);
      setCreating(false);
    }
  }, [open]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    try {
      const project = await createProject({
        name: trimmed,
        description,
        datasetType,
        targetModelId: targetModelId === NO_TARGET_MODEL ? null : targetModelId,
      });
      toast.success(`Project "${project.name}" created`);
      onOpenChange(false);
      navigate(`/p/${project.id}/import`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create project');
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !creating && onOpenChange(o)}>
      <DialogContent
        title="New project"
        description="Stored in this browser only. Nothing leaves your machine."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label htmlFor="np-name">Name</Label>
            <Input
              id="np-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Support-bot SFT v1"
              maxLength={120}
              required
            />
          </div>

          <div>
            <Label htmlFor="np-description">Description</Label>
            <Textarea
              id="np-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this dataset teaches the model (optional)"
              className="min-h-16"
            />
          </div>

          <DatasetTypeField idPrefix="np" value={datasetType} onChange={setDatasetType} />
          <TargetModelField idPrefix="np" value={targetModelId} onChange={setTargetModelId} />

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={creating}>
              Cancel
            </Button>
            <Button type="submit" variant="solid" disabled={!name.trim() || creating}>
              {creating && <Spinner className="border-accent-ink/30 border-t-accent-ink" />}
              Create project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
