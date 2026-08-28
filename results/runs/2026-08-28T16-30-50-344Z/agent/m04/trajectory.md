# m04 — submit button relabelled from "Add" to "Create task"

- Spec: `add-validation.spec.ts`
- Variant: `m04`
- Case kind: heal
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
