<!-- atlas-v3:testing:start -->
# Testing and proof of work

This document is the authoritative repository policy for verification commands,
acceptance evidence, and `PASS`, `FAIL`, `BLOCKED`, and `SKIPPED` verdict
semantics.

Run surface: **local + deployed**.

Read this guide while planning acceptance criteria, Definition of Done,
fixtures, and verification. Resolve the applicable commands and evidence rules
into each execution packet; implementation workers execute that packet without
rereading this guide.

## Commands

| Check | Command | Coverage | When | Status |
|---|---|---|---|---|
| typecheck | `unavailable (no code yet)` | Type correctness across the app | Per slice gate, before PR | unavailable |
| lint | `unavailable (no code yet)` | Static code issues | Per slice gate, before PR | unavailable |
| format | `unavailable (no code yet)` | Consistent formatting | Before lint | unavailable |
| unit | `unavailable (no code yet); vitest planned` | Pure modules and services through public interfaces; no DB for pure-module tests | During implementation and per slice gate | unavailable |
| build | `unavailable (no code yet)` | Next.js production build | Per slice gate, before PR | unavailable |
| e2e | `unavailable (no code yet); smoke planned` | Seeded local Postgres + app start; /xi, /xi/leaderboard, /api/mcp respond; hidden leaderboard via MCP. Only coverage for UI and admin forms | Per slice gate, before PR | unavailable |
| run | `unavailable (no code yet)` | Local dev server | Manual verification and smoke | unavailable |

`verified` means the command ran successfully here. `inferred` means configuration names it but setup did not execute it. `unavailable` is an explicit gap.

## Evidence policy

- Repository-local proof-artifact root: `test-results`.
- Clear the entire proof-artifact root before capturing evidence for each work
  package. It intentionally contains only the latest work package's evidence.
- For UI screenshots and videos, use one directory per test name beneath the
  proof-artifact root. Rerunning a test replaces that test directory.
- Visual/browser behavior: screenshot per smoke test when visual state matters; no video.
- Integration and non-UI behavior: captured vitest and smoke output when an artifact is needed beyond the command result.
- External integration: smoke result against the Vercel deployment when a slice includes deploy.
- Sensitive data: never include secrets, env values, OAuth tokens, or real employee personal data beyond names already on the public JG wiki.
- Any screenshot, video, test report, captured output, or other artifact cited as
  `PASS` evidence is saved beneath `test-results` and committed
  on the feature branch. The PR links to the committed path; it never describes
  an uncommitted local file as attached evidence.
- Screenshot is the default visual proof. Add video only when motion, timing, or
  a multi-step interaction is material and a still image cannot prove it. Do not
  require screenshots or video when the repository has no UI/browser surface.
- Failure-only diagnostics not cited as `PASS` evidence, such as large traces,
  may remain uncommitted when repository policy says so.
- A blocked or skipped check records the attempted command and raw failure.
- `BLOCKED`, `SKIPPED`, ambiguity, and worker self-report are never `PASS`.

Run formatting before lint review, avoid unrelated reformatting, and rerun
affected tests after automatic fixes. Give every real integration seam at least
one criterion against the real dependency. Name test accounts, seed data,
confirmation flows, and cleanup. Human-gated criteria name the prerequisite,
human action, expected result, and post-action check. Runnable work must be
startable and exercisable by a fresh context using committed instructions.

Use `PASS` when evidence proves the criterion, `FAIL` when observable behavior is
incorrect, `BLOCKED` when it cannot be observed or exercised, and `SKIPPED` only
for an approved exception with the attempted command and reason. Sanitize every
retained artifact before storage or sharing.
<!-- atlas-v3:testing:end -->
