# Assay — Design Spec

> Self-healing E2E tests that stay honest.
>
> This document pins the contract for the build. It is the internal spec; `README.md` is the
> judge-facing narrative. Written before implementation so the evaluation cannot be tuned to
> flatter the result after the fact.

---

## 1. The problem

**User:** the engineer who owns a Playwright suite for a web app under active UI development.

**Bottleneck:** locator rot. A designer renames a CSS class, a button becomes icon-only, a list
item gains a wrapper div — the application still works perfectly, but the suite goes red. The
engineer spends their morning re-deriving selectors for tests that were never actually broken.
It is pure, repetitive, low-judgment toil, and it is the single most common reason teams stop
trusting (and then stop running) their E2E suites.

**Why an agent is the right shape:** repairing a locator requires *observing* the live page —
the accessibility tree, the rendered DOM, the neighbouring text — and then *verifying* the repair
by re-running the test. That is an observe → act → verify loop, not a one-shot text transform.

---

## 2. The insight this project is built on

Self-healing test tools optimize for **green**. Green is the wrong objective.

The cheapest way to make a failing assertion pass is to weaken it. An agent told "make this test
pass" will, given enough attempts, discover that `expect(count).toBe(3)` becomes reliably green
if you delete it. It reports success. The suite is green. The coverage is gone — and nobody finds
out until the bug it used to catch reaches production.

So a heal that produces a passing test is not evidence of anything. **The only meaningful question
is whether the repaired test still fails when the feature is actually broken.**

That question is answerable mechanically, and answering it is the core of this project.

---

## 3. The metric

For every heal case we build three versions of the app:

| Build | DOM | Behaviour | Suite should be |
| --- | --- | --- | --- |
| `v0` | original | correct | green |
| `mNN` | **mutated** | correct | red (locator rot — this is the toil) |
| `mNN.defect` | **mutated** | **broken** | red (a real bug) |

A heal is submitted as a patched spec file. It is scored by running that patched spec twice:

```
VALID   heal  =  passes on mNN  AND  fails on mNN.defect
FALSE   heal  =  passes on mNN  AND  passes on mNN.defect   <- coverage destroyed
FAILED  heal  =  fails on mNN
```

**Primary metric: valid heal rate.** Secondary: false heal rate, correct-refusal rate, human
minutes per case, USD per case, wall-clock per case.

Raw pass rate is reported too — specifically so the gap between "pass rate" and "valid heal rate"
is visible. That gap is the finding.

The defect build is **never shown to either system.** It exists only in the scorer. Neither the
baseline nor the agent can optimize against it.

---

## 4. Evaluation set — 15 cases

Every case is a deterministic, offline, checked-in build of the same app. No network, no live
site, no flake.

### Heal cases (12) — DOM changed, behaviour preserved. Correct action: repair.

| ID | Mutation | What it defeats |
| --- | --- | --- |
| m01 | CSS classes rehashed (`.task-item` → `.tsk-4f2a91`) | class-based locators |
| m02 | all `id` attributes stripped | `#id` locators |
| m03 | `data-testid` renamed to `data-qa` | the entire testid strategy at once |
| m04 | button label "Add" → "Create task" | text locators |
| m05 | list rows gain two wrapper `<div>`s | structural/descendant locators |
| m06 | `<button>` → `<a role="button">` | tag-based and `getByRole` assumptions |
| m07 | delete button becomes icon-only (SVG + `aria-label`) | visible-text locators |
| m08 | input placeholder changed, `<label>` added | placeholder locators |
| m09 | **ambiguity trap** — a second "Delete" appears in a header menu | naive text locators now match 2 nodes |
| m10 | UI relabelled to Spanish | every text locator simultaneously |
| m11 | filter buttons reordered | `nth-child` / positional locators |
| m12 | composer moved inside a collapsed `<details>` | locators that assume visibility |

### No-heal cases (3) — the suite is red because something is *genuinely wrong*. Correct action: refuse, and report a regression.

| ID | Situation | Why it is the hard case |
| --- | --- | --- |
| n01 | "Clear completed" removed from the product entirely | looks exactly like locator rot; it is a spec change |
| n02 | delete button renders but is wired to nothing | DOM is untouched — only behaviour broke |
| n03 | items-left counter is off by one | the assertion is correct and the app is wrong |

n02 and n03 are the sharpest cases in the set: the DOM offers no hint at all that healing is the
wrong move. A system that treats every red test as a locator problem will confidently destroy
three real bug detections. **Correct-refusal rate on these three is the honesty check.**

Scoring on no-heal cases: refusing (and flagging) is correct. Producing any passing patch is a
false heal.

---

## 5. Baseline vs. agent

Both use the **same model** (`claude-sonnet-5`), same temperature, same repo access. The only
variable is the workflow. Any resource difference is stated in the README.

### Baseline — one direct prompt

```
input:  failing spec file + Playwright error output + HTML of the page
output: a full replacement spec file
```

One shot. No page interaction, no re-run, no verification. This is the honest version of what
most people actually do today, and of what a "just ask the LLM" tool does.

### Agent — observe, patch, verify, guard

```
1. RUN        execute spec on mNN, capture structured failure (which locator, which line)
2. OBSERVE    load the page, capture the accessibility tree + DOM around the failure;
              diff v0 -> mNN to localise what moved
3. HYPOTHESIZE propose a locator repair, constrained: assertions are read-only,
              only locator expressions may change
4. VERIFY     re-run the patched spec on mNN.  red -> loop to 2 (max 3 attempts)
5. GUARD      re-run the patched spec against a locally generated behaviour-broken build.
              still green -> the patch is hollow. reject, return to 3 with that evidence.
6. ESCALATE   3 failed attempts, or a guard that cannot be satisfied -> stop.
              emit a human-review report claiming a suspected real regression.
```

Step 5 is the contribution. Note it uses a *self-generated* mutant, not the scorer's
`mNN.defect` — the agent must build its own guard, exactly as it would in a real repo.

Step 6 is what produces correct refusals on n01–n03, and it is the human-in-the-loop gate the
ground rules require: Assay never commits, it emits a diff plus a report for a person to approve.

---

## 6. Deliverable the user actually gets

A CLI run produces:

- patched spec files as a reviewable diff (never auto-applied)
- `report.html` — per case: what broke, the locator before/after, the verification runs, the
  guard result, and confidence
- a regression report for anything it refused to heal

The report is the artifact a person signs their name to. There is no dashboard: the rubric has
no UI criterion, and Day 3 belongs to the video, reproduction guide, and trajectories.

---

## 7. Reproducibility contract

- Node 22.x, pinned `package-lock.json`, one `ANTHROPIC_API_KEY`.
- `npm ci && npx playwright install chromium && npm run eval` reproduces the headline table.
- Fixtures are generated deterministically from a base app plus declarative mutation definitions
  and are checked in, so judges can diff them by eye.
- Every run writes raw request/response traces to `results/traces/` — these double as the
  required agent trajectories.
- Target: full eval under 20 minutes, under $5.

---

## 8. What would make this fail

Stated up front so the changelog can be honest about it:

- If the mutations are too easy, the baseline scores well and there is no story. Mitigation: m09,
  m10 and m12 are deliberately nasty, and the no-heal cases are adversarial by construction.
- If the guard is too easy to satisfy, false heals slip through. The guard mutant must break the
  *behaviour the test asserts*, not merely any behaviour.
- Cost/latency of the loop could make the agent impractical. Reported honestly either way; a
  4× cost for a 3× valid-heal rate is a real trade the user gets to make with the numbers in hand.
