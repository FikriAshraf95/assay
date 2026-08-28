# m06 — delete control changed from <button> to <a role="button">

- Spec: `empty-state.spec.ts`
- Variant: `m06`
- Case kind: heal
- Outcome: **accepted-guarded**
- Model calls: 1

## Triage

- Structure changed since last passing build: yes
- Verdict: **repair**

The page structure differs from the last known-good build, so something the test addresses has moved, been renamed or been reordered.

```
- button[2]{class=task-delete data-testid=task-delete type=button text=Delete}
- button[2]{class=task-delete data-testid=task-delete type=button text=Delete}
- button[2]{class=task-delete data-testid=task-delete type=button text=Delete}
+ a[2]{class=task-delete data-testid=task-delete href=# role=button text=Delete}
+ a[2]{class=task-delete data-testid=task-delete href=# role=button text=Delete}
+ a[2]{class=task-delete data-testid=task-delete href=# role=button text=Delete}
```

## Repair attempts

**Attempt 1** — parse: patched, verify: passed, guard: confirmed  _(2051+346 tok, 15149ms)_
