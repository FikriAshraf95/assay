# D016 — Runs can be restricted to named cases

- **Date:** 2026-08-29
- **Spec section:** §7 (reproducibility contract)
- **Status:** accepted

## What changed

`ASSAY_CASE=h01` (or `ASSAY_CASE=m01,n03`) restricts a run to named cases. Applied in
`readManifest()`, so the filter reaches the baseline, the agent and the scorer uniformly — a filtered
eval still compares like with like.

## Why

Two reasons, neither of which affects a scored run.

**The solution video.** The brief requires walking through one realistic execution start to finish
inside five minutes. `npm run eval` takes ~18 minutes across 18 cases; there was no way to
demonstrate a single case without cutting away and asking the viewer to trust the edit. One case now
runs in seconds — measured: `n03` 8.5s, `h01` 34.6s, `m07` 35.5s.

**Judges.** A reviewer who wants to confirm the pipeline works before committing 18 minutes and
~94,000 tokens can run one case first.

## Scored runs are unfiltered

The variable is absent from `.env.example` and defaults to off. When set, the run prints
`ASSAY_CASE=… — running N of 18 cases` at the top of its output, so a filtered run cannot be mistaken
for a full one in a transcript or a screenshot. Unknown case ids throw rather than silently matching
nothing.

## Incidental finding

Running `h01` in isolation (`results/runs/demo-h01/`) reproduced the guard catch exactly: attempt 1
fails VERIFY, attempt 2 passes VERIFY and is rejected `hollow`, attempt 3 fails, escalate. That is
independent corroboration of the single most important measurement in the project
([D013](D013-guard-has-not-earned-its-keep.md)), obtained from a different run under a different
run id — worth noting given [D015](D015-nemo-super-not-fully-deterministic.md) established the model
is not perfectly deterministic.
