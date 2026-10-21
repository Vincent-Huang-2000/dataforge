/**
 * Project form fields shared by the New project and Open file dialogs:
 * dataset type and the optional, vendor-grouped, filterable target model.
 */
import { useMemo, useState } from 'react';
import type { DatasetType, ModelInfo } from '@/engine/types';
import { getModel, modelsByVendor, searchModels } from '@/engine/registry';
import { fmtCtx } from '@/lib/utils';
import { Badge, type BadgeProps } from '@/components/ui/Badge';
import { Input, Label } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from '@/components/ui/Select';

const TYPE_OPTIONS: { value: DatasetType; label: string; hint: string }[] = [
  { value: 'sft', label: 'SFT', hint: 'instruction/chat tuning' },
  { value: 'preference', label: 'DPO', hint: 'preference pairs' },
  { value: 'kto', label: 'KTO', hint: 'thumbs up/down feedback' },
  { value: 'rl', label: 'RL', hint: 'verifiable answers for GRPO' },
  { value: 'pretrain', label: 'PT', hint: 'raw text for continued pretraining' },
];

const SIZE_TONES: Record<ModelInfo['sizeClass'], BadgeProps['tone']> = {
  small: 'ok',
  medium: 'info',
  large: 'warn',
};

/** Sentinel for "no target model" — Radix Select forbids empty item values. */
export const NO_TARGET_MODEL = 'none';

export function DatasetTypeField({
  idPrefix,
  value,
  onChange,
  hint,
}: {
  idPrefix: string;
  value: DatasetType;
  onChange: (value: DatasetType) => void;
  hint?: string;
}) {
  const selected = TYPE_OPTIONS.find((t) => t.value === value) ?? TYPE_OPTIONS[0];
  const labelId = `${idPrefix}-type-label`;

  return (
    <div>
      <Label id={labelId}>Dataset type</Label>
      <Select value={value} onValueChange={(v) => onChange(v as DatasetType)}>
        <SelectTrigger aria-labelledby={labelId}>
          <span>
            <span className="font-medium">{selected.label}</span>
            <span className="text-ink-dim"> · {selected.hint}</span>
          </span>
        </SelectTrigger>
        <SelectContent>
          {TYPE_OPTIONS.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              <span className="font-medium">{t.label}</span>
              <span className="text-ink-faint"> · {t.hint}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint && <p className="text-ink-faint mt-1 text-xs">{hint}</p>}
    </div>
  );
}

export function TargetModelField({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string;
  /** Registry id, or {@link NO_TARGET_MODEL}. */
  value: string;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState('');
  const labelId = `${idPrefix}-model-label`;

  const groups = useMemo(() => {
    const matched = new Set(searchModels(query).map((m) => m.id));
    return Object.entries(modelsByVendor())
      .map(([vendor, models]) => ({
        vendor,
        models: models.filter((m) => matched.has(m.id)),
      }))
      .filter((g) => g.models.length > 0)
      .sort((a, b) => a.vendor.localeCompare(b.vendor));
  }, [query]);

  const selected = value === NO_TARGET_MODEL ? undefined : getModel(value);

  return (
    <div>
      <Label id={labelId}>
        Target model <span className="text-ink-faint font-normal">(optional)</span>
      </Label>
      <Select value={value} onValueChange={onChange} onOpenChange={(o) => !o && setQuery('')}>
        <SelectTrigger aria-labelledby={labelId}>
          <span className={selected ? undefined : 'text-ink-faint'}>
            {selected ? selected.name : 'No target model'}
          </span>
        </SelectTrigger>
        <SelectContent>
          <div className="border-hairline bg-surface-2 sticky top-0 z-10 -mt-1 border-b p-1.5">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Filter models…"
              className="h-8 text-[13px]"
              aria-label="Filter models"
            />
          </div>
          <SelectItem value={NO_TARGET_MODEL}>
            <span className="text-ink-dim">No target model</span>
          </SelectItem>
          {groups.map((g) => (
            <SelectGroup key={g.vendor}>
              <SelectLabel>{g.vendor}</SelectLabel>
              {g.models.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <span className="inline-flex items-center gap-2">
                    <span>{m.name}</span>
                    <span className="text-ink-faint font-mono text-[11px] tabular-nums">
                      {fmtCtx(m.nativeCtx)}
                    </span>
                    <Badge tone={SIZE_TONES[m.sizeClass]}>{m.sizeClass}</Badge>
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
          {groups.length === 0 && (
            <p className="text-ink-faint px-3 py-2 text-[13px]">
              No models match &ldquo;{query}&rdquo;
            </p>
          )}
        </SelectContent>
      </Select>
      <p className="text-ink-faint mt-1 text-xs">
        Drives chat-template rendering, token counts and context-limit checks.
      </p>
    </div>
  );
}
