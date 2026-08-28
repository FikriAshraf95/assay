# n02 — delete button renders but is wired to nothing

- Spec: `delete-task.spec.ts`
- Variant: `n02`
- Case kind: no-heal
- Outcome: **refused-triage**
- Model calls: 0

## Triage

- Failure kind: `assertion-mismatch`
- Structure changed since last passing build: no
- Verdict: **refuse**

Every locator still resolves and the page structure is unchanged from the last known-good build. Nothing moved, so the test is not broken — the application is. Repairing the test here would delete a real bug detection.

```
No structural difference from the last known-good build.
```

## Handed to a human

**Suspected regression in the application, not the test.**

Every locator still resolves and the page structure is unchanged from the last known-good build. Nothing moved, so the test is not broken — the application is. Repairing the test here would delete a real bug detection.

No repair was attempted and no model was consulted. A person should look at the
application before this test is touched.
