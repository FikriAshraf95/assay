/**
 * The evaluation harness: run both systems on the same cases, score them the same way, publish the
 * comparison.
 *
 *   npm run eval                      run baseline and agent, then score
 *   ASSAY_RUN_ID=<id> npm run eval    score an existing run without spending tokens
 *
 * Publishing is gated. If the two systems did not face the same model, the comparison is a blend of
 * two different systems and the harness refuses to present it as a result.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAgent, type AgentCaseResult } from '../agent/run.js';
import { runBaseline, type CaseAttempt } from '../baseline/run.js';
import { readManifest, runId } from '../harness/manifest.js';
import { MissingCredentialsError } from '../llm/client.js';
import { isCorrect, scoreCase, summarize, type CaseScore, type SystemMetrics } from './score.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

interface BaselineSummary {
  modelsSeen: string[];
  totals: { promptTokens: number; completionTokens: number };
  attempts: CaseAttempt[];
}

interface AgentSummary {
  modelsSeen: string[];
  totals: { promptTokens: number; completionTokens: number; modelCalls: number };
  results: AgentCaseResult[];
}

function runDir(id: string): string {
  return join(ROOT, 'results', 'runs', id);
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function bar(value: number): string {
  const filled = Math.round((value / 100) * 20);
  return `${'█'.repeat(filled)}${'·'.repeat(20 - filled)}`;
}

function pct(value: number): string {
  return `${value.toFixed(1)}%`.padStart(6);
}

function delta(before: number, after: number): string {
  const diff = after - before;
  const sign = diff > 0 ? '+' : '';
  return `${sign}${diff.toFixed(1)} pts`;
}

export async function evaluate(id: string): Promise<void> {
  const cases = readManifest();
  const dir = runDir(id);

  const baselinePath = join(dir, 'baseline', 'summary.json');
  const agentPath = join(dir, 'agent', 'summary.json');

  if (!existsSync(baselinePath)) {
    console.log('no baseline run found for this id — running it now\n');
    await runBaseline(id);
    console.log('');
  }
  if (!existsSync(agentPath)) {
    console.log('no agent run found for this id — running it now\n');
    await runAgent(id);
    console.log('');
  }

  const baseline = readJson<BaselineSummary>(baselinePath);
  const agent = readJson<AgentSummary>(agentPath);

  // --- integrity gate ----------------------------------------------------------------------
  const models = new Set([...baseline.modelsSeen, ...agent.modelsSeen]);
  if (models.size !== 1) {
    console.error(
      `\nREFUSING TO PUBLISH: the two systems did not face the same model.\n` +
        `  baseline: ${baseline.modelsSeen.join(', ') || 'none'}\n` +
        `  agent:    ${agent.modelsSeen.join(', ') || 'none'}\n\n` +
        `A comparison across different models measures the models, not the workflow. Re-run with\n` +
        `ASSAY_ALLOW_FALLBACK=0 so a mid-run downgrade cannot silently blend two systems.\n`
    );
    process.exit(1);
  }
  const model = [...models][0] ?? 'unknown';

  // --- score -------------------------------------------------------------------------------
  console.log(`scoring run ${id} — model ${model}\n`);
  console.log(`${'case'.padEnd(6)}${'baseline'.padEnd(20)}agent`);
  console.log('─'.repeat(52));

  const baselineScores: CaseScore[] = [];
  const agentScores: CaseScore[] = [];

  for (const evalCase of cases) {
    const baseAttempt = baseline.attempts.find((a) => a.caseId === evalCase.id);
    const agentResult = agent.results.find((r) => r.caseId === evalCase.id);

    const baseScore = scoreCase({
      evalCase,
      patchedTestDir: baseAttempt?.patchedTestDir ?? null,
      systemOutcome: baseAttempt?.outcome ?? 'missing'
    });
    const agentScore = scoreCase({
      evalCase,
      patchedTestDir: agentResult?.patchedTestDir ?? null,
      systemOutcome: agentResult?.outcome ?? 'missing'
    });

    baselineScores.push(baseScore);
    agentScores.push(agentScore);

    const mark = (score: CaseScore) => (isCorrect(score) ? ' ' : '!');
    console.log(
      `${evalCase.id.padEnd(6)}` +
        `${mark(baseScore)}${baseScore.outcome.padEnd(19)}` +
        `${mark(agentScore)}${agentScore.outcome}`
    );
  }

  const baselineMetrics = summarize('baseline', baselineScores, {
    promptTokens: baseline.totals.promptTokens,
    completionTokens: baseline.totals.completionTokens,
    modelCalls: baseline.attempts.length
  });
  const agentMetrics = summarize('agent', agentScores, {
    promptTokens: agent.totals.promptTokens,
    completionTokens: agent.totals.completionTokens,
    modelCalls: agent.totals.modelCalls
  });

  // --- headline ----------------------------------------------------------------------------
  // Pass rate is neutral, not "lower is better". It is reported only so the distance between it and
  // the valid heal rate is visible — that distance is the finding.
  type Direction = 'higher' | 'lower' | 'neutral';
  // Counts come from the manifest, never hardcoded — adding cases must not silently mislabel a
  // rate. An earlier version said "12 heal cases" after the set had grown to 15.
  const n = agentMetrics;
  const rows: [string, number, number, Direction][] = [
    [`Valid heal rate (${n.healCases} heal cases)`, baselineMetrics.validHealRate, n.validHealRate, 'higher'],
    [`Correct refusal rate (${n.noHealCases} no-heal)`, baselineMetrics.correctRefusalRate, n.correctRefusalRate, 'higher'],
    [`Correct action rate (all ${n.cases})`, baselineMetrics.correctActionRate, n.correctActionRate, 'higher'],
    [`False heal rate (all ${n.cases})`, baselineMetrics.falseHealRate, n.falseHealRate, 'lower'],
    ['Pass rate — the misleading one', baselineMetrics.passRate, n.passRate, 'neutral']
  ];

  console.log(`\n${'─'.repeat(72)}`);
  console.log(`${'metric'.padEnd(34)}${'baseline'.padStart(10)}${'agent'.padStart(10)}${'change'.padStart(12)}`);
  console.log('─'.repeat(72));
  for (const [label, before, after, direction] of rows) {
    const improved = direction === 'higher' ? after > before : after < before;
    const mark =
      direction === 'neutral' || after === before ? '  ' : improved ? ' +' : ' -';
    console.log(
      `${label.padEnd(34)}${pct(before).padStart(10)}${pct(after).padStart(10)}${delta(before, after).padStart(12)}${mark}`
    );
  }
  console.log('─'.repeat(72));
  console.log(`${'valid heal rate'.padEnd(16)} baseline ${bar(baselineMetrics.validHealRate)}`);
  console.log(`${''.padEnd(16)} agent    ${bar(agentMetrics.validHealRate)}`);

  console.log(
    `\ntokens   baseline ${(baselineMetrics.promptTokens + baselineMetrics.completionTokens).toLocaleString()}` +
      `   agent ${(agentMetrics.promptTokens + agentMetrics.completionTokens).toLocaleString()}`
  );
  console.log(
    `calls    baseline ${baselineMetrics.modelCalls}   agent ${agentMetrics.modelCalls}` +
      `   (agent spends more per case and refuses without spending at all)`
  );
  console.log(
    `handed to a human   baseline ${baselineMetrics.handedToHuman}   agent ${agentMetrics.handedToHuman}`
  );

  const comparison = {
    runId: id,
    at: new Date().toISOString(),
    model,
    metrics: { baseline: baselineMetrics, agent: agentMetrics },
    cases: cases.map((evalCase, index) => ({
      id: evalCase.id,
      kind: evalCase.kind,
      title: evalCase.title,
      defeats: evalCase.defeats,
      primarySpec: evalCase.primarySpec,
      defectLabel: evalCase.defectLabel,
      baseline: baselineScores[index],
      agent: agentScores[index]
    }))
  };

  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'comparison.json'), `${JSON.stringify(comparison, null, 2)}\n`);
  console.log(`\nwrote ${join(dir, 'comparison.json')}`);
  console.log('run `npm run report` to render the reviewable HTML report');
}

async function main(): Promise<void> {
  try {
    await evaluate(runId());
  } catch (error) {
    if (error instanceof MissingCredentialsError) {
      console.error(`\n${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}

export type { SystemMetrics };
