# m07 — delete becomes an icon-only control labelled "Remove"

- Spec: `delete-task.spec.ts`
- Variant: `m07`
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
+ button[2]{aria-label=Remove class=task-delete data-testid=task-delete type=button text=}
+ svg[0]{aria-hidden=true}
+ path[0]{}
+ button[2]{aria-label=Remove class=task-delete data-testid=task-delete type=button text=}
+ svg[0]{aria-hidden=true}
+ path[0]{}
+ button[2]{aria-label=Remove class=task-delete data-testid=task-delete type=button text=}
+ svg[0]{aria-hidden=true}
+ path[0]{}
```

## Repair attempts

**Attempt 1** — parse: patched, verify: passed, guard: confirmed  _(2344+149 tok, 1384ms)_
