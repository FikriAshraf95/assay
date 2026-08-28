# m12 — composer collapsed behind a disclosure

- Spec: `add-task.spec.ts`
- Variant: `m12`
- Case kind: heal
- Outcome: **accepted-guarded**
- Model calls: 1

## Triage

- Structure changed since last passing build: yes
- Verdict: **repair**

The page structure differs from the last known-good build, so something the test addresses has moved, been renamed or been reordered.

```
+ details[1]{class=composer-shell}
+ summary[0]{class=composer-summary text=New task}
```

## Repair attempts

**Attempt 1** — parse: patched, verify: passed, guard: confirmed  _(2004+489 tok, 15078ms)_
