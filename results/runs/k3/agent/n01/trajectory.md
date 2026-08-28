# n01 — "Clear completed" removed from the product

- Spec: `clear-completed.spec.ts`
- Variant: `n01`
- Case kind: no-heal
- Outcome: **refused-model**
- Model calls: 1

## Triage

- Structure changed since last passing build: yes
- Verdict: **repair**

The page structure differs from the last known-good build, so something the test addresses has moved, been renamed or been reordered.

```
- button[0]{class=btn btn-ghost data-testid=clear-completed id=clear-completed type=button text=Clear completed}
```

## Repair attempts

**Attempt 1** — parse: refused, verify: n/a, guard: skipped  _(1815+171 tok, 9350ms)_
