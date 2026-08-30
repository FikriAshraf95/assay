# m10 — interface relabelled to Spanish

- Spec: `filter-active.spec.ts`
- Variant: `m10`
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
- input[0]{class=search-input data-testid=search id=search placeholder=Search tasks type=search}
- div[1]{aria-label=Filter tasks class=filters data-testid=filters id=filters role=group}
- button[0]{class=filter is-active data-filter=all data-testid=filter-all type=button text=All}
- button[1]{class=filter data-filter=active data-testid=filter-active type=button text=Active}
- button[2]{class=filter data-filter=completed data-testid=filter-completed type=button text=Completed}
- button[2]{class=task-delete data-testid=task-delete type=button text=Delete}
- button[2]{class=task-delete data-testid=task-delete type=button text=Delete}
- button[2]{class=task-delete data-testid=task-delete type=button text=Delete}
- button[0]{class=btn btn-ghost data-testid=clear-completed id=clear-completed type=button text=Clear completed}
+ input[0]{class=composer-input data-testid=new-task-input id=new-task placeholder=¿Qué hay que hacer? type=text}
+ button[1]{class=btn btn-primary data-testid=add-task id=add-task type=submit text=Añadir}
+ input[0]{class=search-input data-testid=search id=search placeholder=Buscar tareas type=search}
+ div[1]{aria-label=Filtrar tareas class=filters data-testid=filters id=filters role=group}
+ button[0]{class=filter is-active data-filter=all data-testid=filter-all type=button text=Todas}
+ button[1]{class=filter data-filter=active data-testid=filter-active type=button text=Activas}
+ button[2]{class=filter data-filter=completed data-testid=filter-completed type=button text=Completadas}
+ button[2]{class=task-delete data-testid=task-delete type=button text=Eliminar}
+ button[2]{class=task-delete data-testid=task-delete type=button text=Eliminar}
+ button[2]{class=task-delete data-testid=task-delete type=button text=Eliminar}
+ button[0]{class=btn btn-ghost data-testid=clear-completed id=clear-completed type=button text=Borrar completadas}
```

## Repair attempts

**Attempt 1** — parse: patched, verify: passed, guard: confirmed  _(2384+110 tok, 1115ms)_
