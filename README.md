# Frontier Engineering Challenge 2026 — Workspace

Working directory for a solo entry to micro1's **Frontier Engineering Challenge 2026**: a free,
individual, three-day online competition built around coding agents. Kickoff was 2026-08-28 15:00
UTC; submissions close **2026-08-31 18:00 UTC**.

The actual entry — code, evaluation set, results, and write-up — lives in [assay/](assay/). This
file is a map of the workspace, not the submission itself.

## What's here

| Path | What it is |
| --- | --- |
| [assay/](assay/) | **The submission.** Self-healing Playwright tests, scored on whether a repair still detects failure rather than just whether it passes. Has its own README and reproduction guide. |
| [hackathon-brief.md](hackathon-brief.md) | Full transcription of the official challenge PDF — theme, judging rubric, ground rules, deliverables, worked examples. |
| [hackathon-details.md](hackathon-details.md) | The challenge landing page — overview, eligibility, the scored evaluation criteria with weights, the submission package, and FAQs. |
| [IDEA.md](IDEA.md) | The chosen idea and the three-day execution plan it was scoped against. |

`hackathon-brief.md` and `hackathon-details.md` describe the same competition from two sources (PDF
vs. landing page) and are kept as separate references rather than merged, so either can be checked
against the original without guessing which parts were paraphrased.

## The competition, in short

- **Format:** individual only, any language (Python/TypeScript/Java/C++/Go/Rust recommended),
  coding-agent use required and must be disclosed with trajectories.
- **Every entry needs a baseline and an advanced solution**, evaluated on the same cases, with an
  Improvement Changelog connecting each iteration to evidence.
- **Scoring — 100 points, qualification-gated:** a submission that cannot be run or verified from a
  clean environment can be disqualified before rubric scoring even starts.

| Criterion | Weight |
| --- | --- |
| Agent solution & engineering | 30% |
| End-to-end quality | 20% |
| Problem & user value | 15% |
| Measured improvement | 15% |
| Reproducibility | 15% |
| Hot take / insights | 5% |

Full detail, ground rules, and FAQs: [hackathon-brief.md](hackathon-brief.md) ·
[hackathon-details.md](hackathon-details.md).

## Submission status

Engineering and measurement are complete; see [assay/deviations/](assay/deviations/) for the full
build log (14 numbered entries) and [assay/results/runs/](assay/results/runs/) for run evidence.
Headline result (`nemo-super`, run `hollow-v1`, 18 cases):

| Metric | Baseline | Agent |
| --- | ---: | ---: |
| Valid heal rate | 60.0% | **80.0%** |
| Correct refusal rate | 0.0% | **100.0%** |
| Correct action rate | 50.0% | **83.3%** |

Remaining before the 2026-08-31 18:00 UTC deadline: `assay/README.md` with the Improvement
Changelog, the rendered HTML report, the reproduction guide, the solution video, and a final
trajectory snapshot.
