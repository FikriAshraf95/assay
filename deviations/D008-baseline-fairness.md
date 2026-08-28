# D008 — Baseline gets the rendered DOM and the same permission to refuse

- **Date:** 2026-08-29
- **Spec section:** §5 (baseline)
- **Status:** accepted

## What the spec says

> **Baseline — one direct prompt**
> input: failing spec file + Playwright error output + HTML of the page

Refusal appears only in the agent's workflow, at step 6.

## What we built

Two clarifications, both of which make the baseline stronger than a literal reading would:

**1. Rendered DOM, not the static file.** Task rows are cloned from a template the app deletes at
mount, so `index.html` on disk shows markup the user never sees and omits the rows a repair usually
needs. Both systems receive `page.content()` after load.

**2. The same `NO_REPAIR` option the agent has.** The baseline's system prompt tells it that if the
feature is genuinely absent or broken, it should decline.

## Why

The comparison has to isolate the workflow. If the baseline had been handed markup that did not match
the running page, or denied an option the agent is given, the measured gap would partly be an
artefact of how the baseline was set up — and a judge would be right to discount it.

The refusal permission matters most. The headline claim is that the agent refuses correctly on cases
where repair is wrong. That claim is only interesting if the baseline *could* have refused and did
not. Otherwise the agent merely has a feature the baseline was forbidden.

## Result

Both were given the option. Across 15 cases the baseline refused **zero** times, including all three
no-heal cases where refusing was the only correct action. The probe
([D006](D006-openai-compatible-provider.md)) predicted this: told it may decline, the model patches
anyway.

The sharpest instance is `n03`, where the app's counter is off by one and the DOM is untouched:

```diff
- await expect(page.locator('#items-left')).toHaveText('2 items left');
+ await expect(page.locator('#items-left')).toHaveText('3 items left');
- await expect(page.locator('#items-left')).toHaveText('1 item left');
+ await expect(page.locator('#items-left')).toHaveText('2 items left');
```

No locator was changed, because none was broken. The baseline rewrote both expectations to match the
bug. That spec now passes, and the regression it existed to catch is certified as correct behaviour.

This is the difference between the two metrics in one artefact: on pass rate this is a success, and
on valid heal rate it is the worst possible outcome.

## Cost

The baseline is now a genuinely fair opponent, which narrows the gap on the heal cases — it is given
everything a competent one-shot attempt would have. That is the right trade: a gap measured against a
weak baseline is not evidence of anything.

Run cost for all 15 cases: 22,504 in / 1,930 out tokens, about 20 seconds.
