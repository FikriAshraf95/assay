# m06 — delete control changed from <button> to <a role="button">

- Spec: `empty-state.spec.ts`
- Variant: `m06`
- Case kind: heal
- Outcome: **accepted-guarded**
- Model calls: 1

## Triage

- Failure kind: `assertion-mismatch`
- Structure changed since last passing build: yes
- Verdict: **repair**

Every locator resolved, but the page structure differs from the last known-good build — a locator is very likely resolving to the wrong element.

```
- button[2]{class=task-delete data-testid=task-delete type=button}
- button[2]{class=task-delete data-testid=task-delete type=button}
- button[2]{class=task-delete data-testid=task-delete type=button}
+ a[2]{class=task-delete data-testid=task-delete href=# role=button}
+ a[2]{class=task-delete data-testid=task-delete href=# role=button}
+ a[2]{class=task-delete data-testid=task-delete href=# role=button}
```

## Repair attempts

**Attempt 1** — parse: patched, verify: passed, guard: confirmed  _(2004+167 tok, 1485ms)_
