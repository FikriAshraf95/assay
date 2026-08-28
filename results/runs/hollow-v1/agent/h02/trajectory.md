# h02 — counter gains a suffix element

- Spec: `items-left.spec.ts`
- Variant: `h02`
- Case kind: heal
- Outcome: **accepted-guarded**
- Model calls: 1

## Triage

- Structure changed since last passing build: yes
- Verdict: **repair**

The page structure differs from the last known-good build, so something the test addresses has moved, been renamed or been reordered.

```
+ span[0]{class=count}
+ span[1]{class=hint}
```

## Repair attempts

**Attempt 1** — parse: patched, verify: passed, guard: confirmed  _(1871+109 tok, 1054ms)_
