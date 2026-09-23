# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`, never a single combined tickets file
- The `Status:` line near the top of each issue file holds the triage label while an issue is being triaged (see `triage-labels.md` for the role strings), then the lifecycle state defined in the Atlas section below (`planning` through `done`)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` (the Notes / Decisions-so-far / Fog body).
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.

<!-- atlas-v3:tracker:start -->
# Issue tracker

Tracker type: **local**.

This document is the authoritative repository policy for tracker reads, writes,
readiness, availability, claims, ownership, transitions, human-only actions,
and planning-artifact publication.

## States

| State | Meaning |
|---|---|
| `needs-triage` | New; a human must evaluate it |
| `ready-for-agent` | Fully specified; an agent may plan and build it |
| `planning` | An agent is writing the implementation plan |
| `plan-review` | Plan written; red-team review runs here when required |
| `in-progress` | Implementation underway on a feature branch |
| `ai-review` | Implementation complete; aggregate AI review and verification |
| `human-review` | PR open for the human to review and merge |
| `done` | PR merged to main |

Human-only states: `done`.

Recommended lifecycle: `needs-triage` → `ready-for-agent` → `planning` → `plan-review` → `in-progress` → `ai-review` → `human-review` → `done`.

## Read and write rules

- Read the complete ticket and comments before planning or implementation.
- Check for available work before claiming. Available work is ready to
  implement, unclaimed, in an eligible state, has no active impediment or
  blocking decision, and every `blocked by` ticket is in
  `done`. A dependency that is not a `blocked by` edge does
  not make work unavailable.
- Claim before starting work and use one active owner. Enter
  `needs-triage` only when starting any work.
- Enter `planning` only when planning starts and
  `plan-review` only when the plan is ready for review.
- Enter `in-progress` only when implementation starts.
- Enter `ai-review` only when aggregate AI code review starts.
- Record blocks, approved scope changes, proof of work, and the PR URL.
- Enter `human-review` only after verification and PR creation.
- Compare the next Atlas phase with the last-known tracker state from the
  initial ticket read or most recent successful transition. Do not fetch the
  ticket solely for this comparison. When both map to the same state, record
  the phase in its configured phase record or comment without requesting a
  same-status transition.
- Never enter `done`; a human does that after reviewing the PR.
- When blocked, preserve work, record the exact reason and resume instructions,
  and follow the configured blocked-state behavior. On resume, reread the ticket
  and avoid duplicating claims, transitions, workers, commits, or comments.
- Planning artifact storage: **repository**.
- Drafts before approval: **false**.
- Preview exact plan writes and transitions before publishing them. If drafts
  are not permitted, return the draft without presenting it as tracker state.
- Preserve stable ticket/spec requirements. Record evolving execution in
  `[EXECUTION PLAN]`, `[PROGRESS]`, `[SCOPE CHANGE]`, `[BLOCKED]`,
  `[AI CODE REVIEW]`, and `[CLOSEOUT]` records rather than silently rewriting
  the contract. Write the complete AI Code Review output to the ticket before
  entering `human-review`.

Before creating, classifying, prioritizing, or decomposing tickets, also read
and follow `docs/agents/triage-labels.md`. Do not infer labels or priority from
this document.

## Readiness

Ready to plan: Issue file has `Status: ready-for-agent`

Ready to implement: Issue is `ready-for-agent` and its plan (if required) is written under the issue's .scratch/<feature>/ directory

Available to claim: Status is `ready-for-agent`, no claim/owner recorded, and every entry in its `Blocked by:` line is `done`

## Sources and pull requests

| Repository | Path | Source host | Base branch | PR creation command |
|---|---|---|---|---|
| `war-weeker` | `.` | github | `main` | `gh pr create --base main --head <feature-branch>` |

Open one PR per affected repository.

The tracker and source host may differ. Never infer tracker operations from the
source host.

## Atlas closeout record

Record every repository delivery, deliverable and worker/model, each DoD
outcome and evidence, deviations, verified run command, deployed smoke when
applicable, every PR URL, and the AI Code Review output.
<!-- atlas-v3:tracker:end -->
