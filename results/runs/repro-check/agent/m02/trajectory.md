# m02 — id attributes dropped from the markup

- Spec: `add-task.spec.ts`
- Variant: `m02`
- Case kind: heal
- Outcome: **accepted-guarded**
- Model calls: 1

## Triage

- Structure changed since last passing build: yes
- Verdict: **repair**

The page structure differs from the last known-good build, so something the test addresses has moved, been renamed or been reordered.

```
- main[0]{class=app id=app}
- span[1]{class=badge data-testid=items-left id=items-left}
- form[1]{class=composer data-testid=composer id=composer}
- input[0]{class=composer-input data-testid=new-task-input id=new-task placeholder=What needs doing? type=text}
- button[1]{class=btn btn-primary data-testid=add-task id=add-task type=submit text=Add}
- input[0]{class=search-input data-testid=search id=search placeholder=Search tasks type=search}
- div[1]{aria-label=Filter tasks class=filters data-testid=filters id=filters role=group}
- ul[3]{class=task-list data-testid=task-list id=task-list}
- p[4]{class=empty-state data-testid=empty-state hidden= id=empty-state}
- button[0]{class=btn btn-ghost data-testid=clear-completed id=clear-completed type=button text=Clear completed}
+ main[0]{class=app}
+ span[1]{class=badge data-testid=items-left}
+ form[1]{class=composer data-testid=composer}
+ input[0]{class=composer-input data-testid=new-task-input placeholder=What needs doing? type=text}
+ button[1]{class=btn btn-primary data-testid=add-task type=submit text=Add}
+ input[0]{class=search-input data-testid=search placeholder=Search tasks type=search}
+ div[1]{aria-label=Filter tasks class=filters data-testid=filters role=group}
+ ul[3]{class=task-list data-testid=task-list}
+ p[4]{class=empty-state data-testid=empty-state hidden=}
+ button[0]{class=btn btn-ghost data-testid=clear-completed type=button text=Clear completed}
```

## Repair attempts

**Attempt 1** — parse: patched, verify: passed, guard: confirmed  _(2166+123 tok, 1128ms)_
