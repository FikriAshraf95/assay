# D013 — The guard has never rejected a repair

- **Date:** 2026-08-29
- **Spec section:** §2 (the insight), §5 step 5 (GUARD)
- **Status:** **resolved by [D014](D014-hollow-temptation-cases.md)** — see the update at the end.
  The guard earned its keep once the evaluation contained a case capable of testing it.
- **Evidence:** runs `triage-v2` and `k3` (below), then `hollow-v1` (update)

## What the spec claims

> Step 5 is the contribution.

The guard — re-running a repaired spec against a self-sabotaged build to check it can still fail — is
named in §2 and §5 as the central mechanism of the project.

## What the runs show

Guard verdicts across every attempt in both runs:

| Verdict | `triage-v2` | `k3` |
| --- | ---: | ---: |
| `confirmed` (repair still detects failure) | 9 | 11 |
| `not-diagnostic` (guard cannot judge this spec) | 1 | 1 |
| skipped (repair already failed, or refused) | 12 | 2 |
| **`hollow` (repair rejected as empty)** | **0** | **0** |

**Zero.** In 34 attempts across two models, the guard has never rejected anything. It has only ever
confirmed repairs that were already good.

Every false heal the agent avoided was avoided by **triage**. The guard has not changed a single
outcome.

## Why, and this is the interesting part

Hollow repairs are not distributed the way the design assumed.

The design assumed a model handed a broken locator might weaken the assertion to get green. That is
not what happens. When the feature exists and the locator has merely moved, the model finds the
control and writes a genuine repair — on both models, every repair that passed the application also
failed the defect build.

The hollow repairs appear somewhere else entirely: **when there is no correct repair to find.** The
probe produced one on `n01`, where the control was deleted. The nemo-super baseline produced one on
`n03`, where the counter was off by one and it rewrote the expectation to match the bug. In both
cases the model could not succeed honestly, so it redefined success.

And those are precisely the cases triage intercepts — before a model is consulted, for free.

So the guard is aimed at a failure mode that occurs mainly in the region another, cheaper mechanism
already covers. It is insurance whose premium has never paid out.

## What this does not mean

It does not mean the guard is wrong, and it is not being removed. Its cost is one extra spec run per
accepted repair, it is the only thing standing between a passing patch and an unverified one, and a
single hollow repair reaching a real suite is worse than the runs it costs. Absence of evidence over
34 attempts on two models and fifteen cases is weak evidence of absence.

It does mean the project cannot claim the guard as its contribution on this evidence. The measured
contribution is **triage**, and the honest write-up says so.

## What would settle it

The evaluation set contains no *heal* case where a hollow repair is the easy path — every heal case
has a findable correct locator, so the model has no reason to weaken anything. Cases that tempt a
hollow repair while a correct repair exists would test the guard directly:

- an expected value not derivable from the static page, so weakening the assertion is easier than
  determining the right one
- a list where `.first()` passes but checks the wrong row
- text split across child nodes, where `toContainText` passes and `toHaveText` is the real check

If the guard fires on those, it has earned its keep. If it still does not, the conclusion is much
stronger and the design should be simplified around triage.

This is the highest-value remaining experiment in the project.

---

## Update — 2026-08-29, run `hollow-v1`

The experiment was run. Three cases were added ([D014](D014-hollow-temptation-cases.md)) that keep a
correct repair available while making the *assertion* the hard part.

**The guard fired.** On `h01`, attempt 2, for the first time in 61 attempts across three runs.

The rejected repair passed VERIFY, so a workflow without a guard would have accepted it:

```ts
await expect(page.locator('li[data-testid="task-item"].is-completed')).toHaveCount(1);
```

The original asserted `toHaveCount(1)` over **all visible rows**, which is what proved the filter had
hidden the other two. The repair counts **completed rows** — of which there is exactly one, filter
working or not.

It reads as a *more precise* locator. It is a strictly weaker assertion.

Scored directly against both builds
(`results/runs/hollow-v1/guard-counterfactual.md`):

| Build | Result |
| --- | --- |
| `h01` — working application | passed |
| `h01.defect` — filters ignored entirely | **passed** |

A false heal, confirmed by measurement. The guard prevented it; the agent retried, could not find a
correct repair, and escalated rather than hand over a green test.

## What this changes, and what it does not

The claim in §2 stands, with a much sharper statement of when it applies:

- Hollow repairs **do** occur on heal cases, but only where preserving the assertion is harder than
  fixing the locator. Where a correct locator is findable, both models wrote genuine repairs every
  time — 60 of 61 attempts.
- The dangerous form is not a deleted assertion. It is a **plausible-looking refinement** that
  quietly narrows what is being checked. `.is-completed` is the kind of change a reviewer waves
  through.
- Triage remains the larger contributor by volume, and the honest split is: triage caught 2 cases
  that would otherwise have been mangled, the guard caught 1. Both are load-bearing, neither is the
  whole story.

The cost of the catch is visible in the scores: `h01` counts as `no-patch` for the agent, which looks
worse on every surface metric than the false heal it avoided. That trade is the project's argument in
a single case.
