# m08 — composer gains a label and a new placeholder

- Spec: `add-task.spec.ts`
- Variant: `m08`
- Case kind: heal
- Outcome: **accepted-guarded**
- Model calls: 1

## Triage

- Structure changed since last passing build: yes
- Verdict: **repair**

The page structure differs from the last known-good build, so something the test addresses has moved, been renamed or been reordered.

```
- input[0]{class=composer-input data-testid=new-task-input id=new-task placeholder=What needs doing? type=text}
- button[1]{class=btn btn-primary data-testid=add-task id=add-task type=submit text=Add}
+ label[0]{class=composer-label text=New task}
+ input[1]{class=composer-input data-testid=new-task-input id=new-task placeholder=Add an item type=text}
+ button[2]{class=btn btn-primary data-testid=add-task id=add-task type=submit text=Add}
```

## Repair attempts

**Attempt 1** — parse: patched, verify: passed, guard: confirmed  _(1955+438 tok, 45699ms)_
