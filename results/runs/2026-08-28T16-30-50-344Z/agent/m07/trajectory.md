# m07 — delete becomes an icon-only control labelled "Remove"

- Spec: `delete-task.spec.ts`
- Variant: `m07`
- Case kind: heal
- Outcome: **accepted-guarded**
- Model calls: 1

## Triage

- Failure kind: `unresolved-locator`
- Structure changed since last passing build: yes
- Verdict: **repair**

A locator no longer resolves, so something the test addresses has moved or changed.

```
- button[2]{class=task-delete data-testid=task-delete type=button}
- button[2]{class=task-delete data-testid=task-delete type=button}
- button[2]{class=task-delete data-testid=task-delete type=button}
+ button[2]{aria-label=Remove class=task-delete data-testid=task-delete type=button}
+ svg[0]{aria-hidden=true}
+ path[0]{}
+ button[2]{aria-label=Remove class=task-delete data-testid=task-delete type=button}
+ svg[0]{aria-hidden=true}
+ path[0]{}
+ button[2]{aria-label=Remove class=task-delete data-testid=task-delete type=button}
+ svg[0]{aria-hidden=true}
+ path[0]{}
```

## Repair attempts

**Attempt 1** — parse: patched, verify: passed, guard: confirmed  _(2319+148 tok, 1409ms)_
