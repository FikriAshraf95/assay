# Reproduction guide

Written for someone starting from a clean checkout with no prior context. Every command below was
run to produce the numbers it quotes — nothing here is estimated.

## 1. What you need

| | |
| --- | --- |
| OS | Any — verified on Windows 11 (build 10.0.26200), PowerShell |
| Node.js | **≥ 22.0.0** (verified on v22.22.0) — `process.loadEnvFile` and native `.env` loading require Node 22 |
| npm | verified on 10.9.4 |
| Playwright | pinned via `package.json`, verified on 1.62.1; `npx playwright install chromium` fetches the browser build it needs |
| TypeScript | pinned, verified on 5.9.3 (only used for `npm run typecheck`; runtime uses `tsx`) |
| A model | any **OpenAI-compatible chat-completions endpoint** — see below. No Anthropic key needed; the project talks to no Anthropic API. |

No Docker, no database, no network access at eval time beyond the one model endpoint you configure.
The evaluation set itself is fully offline — 34 static fixture builds served from disk.

### A note for Windows users specifically

Node 22 on Windows cannot `spawnSync` a `.cmd` shim without a shell (`EINVAL`). Every place in this
project that shells out to Playwright invokes its JS entry point directly
(`node_modules/@playwright/test/cli.js`) rather than `npx playwright`, specifically to avoid this.
If you fork this and add a new subprocess call, do the same — see
[deviations/D004](deviations/D004-eval-set-self-validation.md) for what happens if you don't.

## 2. Setup

```bash
git clone <this repo>
cd assay
npm ci
npx playwright install chromium
```

`npm ci` installs from the committed lockfile — versions are pinned, not "latest compatible."

## 3. Configure a model

Copy `.env.example` to `.env` and fill in one provider block. `.env` is gitignored; it never enters
the repository.

```bash
cp .env.example .env
```

Minimum required:

```
ASSAY_PRIMARY_BASE_URL=<your endpoint, e.g. https://api.openai.com/v1>
ASSAY_PRIMARY_API_KEY=<your key>
ASSAY_PRIMARY_MODEL=<a model your endpoint serves>
```

Any endpoint implementing the standard `/chat/completions` shape works — verified against ilmu.ai
(`nemo-super`, the headline model in this report) and Moonshot (`kimi-k3`, a second run used as a
robustness check, see [deviations/D012](deviations/D012-frontier-model-saturates.md)). No function
calling, JSON mode, or structured outputs are used, so a small local model behind an
OpenAI-compatible shim (vLLM, Ollama, LM Studio) is a valid substitute — its results will differ from
the ones reported here, and that difference is itself informative (see D012).

Sanity-check the connection before spending anything on the full eval:

```bash
npm run llm:probe
```

Six calls, a few thousand tokens. Confirms the endpoint is reachable, the model can return a
complete file in a fenced code block, and — most importantly for this project — whether it will
decline a repair when asked to. Writes `results/probe-primary.json`.

## 4. Build and validate the evaluation set

```bash
npm run fixtures:build       # ~7 seconds
npm run fixtures:validate    # ~5 minutes — 40 real Playwright runs, not a shortcut
```

`fixtures:build` generates 34 static app variants from one base application plus the case
definitions in `src/fixtures/cases.ts` — deterministic, no network, fully reproducible byte-for-byte.

`fixtures:validate` is not optional and not decorative. It proves, by actually running Playwright,
that every behaviour-breaking "defect" build genuinely breaks its feature, and that every mutated
build is still a working application. **Trust nothing scored below until this prints
`40/40 validation checks passed`.** It is slow because it is honest — each of the 40 checks spins up
a real browser against a real local server; see [deviations/D004](deviations/D004-eval-set-self-validation.md)
for why a faster, non-executing version of this check once produced a fully green result while
Playwright had never run at all.

## 5. Run the evaluation

```bash
npm run eval
```

This runs, in order: the baseline (one prompt per case, no verification), the agent
(triage → repair → verify → guard → escalate), and the scorer (re-runs every delivered patch against
the real application and, for heal cases, a defect build the systems never see). It prints a
comparison table and writes `results/runs/<timestamp>/comparison.json`.

### Running one case

Before committing 18 minutes, you can run a single case in seconds:

```bash
ASSAY_CASE=n03 npm run agent     # ~8.5s, zero model calls — the agent refuses via triage
ASSAY_CASE=m07 npm run agent     # ~35s, one model call — a clean repair, guard-confirmed
ASSAY_CASE=h01 npm run agent     # ~35s — the case where the guard rejects a hollow repair
```

The filter applies to the baseline, agent and scorer alike, so `ASSAY_CASE=m01,n03 npm run eval`
still compares like with like. Scored runs are unfiltered; a filtered run announces itself at the top
of its output so it can't be mistaken for a full one.

