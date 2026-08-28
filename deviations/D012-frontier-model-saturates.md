# D012 — A frontier model saturates the evaluation set

- **Date:** 2026-08-29
- **Spec section:** §3 (metric), §8 (what would make this fail)
- **Status:** accepted — reported as a result, not worked around
- **Evidence:** runs `triage-v2` (nemo-super) and `k3` (kimi-k3)

## What was run

The full 15-case evaluation, both systems, on a second model: `kimi-k3` via Moonshot. Same cases,
same prompts, same scorer. Selected with `ASSAY_PROVIDER=frontier`.

## Result

| Metric | nemo-super baseline | nemo-super agent | **k3 baseline** | **k3 agent** |
| --- | ---: | ---: | ---: | ---: |
| Valid heal rate | 58.3% | 83.3% | **100%** | **100%** |
| Correct refusal rate | 0.0% | 100% | **100%** | **100%** |
| Correct action rate | 46.7% | 86.7% | **100%** | **100%** |
| False heals | 1 | 0 | **0** | **0** |

On `kimi-k3` the one-shot baseline solves every case, including all three no-heal cases. **The agent's
improvement is exactly zero.**

§8 of the spec predicted this shape of failure — "if the mutations are too easy, the baseline scores
well and there is no story" — but predicted it for the wrong reason. The mutations are hard enough
for a mid-tier model and evidently not for a frontier one.

## What did not change: cost and determinism

The outcome columns are identical. The cost columns are not.

| No-heal case | k3 baseline | k3 agent |
| --- | --- | --- |
| `n01` | 44.7 s, 1,317 output tokens | 1 call, 171 output tokens |
| `n02` | **118.8 s, 3,936 output tokens** | **0 calls** |
| `n03` | 37.6 s, 1,207 output tokens | **0 calls** |

The baseline spent 156 seconds and 5,143 output tokens reasoning its way to a conclusion that triage
reaches from a DOM comparison, deterministically and for free. On `n02` it took nearly two minutes to
decide the application was broken.

So at frontier scale the workflow's contribution changes kind rather than disappearing: not
*correctness*, but *cost and determinism*. That is a weaker claim than the nemo-super result and it
is stated as such.

`kimi-k3` also rejects `temperature: 0` and accepts only 1, so it cannot be run deterministically.
Repeated runs give similar numbers, not identical ones. `nemo-super` reproduces byte-for-byte, which
is why it remains the headline configuration under a reproducibility-gated rubric.

## Why this is reported rather than buried

The obvious move is to report the nemo-super run and stay quiet about this one. Ground rule 9 ties
every claim to its evidence, and "our agent improves repair quality" is not a claim this project can
make without the qualifier "on a model of roughly this capability".

The finding is also more interesting than the result it complicates: a deterministic pre-check that
costs nothing buys, on a weak model, +40 points of correctness, and on a strong model, the same
answer two minutes sooner.

## Limitation this exposes

The evaluation set has no headroom at frontier scale. It cannot distinguish workflows once the model
is strong enough to solve every case one-shot, which means it can measure this project's value only
in a capability band it happened to be designed against. See
[D013](D013-guard-has-not-earned-its-keep.md) for the sharper version of the same problem.
