# D011 — Metric table replaced with outcome rates

- **Date:** 2026-08-29
- **Spec section:** §4 (how to evaluate)
- **Status:** accepted
- **Evidence:** run `triage-v2`

## What the spec says

| Metric | Simple baseline | Agent solution | Change |
| --- | --- | --- | --- |
| Primary outcome | … | … | … |
| Human time per task | … | … | … |
| Cost per task | … | … | … |

## What we report

| Metric | Meaning |
| --- | --- |
| **Valid heal rate** | of the 12 heal cases, how many repairs pass on the app *and still fail* on the defect build |
| **Correct refusal rate** | of the 3 no-heal cases, how many were correctly left alone |
| **Correct action rate** | of all 15, how many were handled correctly — one number covering both jobs |
| **False heal rate** | how many delivered patches are green and detect nothing |
| **Pass rate** | reported *only* so the distance from valid heal rate is visible |
| Tokens, model calls | replaces "cost per task" — see [D006](D006-openai-compatible-provider.md) |
| Cases handed to a human | replaces "human time per task" |

## Why

**"Human time per task" is not measurable here without inventing numbers.** No human sat and repaired
these fifteen specs with a stopwatch, and a plausible-sounding estimate would be fabrication attached
to a real-looking metric. What *is* countable is how many cases each system hands to a person rather
than silently resolving: baseline 0, agent 5. That is the honest shape of the same question, and it
reads the right way round — the agent asking for help five times is a feature, since three of those
are cases where acting would have been wrong.

**Pass rate is kept deliberately, and labelled.** It is the metric a naive version of this project
would have reported, and the gap between it and the valid heal rate is the entire argument. On this
run the baseline produced 8 patches that pass, of which only 7 are valid — pass rate overstates its
real performance by one case, and that case is `n03`, where it certified an off-by-one bug as
expected behaviour.

**Correct action rate was added** because neither of the two primary rates alone describes the
system. A tool that repairs everything scores well on heal cases and destroys evidence on the others;
a tool that refuses everything scores 100% on refusals and is useless. One number over all fifteen
resists both degenerate strategies.

## Integrity gate

The harness refuses to print a comparison when the two systems did not face the same model. A
mid-run fallback to a smaller model would otherwise blend two systems into one number with nothing
on screen to say so.
