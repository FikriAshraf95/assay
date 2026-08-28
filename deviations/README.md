# Deviations from DESIGN.md

`DESIGN.md` is frozen. It was written before any implementation so that the evaluation could not be
tuned after the fact to flatter the result — editing it in place would destroy that property and the
guarantee it gives a reader.

So the spec stays as written, and every departure from it is logged here instead. Each entry records
what the spec said, what was actually built, why it changed, and what it cost or bought. Entries are
append-only; if a decision is later reversed, that is a new entry rather than a deletion.

These entries are also the raw material for the Improvement Changelog in the final submission.

| ID | Section | Change | Status |
| --- | --- | --- | --- |
| [D001](D001-assertion-immutability-relaxed.md) | §5 step 3 | Repairs may change expected literals, not just locators | accepted |
| [D002](D002-m09-ambiguity-trap-redefined.md) | §4 (m09) | Ambiguity trap redefined — duplicate composer, not a header "Delete" | accepted |
| [D003](D003-primary-spec-scoring.md) | §3, §4 | Each case is scored on one designated spec, not the whole suite | accepted |
| [D004](D004-eval-set-self-validation.md) | §3, §7 | Added defect-only variants, a smoke spec, and a validation step | accepted |
| [D005](D005-build-agent-trajectories.md) | §7 | Build-agent trajectories snapshotted as a separate artifact | accepted |
| [D006](D006-openai-compatible-provider.md) | §5, §3, §7 | Provider is any OpenAI-compatible endpoint; cost reported in tokens | accepted |
| [D007](D007-behaviour-regression-triage.md) | §5 | Agent gains a TRIAGE step before attempting any repair | superseded by D009 |
| [D008](D008-baseline-fairness.md) | §5 | Baseline gets rendered DOM and the same permission to refuse | accepted |
| [D009](D009-composite-triage.md) | §5 | Triage is a two-stage composite test | stage 1 superseded by D010 |
| [D010](D010-triage-drops-log-scraping.md) | §5 | Triage drops log scraping for one structural comparison | accepted |
| [D011](D011-metric-table.md) | §4 | Metric table replaced with outcome rates | accepted |
| [D012](D012-frontier-model-saturates.md) | §3, §8 | A frontier model saturates the evaluation set | reported as a result |
| [D013](D013-guard-has-not-earned-its-keep.md) | §2, §5 | The guard has never rejected a repair | open finding |
| [D014](D014-hollow-temptation-cases.md) | §4 | Three cases added to test the guard directly | accepted |