To reproduce a specific published run rather than start a fresh one:

```bash
ASSAY_RUN_ID=hollow-v1 npm run eval
```

If `results/runs/hollow-v1/baseline/summary.json` and `.../agent/summary.json` already exist (they
do, checked into this repo), the harness scores them directly and spends **no tokens** —
useful for re-verifying the published numbers without paying for them again. Delete that run
directory first if you want a genuinely fresh run under the same id.

### Expected output

```
scoring run hollow-v1 — model nemo-super

────────────────────────────────────────────────────────────────────────
metric                              baseline     agent      change
────────────────────────────────────────────────────────────────────────
Valid heal rate (15 heal cases)        60.0%     80.0%   +20.0 pts +
Correct refusal rate (3 no-heal)        0.0%    100.0%  +100.0 pts +
Correct action rate (all 18)           50.0%     83.3%   +33.3 pts +
False heal rate (all 18)                5.6%      0.0%    -5.6 pts +
Pass rate — the misleading one         55.6%     66.7%   +11.4 pts
```

**A fresh run will not necessarily reproduce these exactly, even on the identical model at
temperature 0.** Two full runs of this project on `nemo-super`, same code, same prompts, produced
baseline correct action rates of 50.0% and 55.6% — one case (`m02`) got a different completion from
the model between runs. The agent's numbers were identical across both runs. This is disclosed rather
than smoothed over — see [deviations/D015](deviations/D015-nemo-super-not-fully-deterministic.md),
which also corrects an earlier claim in this project that overstated `nemo-super`'s determinism based
on too small a sample. Treat any single run as one sample from a narrow range, not an exact target;
`nemo-super` is nonetheless far more stable run-to-run than most alternatives, including `kimi-k3`,
which cannot run below temperature 1 at all and should be expected to vary more.

### Runtime and cost

| Step | Wall time | Tokens / cost |
| --- | --- | --- |
| `fixtures:build` | 7.1s (measured) | none |
| `fixtures:validate` | 295.0s / ~5 min (measured, 40 real Playwright runs) | none (no model calls) |
| `npm run eval` — full, fresh, both systems + scoring | **1,081.4s / ~18 min (measured)** | baseline 29,214 tokens (18 calls) + agent 64,530 tokens (26 calls) ≈ **93,700 total** |

That 18 minutes covers everything: capturing rendered DOM for all 18 cases twice (baseline and
agent), every model call, every VERIFY and GUARD re-run through a real headless browser, and the
final scoring pass that re-runs every delivered patch against both the app and the defect builds.
Re-scoring an existing run (`ASSAY_RUN_ID=hollow-v1 npm run eval` with that run's `summary.json`
files already present) skips straight to scoring and finishes in under a minute, spending no tokens.

The agent costs roughly 2.2× the baseline in tokens — it makes up to 3 repair attempts per case plus
a guard run, against the baseline's one shot. It also refuses several cases without spending a single
token, which the token figure alone does not show; see the `handed to a human` line in the eval
output (6 of 18 in the published `hollow-v1` run).

Dollar cost depends entirely on your provider's pricing, which is why this project reports tokens
rather than an invented dollar figure (see
[deviations/D006](deviations/D006-openai-compatible-provider.md)). Set `ASSAY_PRICE_INPUT_PER_MTOK`
/ `ASSAY_PRICE_OUTPUT_PER_MTOK` in `.env` if you want a USD figure computed for your own rates.

## 6. Render the report

```bash
npm run report
```

Reads the most recently scored run (or `ASSAY_RUN_ID=<id> npm run report` for a specific one) and
writes `results/runs/<id>/report.html` — a single self-contained file, no external assets, no
network calls, opens directly in a browser. Every case shows the original spec, what each system
delivered as a real line diff, the agent's triage reasoning, every repair attempt with its guard
verdict, and any escalation report handed to a human.

## 7. What a stronger model changes

To check whether the result holds on a different model, add a second provider block to `.env` under
`ASSAY_FRONTIER_*` and select it per run:

```bash
ASSAY_PROVIDER=frontier ASSAY_RUN_ID=<new-id> npm run eval
```

This project's own second run, on `kimi-k3`, is checked in at `results/runs/k3/` and is discussed in
[deviations/D012](deviations/D012-frontier-model-saturates.md) — both baseline and agent scored 100%
on that model, which is reported honestly rather than hidden, and changes what the agent's advantage
even means (cost and determinism, not correctness — see the deviation for the full reasoning).

## 8. Data and privacy

The application under test (Taskly) is a static fixture built entirely for this project — no real
user data, no external service, no PII anywhere in the evaluation set. The three seed tasks are
placeholder strings (`"Write the reproduction guide"`, etc.). Nothing in `results/` or `fixtures/`
requires any data you don't already have by cloning the repo.
