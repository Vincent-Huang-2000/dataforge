/**
 * ZIP archive support for the import router: lists the dataset files inside
 * an archive (typically a DataForge export bundle) so each can be parsed,
 * reads the dataset type a DataForge export declares in its metadata, and
 * maps file names to dataset splits.
 *
 * No DOM, no React — safe in Web Workers and Node (vitest).
 */

import { strFromU8, unzipSync } from 'fflate';
import { DATASET_TYPES, type DatasetType, type SplitName } from '@/engine/types';

/** The provenance file every DataForge export bundle carries. */
const EXPORT_METADATA_FILE = 'metadata.json';

/** Archive files that are never dataset rows (export metadata, LLaMA-Factory registry). */
const NON_DATA_FILES: ReadonlySet<string> = new Set([EXPORT_METADATA_FILE, 'dataset_info.json']);

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

/** The dataset files of an archive plus what its export metadata declares. */
export interface ArchiveContents {
  /** Data files accepted by the caller, in path order. */
  entries: ArchiveEntry[];
  /** `options.datasetType` from a DataForge export's `metadata.json`, if any. */
  datasetType?: DatasetType;
}

function baseName(path: string): string {
  return path.split('/').pop() ?? path;
}

function isIgnored(path: string): boolean {
  return path.endsWith('/') || path.startsWith('__MACOSX/') || baseName(path).startsWith('.');
}

/**
 * The dataset type a DataForge export declares in its `metadata.json`
 * (`generator` "DataForge Studio …", `options.datasetType`), or undefined
 * for any other or malformed metadata.
 */
function exportDatasetType(bytes: Uint8Array): DatasetType | undefined {
  let metadata: unknown;
  try {
    metadata = JSON.parse(strFromU8(bytes)) as unknown;
  } catch {
    return undefined;
  }
  if (typeof metadata !== 'object' || metadata === null) return undefined;
  const { generator, options } = metadata as Record<string, unknown>;
  if (typeof generator !== 'string' || !generator.startsWith('DataForge Studio')) return undefined;
  if (typeof options !== 'object' || options === null) return undefined;
  const datasetType = (options as Record<string, unknown>)['datasetType'];
  return DATASET_TYPES.find((type) => type === datasetType);
}

/**
 * Unpacks a ZIP archive: the entries accepted by `isDataFile` (directories,
 * macOS resource forks, dotfiles and known metadata files are skipped without
 * being decompressed) plus the dataset type declared by a DataForge export's
 * `metadata.json`, the shallowest one when several are present.
 *
 * @throws When the bytes are not a valid ZIP archive.
 */
export function readArchive(
  data: ArrayBuffer,
  isDataFile: (path: string) => boolean,
): ArchiveContents {
  const files = unzipSync(new Uint8Array(data), {
    filter: (file) => {
      if (isIgnored(file.name)) return false;
      const base = baseName(file.name).toLowerCase();
      if (base === EXPORT_METADATA_FILE) return true;
      return !NON_DATA_FILES.has(base) && isDataFile(file.name);
    },
  });
  const paths = Object.keys(files).sort();
  const metadataPath = paths
    .filter((path) => baseName(path).toLowerCase() === EXPORT_METADATA_FILE)
    .sort((a, b) => a.split('/').length - b.split('/').length)[0];
  const entries = paths
    .filter((path) => !NON_DATA_FILES.has(baseName(path).toLowerCase()))
    .map((name) => {
      const bytes = files[name];
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      return { name, data: buffer as ArrayBuffer };
    });
  const datasetType =
    metadataPath !== undefined ? exportDatasetType(files[metadataPath]) : undefined;
  return datasetType !== undefined ? { entries, datasetType } : { entries };
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
