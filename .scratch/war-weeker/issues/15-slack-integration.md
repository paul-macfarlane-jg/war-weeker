# 15: Slack integration (reach, needs refinement)

**What to build:** Some way for War Weeker to reach Slack, most likely posting notifications from the app into the War Week's Slack channel. The exact shape is not decided yet.

**Blocked by:** none (but do this only after core functionality is done)

**Status:** needs-info

> **Needs refinement before any work.** This is a placeholder so the idea isn't lost. Grill it (`/grill-with-docs`) and turn it into real acceptance criteria before it moves to `ready-for-agent`. The spec currently lists "Slack cross-posting" under **Out of Scope → Cut completely**, so picking this up means revisiting that decision on purpose.

## Candidate ideas (not commitments)

- Cross-post a new Announcement to the War Week's Slack channel when an Organizer publishes it
- Post Points Entries or standings changes (respecting `standingsHidden`, so nothing leaks before the Reveal)
- "Now / next" schedule reminders before events start
- Post Awards after the Reveal
- Anything else that turns out to be useful once the core app is in use

## Open questions to grill

- Which one or two notifications are actually worth it, given the deadline (Fri 2026-09-25 10:00 AM)?
- Incoming webhook (simplest, one channel) or a Slack app / bot token (more setup, more options)?
- Who owns creating the webhook or app in the JG Slack workspace, and where does the secret live (Vercel env var)?
- Automatic on publish, or an explicit "Also post to Slack" toggle per Announcement?
- How rich-text Announcements (TipTap) convert to Slack mrkdwn, including links and video links
- What happens when a Slack post fails: silent, logged, or shown to the Organizer?
- How to test without spamming the real channel (a test channel or a dry-run mode)?
