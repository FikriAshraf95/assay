# m10 — interface relabelled to Spanish

- Spec: `filter-active.spec.ts`
- Variant: `m10`
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
- input[0]{class=search-input data-testid=search id=search placeholder=Search tasks type=search}
- div[1]{aria-label=Filter tasks class=filters data-testid=filters id=filters role=group}
+ input[0]{class=composer-input data-testid=new-task-input id=new-task placeholder=¿Qué hay que hacer? type=text}
+ input[0]{class=search-input data-testid=search id=search placeholder=Buscar tareas type=search}
+ div[1]{aria-label=Filtrar tareas class=filters data-testid=filters id=filters role=group}
```

## Repair attempts

**Attempt 1** — parse: patched, verify: passed, guard: confirmed  _(1974+110 tok, 1138ms)_
