# D003 — Each case is scored on one designated spec

- **Date:** 2026-08-28
- **Spec section:** §3 (metric), §4 (case table)
- **Status:** accepted

## What the spec says

§3 speaks of "a patched spec file" in the singular but never says which one, and §4 lists cases
without naming the spec each is measured on. Read plainly, it implies the whole suite is scored.

## What we built

Every case declares a `primarySpec`. The valid-heal / false-heal / correct-refusal metrics are
computed on that spec alone. Suite-wide pass rate across all ten specs is still recorded and
reported, but as a secondary number.

## Why

Mutations are global DOM changes, so most break several specs at once — `m01` rehashes classes that
four specs depend on. The guard, however, is a single behaviour defect, and a defect can only prove
that *one* feature's detection survived. Scoring a case on specs whose feature the defect does not
touch would mean scoring repairs against a guard that cannot fail, which is precisely the vacuous
check this project exists to argue against.

Pairing one spec with one defect per case keeps every scored number backed by a real guard.

## Cost

Less of the healer's work is captured by the headline metric — a case where it repairs four specs and
hollows out three of them scores the same as one where it repairs one. The suite-wide secondary
number is what surfaces that, and any gap between the two deserves comment in the write-up rather
than being smoothed over.

## Implementation

`primarySpec` and `feature` on each case in `src/fixtures/cases.ts`; `FEATURE_SPECS` maps each defect
to the spec that proves it is load-bearing.
