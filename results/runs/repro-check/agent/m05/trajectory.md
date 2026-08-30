# m05 — list rows gain two layout wrappers

- Spec: `complete-task.spec.ts`
- Variant: `m05`
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
+ div[0]{class=task-row}
+ div[0]{class=task-main}
+ div[1]{class=task-actions}
+ button[0]{class=task-delete data-testid=task-delete type=button text=Delete}
+ div[0]{class=task-row}
+ div[0]{class=task-main}
+ div[1]{class=task-actions}
+ button[0]{class=task-delete data-testid=task-delete type=button text=Delete}
+ div[0]{class=task-row}
+ div[0]{class=task-main}
+ div[1]{class=task-actions}
+ button[0]{class=task-delete data-testid=task-delete type=button text=Delete}
```

## Repair attempts

**Attempt 1** — parse: patched, verify: passed, guard: confirmed  _(2073+111 tok, 1161ms)_
