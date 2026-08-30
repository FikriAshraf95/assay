# D015 — "Deterministic at temperature 0" was an overclaim

- **Date:** 2026-08-29
- **Spec section:** §7 (reproducibility contract)
- **Status:** correction — narrows a claim made in [D006](D006-openai-compatible-provider.md)
- **Evidence:** runs `hollow-v1` and `repro-check`, both `nemo-super`, both temperature 0, identical
  code and identical case set

## What was claimed

D006 reported the probe's determinism check — two identical calls, byte-identical replies — as
evidence `nemo-super` "reproduces byte-for-byte." The README repeated this as the reason it, not
`kimi-k3`, is the headline configuration.

## What actually happened

A second full 18-case run (`repro-check`, run to get accurate reproduction-guide timing, not to
re-check determinism) produced a **different correct action rate** than the first: 55.6% baseline
vs. 50.0% in `hollow-v1`, a 5.6-point swing with no code change in between.

Diffing every case across both runs finds exactly one divergence: `m02`, baseline only.

```diff
- await page.locator('#add-task').click();
+ await page.getByTestId('add-task').click();

- await expect(page.getByTestId('task-item')).toHaveCount(3);
+ await expect(page.getByTestId('task-item')).toHaveCount(4);
```

Same prompt, same temperature 0, different completion. `nemo-super` is not perfectly deterministic
in practice — it is **much** more deterministic than `kimi-k3`, which cannot run below temperature 1
at all, but "byte-for-byte" was a claim built on a two-call sample that happened not to find a
counterexample, not a property that holds.

## Why the two-call probe missed it

The probe's determinism check used a short, low-entropy prompt ("name three primary colours").
The actual repair task is long — a full spec, real Playwright output, and rendered HTML in context —
and gives the model far more surface area for output variance to appear, even at temperature 0.
Provider-side floating-point non-associativity in batched inference is a known source of this kind of
drift and is outside this project's control.

Two identical replies to a trivial prompt is weak evidence for determinism on a task nothing like it.
That gap between what was tested and what was claimed is the mistake, not the model.

## What changes

- README and REPRODUCE.md no longer claim byte-for-byte reproduction. They state what was measured:
  `nemo-super` is far more stable than `kimi-k3` run to run, but a fresh run may not match the
  published numbers exactly, and `m02` specifically has been observed to flip.
- `nemo-super` remains the headline configuration. The comparative reasoning in D012 still holds —
  it is the more reproducible of the two available options — it is just no longer "perfectly," and
  the honest version of that claim is what ships.
- The reproduction guide reports the range actually observed (correct action rate 50.0–55.6% for the
  baseline across two runs) rather than a single number presented as exact.

## Why this is logged rather than quietly reworded

Ground rule 9 ties every claim to its evidence. "Byte-for-byte" was evidence-shaped but the evidence
behind it was too thin to support it. Reproducibility is a scored, qualification-gated criterion — a
judge who reruns `npm run eval` and gets 55.6% instead of the published 50.0% should find this
document before they conclude the numbers were cherry-picked.
