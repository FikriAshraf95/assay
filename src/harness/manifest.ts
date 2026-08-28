/** Shared reading of the generated fixture manifest, and run identity. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

export interface ManifestCase {
  id: string;
  kind: 'heal' | 'no-heal';
  title: string;
  defeats: string;
  primarySpec: string;
  variant: string;
  defectVariant: string | null;
  defectLabel: string | null;
  refusalReason: string | null;
}

export function readManifest(): ManifestCase[] {
  const file = join(ROOT, 'fixtures', 'build', 'manifest.json');
  const parsed = JSON.parse(readFileSync(file, 'utf8')) as { cases: ManifestCase[] };
  return parsed.cases;
}

/** One id shared by the baseline and agent runs so the eval harness can pair them. */
export function runId(): string {
  return process.env.ASSAY_RUN_ID ?? new Date().toISOString().replace(/[:.]/g, '-');
}
