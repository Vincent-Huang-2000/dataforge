/**
 * File-import constants shared by the Import page's File tab and Home's
 * Open file dialog.
 */
import type { ImportPhase } from '@/lib/workerClient';

/** Extensions the engine importers accept (rows files, documents, ZIP archives). */
export const ACCEPT_EXTENSIONS = [
  '.jsonl',
  '.ndjson',
  '.json',
  '.csv',
  '.tsv',
  '.parquet',
  '.xlsx',
  '.xls',
  '.pdf',
  '.docx',
  '.md',
  '.txt',
  '.zip',
] as const;

export const PHASE_LABELS: Record<ImportPhase, string> = {
  parsing: 'Parsing',
  detecting: 'Detecting format',
  converting: 'Converting',
};
