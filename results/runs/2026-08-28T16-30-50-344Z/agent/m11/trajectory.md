# m11 — filter buttons reordered

- Spec: `filter-completed.spec.ts`
- Variant: `m11`
- Case kind: heal
- Outcome: **accepted-guarded**
- Model calls: 1

## Triage

- Failure kind: `assertion-mismatch`
- Structure changed since last passing build: yes
- Verdict: **repair**

Every locator resolved, but the page structure differs from the last known-good build — a locator is very likely resolving to the wrong element.

```
- button[0]{class=filter is-active data-filter=all data-testid=filter-all type=button}
- button[2]{class=filter data-filter=completed data-testid=filter-completed type=button}
+ button[0]{class=filter data-filter=completed data-testid=filter-completed type=button}
+ button[2]{class=filter is-active data-filter=all data-testid=filter-all type=button}
```

## Repair attempts

**Attempt 1** — parse: patched, verify: passed, guard: confirmed  _(1926+95 tok, 1030ms)_
