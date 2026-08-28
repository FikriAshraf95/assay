# m12 — composer collapsed behind a disclosure

- Spec: `add-task.spec.ts`
- Variant: `m12`
- Case kind: heal
- Outcome: **escalated**
- Model calls: 3

## Triage

- Failure kind: `unresolved-locator`
- Structure changed since last passing build: yes
- Verdict: **repair**

A locator no longer resolves, so something the test addresses has moved or changed.

```
+ details[1]{class=composer-shell}
+ summary[0]{class=composer-summary}
```

## Repair attempts

**Attempt 1** — parse: patched, verify: failed, guard: skipped → rejected (still-failing)  _(1979+119 tok, 1141ms)_
**Attempt 2** — parse: patched, verify: failed, guard: skipped → rejected (still-failing)  _(2730+145 tok, 1336ms)_
**Attempt 3** — parse: patched, verify: failed, guard: skipped → rejected (still-failing)  _(2604+145 tok, 1325ms)_

## Handed to a human

**No repair could be verified after 3 attempt(s).**

No candidate repair passed against the application. The control this test needs may have been removed rather than moved, which is a product decision rather than a repair.

A person should decide whether this test should be rewritten, retargeted or deleted.
