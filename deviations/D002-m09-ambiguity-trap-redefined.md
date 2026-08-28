# D002 — Ambiguity trap redefined as a duplicate composer

- **Date:** 2026-08-28
- **Spec section:** §4, case `m09`
- **Status:** accepted

## What the spec says

> | m09 | **ambiguity trap** — a second "Delete" appears in a header menu | naive text locators now match 2 nodes |

## What we built

`m09` inserts a second **quick-add composer** into the header: an input carrying the same
`What needs doing?` placeholder and a second button labelled `Add`. Primary spec is
`add-task.spec.ts`, which locates the input by placeholder.

## Why

The spec's version does not bite. The seeded app renders three tasks, so three `Delete` controls
already exist on `v0`. Every spec that touches deletion is therefore *already* written to scope to a
single row — `delete-task.spec.ts` filters `.task-item` by its text before looking for the button. A
fourth `Delete` in the header changes nothing for a correctly written spec, so the case would have
measured nothing.

The trap has to attack a locator that is unique on `v0` and stops being unique after the mutation.
The composer is the natural target: exactly one input has that placeholder on `v0`, and exactly two
do afterwards, so `getByPlaceholder('What needs doing?')` goes from resolving cleanly to a Playwright
strict-mode violation. A correct repair has to scope to the real composer rather than reach for
`.first()`.

## Verified

`npm run fixtures:validate` confirms `m09` fails `add-task.spec.ts` and that the `m09` build is still
a working application.

## Note

`.first()` is the tempting shortcut here and it would pass the guard, since the quick-add control is
inert and the real composer is first in the DOM. That is worth watching in the results: it is a
repair that is green, guard-clean, and still brittle. If it shows up, it belongs in the write-up as a
limit of what the guard can detect.

## Correction — 2026-08-29 (run `triage-v2`)

The note above is wrong on a fact, and the case is better for it. The quick-add control is inserted
**after the header and before the composer**, so it comes *first* in DOM order — the decoy, not the
real control, is what `.first()` selects.

The agent did reach for `.first()`, on all three attempts:

```ts
await page.getByRole('textbox', { name: 'What needs doing?' }).first().fill('Buy milk');
await page.getByRole('button', { name: 'Add' }).first().click();
```

Every attempt failed VERIFY, because the decoy is inert — text typed into it goes nowhere. The agent
escalated rather than hand over an unverified patch.

So the shortcut is not "green and guard-clean" as predicted; it is simply wrong, and ordinary
verification catches it without the guard being involved. The trap punishes the shortcut instead of
rewarding it, which makes `m09` a stronger case than intended — though it is now a case the agent
**fails**, not one it passes. That is the honest result and is reported as such.
