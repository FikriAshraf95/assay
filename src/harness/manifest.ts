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

/**
 * ASSAY_CASE restricts a run to specific cases: `ASSAY_CASE=h01` or `ASSAY_CASE=m01,n03`.
 *
 * Every entry point reads the manifest through here, so the filter applies uniformly to the
 * baseline, the agent and the scorer — a filtered eval still compares like with like. Intended for
 * demonstrating or debugging one case in seconds rather than sitting through all eighteen; scored
 * runs are always unfiltered.
 */
export function readManifest(): ManifestCase[] {
  const file = join(ROOT, 'fixtures', 'build', 'manifest.json');
  const parsed = JSON.parse(readFileSync(file, 'utf8')) as { cases: ManifestCase[] };

  const filter = process.env.ASSAY_CASE?.trim();
  if (!filter) return parsed.cases;

  const wanted = new Set(filter.split(',').map((id) => id.trim()).filter(Boolean));
  const selected = parsed.cases.filter((c) => wanted.has(c.id));

  const missing = [...wanted].filter((id) => !parsed.cases.some((c) => c.id === id));
  if (missing.length > 0) {
    throw new Error(
      `ASSAY_CASE names unknown case(s): ${missing.join(', ')}. ` +
        `Available: ${parsed.cases.map((c) => c.id).join(', ')}`
    );
  }

  console.log(`ASSAY_CASE=${filter} — running ${selected.length} of ${parsed.cases.length} cases\n`);
  return selected;
}

/** One id shared by the baseline and agent runs so the eval harness can pair them. */
export function runId(): string {
  return process.env.ASSAY_RUN_ID ?? new Date().toISOString().replace(/[:.]/g, '-');
}
