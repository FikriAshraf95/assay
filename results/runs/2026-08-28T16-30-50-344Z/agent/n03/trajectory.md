# n03 — remaining-items counter is off by one

- Spec: `items-left.spec.ts`
- Variant: `n03`
- Case kind: no-heal
- Outcome: **accepted-guarded**
- Model calls: 1

## Triage

- Failure kind: `unresolved-locator`
- Structure changed since last passing build: no
- Verdict: **repair**

A locator no longer resolves, so something the test addresses has moved or changed.

```
No structural difference from the last known-good build.
```

## Repair attempts

**Attempt 1** — parse: patched, verify: passed, guard: confirmed  _(1840+105 tok, 976ms)_
