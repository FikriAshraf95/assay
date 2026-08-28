# m01 — CSS classes rehashed by the build tool

- Spec: `delete-task.spec.ts`
- Variant: `m01`
- Case kind: heal
- Outcome: **accepted-guarded**
- Model calls: 1

## Triage

- Structure changed since last passing build: yes
- Verdict: **repair**

The page structure differs from the last known-good build, so something the test addresses has moved, been renamed or been reordered.

```
- span[1]{class=badge data-testid=items-left id=items-left}
- input[0]{class=composer-input data-testid=new-task-input id=new-task placeholder=What needs doing? type=text}
- input[0]{class=search-input data-testid=search id=search placeholder=Search tasks type=search}
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
+ span[1]{class=bdg-6f1c33 data-testid=items-left id=items-left}
+ input[0]{class=cmp-51fa2c data-testid=new-task-input id=new-task placeholder=What needs doing? type=text}
+ input[0]{class=cmp-77b1e0 data-testid=search id=search placeholder=Search tasks type=search}
+ button[0]{class=flt-8823ac flt-ac7v01 data-filter=all data-testid=filter-all type=button text=All}
+ button[1]{class=flt-8823ac data-filter=active data-testid=filter-active type=button text=Active}
+ button[2]{class=flt-8823ac data-filter=completed data-testid=filter-completed type=button text=Completed}
+ ul[3]{class=lst-19ffab data-testid=task-list id=task-list}
+ li[0]{class=tsk-4f2a91 data-task-id=1 data-testid=task-item}
+ input[0]{aria-label=Toggle Write the reproduction guide class=tsk-01ab4e data-testid=task-toggle type=checkbox}
+ span[1]{class=tsk-9c31b0 data-testid=task-title}
+ button[2]{class=tsk-77de12 data-testid=task-delete type=button text=Delete}
+ li[1]{class=tsk-4f2a91 data-task-id=2 data-testid=task-item}
+ input[0]{aria-label=Toggle Record the demo video class=tsk-01ab4e data-testid=task-toggle type=checkbox}
+ span[1]{class=tsk-9c31b0 data-testid=task-title}
+ button[2]{class=tsk-77de12 data-testid=task-delete type=button text=Delete}
+ li[2]{class=tsk-4f2a91 tsk-c0mpl3 data-task-id=3 data-testid=task-item}
+ input[0]{aria-label=Toggle Pin the evaluation set class=tsk-01ab4e data-testid=task-toggle type=checkbox}
+ span[1]{class=tsk-9c31b0 data-testid=task-title}
+ button[2]{class=tsk-77de12 data-testid=task-delete type=button text=Delete}
+ p[4]{class=emp-4a2d90 data-testid=empty-state hidden= id=empty-state}
```

## Repair attempts

**Attempt 1** — parse: patched, verify: passed, guard: confirmed  _(3020+148 tok, 1450ms)_
