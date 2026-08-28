/**
 * Runs a Playwright spec against a fixture variant and reports whether it passed.
 *
 * Invoked through node with Playwright's own CLI entry rather than through `npx`: Node 22 refuses to
 * spawn a .cmd shim without a shell, and the resulting `status: null` is indistinguishable from a
 * failing spec. That mistake once produced a fully green validation run in which Playwright had never
 * executed. This module therefore throws when the process did not actually run, and never lets
 * "could not run" collapse into "returned false".
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PLAYWRIGHT_CLI = join(ROOT, 'node_modules', '@playwright', 'test', 'cli.js');

let nextPort = 4700 + Math.floor(Math.random() * 300);

export interface SpecRunOptions {
  variant: string;
  /** Spec filename, used as Playwright's path filter, e.g. "add-task.spec.ts". */
  spec: string;
  /** Directory to load specs from. Defaults to the project's own tests/. */
  testDir?: string;
  /** Serve this directory instead of fixtures/build/<variant> — used for sabotaged guard builds. */
  variantDir?: string;
  timeoutMs?: number;
}

export interface SpecRunResult {
  passed: boolean;
  output: string;
  durationMs: number;
}

/** Playwright's own warnings about colour env vars are noise in a prompt. */
function clean(output: string): string {
  return output
    .split('\n')
    .filter((line) => !/NO_COLOR|FORCE_COLOR|trace-warnings|Use `node --trace/.test(line))
    .join('\n')
    .trim();
}

export function runSpec(options: SpecRunOptions): SpecRunResult {
  if (!existsSync(PLAYWRIGHT_CLI)) {
    throw new Error(`playwright cli not found at ${PLAYWRIGHT_CLI} — run \`npm ci\``);
  }

  const port = (nextPort += 1);
  const started = Date.now();

  const result = spawnSync(
    process.execPath,
    [PLAYWRIGHT_CLI, 'test', options.spec, '--reporter=list'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: options.timeoutMs ?? 120_000,
      env: {
        ...process.env,
        ASSAY_VARIANT: options.variant,
        ASSAY_PORT: String(port),
        ASSAY_TEST_DIR: options.testDir ?? './tests',
        FORCE_COLOR: '0',
        ...(options.variantDir ? { ASSAY_VARIANT_DIR: options.variantDir } : {})
      }
    }
  );

  const output = clean(`${result.stdout ?? ''}\n${result.stderr ?? ''}`);

  if (result.error || result.status === null) {
    throw new Error(
      `playwright did not run (${options.variant}/${options.spec}): ` +
        `${result.error?.message ?? 'no exit status'}\n${output}`
    );
  }
  if (/No tests found/i.test(output)) {
    throw new Error(`no tests matched "${options.spec}" in ${options.testDir ?? './tests'}`);
  }

  return { passed: result.status === 0, output, durationMs: Date.now() - started };
}
