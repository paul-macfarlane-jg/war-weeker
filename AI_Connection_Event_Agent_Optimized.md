# AI Connection Event

## Event Metadata

- **Event:** AI Connection Event
- **Organization:** Jahnel Group (internal)
- **Location:** JGHQ, 108 State St, 5th floor, Schenectady, NY
- **Dates:** Wednesday, September 23 through Friday, September 25
- **Calendar authority:** Every session is on the Jahnel Group Calendar. Check the calendar for event blocks and last-minute changes.
- **Daily Atlas office hours:** 8:00–8:30 AM, in person or on Google Meet

---

## Schedule

### Wednesday, September 23

**Theme:** Kickoff. Teams form and start building.

| Time | Event | Details |
|---|---|---|
| 7:30 AM | Morning walk | Walk through the Stockade; coffee at Arthur's Market |
| 8:00 AM | Atlas Office Hours and Atlas setup | Get installed and set up with help in the room. Prerequisite: watch **Atlas Demo**, **Setup Green Field Project**, and complete Atlas setup. |
| 8:30 AM | Healthy Breakfast Bar | Breakfast |
| 12:00 PM | Atlas Kickoff | Lunch: sandwich and salad bar. Overview of how the hackathon works. Build solo or as a team. |
| After kickoff | Build time | Open build time |
| 5:00 PM | Pizza | Dinner |
| 5:30 PM | Evening working session | Stay as long as you like |

### Thursday, September 24

**Theme:** PSL Day and the Fall Bakeoff in the morning.

| Time | Event | Details |
|---|---|---|
| 7:30 AM | Morning walk | Walk through the Stockade; coffee at Arthur's Market |
| 8:00 AM | Atlas office hours | Drop-in support |
| 8:30 AM | JCS PSL Coffee Bar, Fall Breakfast Club, Fall Bakeoff | Bring an entry for the bakeoff if you have one |
| 12:00 PM | Responsible AI Usage | Josh Jameson; 30 minutes. Lunch: sandwich and salad bar. |
| After talk | Build time | Open build time |
| 5:00 PM | Italian buffet | Clients arrive |
| 5:30 PM | AI Community Roundtable | Open to the public. Topics: **AI ROI**, then **Building AI Harness**. Wraps around 7:30 PM; attendees can hang around afterward. |

### Friday, September 25

**Theme:** Show what you built. Then go out.

| Time | Event | Details |
|---|---|---|
| 7:30 AM | Morning walk | Walk through the Stockade; coffee at Arthur's Market |
| 8:00 AM | Atlas office hours | Last fixes |
| 8:30 AM | Healthy Breakfast Bar | Breakfast |
| 10:00 AM | Submissions close | Every team and solo builder fills out the form describing what they built |
| 12:00 PM | Atlas Project Presentations | Lunch: sandwich and salad bar. Selected teams and solo builders demo for about five minutes each, followed by questions. |
| 4:30 PM | Engagement Hour | Burgers and dogs on the grill. Optional mini AI talk with Paul in the conference room. |
| Later | Frog Alley, then casino | For whoever is still standing |

---

## Talks and Sessions

### Atlas Office Hours

- **When:** Wednesday through Friday at 8:00 AM
- **Format:** Google Meet or in person
- **Purpose:** Drop-in help with Atlas setup, planning, and builds
- **People:** Alex Kelly, Ian Ballard, Jory Hutchins, Steven Zgaljic

### Wednesday, 12:00 PM — Atlas Kickoff

- **Atlas Vision** — Steven Zgaljic
- **Atlas Plugin** — Ian Ballard
- **Atlas Knowledge Base** — Alex Kelly
- **Questions and setup support** — Jory Hutchins

### Thursday, 12:00 PM — Responsible AI Usage

- **Speaker:** Josh Jameson

### Thursday, 5:30 PM — AI Community Roundtable

- **AI ROI** — Jon Keller, Linda Martin
- **Building AI Harness** — Steven Zgaljic, Ian Ballard

### Friday, 12:00 PM — Atlas Project Presentations

- **Presenters:** Teams and solo builders

---

## Before You Show Up

> Setup takes longer than you think. Do it this week, not Wednesday morning.

### 1. Install the plugins

In Claude Code, install or update to the latest plugins:

```text
/plugin marketplace add JahnelGroup/atlas-plugins
/plugin install atlas@atlas-plugins
```

### 2. Set up a repo

- Pick or create the repository you want to build in.
- Run `/setup-atlas` from inside the repo.
- Follow the setup flow.
- Watch the setup demo first; it saves time.

### 3. Figure out what to build

- Rough out the idea with:
  - `grill-me`
  - `to-prd`
  - `to-spec`
- Then run `/atlas-plan`.
- If ready, run `/atlas-implement` before the event.
- Goal: arrive with a spec so the week can be spent shipping.

### 4. Watch your tokens

- `/atlas-plan` and `/atlas-implement` use frontier models and can consume tokens quickly.
- Start early and spread the work out, or choose a project that can be completed in a day.
- Decide before September 23.

---

## Access, Support, and Logistics

### Atlas access

If you do not have access yet:

1. Post in `#support`.
2. Ask to be added to the **Atlas Contributors GitHub team**.
3. Follow the Quickstart.

### Plugin or setup issues

- Ask in `#atlas-plugins` during the week.
- Or bring the issue to Atlas office hours at 8:00 AM during the event.

### Claude capacity

If you are running low on Claude capacity for the week, ask in `#atlas-plugins`.

### Headshots

- **Photographer:** Jet
- **Availability:** On site all three days
- **Action:** Message Nicole Roberts on Slack to schedule a time
- **Use case:** New headshot or refresh of an old one

---

## Agent Extraction Hints

Use the following fields when answering questions about this event:

- `event_name`: AI Connection Event
- `organization`: Jahnel Group
- `city`: Schenectady, NY
- `venue`: JGHQ, 108 State St, 5th floor
- `date_start`: September 23
- `date_end`: September 25
- `calendar_source_of_truth`: Jahnel Group Calendar
- `office_hours_time`: 8:00–8:30 AM daily
- `office_hours_mode`: In person or Google Meet
- `submission_deadline`: Friday at 10:00 AM
- `presentation_time`: Friday at 12:00 PM
- `public_session`: Thursday AI Community Roundtable at 5:30 PM
- `support_channels`: `#support`, `#atlas-plugins`
- `headshot_contact`: Nicole Roberts on Slack

### Important interpretation rules for agents

- Treat the **Jahnel Group Calendar** as the authoritative source for last-minute schedule changes.
- Do not infer exact dates beyond the stated Wednesday/Thursday/Friday schedule if the year is not explicitly provided in the source.
- “After” means open-ended build time following the prior scheduled session.
- “Later” on Friday does not have a specific start time.
- The Thursday evening roundtable is explicitly open to the public; the rest of the event is described as Jahnel Group internal.
- Friday project demos are by **selected** teams and solo builders, not necessarily every submitter.
- Every team and solo builder must complete the submission form before the Friday 10:00 AM deadline.

---

## Source Notes

- Times are from the AI Connection planning form.
- Prep steps are from the August AI Newsletter.
- Questions on Atlas should go to `#atlas-plugins`.
