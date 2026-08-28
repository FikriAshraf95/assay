/**
 * The agent: triage → observe → repair → verify → guard → escalate.
 *
 *   TRIAGE    decide whether this is even a repair job, before any model call (D009)
 *   OBSERVE   rendered DOM, accessibility tree, and what moved since the last passing build
 *   REPAIR    propose a patched spec
 *   VERIFY    run the patch against the real application; red -> feed the failure back and retry
 *   GUARD     run the patch against a sabotaged build; still green -> the patch is hollow, retry
 *   ESCALATE  out of attempts -> stop and hand a human a report, never a silent green
 *
 * Nothing here is auto-applied. The output is a diff and a report for a person to approve, which is
 * also what the brief's ground rules require for consequential actions.
 *
 *   npm run agent
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { capturePage } from '../harness/page.js';
import { runSpec } from '../harness/spec-runner.js';
import { LlmClient, MissingCredentialsError } from '../llm/client.js';
import { readManifest, runId, type ManifestCase } from '../harness/manifest.js';
import { materializeMutant, SABOTAGE_LABEL } from './mutant.js';
import { buildInitialMessages, buildRetryMessages, parseRepair, type RejectionKind, type RepairContext } from './prompt.js';
import { triage, type TriageResult } from './triage.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const MAX_ATTEMPTS = 3;

export type AgentOutcome =
  | 'refused-triage'
  | 'refused-model'
  | 'accepted-guarded'
  | 'accepted-unguarded'
  | 'escalated'
  | 'error';

export interface AgentAttemptRecord {
  attempt: number;
  parse: 'patched' | 'refused' | 'unparseable';
  verified: boolean | null;
  guard: 'confirmed' | 'hollow' | 'not-diagnostic' | 'skipped';
  rejection: RejectionKind | null;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
}

export interface AgentCaseResult {
  caseId: string;
  kind: 'heal' | 'no-heal';
  primarySpec: string;
  variant: string;
  outcome: AgentOutcome;
  triage: TriageResult | null;
  attempts: AgentAttemptRecord[];
  patchedTestDir: string | null;
  modelCalls: number;
  promptTokens: number;
  completionTokens: number;
  escalationReport: string | null;
  error: string | null;
}

/** Does this spec detect an inert application at all? A spec asserting that nothing happens does
 *  not, and the guard must not be trusted to judge it. Mirrors the check that every scorer defect is
 *  load-bearing (D004) — the agent validates its own instrument before believing it. */
function isGuardDiagnostic(spec: string, v0MutantDir: string): boolean {
  const run = runSpec({ variant: 'v0', spec, variantDir: v0MutantDir });
  return !run.passed;
}

function renderTrajectory(result: AgentCaseResult, evalCase: ManifestCase): string {
  const lines = [
    `# ${result.caseId} — ${evalCase.title}`,
    '',
    `- Spec: \`${result.primarySpec}\``,
    `- Variant: \`${result.variant}\``,
    `- Case kind: ${result.kind}`,
    `- Outcome: **${result.outcome}**`,
    `- Model calls: ${result.modelCalls}`,
    ''
  ];

  if (result.triage) {
    lines.push(
      '## Triage',
      '',
      `- Structure changed since last passing build: ${result.triage.structureChanged ? 'yes' : 'no'}`,
      `- Verdict: **${result.triage.verdict}**`,
      '',
      result.triage.reason,
      '',
      '```',
      result.triage.structureSummary,
      '```',
      ''
    );
  }

  if (result.attempts.length > 0) {
    lines.push('## Repair attempts', '');
    for (const attempt of result.attempts) {
      lines.push(
        `**Attempt ${attempt.attempt}** — parse: ${attempt.parse}, ` +
          `verify: ${attempt.verified === null ? 'n/a' : attempt.verified ? 'passed' : 'failed'}, ` +
          `guard: ${attempt.guard}` +
          (attempt.rejection ? ` → rejected (${attempt.rejection})` : '') +
          `  _(${attempt.promptTokens}+${attempt.completionTokens} tok, ${attempt.latencyMs}ms)_`
      );
    }
    lines.push('');
  }

  if (result.escalationReport) {
    lines.push('## Handed to a human', '', result.escalationReport, '');
  }

  return lines.join('\n');
}

