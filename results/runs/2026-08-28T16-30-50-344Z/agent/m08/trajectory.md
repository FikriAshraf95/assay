# m08 — composer gains a label and a new placeholder

- Spec: `add-task.spec.ts`
- Variant: `m08`
- Case kind: heal
- Outcome: **accepted-guarded**
- Model calls: 1

## Triage

- Failure kind: `assertion-mismatch`
- Structure changed since last passing build: yes
- Verdict: **repair**

Every locator resolved, but the page structure differs from the last known-good build — a locator is very likely resolving to the wrong element.

```
- input[0]{class=composer-input data-testid=new-task-input id=new-task placeholder=What needs doing? type=text}
- button[1]{class=btn btn-primary data-testid=add-task id=add-task type=submit}
+ label[0]{class=composer-label}
+ input[1]{class=composer-input data-testid=new-task-input id=new-task placeholder=Add an item type=text}
+ button[2]{class=btn btn-primary data-testid=add-task id=add-task type=submit}
```

## Repair attempts

**Attempt 1** — parse: patched, verify: passed, guard: confirmed  _(1928+118 tok, 1125ms)_
