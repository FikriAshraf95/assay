# D010 — Triage drops log scraping for a single structural comparison

- **Date:** 2026-08-29
- **Spec section:** §5 (agent workflow)
- **Supersedes:** stage 1 of [D009](D009-composite-triage.md)
- **Status:** accepted
- **Evidence:** run `2026-08-28T16-30-50-344Z`

## What D009 built

A two-stage test. Stage 1 asked "did a locator fail to resolve?" by matching patterns against
Playwright's failure output — `element(s) not found`, `waiting for locator`, `strict mode violation`
and similar. Stage 2 compared page structure against the last known-good build.

## What the run showed

Stage 1 misclassified 2 of 15 cases, and in both directions:

| Case | Truth | Stage 1 said | Result |
| --- | --- | --- | --- |
| `m04` | locator unresolved | assertion-mismatch | **refused a case needing repair** |
| `n03` | assertion mismatch | unresolved-locator | **repaired a case needing refusal** |

The reason is that Playwright's call log does not say what the pattern list assumed.

`n03` is an assertion failure — the counter reads `3 items left` instead of `2` — yet its log still
contains `waiting for locator('#items-left')`, because that is how the expect step narrates itself
while polling. The pattern fired on a case where the locator resolved perfectly.

`m04` is a genuine unresolved-locator timeout, but its log says `waiting for getByRole(...)`, not
`waiting for locator`, so the pattern missed it.

The heuristic was very nearly inverted. Worse, it was the wrong *kind* of test: a brittle proxy for
the property actually of interest, which is the mistake this whole project exists to argue against.
It read plausibly and it was wrong, and only running it revealed that.

## What we built instead

Stage 1 is deleted. Triage is now a single deterministic structural comparison against the last
known-good build, with one refinement that makes it sufficient on its own.

`m04` and `n03` are both **text-only** changes, which is why structure alone could not separate them
before. What separates them is *which* text:

- `m04` changes a **button's label** — `Add` becomes `Create task`. A control's accessible name is
  part of the page's addressing surface; a test locates by it.
- `n03` changes a **displayed value** — the counter reads `3 items left`. That is data the test
  asserts *about*, and it is exactly where a behavioural bug surfaces.

So the element signature now includes text for label-bearing elements (`button`, `a`, `label`,
`summary`, `option`, and anything with `role=button|link|tab`) and excludes it everywhere else.

```
Does the page's structure differ from the last known-good build?
  yes -> something the test addresses has moved, been renamed, or been reordered. Repair.
  no  -> every control is where it was and named what it was. The application is wrong. Refuse.
```

## Effect on every case

| Case | Signature difference | Verdict |
| --- | --- | --- |
| `m01`–`m03`, `m05`–`m12` | attributes, ordering or nesting | repair |
| `m04` | button label text | repair |
| `n01` | control absent | repair, then escalate on exhaustion |
| `n02` | none | **refuse** |
| `n03` | none — counter text is not label-bearing | **refuse** |

## Known limitation

A spec that locates an element by **data** text — `filter({ hasText: 'Record the demo video' })` —
would be misclassified if that data changed, since non-label text is excluded by design. No case in
this evaluation set does that, but it is a real hole and belongs in the write-up rather than being
discovered by a reader.

## Why this is worth keeping in the record

This is the experiment to show in the video. It was implemented, run on the full set, and removed
because measurement contradicted the reasoning behind it. The replacement is simpler than what it
replaced — one comparison instead of two stages plus a pattern list — which is the usual shape of a
good correction.
