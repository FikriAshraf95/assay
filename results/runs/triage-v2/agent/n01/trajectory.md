# n01 — "Clear completed" removed from the product

- Spec: `clear-completed.spec.ts`
- Variant: `n01`
- Case kind: no-heal
- Outcome: **escalated**
- Model calls: 3

## Triage

- Structure changed since last passing build: yes
- Verdict: **repair**

The page structure differs from the last known-good build, so something the test addresses has moved, been renamed or been reordered.

```
- button[0]{class=btn btn-ghost data-testid=clear-completed id=clear-completed type=button text=Clear completed}
```

## Repair attempts

**Attempt 1** — parse: patched, verify: failed, guard: skipped → rejected (still-failing)  _(1781+110 tok, 1148ms)_
**Attempt 2** — parse: patched, verify: failed, guard: skipped → rejected (still-failing)  _(2295+110 tok, 1028ms)_
**Attempt 3** — parse: patched, verify: failed, guard: skipped → rejected (still-failing)  _(2295+110 tok, 1022ms)_

## Handed to a human

**No repair could be verified after 3 attempt(s).**

No candidate repair passed against the application. The control this test needs may have been removed rather than moved, which is a product decision rather than a repair.

A person should decide whether this test should be rewritten, retargeted or deleted.
