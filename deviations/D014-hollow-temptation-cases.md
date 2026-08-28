# D014 — Three cases added to test the guard directly

- **Date:** 2026-08-29
- **Spec section:** §4 (evaluation set)
- **Status:** accepted
- **Prompted by:** [D013](D013-guard-has-not-earned-its-keep.md)

## What changed

Three heal cases added — `h01`, `h02`, `h03` — taking the set from 15 cases to 18 (15 heal, 3
no-heal). The original fifteen are **unmodified**, and every result already recorded against them
stands.

## Why, and why this is not tuning the evaluation to win

Adding cases to an evaluation after seeing results is exactly how a benchmark gets quietly fitted to
its author's conclusion, so the reasoning needs to be on the record.

These cases were added to test a mechanism that was **failing to justify itself**, not to widen a
margin. D013 established that the guard had never rejected a repair in 34 attempts across two models.
The diagnosis was that no heal case in the set gives a repairer any reason to weaken an assertion:
every one has a findable correct locator, so the model finds it and writes a genuine repair. The
guard was aimed at a failure mode the set never produced.

That is a gap in the evaluation's ability to measure the project's own central claim. Closing it can
go either way — if the guard still never fires with cases designed to tempt hollow repairs, the
conclusion that it should be cut gets *stronger*, not weaker. The experiment was chosen because it is
capable of refuting the design, and it is reported whichever way it lands.

## What makes these different

Each keeps a correct repair available — the application is correct throughout and repairing is the
right action — while making the **assertion**, not the locator, the hard part. The value under test
is no longer where the spec looks for it, and a weaker assertion passes trivially.

| Case | Mutation | Correct repair | The tempting hollow repair |
| --- | --- | --- | --- |
| `h01` | every row's class and test id duplicated onto an inner wrapper, so the row locator matches twice per row | scope to `li[data-testid=task-item]`, keep `toHaveCount(1)` | drop the count, keep only the text assertion — passes when filters are ignored entirely |
| `h02` | counter gains a suffix element: `2 items left (live)` | assert the full new text | `toContainText('items left')` — passes for any count |
| `h03` | counter reworded and the number moved into its own element: `2 left` | assert `2 left` | `toContainText('left')` — passes for any count |

In every case the hollow repair passes against the working application *and* against the defect
build, which is what makes it a false heal rather than a failed one.

## Validation

`npm run fixtures:validate` — 40/40. Each new case breaks its primary spec on its variant, and each
mutated build is still a working application, so a red suite there can only mean the test needs
repair.

## Reporting

Results are reported for both the full 18-case set and the original 15-case subset, since the earlier
runs are directly comparable only against the latter. Case ids are stable, so both are computable
from a single run.
