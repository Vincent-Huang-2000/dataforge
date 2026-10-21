/**
 * ZIP archive support for the import router: lists the dataset files inside
 * an archive (typically a DataForge export bundle) so each can be parsed,
 * and maps their file names to dataset splits.
 *
 * No DOM, no React — safe in Web Workers and Node (vitest).
 */

import { unzipSync } from 'fflate';
import type { SplitName } from '@/engine/types';

/** Archive files that are never dataset rows (export metadata, LLaMA-Factory registry). */
const NON_DATA_FILES: ReadonlySet<string> = new Set(['metadata.json', 'dataset_info.json']);

/** File base names (lower-cased, no extension) that name a split. */
const SPLIT_NAMES: Readonly<Record<string, SplitName>> = {
  train: 'train',
  training: 'train',
  validation: 'validation',
  valid: 'validation',
  val: 'validation',
  dev: 'validation',
  eval: 'validation',
  test: 'test',
};

/** One file extracted from an archive. */
export interface ArchiveEntry {
  /** Path inside the archive (e.g. `data/train.jsonl`). */
  name: string;
  data: ArrayBuffer;
}

function baseName(path: string): string {
  return path.split('/').pop() ?? path;
}

/**
 * Unpacks the entries of a ZIP archive accepted by `isDataFile`, in path
 * order. Directories, macOS resource forks (`__MACOSX/`), dotfiles and known
 * metadata files are skipped without being decompressed.
 *
 * @throws When the bytes are not a valid ZIP archive.
 */
export function listArchiveFiles(
  data: ArrayBuffer,
  isDataFile: (path: string) => boolean,
): ArchiveEntry[] {
  const files = unzipSync(new Uint8Array(data), {
    filter: (file) => {
      const base = baseName(file.name);
      return (
        !file.name.endsWith('/') &&
        !file.name.startsWith('__MACOSX/') &&
        !base.startsWith('.') &&
        !NON_DATA_FILES.has(base.toLowerCase()) &&
        isDataFile(file.name)
      );
    },
  });
  return Object.keys(files)
    .sort()
    .map((name) => {
      const bytes = files[name];
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      return { name, data: buffer as ArrayBuffer };
    });
}

/**
 * The split a data file's base name denotes (`data/validation.jsonl` →
 * `validation`, `val.csv` → `validation`); anything else is `train`.
 */
export function splitFromFileName(path: string): SplitName {
  const base = baseName(path).toLowerCase();
  const dot = base.lastIndexOf('.');
  return SPLIT_NAMES[dot > 0 ? base.slice(0, dot) : base] ?? 'train';
}
