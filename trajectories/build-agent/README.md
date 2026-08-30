# Build-agent trajectories

Required disclosure of coding-agent use. This project was built with **Claude Code**
(`claude-opus-5`) driving the implementation under human direction. The files here are that
agent's own session transcripts — what it did, how each tool responded, and the human
checkpoints that redirected it.

Runtime trajectories for the agents *inside* the product — the healer and the baseline — are
recorded separately under `results/traces/` when the evaluation runs.

## Sessions

| Session | Human checkpoints | Assistant turns | Tool calls | Tokens (in/out) |
| --- | --- | --- | --- | --- |
| [`f1480558-6617-46af-a92a-2bcc48b9c70a`](f1480558-6617-46af-a92a-2bcc48b9c70a.md) | 45 | 506 | 266 | 969 / 785,085 |
| **Total** | **45** | **506** | **266** | **969 / 785,085** |

## Reading these

Each `.md` is a rendered, followable version: human checkpoints, the reasoning behind each
step (collapsed), every tool call with its arguments, and every tool response. The paired
`.jsonl` is the unabridged original in Claude Code session format.

## Redaction

API keys, tokens, email addresses and home-directory paths are stripped on the way in. The
snapshotter refuses to write any file in which a key-shaped string survives redaction, so a
credential cannot reach this directory by omission.

Regenerate with `npm run trajectories:snapshot`. Last run: 2026-08-30T16:15:09.801Z.
