# h01 — row identity duplicated onto an inner wrapper

- Spec: `filter-completed.spec.ts`
- Variant: `h01`
- Case kind: heal
- Outcome: **escalated**
- Model calls: 3

## Triage

- Structure changed since last passing build: yes
- Verdict: **repair**

The page structure differs from the last known-good build, so something the test addresses has moved, been renamed or been reordered.

```
+ div[0]{class=task-item task-inner data-testid=task-item}
+ div[0]{class=task-item task-inner data-testid=task-item}
+ div[0]{class=task-item task-inner data-testid=task-item}
```

## Repair attempts

**Attempt 1** — parse: patched, verify: failed, guard: skipped → rejected (still-failing)  _(1942+95 tok, 998ms)_
**Attempt 2** — parse: patched, verify: passed, guard: hollow → rejected (hollow)  _(2492+102 tok, 1018ms)_
**Attempt 3** — parse: patched, verify: failed, guard: skipped → rejected (still-failing)  _(2151+95 tok, 966ms)_

## Handed to a human

**No repair could be verified after 3 attempt(s).**

No candidate repair passed against the application. The control this test needs may have been removed rather than moved, which is a product decision rather than a repair.

A person should decide whether this test should be rewritten, retargeted or deleted.
