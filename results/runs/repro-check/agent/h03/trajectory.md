# h03 — counter reworded, number moved into its own element

- Spec: `items-left.spec.ts`
- Variant: `h03`
- Case kind: heal
- Outcome: **accepted-guarded**
- Model calls: 1

## Triage

- Structure changed since last passing build: yes
- Verdict: **repair**

The page structure differs from the last known-good build, so something the test addresses has moved, been renamed or been reordered.

```
+ span[0]{class=count}
```

## Repair attempts

**Attempt 1** — parse: patched, verify: passed, guard: confirmed  _(1839+103 tok, 1021ms)_
