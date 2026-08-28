# D007 — Agent gains a triage step before attempting any repair

- **Date:** 2026-08-29
- **Spec section:** §5 (agent workflow)
- **Status:** superseded by [D009](D009-composite-triage.md) — the rule below misclassifies `m11`,
  where a positional locator resolves to the wrong element. Kept for the record; the reasoning about
  *why* refusals must be structural still stands, only the mechanism changed.

## What the spec says

The agent workflow begins at step 1, RUN, and proceeds directly to OBSERVE and HYPOTHESIZE. Every
red spec is treated as a repair candidate. Refusals emerge only at step 6, ESCALATE, after three
failed attempts.

## What we will build

A step 0, TRIAGE, before any repair is attempted:

> Re-resolve every locator the failing spec uses against the current page.
>
> - **All locators resolve** → this is not locator rot. The page still offers everything the test
>   asks for, so the failure is behavioural. Refuse, and report a suspected regression.
> - **Some locator does not resolve** → locator rot is possible. Proceed to OBSERVE.

## Why

The probe ([D006](D006-openai-compatible-provider.md)) showed the model will not refuse when asked
to. Given a removed feature and an explicit `NO_REPAIR` escape hatch, it rewrote the assertions
instead. Politeness is not a mechanism.

Escalation-by-exhaustion alone is not sufficient either. It handles `n01`, where no locator can be
found however many attempts are spent, but it does not handle `n02` and `n03`, where every locator
resolves perfectly and only the behaviour is wrong. There the model can produce a patch that genuinely
passes — change the expected counter text from `2 items left` to `3 items left` and `n03` goes green
while permanently endorsing an off-by-one bug.

The guard cannot catch that one. A self-generated mutant that breaks the counter would make the
patched spec fail, so the guard is satisfied, and the hollow repair is accepted. This is a real limit
of the guard and worth stating plainly rather than discovering at write-up time.

Triage catches it, because the two situations are cleanly distinguishable by a question neither the
model nor the guard asks:

> **Locator resolves + assertion fails = behaviour regression. Locator does not resolve = structural
> change.**

That is deterministic, needs no model call, and is checkable directly through Playwright.

## Expected effect on the evaluation set

| Case | Locators resolve? | Triage verdict |
| --- | --- | --- |
| `m01`–`m12` | no — that is what the mutation broke | proceed to repair |
| `n01` (control removed) | no | proceed, then escalate on exhaustion |
| `n02` (delete wired to nothing) | yes | refuse immediately |
| `n03` (counter off by one) | yes | refuse immediately |

`n01` is the case triage does *not* resolve on its own, which is worth keeping: it means the two
refusal mechanisms — triage and exhaustion — are both load-bearing, and the write-up can show which
one caught which case.

## Cost

One extra Playwright run per case before any model call. Cheaper than the repair attempts it avoids,
and it makes the baseline/agent gap partly attributable to a step that uses no model at all — which
should be reported honestly as such rather than credited to the agent's reasoning.
