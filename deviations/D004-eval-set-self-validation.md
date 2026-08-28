# D004 — Added defect-only variants, a smoke spec, and a validation step

- **Date:** 2026-08-28
- **Spec section:** §3 (three builds per case), §7 (reproducibility contract)
- **Status:** accepted

## What the spec says

§3 defines three builds per case (`v0`, `mNN`, `mNN.defect`). §7 gives the reproduction path as
`npm ci && npx playwright install chromium && npm run eval`.

## What we built

Three additions, none of which are scored:

1. **Defect-only variants** — `v0.<feature>` for each of the seven defects: the unmutated app with
   one behaviour broken.
2. **A smoke spec** — `src/fixtures/smoke/app-works.spec.ts`, which drives state through the app's
   own API and counts `<li>` elements, the one thing no mutation changes.
3. **`npm run fixtures:validate`** — 34 checks, now part of the reproduction path.

## Why

The metric is only meaningful if two things hold, and neither was being checked.

**Defects must be load-bearing.** An inert defect makes the guard vacuous: every correct repair would
pass on the defect build and be scored a *false heal*. Running each defect against the unmutated app
proves it genuinely breaks its feature, independent of any mutation.

**Mutated builds must still work.** If a mutation broke the app itself, no repair could pass and the
case would be unfair. The smoke spec proves each heal variant is still a working application, so a
red suite there can only mean locator rot.

## What this caught

On its first real run the validation suite exposed a bug in itself, not in the fixtures. It reported
**22/22 passed** while Playwright had never executed once: Node 22 on Windows refuses to `spawnSync`
a `.cmd` shim without a shell, returning `EINVAL` and `status: null`, which the harness compared
against `status === 0` and read as "the spec failed". Every check at that point expected a failure,
so "never ran" and "failed as intended" were the same observation.

It surfaced only because the smoke checks expect a *pass*; those failed uniformly, which is what
exposed it. Fixed by spawning `process.execPath` with Playwright's own `cli.js`, and by making
`runSpec` throw on a null status or "No tests found" rather than returning a boolean.

This is the project's own thesis one level up the stack — a check that cannot distinguish "passed"
from "never ran" is not a check — and is the leading candidate for the submission's hot take.

## Cost

Adds roughly 34 Playwright invocations to the reproduction path. §7's command list needs updating in
the reproduction guide to include `fixtures:build` and `fixtures:validate`.
