# m09 — a second quick-add control appears in the header

- Spec: `add-task.spec.ts`
- Variant: `m09`
- Case kind: heal
- Outcome: **escalated**
- Model calls: 3

## Triage

- Structure changed since last passing build: yes
- Verdict: **repair**

The page structure differs from the last known-good build, so something the test addresses has moved, been renamed or been reordered.

```
- form[1]{class=composer data-testid=composer id=composer}
- div[2]{class=toolbar}
- ul[3]{class=task-list data-testid=task-list id=task-list}
- p[4]{class=empty-state data-testid=empty-state hidden= id=empty-state}
- footer[5]{class=app-footer}
+ div[1]{class=quick-add data-testid=quick-add}
+ input[0]{class=composer-input placeholder=What needs doing? type=text}
+ button[1]{class=btn btn-primary type=button text=Add}
+ form[2]{class=composer data-testid=composer id=composer}
+ div[3]{class=toolbar}
+ ul[4]{class=task-list data-testid=task-list id=task-list}
+ p[5]{class=empty-state data-testid=empty-state hidden= id=empty-state}
+ footer[6]{class=app-footer}
```

## Repair attempts

**Attempt 1** — parse: patched, verify: failed, guard: skipped → rejected (still-failing)  _(2161+121 tok, 1178ms)_
**Attempt 2** — parse: patched, verify: failed, guard: skipped → rejected (still-failing)  _(2852+130 tok, 1204ms)_
**Attempt 3** — parse: patched, verify: failed, guard: skipped → rejected (still-failing)  _(2870+130 tok, 1184ms)_

## Handed to a human

**No repair could be verified after 3 attempt(s).**

No candidate repair passed against the application. The control this test needs may have been removed rather than moved, which is a product decision rather than a repair.

A person should decide whether this test should be rewritten, retargeted or deleted.