export async function runAgent(id: string): Promise<AgentCaseResult[]> {
  const cases = readManifest();
  const outRoot = join(ROOT, 'results', 'runs', id, 'agent');
  mkdirSync(outRoot, { recursive: true });

  const client = new LlmClient({
    traceDir: join(ROOT, 'results', 'runs', id, 'traces', 'agent'),
    actor: 'agent'
  });

  console.log(`agent — run ${id}`);
  console.log(`model: ${client.describe().primaryModel}\n`);

  const knownGood = await capturePage('v0');
  const v0MutantDir = materializeMutant('v0');
  const diagnosticCache = new Map<string, boolean>();

  const results: AgentCaseResult[] = [];

  for (const evalCase of cases) {
    process.stdout.write(`${evalCase.id} ${evalCase.primarySpec.padEnd(26)} `);

    const caseDir = join(outRoot, evalCase.id);
    const patchedTestDir = join(caseDir, 'tests');
    mkdirSync(patchedTestDir, { recursive: true });

    const result: AgentCaseResult = {
      caseId: evalCase.id,
      kind: evalCase.kind,
      primarySpec: evalCase.primarySpec,
      variant: evalCase.variant,
      outcome: 'error',
      triage: null,
      attempts: [],
      patchedTestDir: null,
      modelCalls: 0,
      promptTokens: 0,
      completionTokens: 0,
      escalationReport: null,
      error: null
    };

    try {
      const failure = runSpec({ variant: evalCase.variant, spec: evalCase.primarySpec });
      if (failure.passed) {
        throw new Error(
          `${evalCase.primarySpec} unexpectedly passes on ${evalCase.variant} — ` +
            'run `npm run fixtures:validate`'
        );
      }

      const specSource = readFileSync(join(ROOT, 'tests', evalCase.primarySpec), 'utf8');
      const current = await capturePage(evalCase.variant);

      const verdict = triage({
        knownGoodHtml: knownGood.html,
        currentHtml: current.html
      });
      result.triage = verdict;

      if (verdict.verdict === 'refuse') {
        result.outcome = 'refused-triage';
        result.escalationReport = [
          `**Suspected regression in the application, not the test.**`,
          '',
          verdict.reason,
          '',
          'No repair was attempted and no model was consulted. A person should look at the',
          'application before this test is touched.'
        ].join('\n');
        results.push(result);
        writeFileSync(join(caseDir, 'trajectory.json'), `${JSON.stringify(result, null, 2)}\n`);
        writeFileSync(join(caseDir, 'trajectory.md'), renderTrajectory(result, evalCase));
        console.log('refused-triage   (0 model calls)');
        continue;
      }

      const context: RepairContext = {
        specName: evalCase.primarySpec,
        specSource,
        failureOutput: failure.output,
        html: current.html,
        aria: current.aria,
        triageReason: verdict.reason,
        structureSummary: verdict.structureSummary
      };

      if (!diagnosticCache.has(evalCase.primarySpec)) {
        diagnosticCache.set(evalCase.primarySpec, isGuardDiagnostic(evalCase.primarySpec, v0MutantDir));
      }
      const guardIsDiagnostic = diagnosticCache.get(evalCase.primarySpec) === true;
      const variantMutantDir = materializeMutant(evalCase.variant);

      let previous: { code: string; kind: RejectionKind; detail: string } | null = null;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        const messages = previous ? buildRetryMessages(context, previous) : buildInitialMessages(context);
        const response = await client.complete(messages, `${evalCase.id}-attempt-${attempt}`);
        result.modelCalls += 1;
        result.promptTokens += response.promptTokens;
        result.completionTokens += response.completionTokens;

        const parsed = parseRepair(response.text);
        const record: AgentAttemptRecord = {
          attempt,
          parse: parsed.outcome,
          verified: null,
          guard: 'skipped',
          rejection: null,
          promptTokens: response.promptTokens,
          completionTokens: response.completionTokens,
          latencyMs: response.latencyMs
        };

        writeFileSync(join(caseDir, `reply-${attempt}.txt`), response.text);

        if (parsed.outcome === 'refused') {
          result.attempts.push(record);
          result.outcome = 'refused-model';
          break;
        }

        if (parsed.outcome === 'unparseable' || !parsed.code) {
          record.rejection = 'unparseable';
          result.attempts.push(record);
          previous = { code: response.text.slice(0, 2_000), kind: 'unparseable', detail: '' };
          continue;
        }

        writeFileSync(join(patchedTestDir, evalCase.primarySpec), `${parsed.code}\n`);

        const verify = runSpec({
          variant: evalCase.variant,
          spec: evalCase.primarySpec,
          testDir: patchedTestDir
        });
        record.verified = verify.passed;

        if (!verify.passed) {
          record.rejection = 'still-failing';
          result.attempts.push(record);
          previous = { code: parsed.code, kind: 'still-failing', detail: verify.output };
          continue;
        }

        if (!guardIsDiagnostic) {
          record.guard = 'not-diagnostic';
          result.attempts.push(record);
          result.outcome = 'accepted-unguarded';
          result.patchedTestDir = patchedTestDir;
          break;
        }

        const guarded = runSpec({
          variant: evalCase.variant,
          spec: evalCase.primarySpec,
          testDir: patchedTestDir,
          variantDir: variantMutantDir
        });

        if (guarded.passed) {
          record.guard = 'hollow';
          record.rejection = 'hollow';
          result.attempts.push(record);
          previous = {
            code: parsed.code,
            kind: 'hollow',
            detail: `The patch passed against a build where ${SABOTAGE_LABEL}.`
          };
          continue;
        }

        record.guard = 'confirmed';
        result.attempts.push(record);
        result.outcome = 'accepted-guarded';
        result.patchedTestDir = patchedTestDir;
        break;
      }

      if (result.outcome === 'error') {
        result.outcome = 'escalated';
        const last = result.attempts.at(-1);
        result.escalationReport = [
          `**No repair could be verified after ${result.attempts.length} attempt(s).**`,
          '',
          last?.rejection === 'hollow'
            ? 'Every candidate repair either failed against the application, or passed against a ' +
              'build where the feature was deliberately broken — meaning it no longer detected ' +
              'anything. Rather than hand over a test that is green and empty, the run stopped here.'
            : 'No candidate repair passed against the application. The control this test needs may ' +
              'have been removed rather than moved, which is a product decision rather than a ' +
              'repair.',
          '',
          'A person should decide whether this test should be rewritten, retargeted or deleted.'
        ].join('\n');
      }

      writeFileSync(join(caseDir, 'trajectory.json'), `${JSON.stringify(result, null, 2)}\n`);
      writeFileSync(join(caseDir, 'trajectory.md'), renderTrajectory(result, evalCase));
      results.push(result);

      console.log(
        `${result.outcome.padEnd(18)} ${result.modelCalls} call(s), ` +
          `${result.promptTokens}+${result.completionTokens} tok`
      );
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      result.outcome = 'error';
      results.push(result);
      writeFileSync(join(caseDir, 'trajectory.json'), `${JSON.stringify(result, null, 2)}\n`);
      console.log(`error            ${result.error.split('\n')[0]}`);
    }
  }

  const count = (outcome: AgentOutcome) => results.filter((r) => r.outcome === outcome).length;

  const summary = {
    runId: id,
    system: 'agent',
    at: new Date().toISOString(),
    config: client.describe(),
    modelsSeen: [...client.modelsSeen],
    totals: {
      cases: results.length,
      acceptedGuarded: count('accepted-guarded'),
      acceptedUnguarded: count('accepted-unguarded'),
      refusedTriage: count('refused-triage'),
      refusedModel: count('refused-model'),
      escalated: count('escalated'),
      errors: count('error'),
      modelCalls: results.reduce((n, r) => n + r.modelCalls, 0),
      promptTokens: client.totalPromptTokens,
      completionTokens: client.totalCompletionTokens
    },
    results
  };

  writeFileSync(join(outRoot, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

  console.log(
    `\naccepted ${summary.totals.acceptedGuarded} guarded / ${summary.totals.acceptedUnguarded} unguarded, ` +
      `refused ${summary.totals.refusedTriage} triage / ${summary.totals.refusedModel} model, ` +
      `escalated ${summary.totals.escalated}, errors ${summary.totals.errors}`
  );
  console.log(
    `tokens: ${client.totalPromptTokens.toLocaleString()} in / ` +
      `${client.totalCompletionTokens.toLocaleString()} out over ${summary.totals.modelCalls} call(s)`
  );
  console.log(`\nwrote ${outRoot}`);

  return results;
}

async function main(): Promise<void> {
  try {
    await runAgent(runId());
  } catch (error) {
    if (error instanceof MissingCredentialsError) {
      console.error(`\n${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }
}

// Only run when invoked directly, so the eval harness can import runAgent without executing it.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
