/**
 * Renders results/runs/<id>/comparison.json into a single self-contained report.html.
 *
 * This is the artifact a person actually reads — the brief has no UI criterion, so there is no
 * dashboard, just one static page with every claim linked to the evidence behind it: the original
 * spec, the patched spec, the triage reasoning, the guard verdict, the escalation report. Offline,
 * no external assets, so it opens the same way from a zip on a judge's machine as it does here.
 *
 *   npm run report                     render the most recently evaluated run
 *   ASSAY_RUN_ID=<id> npm run report   render a specific run
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { diffLines, type DiffLine } from './diff.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const RUNS_DIR = join(ROOT, 'results', 'runs');

interface CaseScore {
  caseId: string;
  kind: 'heal' | 'no-heal';
  title: string;
  primarySpec: string;
  delivered: boolean;
  outcome: string;
  systemOutcome: string;
  note: string;
}

interface ComparisonCase {
  id: string;
  kind: 'heal' | 'no-heal';
  title: string;
  defeats: string;
  primarySpec: string;
  defectLabel: string | null;
  baseline: CaseScore;
  agent: CaseScore;
}

interface SystemMetrics {
  system: string;
  cases: number;
  healCases: number;
  noHealCases: number;
  validHeals: number;
  falseHeals: number;
  failedHeals: number;
  noPatch: number;
  correctRefusals: number;
  ineffectivePatches: number;
  patchesPassing: number;
  validHealRate: number;
  falseHealRate: number;
  correctRefusalRate: number;
  correctActionRate: number;
  passRate: number;
  handedToHuman: number;
  promptTokens: number;
  completionTokens: number;
  modelCalls: number;
}

interface Comparison {
  runId: string;
  at: string;
  model: string;
  metrics: { baseline: SystemMetrics; agent: SystemMetrics };
  cases: ComparisonCase[];
}

interface AgentAttempt {
  attempt: number;
  parse: string;
  verified: boolean | null;
  guard: string;
  rejection: string | null;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
}

interface AgentTriage {
  verdict: 'repair' | 'refuse';
  structureChanged: boolean;
  reason: string;
  structureSummary: string;
}

interface AgentCaseResult {
  caseId: string;
  outcome: string;
  triage: AgentTriage | null;
  attempts: AgentAttempt[];
  escalationReport: string | null;
}

interface BaselineAttempt {
  caseId: string;
  outcome: string;
  patchedTestDir: string | null;
}

function findLatestRunId(): string {
  const runId = process.env.ASSAY_RUN_ID;
  if (runId) return runId;

  if (!existsSync(RUNS_DIR)) {
    throw new Error(`no runs found at ${RUNS_DIR} — run \`npm run eval\` first`);
  }
  const candidates = readdirSync(RUNS_DIR)
    .filter((name) => existsSync(join(RUNS_DIR, name, 'comparison.json')))
    .map((name) => ({ name, mtime: statSync(join(RUNS_DIR, name, 'comparison.json')).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  if (candidates.length === 0) {
    throw new Error(`no scored runs under ${RUNS_DIR} — run \`npm run eval\` first`);
  }
  return candidates[0]!.name;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function readIfExists(path: string): string | null {
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderDiff(before: string | null, after: string | null): string {
  if (before === null && after === null) return '<p class="muted">Nothing was delivered.</p>';
  if (after === null) return '<p class="muted">No patch was delivered for this system.</p>';
  if (before === null) before = '';

  const lines: DiffLine[] = diffLines(before.trimEnd(), after.trimEnd());
  const rendered = lines
    .map((line) => {
      const cls = line.kind === 'add' ? 'add' : line.kind === 'remove' ? 'remove' : 'ctx';
      const marker = line.kind === 'add' ? '+' : line.kind === 'remove' ? '-' : ' ';
      return `<span class="dl ${cls}">${esc(marker)} ${esc(line.text)}</span>`;
    })
    .join('\n');
  return `<pre class="diff">${rendered}</pre>`;
}

const OUTCOME_LABEL: Record<string, string> = {
  'valid-heal': 'Valid heal',
  'false-heal': 'False heal',
  'failed-heal': 'Failed heal',
  'no-patch': 'No patch delivered',
  'correct-refusal': 'Correctly refused',
  'ineffective-patch': 'Attempted, ineffective'
};

const OUTCOME_CLASS: Record<string, string> = {
  'valid-heal': 'good',
  'correct-refusal': 'good',
  'false-heal': 'bad',
  'failed-heal': 'warn',
  'no-patch': 'warn',
  'ineffective-patch': 'warn'
};

function badge(outcome: string): string {
  const cls = OUTCOME_CLASS[outcome] ?? 'warn';
  const label = OUTCOME_LABEL[outcome] ?? outcome;
  return `<span class="badge ${cls}">${esc(label)}</span>`;
}

function metricRow(label: string, baseline: number, agent: number, suffix = 'pts'): string {
  const diff = Math.round((agent - baseline) * 10) / 10;
  const sign = diff > 0 ? '+' : '';
  const cls = diff > 0 ? 'good' : diff < 0 ? 'bad' : 'neutral';
  return `
    <tr>
      <td>${esc(label)}</td>
      <td class="num">${baseline.toFixed(1)}%</td>
      <td class="num">${agent.toFixed(1)}%</td>
      <td class="num ${cls}">${sign}${diff.toFixed(1)} ${suffix}</td>
    </tr>`;
}

function bar(value: number): string {
  return `<div class="bar-track"><div class="bar-fill" style="width:${value}%"></div></div>`;
}

function main(): void {
  const runId = findLatestRunId();
  const runDir = join(RUNS_DIR, runId);
  const comparison = readJson<Comparison>(join(runDir, 'comparison.json'));

  const agentSummary = readJson<{ results: AgentCaseResult[] }>(join(runDir, 'agent', 'summary.json'));
  const baselineSummary = readJson<{ attempts: BaselineAttempt[] }>(
    join(runDir, 'baseline', 'summary.json')
  );

  const agentByCase = new Map(agentSummary.results.map((r) => [r.caseId, r]));
  const baselineByCase = new Map(baselineSummary.attempts.map((a) => [a.caseId, a]));

  // The one attempt across every run so far where the guard rejected a repair that had already
  // passed VERIFY — i.e. would have shipped as a confirmed false heal without it.
  let guardCatchCaseId: string | null = null;
  for (const [caseId, result] of agentByCase) {
    if (result.attempts.some((a) => a.guard === 'hollow')) {
      guardCatchCaseId = caseId;
      break;
    }
  }

  const { baseline: bm, agent: am } = comparison.metrics;

  const caseRows = comparison.cases
    .map((c) => {
      const original = readIfExists(join(ROOT, 'tests', c.primarySpec)) ?? '';
      const baselineAttempt = baselineByCase.get(c.id);
      const agentResult = agentByCase.get(c.id);

      const baselinePatched = baselineAttempt?.patchedTestDir
        ? readIfExists(join(baselineAttempt.patchedTestDir, c.primarySpec))
        : null;
      const agentPatched = c.agent.delivered
        ? readIfExists(join(runDir, 'agent', c.id, 'tests', c.primarySpec))
        : null;

      const isGuardCatch = c.id === guardCatchCaseId;

      const triageBlock =
        agentResult?.triage != null
          ? `<div class="sub">
               <strong>Triage:</strong> ${esc(agentResult.triage.verdict)} —
               ${esc(agentResult.triage.reason)}
             </div>`
          : '';

      const attemptsBlock =
        agentResult && agentResult.attempts.length > 0
          ? `<div class="sub"><strong>Agent attempts:</strong>
               <ul class="attempts">
                 ${agentResult.attempts
                   .map(
                     (a) =>
                       `<li>#${a.attempt} — parse ${esc(a.parse)}, ` +
                       `verify ${a.verified === null ? 'n/a' : a.verified ? 'passed' : 'failed'}, ` +
                       `guard ${esc(a.guard)}` +
                       (a.rejection ? ` <span class="tag">${esc(a.rejection)}</span>` : '') +
                       `</li>`
                   )
                   .join('')}
               </ul>
             </div>`
          : '';

      const escalation = agentResult?.escalationReport
        ? `<div class="sub escalation"><strong>Handed to a human:</strong><br>${esc(
            agentResult.escalationReport
          ).replace(/\n/g, '<br>')}</div>`
        : '';

      return `
        <details class="case ${isGuardCatch ? 'guard-catch' : ''}" id="case-${esc(c.id)}">
          <summary>
            <span class="case-id">${esc(c.id)}</span>
            <span class="case-title">${esc(c.title)}</span>
            <span class="case-badges">${badge(c.baseline.outcome)}${badge(c.agent.outcome)}</span>
          </summary>
          <div class="case-body">
            ${isGuardCatch ? '<p class="callout">This is the one case where the guard rejected a repair that had already passed VERIFY — see below.</p>' : ''}
            <p class="muted">Defeats: ${esc(c.defeats)}${
        c.defectLabel ? ` · Guard defect: ${esc(c.defectLabel)}` : ''
      }</p>

            <div class="grid">
              <div>
                <h4>Baseline ${badge(c.baseline.outcome)}</h4>
                <p class="note">${esc(c.baseline.note)}</p>
                ${renderDiff(original, baselinePatched)}
              </div>
              <div>
                <h4>Agent ${badge(c.agent.outcome)}</h4>
                <p class="note">${esc(c.agent.note)}</p>
                ${renderDiff(original, agentPatched)}
                ${triageBlock}
                ${attemptsBlock}
                ${escalation}
              </div>
            </div>
          </div>
        </details>`;
    })
    .join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Assay — evaluation report (${esc(runId)})</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root {
    --bg: #f6f6f4; --surface: #ffffff; --border: #e2e1dd; --text: #1b1b19; --muted: #6f6d67;
    --accent: #b5533a; --good: #2f7d4f; --bad: #b5533a; --warn: #a37a1f; --code-bg: #f1efe9;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #17171a; --surface: #1f1f23; --border: #32323a; --text: #ececea; --muted: #98968f;
      --accent: #d4795e; --good: #5fbf85; --bad: #e08a72; --warn: #d8ab55; --code-bg: #16161a;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 2.5rem 1rem 5rem; background: var(--bg); color: var(--text);
    font: 15px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  main { max-width: 62rem; margin: 0 auto; }
  h1 { font-size: 1.6rem; letter-spacing: -0.02em; margin: 0 0 0.25rem; }
  h2 { font-size: 1.1rem; margin: 2.5rem 0 0.75rem; padding-bottom: 0.4rem; border-bottom: 1px solid var(--border); }
  h4 { margin: 0 0 0.4rem; font-size: 0.9rem; }
  .meta { color: var(--muted); font-size: 0.875rem; margin-bottom: 1.5rem; }
  .muted { color: var(--muted); }
  .note { color: var(--muted); font-size: 0.8125rem; margin: 0 0 0.5rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  th, td { text-align: left; padding: 0.5rem 0.6rem; border-bottom: 1px solid var(--border); }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.good, span.good { color: var(--good); }
  td.bad, span.bad { color: var(--bad); }
  td.neutral { color: var(--muted); }
  .bars { display: grid; gap: 0.5rem; margin-top: 1rem; }
  .bar-row { display: grid; grid-template-columns: 9rem 1fr 3.5rem; align-items: center; gap: 0.6rem; font-size: 0.8125rem; }
  .bar-track { background: var(--code-bg); border-radius: 5px; height: 0.8rem; overflow: hidden; border: 1px solid var(--border); }
  .bar-fill { background: var(--accent); height: 100%; }
  .badge { display: inline-block; padding: 0.1rem 0.5rem; border-radius: 999px; font-size: 0.7rem;
    font-weight: 600; margin-left: 0.35rem; border: 1px solid currentColor; }
  .badge.good { color: var(--good); }
  .badge.bad { color: var(--bad); }
  .badge.warn { color: var(--warn); }
  details.case { background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
    margin-bottom: 0.6rem; padding: 0.1rem 0; }
  details.case[open] { padding-bottom: 0.75rem; }
  details.case.guard-catch { border-color: var(--accent); }
  summary { cursor: pointer; padding: 0.7rem 1rem; display: flex; align-items: center; gap: 0.6rem;
    list-style: none; }
  summary::-webkit-details-marker { display: none; }
  .case-id { font-family: ui-monospace, monospace; font-size: 0.8125rem; color: var(--muted);
    min-width: 2.4rem; }
  .case-title { flex: 1; }
  .case-badges { white-space: nowrap; }
  .case-body { padding: 0 1rem; }
  .callout { background: color-mix(in srgb, var(--accent) 12%, transparent); border-left: 3px solid var(--accent);
    padding: 0.5rem 0.75rem; border-radius: 4px; font-size: 0.85rem; margin-top: 0.5rem; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-top: 0.75rem; }
  @media (max-width: 46rem) { .grid { grid-template-columns: 1fr; } }
  pre.diff { background: var(--code-bg); border: 1px solid var(--border); border-radius: 8px;
    padding: 0.6rem 0.7rem; overflow-x: auto; font-size: 0.78rem; line-height: 1.5; margin: 0; }
  .dl { display: block; white-space: pre; }
  .dl.add { background: color-mix(in srgb, var(--good) 16%, transparent); }
  .dl.remove { background: color-mix(in srgb, var(--bad) 16%, transparent); }
  .sub { margin-top: 0.6rem; font-size: 0.8125rem; }
  .attempts { margin: 0.3rem 0 0; padding-left: 1.1rem; }
  .attempts li { margin-bottom: 0.2rem; }
  .tag { font-family: ui-monospace, monospace; font-size: 0.7rem; background: var(--code-bg);
    border: 1px solid var(--border); border-radius: 4px; padding: 0.05rem 0.35rem; }
  .escalation { background: var(--code-bg); border-radius: 6px; padding: 0.5rem 0.65rem; }
  footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid var(--border);
    color: var(--muted); font-size: 0.8125rem; }
  code { font-family: ui-monospace, monospace; background: var(--code-bg); padding: 0.05rem 0.3rem;
    border-radius: 4px; font-size: 0.85em; }
</style>
</head>
<body>
<main>
  <h1>Assay — evaluation report</h1>
  <p class="meta">Run <code>${esc(runId)}</code> · model <code>${esc(comparison.model)}</code> ·
    ${esc(comparison.at)} · ${comparison.cases.length} cases
    (${bm.healCases} heal, ${bm.noHealCases} no-heal)</p>

  <h2>Headline</h2>
  <table>
    <thead><tr><th>Metric</th><th class="num">Baseline</th><th class="num">Agent</th><th class="num">Change</th></tr></thead>
    <tbody>
      ${metricRow(`Valid heal rate (${am.healCases} heal cases)`, bm.validHealRate, am.validHealRate)}
      ${metricRow(`Correct refusal rate (${am.noHealCases} no-heal)`, bm.correctRefusalRate, am.correctRefusalRate)}
      ${metricRow(`Correct action rate (all ${am.cases})`, bm.correctActionRate, am.correctActionRate)}
      ${metricRow('False heal rate', bm.falseHealRate, am.falseHealRate)}
      ${metricRow('Pass rate — the misleading one', bm.passRate, am.passRate)}
    </tbody>
  </table>

  <div class="bars">
    <div class="bar-row"><span>Baseline — valid heal</span>${bar(bm.validHealRate)}<span class="num">${bm.validHealRate.toFixed(1)}%</span></div>
    <div class="bar-row"><span>Agent — valid heal</span>${bar(am.validHealRate)}<span class="num">${am.validHealRate.toFixed(1)}%</span></div>
  </div>

  <p class="meta" style="margin-top:1rem;">
    Tokens — baseline ${(bm.promptTokens + bm.completionTokens).toLocaleString()},
    agent ${(am.promptTokens + am.completionTokens).toLocaleString()} over ${am.modelCalls} calls.
    Handed to a human — baseline ${bm.handedToHuman}, agent ${am.handedToHuman}.
  </p>

  <h2>Every case</h2>
  <p class="meta">Each row shows what the primary spec looked like before, and what each system
    delivered — a real diff, not a description of one. Nothing here was auto-applied; every
    delivered patch is a proposal a person can accept or reject.</p>
  ${caseRows}

  <footer>
    Generated by <code>npm run report</code> from <code>results/runs/${esc(runId)}/comparison.json</code>.
    Full reasoning behind every design decision: <code>deviations/</code>. Raw traces for every
    model call: <code>results/runs/${esc(runId)}/traces/</code>.
  </footer>
</main>
</body>
</html>
`;

  mkdirSync(runDir, { recursive: true });
  const outPath = join(runDir, 'report.html');
  writeFileSync(outPath, html);
  console.log(`wrote ${outPath}`);
}

main();
