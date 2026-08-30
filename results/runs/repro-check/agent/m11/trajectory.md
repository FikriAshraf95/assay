# m11 — filter buttons reordered

- Spec: `filter-completed.spec.ts`
- Variant: `m11`
- Case kind: heal
- Outcome: **accepted-guarded**
- Model calls: 1

## Triage

- Structure changed since last passing build: yes
- Verdict: **repair**

The page structure differs from the last known-good build, so something the test addresses has moved, been renamed or been reordered.

```
- button[0]{class=filter is-active data-filter=all data-testid=filter-all type=button text=All}
- button[2]{class=filter data-filter=completed data-testid=filter-completed type=button text=Completed}
+ button[0]{class=filter data-filter=completed data-testid=filter-completed type=button text=Completed}
+ button[2]{class=filter is-active data-filter=all data-testid=filter-all type=button text=All}
```

## Repair attempts

**Attempt 1** — parse: patched, verify: passed, guard: confirmed  _(1935+95 tok, 900ms)_
