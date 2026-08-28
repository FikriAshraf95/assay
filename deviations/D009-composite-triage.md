# D009 — Triage is a two-stage composite test

- **Date:** 2026-08-29
- **Spec section:** §5 (agent workflow)
- **Supersedes:** [D007](D007-behaviour-regression-triage.md)
- **Status:** accepted

## What D007 proposed

> Locator resolves + assertion fails = behaviour regression. Locator does not resolve = structural
> change.

## Why that is wrong

`m11` reorders the filter buttons. The spec locates the third control positionally
(`page.locator('.filter').nth(2)`), which still resolves perfectly — to the *wrong* button. Every
locator resolves, the assertion fails, and D007 would refuse to repair a case that plainly needs
repairing. A positional locator can survive a structural change and still be broken.

## Why the obvious alternative is also wrong

Comparing the rendered DOM against the last known-good build (`v0`) fixes `m11`, but breaks on two
others:

- `n03` — the counter renders `3 items left` instead of `2 items left`. The DOM *does* differ, so a
  DOM-difference rule would attempt a repair on a case where refusing is the only correct action.
- `m04` — only a button's label changes, `Add` to `Create task`. Structurally the page is identical,
  so a structure rule would refuse a case that needs repairing.

Neither signal is sufficient alone. Each misclassifies exactly two cases, and they are different
two.

## What we built

The two compose cleanly, because they fail on disjoint cases:

```
1. Did any locator fail to resolve?
     yes -> structural change. Attempt repair.
     no  -> continue

2. Does the page structure differ from the last known-good build?
     yes -> a locator resolved to the wrong element. Attempt repair.
     no  -> nothing structural changed and every locator still resolves.
            The application's behaviour is wrong. Refuse and report a regression.
```

Stage 1 reads Playwright's own failure output — "element(s) not found", "strict mode violation",
timeouts waiting for a locator, visibility failures. Stage 2 compares element signatures (tag, id,
classes, attributes) against `v0`, **ignoring text content**, since text is where a behavioural bug
shows up and `n03` must not be mistaken for a structural change.

Both stages are deterministic and use no model call.

## Effect on every case

| Case | Stage 1 | Stage 2 | Verdict |
| --- | --- | --- | --- |
| `m01`–`m10`, `m12` | locator unresolved | — | repair |
| `m11` | all resolve | structure differs | repair |
| `n01` | locator unresolved | — | repair, then escalate on exhaustion |
| `n02` | all resolve | identical | **refuse** |
| `n03` | all resolve | identical | **refuse** |

## Resource difference, disclosed

Stage 2 requires the rendered DOM of the last known-good build. The agent has this; the one-shot
baseline does not. This is a real difference in resources available to the two systems and must be
stated plainly in the report rather than buried — the brief asks for exactly that.

It is not an unfair advantage so much as a different one: any CI system has the previous green build,
and using it is the sort of "better context" the brief explicitly invites. But the honest framing is
that part of the agent's margin comes from information the baseline was never given, and part comes
from verification the baseline never performs. The report should separate those two contributions
rather than presenting one number.

A `baseline + triage` ablation would measure the split directly and is worth running if time allows.

## Note for the write-up

The route to this rule is itself the finding: two plausible one-line heuristics, each defeated by a
concrete case in our own evaluation set, and a composite that survives because the failures do not
overlap. The counterexamples (`m11` for one rule, `n03` and `m04` for the other) were found by
walking the case list, not by measurement — cheap to find in advance, expensive to discover in a
final run.
