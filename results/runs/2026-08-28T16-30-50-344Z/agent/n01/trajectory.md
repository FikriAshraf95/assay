# n01 — "Clear completed" removed from the product

- Spec: `clear-completed.spec.ts`
- Variant: `n01`
- Case kind: no-heal
- Outcome: **escalated**
- Model calls: 3

## Triage

- Failure kind: `assertion-mismatch`
- Structure changed since last passing build: yes
- Verdict: **repair**

Every locator resolved, but the page structure differs from the last known-good build — a locator is very likely resolving to the wrong element.

```
- button[0]{class=btn btn-ghost data-testid=clear-completed id=clear-completed type=button}
```

## Repair attempts

**Attempt 1** — parse: patched, verify: failed, guard: skipped → rejected (still-failing)  _(1780+110 tok, 1093ms)_
**Attempt 2** — parse: patched, verify: failed, guard: skipped → rejected (still-failing)  _(2378+110 tok, 1018ms)_
**Attempt 3** — parse: patched, verify: failed, guard: skipped → rejected (still-failing)  _(2378+110 tok, 993ms)_

## Handed to a human

**No repair could be verified after 3 attempt(s).**

No candidate repair passed against the application. The control this test needs may have been removed rather than moved, which is a product decision rather than a repair.

A person should decide whether this test should be rewritten, retargeted or deleted.
