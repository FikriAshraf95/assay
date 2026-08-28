/**
 * The baseline repairer: one direct prompt per case, no verification.
 *
 * It sees the failing spec, the real Playwright output and the rendered page, then emits a
 * replacement spec. It never re-runs the test, never looks at the page itself, and never checks
 * whether its repair still detects anything. That is the point — it is the reasonable basic way to
 * handle this task today, and the thing the agent has to beat.
 *
 * Scoring happens in the eval harness, not here. This step only produces patches.
 *
 *   npm run baseline
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { capturePage } from '../harness/page.js';
import { readManifest, runId } from '../harness/manifest.js';
import { runSpec } from '../harness/spec-runner.js';
import { LlmClient, MissingCredentialsError } from '../llm/client.js';
import { buildBaselineMessages, parseRepair } from './prompt.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

export interface CaseAttempt {
  caseId: string;
  kind: 'heal' | 'no-heal';
  primarySpec: string;
  variant: string;
  outcome: 'patched' | 'refused' | 'unparseable' | 'error';
  patchedTestDir: string | null;
  model: string;
  usedFallback: boolean;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  error: string | null;
}

export async function runBaseline(id: string): Promise<CaseAttempt[]> {
  const cases = readManifest();
  const outRoot = join(ROOT, 'results', 'runs', id, 'baseline');
  mkdirSync(outRoot, { recursive: true });

  const client = new LlmClient({
    traceDir: join(ROOT, 'results', 'runs', id, 'traces', 'baseline'),
    actor: 'baseline'
  });

  console.log(`baseline — run ${id}`);
  console.log(`model: ${client.describe().primaryModel}\n`);

  const attempts: CaseAttempt[] = [];

  for (const evalCase of cases) {
    process.stdout.write(`${evalCase.id} ${evalCase.primarySpec.padEnd(26)} `);

    const caseDir = join(outRoot, evalCase.id);
    const patchedTestDir = join(caseDir, 'tests');
    mkdirSync(patchedTestDir, { recursive: true });

    try {
      const failure = runSpec({ variant: evalCase.variant, spec: evalCase.primarySpec });
      if (failure.passed) {
        throw new Error(
          `${evalCase.primarySpec} unexpectedly passes on ${evalCase.variant}; ` +
            'the evaluation set is not in the state it should be — run `npm run fixtures:validate`'
        );
      }

      const specSource = readFileSync(join(ROOT, 'tests', evalCase.primarySpec), 'utf8');
      const { html } = await capturePage(evalCase.variant);

      const messages = buildBaselineMessages({
        specName: evalCase.primarySpec,
        specSource,
        failureOutput: failure.output,
        html
      });

      const response = await client.complete(messages, `${evalCase.id}-repair`);
      const parsed = parseRepair(response.text);

      writeFileSync(join(caseDir, 'reply.txt'), response.text);
      writeFileSync(join(caseDir, 'failure.txt'), failure.output);

      if (parsed.outcome === 'patched' && parsed.code) {
        writeFileSync(join(patchedTestDir, evalCase.primarySpec), `${parsed.code}\n`);
      }

      const attempt: CaseAttempt = {
        caseId: evalCase.id,
        kind: evalCase.kind,
        primarySpec: evalCase.primarySpec,
        variant: evalCase.variant,
        outcome: parsed.outcome,
        patchedTestDir: parsed.outcome === 'patched' ? patchedTestDir : null,
        model: response.model,
        usedFallback: response.usedFallback,
        promptTokens: response.promptTokens,
        completionTokens: response.completionTokens,
        latencyMs: response.latencyMs,
        error: null
      };

      attempts.push(attempt);
      writeFileSync(join(caseDir, 'attempt.json'), `${JSON.stringify(attempt, null, 2)}\n`);
      console.log(
        `${attempt.outcome.padEnd(12)} ${response.promptTokens}+${response.completionTokens} tok, ${response.latencyMs}ms`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const attempt: CaseAttempt = {
        caseId: evalCase.id,
        kind: evalCase.kind,
        primarySpec: evalCase.primarySpec,
        variant: evalCase.variant,
        outcome: 'error',
        patchedTestDir: null,
        model: 'none',
        usedFallback: false,
        promptTokens: 0,
        completionTokens: 0,
        latencyMs: 0,
        error: message
      };
      attempts.push(attempt);
      writeFileSync(join(caseDir, 'attempt.json'), `${JSON.stringify(attempt, null, 2)}\n`);
      console.log(`error        ${message.split('\n')[0]}`);
    }
  }

  const summary = {
    runId: id,
    system: 'baseline',
    at: new Date().toISOString(),
    config: client.describe(),
    modelsSeen: [...client.modelsSeen],
    totals: {
      cases: attempts.length,
      patched: attempts.filter((a) => a.outcome === 'patched').length,
      refused: attempts.filter((a) => a.outcome === 'refused').length,
      unparseable: attempts.filter((a) => a.outcome === 'unparseable').length,
      errors: attempts.filter((a) => a.outcome === 'error').length,
      promptTokens: client.totalPromptTokens,
      completionTokens: client.totalCompletionTokens
    },
    attempts
  };

  writeFileSync(join(outRoot, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

  console.log(
    `\n${summary.totals.patched} patched, ${summary.totals.refused} refused, ` +
      `${summary.totals.unparseable} unparseable, ${summary.totals.errors} errors`
  );
  console.log(
    `tokens: ${client.totalPromptTokens.toLocaleString()} in / ` +
      `${client.totalCompletionTokens.toLocaleString()} out`
  );
  console.log(`models served: ${[...client.modelsSeen].join(', ')}`);
  console.log(`\nwrote ${outRoot}`);

  return attempts;
}

async function main(): Promise<void> {
  try {
    await runBaseline(runId());
  } catch (error) {
    if (error instanceof MissingCredentialsError) {
      console.error(`\n${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }
}

// Only run when invoked directly, so the eval harness can import runBaseline without executing it.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
