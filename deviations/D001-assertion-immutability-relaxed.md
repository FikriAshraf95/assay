# D001 — Repairs may change expected literals, not only locators

- **Date:** 2026-08-28
- **Spec section:** §5, agent step 3 (HYPOTHESIZE)
- **Status:** accepted

## What the spec says

> propose a locator repair, constrained: assertions are read-only, only locator expressions may change

## What we are building

A repair may change locator expressions **and** expected literal values. It may not delete an
assertion, weaken it to a tautology, or add an unconditional pass.

## Why

The original rule is unsatisfiable for some cases in our own evaluation set. Case `m10` relabels the
interface to Spanish, which changes the counter text from `2 items left` to `2 tareas pendientes`.
There is no locator-only repair for `items-left.spec.ts` under `m10` — the correct repair genuinely
requires editing the expected string. A rule the correct answer cannot satisfy would score honest
repairs as failures.

It was also the wrong mechanism. "Assertions are read-only" is a *syntactic* proxy for the property
we actually care about, which is that the repaired spec still detects real breakage. That property is
already measured directly and empirically by the guard step: a patched spec that passes on the defect
build has been hollowed out, whatever it did to the source. Enforcing a syntactic rule on top of a
behavioural check adds no safety and rejects legitimate repairs.

## Cost

The prompt constraint becomes softer, so the agent has more room to cheat. This is deliberate: the
guard is now the sole enforcement, which means D004's validation that every defect is load-bearing is
what the whole metric rests on. If a defect were inert, nothing else would catch a hollow repair.

## Consequence for scoring

None. `n03` (counter off by one) remains a no-heal case: editing the expectation to match the bug is
still wrong there, because the application is wrong and the test is right. The distinction is not
"may literals change" but "is the application's current behaviour correct" — which the guard answers
and a syntactic rule never could.
