# Assay

Self-healing Playwright tests that stay honest.

Submission for micro1's Frontier Engineering Challenge 2026. Coding-agent use: **Claude Code**
(`claude-opus-5`) built this project under human direction — see [Agent trajectories](#agent-trajectories).
The healer and baseline it built talk to a configurable OpenAI-compatible model; scored runs use
`nemo-super` via ilmu.ai.

## Who has this problem

An engineer who owns a Playwright suite for a web app under active UI development. The app works.
The suite doesn't, because a designer renamed a class, a button went icon-only, or a list item grew
a wrapper `<div>`. Nothing broke — the DOM moved. This is **locator rot**, and it is the single most
common reason teams stop trusting, and then stop running, their end-to-end suite.

## The bottleneck

Repairing a locator means *observing* the live page and *verifying* the repair by re-running the
test — an observe → act → verify loop, not a one-shot text transform. That is exactly the shape of
task an agent is suited to and a static tool is not. The toil is real but low-judgment, which makes
it tempting to automate carelessly.

That carelessness is the actual danger. A tool that just wants tests to go green will find that the
cheapest way to make `expect(count).toBe(3)` pass is to delete it. The suite goes green. The
coverage is gone. Nobody finds out until the bug it used to catch reaches production. So the real
question this project answers is not "can an agent make tests pass again" — a bad answer to that is
easy — but **can it tell the difference between a test that needs repairing and an application that
needs fixing, and can it prove its own repairs still work.**

## Design

Full spec, frozen before implementation, in [DESIGN.md](DESIGN.md). It was written and locked before
any code existed specifically so the evaluation could not be tuned afterward to flatter the result.
Every departure from it during the build is logged as a numbered, dated entry in
[deviations/](deviations/) rather than edited into the spec — that log is also the source for the
changelog below.

**The metric.** A repair is scored `valid` only if it passes on the mutated build **and still fails**
on a defect build where the feature it covers is deliberately broken. The defect builds exist only in
the scorer; neither system ever sees them.

**The agent.** `TRIAGE → REPAIR → VERIFY → GUARD → ESCALATE`. Triage is one deterministic structural
comparison against the last known-good build — no model call — that decides whether this is a repair
job at all. Guard re-runs an accepted repair against a self-generated sabotaged build; if it still
passes, the repair detects nothing and is rejected. Nothing is auto-applied: output is a diff and a
report for a human to approve.

**The baseline.** One direct prompt: failing spec, real Playwright output, rendered page. No
verification. It is given the same permission to refuse that the agent has — the comparison has to
isolate the workflow, not one system being denied an option the other has.

## Headline result

Model `nemo-super`, run `hollow-v1`, 18 cases (15 heal, 3 no-heal). Full detail:
[results/runs/hollow-v1/](results/runs/hollow-v1/).

| Metric | Baseline | Agent | Change |
| --- | ---: | ---: | ---: |
| **Valid heal rate** (15 heal cases) | 60.0% | **80.0%** | +20.0 pts |
| **Correct refusal rate** (3 no-heal) | 0.0% | **100.0%** | +100.0 pts |
| **Correct action rate** (all 18) | 50.0% | **83.3%** | +33.3 pts |
| False heal rate | 5.6% | **0.0%** | −5.6 pts |
| Pass rate — *the misleading one* | 55.6% | 66.7% | — |

Pass rate is reported only so the gap is visible. The baseline produced 10 patches that pass, of
which just 9 are valid; one — `n03`, an off-by-one counter bug — got its expectation rewritten to
match the bug, certifying it as correct behaviour. That single artifact is most of the argument for
this project: on pass rate it's a success, on valid heal rate it's the worst possible outcome, same
file. See [results/runs/hollow-v1/guard-counterfactual.md](results/runs/hollow-v1/guard-counterfactual.md)
for the sharper case — a repair the guard rejected that would otherwise have shipped a confirmed
false heal.

**A second full run moved the baseline's correct action rate to 55.6%** (from 50.0%) — same code,
same prompts, temperature 0, one baseline case (`m02`) produced a different completion. `nemo-super`
is far more stable run-to-run than `kimi-k3` below, but is not perfectly deterministic in practice;
see [D015](deviations/D015-nemo-super-not-fully-deterministic.md), which corrects an earlier claim in
this README that overstated it. The agent's numbers were identical across both runs.

**On a stronger model, the story changes.** The same 15-case set run on `kimi-k3` (Moonshot) has
*both* systems score 100% on everything — reported in full rather than dropped, see
[D012](deviations/D012-frontier-model-saturates.md). The set has no headroom left once the model is
strong enough to one-shot every case. What survives at that scale is not correctness but cost and
determinism: on the three no-heal cases, K3's baseline spent **156 seconds and 5,143 output tokens**
reasoning its way to "the application is broken" — a verdict triage reaches from a DOM diff, for
nothing, and considerably more reliably.

## Improvement changelog

Sixteen numbered deviations are recorded in [deviations/](deviations/) with full reasoning and
measurements; this is the summarized version the brief asks for. **Bold** rows are where measurement
overturned the original plan.

| Stage | What was tried, and why | Evidence | Decision |
| --- | --- | --- | --- |
| Baseline | One direct prompt, given rendered DOM (not the static file) and the same refusal option the agent gets — for fairness, not to weaken it | 0/3 correct refusals; rewrote `n03`'s expectations to match an off-by-one bug | Kept as designed. [D008](deviations/D008-baseline-fairness.md) |
| Iteration 1 | Frozen-spec assertion rule: repairs may only touch locators, never assertions | Unsatisfiable on `m10` (full Spanish relabel forces a literal-text change); the model's own hollow edit on `n01` showed the *behavioural* property was what mattered, not the syntactic one | Relaxed to "may not weaken," enforcement moved entirely to the guard. [D001](deviations/D001-assertion-immutability-relaxed.md) |
| Iteration 2 | Ambiguity trap case (`m09`) as originally scoped: a second "Delete" in a header menu | Didn't bite — every deletion spec was already row-scoped, so a 4th delete button changed nothing measurable | Redefined as a duplicate composer, which breaks a locator that *is* unique on `v0`. [D002](deviations/D002-m09-ambiguity-trap-redefined.md) |
| **Iteration 3** | **Triage v1: classify a failure as "locator unresolved" vs. "assertion mismatch" by pattern-matching Playwright's log text** | **Ran on all 15 cases. Misclassified `m04` and `n03` — in opposite directions — because the log text doesn't mean what the patterns assumed** | **Removed.** Replaced with one structural-diff comparison that treats label-bearing text (a button's name) as structural and data text (a counter's value) as not. [D009](deviations/D009-composite-triage.md), [D010](deviations/D010-triage-drops-log-scraping.md) |
| Iteration 4 | Re-ran corrected triage | 15/15 correctly classified, including both cases that broke v1 | Kept. |
| **Iteration 5** | **Full 15-case run on a second, stronger model (`kimi-k3`) to see if the result holds at frontier scale** | **Both systems: 100% on everything. Zero measured improvement.** Cost gap remained: 156s / 5,143 tokens to reach a verdict triage reaches for free | **Reported as a real finding, not discarded.** `nemo-super` kept as the headline configuration because it is far more reproducible than K3, which cannot run below temperature 1 at all — though not perfectly reproducible itself; see [D015](deviations/D015-nemo-super-not-fully-deterministic.md). [D012](deviations/D012-frontier-model-saturates.md) |
| **Iteration 6** | **Audited whether the guard — named as the project's central contribution — had ever actually rejected a repair** | **Zero rejections in 34 attempts across two models.** Every avoided false heal came from triage, not the guard | Flagged as an open, unresolved finding rather than left implicit. [D013](deviations/D013-guard-has-not-earned-its-keep.md) |
| Iteration 7 | Added 3 cases (`h01`–`h03`) designed to tempt a hollow repair while a correct one still exists — the gap the original 15 never tested | Guard fired for the first time: rejected a patch that passed the app *and* a build with filtering completely broken. Verified independently by hand-scoring the rejected patch against both builds | Kept; evaluation set is now 18 cases. Guard's contribution confirmed, at smaller volume than triage. [D014](deviations/D014-hollow-temptation-cases.md) |
| **Iteration 8** | **Ran a second full evaluation, unrelated to determinism — just to time the pipeline accurately for the reproduction guide** | **Baseline correct action rate moved 50.0% → 55.6% between two identical-config runs.** One case (`m02`) produced a different model completion at temperature 0 | **Corrected an earlier overclaim** that `nemo-super` reproduces "byte-for-byte," which had been based on a 2-call sample. [D015](deviations/D015-nemo-super-not-fully-deterministic.md) |
| Final | Combined result | Table above | 18-case set, `nemo-super` headline (most-reproducible option, not a perfectly deterministic one), `kimi-k3` reported as a robustness check |

## Main failure mode

The agent still loses `m09`: it fell for the ambiguity trap it was designed to expose, tried
`.first()` against the duplicate composer three times, and escalated rather than find the real one.
And `m12` — a composer hidden behind a collapsed `<details>` — needs an *action* before a locator
even applies, and a repairer that only rewrites locators cannot solve it. Both are real, reported
losses, not smoothed over.

## Hot take

**A check that cannot tell "it ran and passed" from "it never ran" is not a check — and this bug
will happen to you twice before you notice the pattern.** It happened twice in this project alone.
First, fixture validation reported 22/22 passed while Playwright had never executed once — Node 22
refuses to spawn a `.cmd` shim without a shell, returns `status: null`, and a naive `status === 0`
check reads that as "failed," which is indistinguishable from a genuine failure when every check in
the suite expects one. Second, a model-capability probe reported "the model did not refuse" as a
finding about the model's *behaviour* — while every one of its six API calls had actually failed with
an HTTP 400. Any harness that shells out, calls an API, or wraps a subprocess and then collapses the
result to a boolean can make this exact mistake. The fix in both cases was the same: throw on "did
not run," never let it fall through to "returned false," and keep at least one check in the suite
that expects success — because a suite where every check expects failure cannot tell a working
harness from a dead one.

## Reproduce it

```bash
npm ci
npx playwright install chromium
cp .env.example .env        # fill in ASSAY_PRIMARY_* — any OpenAI-compatible endpoint
npm run fixtures:build      # ~7s
npm run fixtures:validate   # ~5 min — proves the evaluation set is sound before trusting any score
npm run eval                # baseline + agent + scorer
npm run report               # renders results/runs/<id>/report.html
```

Full guide — exact versions, expected output, per-step runtime and token cost, what changes on a
different model, Windows-specific notes: **[REPRODUCE.md](REPRODUCE.md)**.

To see one case rather than all eighteen: `ASSAY_CASE=n03 npm run agent` runs in ~8 seconds and makes
zero model calls — the agent refuses, because the application is what's broken.

## Report

`npm run report` renders `results/runs/<id>/report.html` — one self-contained page, no external
assets. Every case shows the original spec against what each system actually delivered as a real
line diff, the agent's triage reasoning, every repair attempt with its guard verdict, and any
escalation report. This is the artifact a person reads, not a dashboard — the rubric has no UI
criterion and this project spent no time building one.

## Agent trajectories

- **Build-time agent** (Claude Code, wrote this project): [trajectories/build-agent/](trajectories/build-agent/)
- **Runtime agents** (the healer and baseline, one file per model call): `results/runs/<id>/traces/`

## Ground rules

Consequential actions require a human: the agent never auto-applies a patch, only proposes a diff
plus a report. Credentials never enter the repo (`.env` is gitignored and was checked before every
publish). Every headline number links to the run and case that produced it — see
[deviations/](deviations/) and [results/runs/](results/runs/).
