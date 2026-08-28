# m05 — list rows gain two layout wrappers

- Spec: `complete-task.spec.ts`
- Variant: `m05`
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
+ div[0]{class=task-row}
+ div[0]{class=task-main}
+ div[1]{class=task-actions}
+ button[0]{class=task-delete data-testid=task-delete type=button}
+ div[0]{class=task-row}
+ div[0]{class=task-main}
+ div[1]{class=task-actions}
+ button[0]{class=task-delete data-testid=task-delete type=button}
+ div[0]{class=task-row}
+ div[0]{class=task-main}
+ div[1]{class=task-actions}
+ button[0]{class=task-delete data-testid=task-delete type=button}
```

## Repair attempts

**Attempt 1** — parse: patched, verify: passed, guard: confirmed  _(2045+128 tok, 1240ms)_
