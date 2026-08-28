# D005 — Build-agent trajectories are a separate artifact

- **Date:** 2026-08-29
- **Spec section:** §7 (reproducibility contract)
- **Status:** accepted

## What the spec says

> Every run writes raw request/response traces to `results/traces/` — these double as the required
> agent trajectories.

## What we built

That covers only the agents *inside* the product. The submission requires trajectories for **every
agent used**, and the agent that wrote this project — Claude Code — is one of them. Added
`npm run trajectories:snapshot` (`src/trajectories/snapshot.ts`), which copies the Claude Code session
transcripts into `trajectories/build-agent/`.

Two artifacts per session: the unabridged `.jsonl`, and a rendered `.md` with human checkpoints,
collapsed reasoning, every tool call with its arguments, and every tool response. Plus a generated
`README.md` carrying the required tool disclosure and per-session totals.

## Why

Raw JSONL sitting outside the repo satisfies nothing: it is not submitted, not readable, and would be
lost if the session store were cleared. The deliverable asks for trajectories "easy to follow from
the agent instructions to the final result", which the rendered Markdown provides and the raw format
does not.

## Redaction, and why it fails closed

Transcripts can contain anything typed or printed during a session, so the snapshotter strips API
keys, tokens, emails and home paths, and then **re-scans its own output**. If a key-shaped string
survives, it throws and writes nothing. Ground rule 8 keeps credentials out of the submission, and a
redactor that silently misses is worse than none — this one cannot fail quietly.

Verified on first run: 20 home paths rewritten, no credentials present.

## Note

The current session is live, so its snapshot is necessarily partial. **Re-run this immediately before
submission** to capture the complete record.

A tight external scan initially appeared to find an AWS key in the output. It was a false positive:
PowerShell's `Select-String` is case-insensitive by default and matched the mixed-case id
`AkIa8HSmu0Xq4yGWlmfY` against `AKIA[0-9A-Z]{16}`. The in-script guard is case-sensitive and correctly
ignored it. Worth remembering when auditing this directory by hand — use `-CaseSensitive`.
