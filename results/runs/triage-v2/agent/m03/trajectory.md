# m03 — test hooks renamed from data-testid to data-qa

- Spec: `complete-task.spec.ts`
- Variant: `m03`
- Case kind: heal
- Outcome: **accepted-guarded**
- Model calls: 3

## Triage

- Structure changed since last passing build: yes
- Verdict: **repair**

The page structure differs from the last known-good build, so something the test addresses has moved, been renamed or been reordered.

```
- span[1]{class=badge data-testid=items-left id=items-left}
- form[1]{class=composer data-testid=composer id=composer}
- input[0]{class=composer-input data-testid=new-task-input id=new-task placeholder=What needs doing? type=text}
- button[1]{class=btn btn-primary data-testid=add-task id=add-task type=submit text=Add}
- input[0]{class=search-input data-testid=search id=search placeholder=Search tasks type=search}
- div[1]{aria-label=Filter tasks class=filters data-testid=filters id=filters role=group}
- button[0]{class=filter is-active data-filter=all data-testid=filter-all type=button text=All}
- button[1]{class=filter data-filter=active data-testid=filter-active type=button text=Active}
- button[2]{class=filter data-filter=completed data-testid=filter-completed type=button text=Completed}
- ul[3]{class=task-list data-testid=task-list id=task-list}
- li[0]{class=task-item data-task-id=1 data-testid=task-item}
- input[0]{aria-label=Toggle Write the reproduction guide class=task-toggle data-testid=task-toggle type=checkbox}
- span[1]{class=task-title data-testid=task-title}
- span[1]{class=task-title data-testid=task-title}
- span[1]{class=task-title data-testid=task-title}
- button[2]{class=task-delete data-testid=task-delete type=button text=Delete}
- button[2]{class=task-delete data-testid=task-delete type=button text=Delete}
- button[2]{class=task-delete data-testid=task-delete type=button text=Delete}
- li[1]{class=task-item data-task-id=2 data-testid=task-item}
- input[0]{aria-label=Toggle Record the demo video class=task-toggle data-testid=task-toggle type=checkbox}
- li[2]{class=task-item is-completed data-task-id=3 data-testid=task-item}
- input[0]{aria-label=Toggle Pin the evaluation set class=task-toggle data-testid=task-toggle type=checkbox}
- p[4]{class=empty-state data-testid=empty-state hidden= id=empty-state}
- button[0]{class=btn btn-ghost data-testid=clear-completed id=clear-completed type=button text=Clear completed}
+ span[1]{class=badge data-qa=items-left id=items-left}
+ form[1]{class=composer data-qa=composer id=composer}
+ input[0]{class=composer-input data-qa=new-task-input id=new-task placeholder=What needs doing? type=text}
+ button[1]{class=btn btn-primary data-qa=add-task id=add-task type=submit text=Add}
+ input[0]{class=search-input data-qa=search id=search placeholder=Search tasks type=search}
+ div[1]{aria-label=Filter tasks class=filters data-qa=filters id=filters role=group}
+ button[0]{class=filter is-active data-filter=all data-qa=filter-all type=button text=All}
+ button[1]{class=filter data-filter=active data-qa=filter-active type=button text=Active}
+ button[2]{class=filter data-filter=completed data-qa=filter-completed type=button text=Completed}
+ ul[3]{class=task-list data-qa=task-list id=task-list}
+ li[0]{class=task-item data-qa=task-item data-task-id=1}
+ input[0]{aria-label=Toggle Write the reproduction guide class=task-toggle data-qa=task-toggle type=checkbox}
+ span[1]{class=task-title data-qa=task-title}
+ button[2]{class=task-delete data-qa=task-delete type=button text=Delete}
+ li[1]{class=task-item data-qa=task-item data-task-id=2}
+ input[0]{aria-label=Toggle Record the demo video class=task-toggle data-qa=task-toggle type=checkbox}
+ span[1]{class=task-title data-qa=task-title}
+ button[2]{class=task-delete data-qa=task-delete type=button text=Delete}
+ li[2]{class=task-item is-completed data-qa=task-item data-task-id=3}
+ input[0]{aria-label=Toggle Pin the evaluation set class=task-toggle data-qa=task-toggle type=checkbox}
+ span[1]{class=task-title data-qa=task-title}
+ button[2]{class=task-delete data-qa=task-delete type=button text=Delete}
+ p[4]{class=empty-state data-qa=empty-state hidden= id=empty-state}
+ button[0]{class=btn btn-ghost data-qa=clear-completed id=clear-completed type=button text=Clear completed}
```

## Repair attempts

**Attempt 1** — parse: patched, verify: failed, guard: skipped → rejected (still-failing)  _(2945+120 tok, 1178ms)_
**Attempt 2** — parse: patched, verify: failed, guard: skipped → rejected (still-failing)  _(3505+123 tok, 1108ms)_
**Attempt 3** — parse: patched, verify: passed, guard: confirmed  _(3560+123 tok, 1143ms)_
