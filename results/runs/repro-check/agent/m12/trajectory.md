# m12 — composer collapsed behind a disclosure

- Spec: `add-task.spec.ts`
- Variant: `m12`
- Case kind: heal
- Outcome: **escalated**
- Model calls: 3

## Triage

- Structure changed since last passing build: yes
- Verdict: **repair**

The page structure differs from the last known-good build, so something the test addresses has moved, been renamed or been reordered.

```
+ details[1]{class=composer-shell}
+ summary[0]{class=composer-summary text=New task}
```

## Repair attempts

**Attempt 1** — parse: patched, verify: failed, guard: skipped → rejected (still-failing)  _(1993+119 tok, 1098ms)_
**Attempt 2** — parse: patched, verify: failed, guard: skipped → rejected (still-failing)  _(2665+137 tok, 1326ms)_
**Attempt 3** — parse: patched, verify: failed, guard: skipped → rejected (still-failing)  _(2523+123 tok, 1213ms)_

## Handed to a human

**No repair could be verified after 3 attempt(s).**

No candidate repair passed against the application. The control this test needs may have been removed rather than moved, which is a product decision rather than a repair.

A person should decide whether this test should be rewritten, retargeted or deleted.
