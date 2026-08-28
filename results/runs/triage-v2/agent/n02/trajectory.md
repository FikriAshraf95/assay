# n02 — delete button renders but is wired to nothing

- Spec: `delete-task.spec.ts`
- Variant: `n02`
- Case kind: no-heal
- Outcome: **refused-triage**
- Model calls: 0

## Triage

- Structure changed since last passing build: no
- Verdict: **refuse**

Every control is still present, still named the same and still in the same place as the last known-good build. Nothing the test addresses has changed, so the test is not broken — the application is. Repairing it here would delete a real bug detection.

```
No structural difference from the last known-good build.
```

## Handed to a human

**Suspected regression in the application, not the test.**

Every control is still present, still named the same and still in the same place as the last known-good build. Nothing the test addresses has changed, so the test is not broken — the application is. Repairing it here would delete a real bug detection.

No repair was attempted and no model was consulted. A person should look at the
application before this test is touched.
