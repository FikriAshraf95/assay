/**
 * Proves the evaluation set is sound before any result computed on it is believed.
 *
 *   1. every defect genuinely breaks its feature on the *unmutated* app
 *      — an inert defect would make the guard vacuous and score correct repairs as false heals
 *   2. every case's primary spec actually fails on the variant it ships with
 *      — a case whose spec still passes is not measuring anything
 *
 * The v0-is-green check is the standard suite run and is not repeated here.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CASES, DEFECTS, FEATURE_SPECS, type FeatureKey } from './cases.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

/**
 * Invoked through node with the CLI's own entry point rather than through `npx`. Node 22 refuses to
 * spawn a .cmd shim without a shell (EINVAL), and a spawn that never runs returns a non-zero status
 * that is indistinguishable from a genuinely failing spec — which would silently turn every check
 * into a false pass. Resolving the JS entry avoids the shim, and runSpec throws rather than
 * returning a boolean if the process did not actually run.
 */
const PLAYWRIGHT_CLI = join(ROOT, 'node_modules', '@playwright', 'test', 'cli.js');

if (!existsSync(PLAYWRIGHT_CLI)) {
  console.error(`playwright cli not found at ${PLAYWRIGHT_CLI} — run \`npm ci\` first`);
  process.exit(1);
}

const SMOKE_DIR = 'src/fixtures/smoke';

interface Check {
  label: string;
  variant: string;
  spec: string;
  expect: 'pass' | 'fail';
  testDir?: string;
}

function runSpec(variant: string, spec: string, port: number, testDir?: string): boolean {
  const target = testDir ? spec : `tests/${spec}`;
  const result = spawnSync(
    process.execPath,
    [PLAYWRIGHT_CLI, 'test', target, '--reporter=dot'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        ASSAY_VARIANT: variant,
        ASSAY_PORT: String(port),
        FORCE_COLOR: '0',
        ASSAY_TEST_DIR: testDir ?? './tests'
      }
    }
  );

  if (result.error || result.status === null) {
    throw new Error(
      `playwright did not run for ${variant}/${spec}: ${result.error?.message ?? 'no exit status'}`
    );
  }
  if (/No tests found/i.test(result.stdout ?? '')) {
    throw new Error(`no tests matched ${target} for ${variant}`);
  }
  return result.status === 0;
}

function main(): void {
  const checks: Check[] = [];

  for (const [feature, spec] of Object.entries(FEATURE_SPECS) as [FeatureKey, string][]) {
    checks.push({
      label: `defect "${DEFECTS[feature].label}" breaks ${spec}`,
      variant: `v0.${feature}`,
      spec,
      expect: 'fail'
    });
  }

  for (const evalCase of CASES) {
    checks.push({
      label: `${evalCase.id} (${evalCase.title}) breaks ${evalCase.primarySpec}`,
      variant: evalCase.id,
      spec: evalCase.primarySpec,
      expect: 'fail'
    });

    if (evalCase.kind === 'heal') {
      checks.push({
        label: `${evalCase.id} is still a working application`,
        variant: evalCase.id,
        spec: 'app-works.spec.ts',
        expect: 'pass',
        testDir: SMOKE_DIR
      });
    }
  }

  let failures = 0;
  checks.forEach((check, index) => {
    const passed = runSpec(check.variant, check.spec, 4400 + index, check.testDir);
    const actual = passed ? 'pass' : 'fail';
    const ok = actual === check.expect;
    if (!ok) failures += 1;
    console.log(`${ok ? 'OK  ' : 'BAD '} ${check.label} -> spec ${actual}`);
  });

  console.log(`\n${checks.length - failures}/${checks.length} validation checks passed`);
  if (failures > 0) {
    console.error('\nthe evaluation set is not sound — fix the cases above before running eval');
    process.exit(1);
  }
}

main();
