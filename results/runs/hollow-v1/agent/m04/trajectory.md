# m04 — submit button relabelled from "Add" to "Create task"

- Spec: `add-validation.spec.ts`
- Variant: `m04`
- Case kind: heal
- Outcome: **accepted-unguarded**
- Model calls: 1

## Triage

- Structure changed since last passing build: yes
- Verdict: **repair**

The page structure differs from the last known-good build, so something the test addresses has moved, been renamed or been reordered.

```
- button[1]{class=btn btn-primary data-testid=add-task id=add-task type=submit text=Add}
+ button[1]{class=btn btn-primary data-testid=add-task id=add-task type=submit text=Create task}
```

## Repair attempts

**Attempt 1** — parse: patched, verify: passed, guard: not-diagnostic  _(1829+106 tok, 1029ms)_
