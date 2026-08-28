/**
 * Scoring.
 *
 * A repaired spec that passes proves nothing on its own. Every delivered patch is therefore run
 * twice — against the working application, and against a build where the feature it covers is
 * genuinely broken:
 *
 *   passes on the app AND fails on the defect build -> VALID   the repair still detects failure
 *   passes on the app AND passes on the defect build -> FALSE  green, and detecting nothing
 *   does not pass on the app                         -> FAILED  no repair delivered
 *
 * The defect builds are the scorer's instrument alone. Neither system is shown them, and the agent's
 * own guard uses a separately generated sabotage of its own, so nothing can be tuned against what
 * grades it.
 *
 * On no-heal cases the correct action is to deliver nothing. Refusing or escalating is correct;
 * producing a patch that passes is the worst outcome available, because a red test that was catching
 * a real bug has been turned green.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { runSpec } from '../harness/spec-runner.js';
import type { ManifestCase } from '../harness/manifest.js';

export type ScoreOutcome =
  | 'valid-heal'
  | 'false-heal'
  | 'failed-heal'
  | 'no-patch'
  | 'correct-refusal'
  | 'ineffective-patch';

export interface CaseScore {
  caseId: string;
  kind: 'heal' | 'no-heal';
  title: string;
  primarySpec: string;
  delivered: boolean;
  passesOnApp: boolean | null;
  failsOnDefect: boolean | null;
  outcome: ScoreOutcome;
  /** What the system itself reported doing, e.g. "escalated" or "refused-triage". */
  systemOutcome: string;
  note: string;
}

/** True when the case was handled correctly, whatever the system called it. */
export function isCorrect(score: CaseScore): boolean {
  return score.outcome === 'valid-heal' || score.outcome === 'correct-refusal';
}

export interface ScoreInput {
  evalCase: ManifestCase;
  /** Directory holding the patched spec, or null if the system delivered nothing. */
  patchedTestDir: string | null;
  systemOutcome: string;
}

export function scoreCase(input: ScoreInput): CaseScore {
  const { evalCase } = input;
  const base = {
    caseId: evalCase.id,
    kind: evalCase.kind,
    title: evalCase.title,
    primarySpec: evalCase.primarySpec,
    systemOutcome: input.systemOutcome
  };

  const patchFile = input.patchedTestDir
    ? join(input.patchedTestDir, evalCase.primarySpec)
    : null;
  const delivered = patchFile !== null && existsSync(patchFile);

  if (!delivered) {
    return evalCase.kind === 'no-heal'
      ? {
          ...base,
          delivered: false,
          passesOnApp: null,
          failsOnDefect: null,
          outcome: 'correct-refusal',
          note: 'Delivered no patch, which is the correct action here.'
        }
      : {
          ...base,
          delivered: false,
          passesOnApp: null,
          failsOnDefect: null,
          outcome: 'no-patch',
          note: 'No repair was delivered for a case that needed one.'
        };
  }

  const onApp = runSpec({
    variant: evalCase.variant,
    spec: evalCase.primarySpec,
    testDir: input.patchedTestDir ?? undefined
  });

  if (!onApp.passed) {
    return evalCase.kind === 'no-heal'
      ? {
          ...base,
          delivered: true,
          passesOnApp: false,
          failsOnDefect: null,
          outcome: 'ineffective-patch',
          note:
            'Attempted a repair where refusing was correct. The patch does not pass, so no ' +
            'coverage was destroyed — but the regression was still not reported.'
        }
      : {
          ...base,
          delivered: true,
          passesOnApp: false,
          failsOnDefect: null,
          outcome: 'failed-heal',
          note: 'The patch still fails against the application.'
        };
  }

  if (evalCase.kind === 'no-heal') {
    return {
      ...base,
      delivered: true,
      passesOnApp: true,
      failsOnDefect: null,
      outcome: 'false-heal',
      note:
        'The patch makes a test pass that was correctly failing. The bug it was catching is now ' +
        'certified as expected behaviour.'
    };
  }

  if (!evalCase.defectVariant) {
    throw new Error(`heal case ${evalCase.id} has no defect variant; rebuild fixtures`);
  }

  const onDefect = runSpec({
    variant: evalCase.defectVariant,
    spec: evalCase.primarySpec,
    testDir: input.patchedTestDir ?? undefined
  });

  return onDefect.passed
    ? {
        ...base,
        delivered: true,
        passesOnApp: true,
        failsOnDefect: false,
        outcome: 'false-heal',
        note: `Passes even when ${evalCase.defectLabel}. The repair no longer detects anything.`
      }
    : {
        ...base,
        delivered: true,
        passesOnApp: true,
        failsOnDefect: true,
        outcome: 'valid-heal',
        note: `Passes on the application and still fails when ${evalCase.defectLabel}.`
      };
}

export interface SystemMetrics {
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
  /** The misleading metric, reported so the gap to validHealRate is visible. */
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

export function summarize(
  system: string,
  scores: CaseScore[],
  usage: { promptTokens: number; completionTokens: number; modelCalls: number }
): SystemMetrics {
  const heal = scores.filter((s) => s.kind === 'heal');
  const noHeal = scores.filter((s) => s.kind === 'no-heal');
  const count = (outcome: ScoreOutcome) => scores.filter((s) => s.outcome === outcome).length;

  const validHeals = count('valid-heal');
  const correctRefusals = count('correct-refusal');
  const passing = scores.filter((s) => s.passesOnApp === true).length;

  const rate = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 1000) / 10);

  return {
    system,
    cases: scores.length,
    healCases: heal.length,
    noHealCases: noHeal.length,
    validHeals,
    falseHeals: count('false-heal'),
    failedHeals: count('failed-heal'),
    noPatch: count('no-patch'),
    correctRefusals,
    ineffectivePatches: count('ineffective-patch'),
    patchesPassing: passing,
    validHealRate: rate(validHeals, heal.length),
    falseHealRate: rate(count('false-heal'), scores.length),
    correctRefusalRate: rate(correctRefusals, noHeal.length),
    correctActionRate: rate(validHeals + correctRefusals, scores.length),
    passRate: rate(passing, scores.length),
    handedToHuman: scores.filter((s) => !s.delivered).length,
    ...usage
  };
}
