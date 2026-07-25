# ADHD-Friendly Freelance Command Center

A unified project-management + email client for running freelance work on a
custom domain, designed around ADHD cognition rather than neurotypical
productivity conventions.

> Companion visual reference: the [Strobe — How It Works
> mindmap](https://claude.ai/code/artifact/b7e205e3-9ebf-4eeb-9883-96c10875e6bb)
> maps the five screens, a normal day's workflow, and the same "why it
> works this way" reasoning as this doc. Kept in sync with this file —
> update both when either changes.
>
> Anything agreed but not yet written up properly here lives in
> [WORKING-NOTES.md](WORKING-NOTES.md) in the meantime — check there for
> in-flight decisions this doc hasn't caught up to yet.

## 1. Design philosophy

Most PM tools and email clients fight ADHD brains: infinite lists, red badge
counts, unbounded inboxes, and "priority" fields that require executive
function you don't have in the moment. The core bet of this system is:

- **One inbox, not two.** Email and tasks live in the same triage stream.
  Context-switching between "my email client" and "my task manager" is
  itself the enemy — every switch is a chance to lose the thread.
- **Reduce decisions, not just track them.** The app should often be able to
  answer "what do I do right now?" without the user having to think about
  priority, energy, or deadlines themselves.
- **No shame states.** Overdue items don't turn red and multiply guilt. They
  quietly resurface. Missed check-ins are logged, not punished.
- **Capture is instant, triage is deferred.** Anything can be dumped into the
  system in under 2 seconds; deciding what it *means* happens later, in a
  dedicated low-stakes pass.
- **Small, visible next actions.** Projects don't show as walls of tasks —
  they show as "the one next thing," with everything else collapsed.

## 2. System overview

Two engines sharing one data model:

```
┌─────────────────────────────────────────────────────────┐
│                      Unified Data Layer                  │
│   Clients · Projects · Tasks · EmailThreads · Links       │
└───────────────┬───────────────────────────┬──────────────┘
                │                           │
       ┌────────▼────────┐         ┌────────▼────────┐
       │   Mail Engine    │         │    PM Engine     │
       │  (send/receive on │◄──────►│ (tasks, projects, │
       │  custom domain)   │  links │  focus, capture)  │
       └────────┬─────────┘         └────────┬─────────┘
                │                            │
       ┌────────▼────────────────────────────▼─────────┐
       │              Unified UI (per-client view,       │
       │         Today/Focus view, global capture bar)   │
       └──────────────────────────────────────────────────┘
```

The two engines are bridged by a `TaskEmailLink` table — any email thread can
spawn a task, and any task can carry a reference back to the thread it came
from, so opening a project shows a single merged timeline instead of two
tabs.

## 3. Core data model

- **Client** — a person/company you freelance for. Has a name, primary
  contact email(s), and a color tag (color-coding reduces re-reading names).
- **Project** — belongs to a Client. Has a status (`active`, `waiting`,
  `someday`, `done` — no fine-grained percent-complete, that invites
  over-analysis), a due date if real (not invented), and a *single* pinned
  "next action."
- **Task** — belongs to a Project (or floats unassigned in the Capture
  Inbox). See §5 for the ADHD-specific fields.
- **EmailAccount** — one row per mailbox on the custom domain
  (`sasha@yourdomain.com`, maybe `hello@yourdomain.com`), holding IMAP/SMTP
  or provider-API credentials.
- **EmailThread / EmailMessage** — synced mail, deduped into threads like a
  normal client, but each thread carries a `status`: `unprocessed`,
  `triaged`, `archived`.
- **TaskEmailLink** — join table: `task_id ↔ email_thread_id`. A thread can
  have zero, one, or many linked tasks (e.g. "reply," "send invoice," "review
  their feedback" all spawned from one client email).
- **CaptureItem** — the universal quick-capture bucket. Raw, untyped text
  dropped from anywhere (global hotkey, mobile, forwarded email). Triage
  turns it into a Task, Project, or discards it.
- **BriefExtraction** — record of an LLM extraction run against a source
  document: either an EmailThread's attachment, or a file dropped directly
  into Capture or a Project with no email involved at all. Stores the raw
  model output, which sections of the source were judged actionable vs.
  reference-only, which Tasks it produced, and whether each was
  accepted/edited/merged/discarded — so a batch of generated tasks is
  always traceable back to the source and re-editable if the parse was off.
- **Task (extended fields)** — `estimatedDuration`, `actualDuration`
  (captured on completion, used to calibrate future estimates),
  `deadlineType: hard|soft` (hard = client-committed, soft = self-imposed —
  only soft deadlines get silently moved by the scheduler), `phase`
  (optional short free-text label like "Pre-launch" or "Month 3," used
  instead of a `dueDate` when the source organizes work by milestone rather
  than a hard date — not every extracted task has a real deadline, and
  fabricating one to fill the field is worse than leaving it blank),
  `startedAt` (nullable — set only if the user taps "start" on the task in
  Focus; see §11.3 for why `actualDuration` is opt-in rather than forced),
  `targetDate` (nullable — an optional self-imposed date distinct from
  `dueDate`, never used in at-risk logic; see §11.14).
- **ProjectTemplate / TemplateTask** — a reusable shape for repeatable
  project structures (e.g. the Lumen "10 ads" batch), see §11.5. Stores
  task titles, order, energy/context tags, and estimated durations with no
  dates attached — dates are never templated, only structure is, per the
  "due date if real, not invented" rule above.
- **ScheduledBlock** — a specific instance of (part of) a Task placed on
  the calendar (`task_id`, `start`, `end`). A task can have more than one
  block if its duration had to be split across multiple sessions (§11.16)
  — either way, blocks are kept separate from the Task itself so a task
  can be rescheduled repeatedly without losing its identity or history.
- **CalendarEvent** — read-only synced copy of existing calendar
  commitments (meetings, personal events) from an external calendar, used
  as fixed obstacles the scheduler must route around.
- **UserScheduleProfile** — a recurring weekly template of multiple
  labeled working windows per day (not one start/end range), each
  optionally tagged with a preferred `context`, plus per-date exceptions
  (a day off, or extra hours on an otherwise-off day) for anything that
  doesn't fit the recurring pattern, and a default transition/buffer time
  between blocks — see §11.15 for why one range wasn't enough.

## 4. Email client architecture (custom domain)

**DNS/provider layer** (pick one, don't self-host a mail server — running
your own MTA is a support burden with zero ADHD upside):
- Cheapest/simplest: **Migadu** or **Zoho Mail** for real mailbox hosting on
  your domain (IMAP+SMTP included).
- If you want programmatic send/receive as the primary interface rather than
  a "real mailbox": **Postmark** or **Resend** for outbound, plus
  **Cloudflare Email Routing → worker/webhook** for inbound parsing. This is
  the better fit if the app *is* your email client (no separate Gmail-style
  UI needed elsewhere).
- Either way: SPF, DKIM, DMARC configured on the domain so mail lands in
  inboxes instead of spam — non-negotiable for freelance credibility.

**Sync engine:**
- Inbound: IMAP IDLE (via `imapflow`) for near-real-time push if using a
  real mailbox provider, or webhook-based inbound if using
  Postmark/Cloudflare Routing.
- Outbound: SMTP (`nodemailer`) or the provider's transactional send API.
- A background worker normalizes everything into `EmailMessage` rows,
  threads them (by `Message-ID`/`References` headers, not just subject
  line), and marks new threads `unprocessed`.

**Triage-first inbox, not read-all inbox:** the mail UI defaults to showing
only `unprocessed` threads. Once a thread is triaged (archived, replied,
or converted to a task) it disappears from the default view — mirroring
"inbox zero" as a state the *system* maintains, not a chore the user
performs.

## 5. PM engine — ADHD-specific mechanics

**Task states** (deliberately more than todo/done, because ADHD work rarely
maps cleanly to binary state):
- `next` — the one visible action for its project
- `later` — exists, not visible by default
- `waiting` — blocked on someone else (a client reply, a payment) — shown
  in a separate "waiting on" list so it's not forgotten but also not
  nagging
- `stuck` — user-flagged "I don't know how to start this"; surfaced in a
  weekly review rather than daily nags
- `done`

**Energy/context tagging**, not just priority: each task optionally gets a
`energy: low|medium|high` and `context: @email|@calls|@deep-work|@admin`
tag. The Focus view can filter to "show me only low-energy things" on a
bad day — matching the task list to actual current capacity instead of
guilt-driven prioritization.

**Focus / "Right now" view:** the default landing screen. Shows at most 3
items: the top `next` task, the oldest unreplied `unprocessed` email
older than 48h, and anything with a real (not padded) deadline in the next
24h. Everything else is one click away but not visible — the point is to
never present an overwhelming list as the first thing seen.

**Time-blindness aids:**
- Deadlines render as relative countdowns ("in 2 days") not just dates.
- A lightweight time-blocking calendar view lets a task be dragged onto a
  block of time, turning "someday" into "this Tuesday 2-3pm."
- No urgent-red styling for lateness — late items get a neutral "still
  here" treatment; the system's job is to resurface, not shame.

**Quick capture:** a single global-hotkey text box, from desktop or mobile,
that writes a `CaptureItem` and gets out of the way. No required fields, no
project picker at capture time — that decision is deferred to a dedicated,
scheduled triage pass (e.g. once daily), because forcing categorization at
capture time is exactly the friction that makes ADHD brains stop capturing.

**Email → task conversion:** one button on any email thread: "Turn into
task." Pre-fills task title from the subject, links back to the thread,
and defaults energy/context based on simple heuristics (contains "call"
→ `@calls`, contains attachment → `@admin`, etc.) — again, so the user
doesn't have to make decisions that don't need to be made by a human.

## 6. Bulk task extraction from briefs (LLM-assisted)

The simple "Turn into task" button (§5) assumes 1 email → 1 task. A brief
("10 ads, here's the copy and specs for each") is really 1 source → 1
project + N related tasks, and needs its own path. Testing this against a
real, messier document (a multi-section business plan, not a clean ad
brief) surfaced three gaps in the original design, folded in below.

1. **Extract, don't auto-run — from anywhere, not just email.** An
   explicit "Extract tasks" action — never something that fires
   automatically on arrival — sends the source to an LLM with a
   structured-output schema. The source is either an email thread's
   attachment (the original case) *or* a file dropped directly into
   Capture or straight onto a Project, with no email involved at all.
   Plenty of real source material — a personal business plan, a scope doc
   a client hands over in person, a PDF pulled off Drive — never arrives
   by email, so the entry point can't assume one did. Attachments are
   text-extracted first so the model sees the document's actual content.
2. **Scope to the actionable sections before extracting, not the whole
   document.** A clean ad brief is almost entirely deliverables, so
   extracting from the whole thing works. A planning document is mostly
   *not* actionable — an executive summary, a market analysis, a financial
   model are reference material, not tasks. Before pulling candidates, a
   first pass classifies sections as reference vs. actionable (checklists,
   milestones, "next steps" framing, imperative phrasing) and only sends
   the actionable ones to extraction. Skipping this step means the model
   eventually tries to manufacture a task out of a sentence like "the
   market is growing at 23% annually" — a real failure mode, not a
   hypothetical one.
3. **Preview before commit.** Results land in an editable confirmation
   screen — "found N items, confirm/edit/merge/discard before adding" —
   never silently created. This step earns its keep even harder on messy
   source material: a real planning document can describe the *same* task
   twice in two different sections at two different levels of detail (a
   milestone list says "sample shirts ordered," a separate open-questions
   section says "order sample shirts from two printers for comparison") —
   an organic duplicate the model won't reliably catch on its own, which
   the merge step exists to catch.
4. **Group, don't scatter — and don't require a client.** Accepted items
   become one Project ("10 ads — [Client]") with child Tasks, each
   carrying its own spec as a note and a link back to the source, so the
   original document never needs to be re-opened and re-read to remember
   what one item meant. When the source has a Client attached (an email
   thread), the Project is tied to it; when it doesn't (a standalone
   upload, a personal project with no client at all), the Project is
   created freestanding — bulk extraction isn't only a client-work feature.
5. **No forced shared deadline.** The ad-brief case had one clean date for
   all 10 items, but that's the exception, not the rule — a planning
   document organizes work by milestone ("Foundation," "Pre-launch,"
   "Month 3") or leaves things as open decisions with no date at all. Each
   extracted item carries whatever timing signal the source actually gives
   it — a real `dueDate`, a `phase` label, or nothing — rather than being
   forced into a fabricated shared deadline the confirmation screen has no
   honest way to display.
6. **Focus view stays calm.** Even though N tasks now exist, the
   Today/Focus view (§5) still only ever surfaces that project's single
   pinned `next` task. The batch is worked one item at a time; the rest
   are one click away under the project, never the first thing seen.
7. **BriefExtraction record** keeps the raw model output, which sections
   were judged actionable, and links to the generated tasks, so a bad
   parse can be reopened and re-edited rather than manually cleaned up
   task-by-task.

## 7. Auto-scheduling calendar (Motion-style time-blocking)

A scheduler that automatically places tasks into open calendar time and
reflows them when things change — with ADHD-specific behavior Motion
doesn't have (grace instead of guilt, transition buffers, estimate
calibration).

**Inputs the scheduler needs:**
- Task `estimatedDuration`, `deadlineType` (hard/soft), and existing
  energy/context tags (§5) — context maps to preferred time-of-day windows
  (e.g. `@deep-work` prefers morning blocks) as a **soft** preference, via
  the labeled-window mechanism in §11.15.
- `CalendarEvent`s synced read-only from an external calendar (Google
  Calendar/CalDAV) — real meetings and commitments are fixed obstacles, not
  something the scheduler can move.
- `UserScheduleProfile` — multiple working windows per day (§11.15, not
  one start/end range), personal energy/context preferences per window,
  per-date exceptions, and a default transition buffer between blocks
  (task-switching has a real cost for ADHD; back-to-back blocks with zero
  gap invite burnout and slippage).

**Scheduling algorithm:**
- A greedy constraint scheduler (sufficient at single-person scale — no
  need for a heavy solver): sort unscheduled tasks by deadline urgency,
  then place each into the next open slot that matches its duration,
  energy/context window, and required buffer, working forward from now.
  If no single open window is long enough for a task's whole duration, it
  gets split across successive windows instead of failing outright
  (§11.16).
- Re-runs automatically on triggers: a task is added or edited, a deadline
  changes, a new `CalendarEvent` conflicts with an existing block, or a
  scheduled block passes without being marked done.
- If a hard deadline genuinely doesn't fit the remaining open time, the
  scheduler does **not** silently overcommit — it flags the task as
  "at risk" in the Focus view with the reason ("not enough open hours before
  Friday"), so the user finds out early instead of on the deadline day.

**Deadline readjustment — hard vs. soft:**
- `soft` deadlines (self-imposed) can be quietly pushed by the scheduler
  when something doesn't fit — no confirmation needed, no red banner.
- `hard` deadlines (client-committed) are never silently moved. If they're
  at risk, they surface once in the Focus view as a heads-up, not a
  recurring nag.

**ADHD-specific behavior beyond vanilla Motion:**
- **No shame reflow.** A missed block doesn't trigger red alerts or
  cascading urgency — it's quietly re-slotted into the next open matching
  window, consistent with the "no shame states" philosophy in §1.
- **Duration calibration loop.** `actualDuration` (captured when a task is
  marked done) is compared against `estimatedDuration` over time to learn a
  personal bias correction (ADHD time estimation is notoriously optimistic)
  and pad future estimates automatically rather than trusting each guess
  literally.
- **Manual override always wins.** Drag-to-reschedule any block by hand at
  any time — the algorithm proposes a plan, it never locks the user out of
  moving things.

## 8. Unified UI surfaces

1. **Today/Focus** (default view) — the 3-item view above.
2. **Client workspace** — per-client page merging their Project(s), open
   Tasks, and EmailThreads into one chronological timeline. This is the
   single most important screen: it replaces "check email, then check my
   task list, then remember what we discussed" with one scroll.
3. **Triage** — a dedicated, opt-in-timed session (not always-visible) for
   processing the Capture Inbox and `unprocessed` email into real
   Projects/Tasks or archive.
4. **Waiting On** — the list of everything blocked on someone else, so it's
   trackable without living in the daily view.
5. **Weekly Review** — a single guided screen surfacing `stuck` tasks,
   stale `waiting` items, and projects with no `next` action set, prompting
   (not demanding) a decision on each.
6. **Time report** — a per-client rollup of logged `actualDuration`, by
   week/month, for invoicing. See §11.3.

## 9. Visual design language — clean, structured (Monday.com-inspired)

Superseded the original "acid maximalism" direction after live use: a
high-intensity skin was interesting as a concept but fought the actual
day-to-day experience of a tool meant to be opened dozens of times a day
under real cognitive load. The revised bet is closer to Monday.com's own
visual language — light, white/near-white panels, one calm brand blue, a
lot of whitespace, plain system typography — because that register reads
as *low-effort to look at*, which matters more for daily-driver use than
personality. The information architecture from §1/§5/§8 doesn't change:
the Focus view still shows exactly 3 items. What changes is that the
shell around it stops working against that restraint instead of leaning
into a contradiction (a maximalist skin around a minimalist screen).

**The look:**
- Light by default: near-white app background, white panels, a light
  gray border (`--line`) instead of heavy shadow/glow to separate
  surfaces — the same restrained separation Monday/Asana/Motion all use.
- **One accent blue, still reserved for the one thing** — this is the
  one place the old philosophy carries over unchanged from §1. Monday
  itself uses its brand blue everywhere (nav, chrome, links); this app
  deliberately doesn't — accent color stays reserved for the pinned next
  action and primary buttons specifically, and everything else (nav,
  secondary text, borders) stays neutral gray. Borrowing Monday's palette
  doesn't mean borrowing Monday's "brand color on everything" instinct.
- Plain system sans-serif throughout, normal case and weight — the
  stretched/condensed display treatment on headers is gone. Small
  uppercase eyebrow labels (section headers like "SCHEDULE") stay; that
  convention is common ground between the old and new look and isn't
  specifically an "acid" trait.
- No grain/noise texture, no warped/sticker shapes. Flat, clean surfaces.
- Dark mode is kept as a plain, ordinary dark theme (not a separate
  "Calm Mode" concept) — since the light default is already calm, the
  toggle's job shrinks to "which theme do you prefer," same as any other
  app's light/dark switch.
- Completion still gets a small, satisfying acknowledgment (a checkbox
  fill animation, a brief color flash) — the dopamine-on-completion
  principle from §1 survives, just scaled down from a "celebratory acid
  burst" to something that fits a quiet, professional-looking screen.
- Respect `prefers-reduced-motion` throughout — this rule didn't depend
  on the old aesthetic and still applies.

**Navigation shell — sidebar (desktop) / slide-out drawer (mobile).**
The original top horizontal tab bar (§8's five surfaces: Focus,
Workspace, Capture, Weekly Review, Schedule) doesn't scale down cleanly —
five tabs wrap awkwardly on a phone width. The fix, modeled on how
Monday.com (and most mature PM tools) actually handle this:
- **Desktop:** a persistent left sidebar, icon + label per surface,
  always visible — no click-to-reveal step for the primary navigation
  action of the entire app.
- **Mobile:** the sidebar collapses behind a hamburger icon in a slim top
  bar; tapping it opens a full-height slide-out drawer with the same nav
  list, closing on selection or an outside tap. This matches the
  established mobile PM-app pattern (Google Calendar's own hamburger
  drawer behaves the same way) rather than inventing a bespoke mobile nav.
- Sign-out and the light/dark toggle live at the bottom of the sidebar
  (desktop) and inside the drawer (mobile) — secondary actions, not
  competing for space with the five primary surfaces.

## 10. Cross-device sync (Mac + Android)

Because the architecture is already "thin clients talking to one central
backend" (§2) rather than a local-first app, this is simpler than it
sounds — there's no peer-to-peer sync problem, just multiple clients
against one source of truth.

**What "sync" actually means here:** one Postgres-backed API (already the
design) is the single source of truth. The Mac and Android apps are both
just clients of it, not separate local databases that need to reconcile
with each other. "Sync" reduces to two things: (1) getting local writes to
the server reliably even when offline, and (2) pushing server changes back
out to other open devices quickly.

**One codebase, not three.** Ship the actual product as the existing web
app (Next.js). Maintaining parallel Swift (Mac) and Kotlin (Android)
codebases alongside the web app means building every feature three times —
its own kind of maintenance nightmare for a solo build.
- **Fastest path:** an installable PWA. Mac (Safari/Chrome "Add to Dock")
  and Android (Chrome "Add to Home Screen") both get a real app icon, own
  window, and offline caching straight from the existing web build — zero
  extra code.
- **If deeper native integration is wanted later** (Android share-sheet
  "send to Capture" from any app, a Mac menu-bar quick-capture, native push
  instead of web push): wrap the same web frontend with **Capacitor**
  (Android) and **Tauri** (Mac) — thin native shells around the existing
  code, not rewrites.

**Offline-first capture** is the part that actually matters here: quick
capture (§5) must never block on network, so "offline" can't be allowed to
break the 2-second capture promise. Local writes go to an on-device queue
(IndexedDB in a PWA, or SQLite if wrapped natively) immediately, render
optimistically, and sync to the server in the background once connectivity
returns. This is a simple queue-and-retry, not a CRDT merge problem —
there's only one person writing and one server arbiter, so conflicts are
rare and "last write wins" is enough; no real distributed-sync engine
needed.

**Live updates across devices:** a lightweight WebSocket (or
Server-Sent Events) connection from each open client to the backend pushes
changes through, so finishing a task on Android clears it from the Mac
Focus view within a second or two without a manual refresh. Cheap at
single-user scale — a simple per-user pub/sub channel is enough.

**Auth across devices:** since it's single-user, each device just holds
its own long-lived session token (or passkey) rather than needing full
multi-device OAuth infrastructure — add/revoke a device from a plain
"devices" list in settings.

**Push notifications:** Web Push covers both installed-PWA platforms
(Android Chrome and macOS Safari/Chrome) for the daily digest and
Waiting-On resurfacing pings, with no native push infrastructure required.
If wrapped via Capacitor/Tauri later, swap in native push (FCM for
Android, APNs for Mac) for more reliable delivery.

## 11. Closing the gap to daily-driver parity

Phases 1–7 (built so far: Foundation through auto-scheduling) prove the
core loop. But measured against Monday/Motion/Asana as daily drivers, a
few real gaps remain — surfaced by asking "what would make this feel
unfinished after a month of actual use," not by chasing feature parity.
Most of what those tools have would actively work against §1's
minimalism (see §11.17); the following is the subset worth building, in
priority order, plus the reasoning for each.

**11.1 Direct create — no more database GUI.** Clients, Projects, and
Tasks currently only get created via the seed script or a database admin
tool — there's no in-app "+ New client" anywhere. This is the most basic
gap: nothing else in the app matters if adding a new client requires
leaving it. The fix mirrors Quick Capture's philosophy applied to
structured entities instead of raw text: a lightweight inline "+ New"
affordance on the Workspace index (client), on a client page (project),
and on a project (task) — each asking for **only a name/title**, with
every other field (dates, energy, context, deadline type) optional and
editable later. Forcing a full form up front at creation time is the same
friction Quick Capture already exists to avoid; the fix shouldn't
reintroduce it through a different door.

**11.2 Quick-jump, not a data-entry palette.** A Cmd+K-style palette,
but scoped narrowly: fuzzy search/jump across Clients, Projects, Tasks,
and email threads, plus a short list of navigation actions (open today's
Schedule, open Capture, mark the pinned next-action done). Deliberately
**not** a general quick-add-anything form — Monday/Linear-style palettes
often double as data entry, but that reintroduces exactly the
"decide-while-capturing" friction §1 and §5's Quick Capture are designed
around. If you want to add something fast, that's what Capture is for;
the palette is for finding and jumping, not typing structured data under
time pressure.

**11.3 Session timer — opt-in, and doing double duty.** `actualDuration`
exists in the schema (§3) but nothing populates it yet, and freelance
invoicing genuinely needs it. Originally scoped as a bare "start" tap
that silently logs elapsed time; evaluating the app against
`adhd-productivity-research.md` (on branch `claude/add-productivity-research-fjjpt9`)
found that a *visible* countdown does the invoicing job **and** supplies
the externalized-urgency/time-blindness mechanism the research treats as
central — without needing gamification. Streaks/points were the more
obvious way to inject urgency and were explicitly ruled out: a streak is
a shame machine the moment it breaks, directly against "no shame states"
(§1). So: one "start a focus session" action in Focus, a visible
countdown (defaulting to the task's `estimatedDuration`) on a
decluttered session view — sidebar/nav hidden, just the pinned task and
the timer — loosely inspired by focus-companion apps like Flocus, minus
Flocus's ambient sound/video, which stays out of scope. Worth being
honest about the reasoning here rather than tidying it up after the
fact: an earlier pass on this same question argued the ambient
scene/soundscape wasn't just decoration — it pitched it as a genuine
task-initiation aid, functioning like solo body-doubling, which the
ADHD research (`adhd-productivity-research.md`) separately backs as a real if
thinly-evidenced strategy. That argument hasn't been disproven; the cut
is a deliberate scope call (real asset/licensing cost for a single-user
tool, and one more thing to get right visually) made anyway, not a claim
that ambient sound has no function. On completion: a gentle, dismissible
nudge, never a
forced break — enforcing a stop risks punishing hyperfocus. `actualDuration`
is only computed (as `completedAt − startedAt`) if a session actually
ran, and stays `null` otherwise — no guilt, no retroactive "how long did
this actually take" interrogation. The §7 duration-calibration loop
simply skips tasks with a `null` `actualDuration`. A **Time report**
surface (§8.6) sums logged duration per client per week/month — the
actual invoicing payoff.

**11.4 Resizable schedule blocks — and why they don't behave like a
drag-move.** The Schedule view (§7/§8) currently supports dragging a
block to a new time (a same-session nudge that the next Reflow can
freely undo — see the app's README for the implementation notes).
Resizing a block's *duration* by dragging its
edge is a different kind of edit and should behave differently: a
drag-move corrects *when* something happens, which Reflow is allowed to
re-decide; a resize corrects *how long the task actually takes* — a
property of the task's `estimatedDuration` itself, not just this one
placement. So a resize should **persist through the next Reflow** by
writing back to the task's `estimatedDuration`, not just the one
`ScheduledBlock` instance. Conflating the two would mean every resize
gets silently discarded on the next reflow, defeating the point of
correcting a bad estimate.

**11.5 Project templates — reusable structure, not auto-recurrence.**
The Lumen "10 ads" batch is exactly the kind of repeatable shape
freelancers rebuild constantly. The fix is a manually-invoked "Save as
template" / "New from template" pair (§3's `ProjectTemplate`/
`TemplateTask`), not automatic recurrence (a project regenerating itself
on a schedule). Auto-recurrence means tasks appear on their own without
the user initiating anything — the opposite of "reduce decisions, not
autopilot around them," and a specific bad fit for ADHD object
permanence: things you didn't consciously add are easy to not register
as real. A template still requires the user to explicitly say "start a
new one of these," same as any other project creation, just pre-filled.
No dates ever come from a template, per §3's existing "due date if real,
not invented" rule — only the task structure, order, and tags carry over.

**11.6 Reminders — closing a loop §10 already opened.** §10 already
specs Web Push for a daily digest and Waiting-On resurfacing, but that's
gated on a real deployed HTTPS domain (service workers don't work
against localhost) and hasn't shipped. Two tiers, so the first doesn't
wait on the second: **v0**, shippable now — an in-tab toast when a
`ScheduledBlock`'s start time arrives while the app happens to be open,
and when a hard-deadline task crosses into "at risk" (§7), zero
infrastructure required. **v1** — the actual Web Push from §10, once
real deployment exists.

**11.7 Client color tags — execution debt, not a new decision.**
`Client.colorTag` has existed in the schema since §3's first draft
("color-coding reduces re-reading names") but nothing in the UI renders
it — Focus, Workspace, and Schedule all show client names as plain text.
This isn't a new design question, just a gap between what §3 already
decided and what got built.

**11.8 Click-to-create on the calendar.** Schedule (§7/§8) currently only
gains a fixed event through the separate "Add a fixed event" form below
the grid — there's no click-an-empty-slot affordance the way Google
Calendar or Monday's calendar view both work. Clicking an open slot in
Day/Week view should open the same minimal "just a name" quick-add from
§11.1, pre-filled with the clicked time, rather than requiring a scroll
down to a separate form every time.

**11.9 Notes/brief on click — a UI gap, not a schema gap.**
`Task.note` (§3) has existed since the very first schema draft and is
exactly what a bulk-extracted batch task (§6) stores its spec in ("each
carrying its own spec as a note") — but no screen actually surfaces it.
Clicking a task anywhere it appears (Focus, Workspace, Schedule) should
open that task's note for reading and editing, not just show its title.
The data's always been there; the click-through to it isn't.

**11.10 A dedicated client view.** Logged as requested, but needs scope
clarified before it's built: Workspace (§8.2) already gives each client a
merged timeline of their projects/tasks/email, so this likely means
something adjacent to that — a client "profile" surface (contact info,
rate, relationship notes) distinct from the task/email timeline — rather
than a duplicate of what Workspace already does. Worth a quick scoping
pass before starting, not assuming.

**11.11 Live at-risk warning while dragging a hard-deadline task.**
Hard-deadline tasks are already draggable today — only fixed
`CalendarEvent`s are locked from dragging — and "at risk" (§7) already
gets recomputed from wherever a block currently sits, on every page
load. The actual gap is *live* feedback: right now you only find out a
drag pushed a hard deadline into danger after dropping the block and the
page reloads. The dragged block should flip to the "at risk" visual
treatment (see the app's README) the moment its live drag position would
land past the deadline, not after the fact. (Confirmed: dragging across
days is fine and expected, same as today — nothing here restricts a
hard-deadline task to same-day moves only.)

**Search** was also requested — it isn't a new item here, it converges
with the quick-jump palette already planned in §11.2.

**11.12 Undo.** Surfaced by auditing interaction modes against the built
app, not by a specific ask: nothing anywhere can be undone. Completing a
task by accident, discarding the wrong Capture item, or dropping a
dragged schedule block on the wrong slot all currently require manually
redoing the correct action from scratch — there's no way back. Given the
single-user, low-blast-radius nature of this app, this doesn't need a
full undo/redo history stack — a short-lived "Undone" toast with a
reverse action after any of the handful of destructive-feeling moments
(complete, discard, delete fixed event, block drag) covers the realistic
case ("wrong button") without building general-purpose undo
infrastructure.

**11.13 Global quick-capture — a floating button, not a fifth tab.**
§2's own architecture diagram and §5 both describe capture as a "global
capture bar"/"global-hotkey text box" reachable from anywhere — but what
actually got built (§9) is a fifth item in the Sidebar/drawer nav, which
means "drop a thought in under 2 seconds" currently requires navigating
away from whatever screen you're on first. That quietly breaks the
promise §1 makes. The fix: pull the *input* out of the nav and make it a
floating action button present on every screen, desktop and mobile
alike, that opens the same one-field-no-picker box from §5 inline or as
a lightweight overlay — never a full page navigation. The Capture
*page* itself doesn't go away — the list of untriaged items you review
later stays exactly where it is in the nav, since triage is a
deliberate, scheduled pass (§5), not something you need mid-task. Only
the "add one now" action moves to global chrome. On mobile this should
sit thumb-reachable (bottom-right is the convention, matching the
`Add`/`+` affordances already used in Schedule) rather than fighting the
top hamburger for the same corner.

**11.14 Personal target date — self-imposed urgency without
gamification.** Also surfaced by the ADHD-research evaluation: importance
alone often doesn't generate enough activation for an ADHD brain, and a
self-imposed ("fake") earlier deadline is one of the better-evidenced
ways to manufacture urgency artificially. As with §11.3, streaks/points
were considered and ruled out first. Instead: an optional personal
target date on a soft task (§3's `targetDate`), distinct from a real
`dueDate` and rendered visibly differently ("your target: Wed" vs. "due:
Fri") — and explicitly excluded from the scheduler's at-risk logic (§7)
so it can never trigger a false alarm. Only a real deadline does that.

**11.15 Multiple working windows, not one working-hours range.**
`scheduler.ts`'s `WORK_START_HOUR`/`WORK_END_HOUR` are a single
contiguous range — a simplification the code's own comments already
flagged as provisional ("hardcoded... rather than a `UserScheduleProfile`
table"). Two things make that insufficient: some adults with ADHD have a
measurably delayed circadian rhythm and self-advocate for working with a
shifted or split schedule rather than a standard block (per the same
research evaluation), and a day's genuinely open time often isn't one
contiguous stretch anyway — a few hours in the morning, a few more in the
evening. The fix generalizes `UserScheduleProfile` (§3) into two layers: a
**recurring weekly template** — multiple labeled windows per day-of-week,
not one range — plus **per-date exceptions** ("no work today," or extra
hours on an otherwise-off day) for anything that doesn't fit the
recurring pattern, like working some weekends but not all. Each recurring
window can optionally carry a preferred `context` tag (§5's existing
`TaskContext` enum), finally giving the "`@deep-work` prefers morning
blocks" idea from §7 an actual place to live — but only as a **soft**
preference: a task tries its labeled window first and falls back to any
open window rather than becoming unschedulable over a label mismatch,
the same "never silently drop, flag instead" principle the hard-deadline
logic already follows.

**11.16 Splitting a task across multiple slots or days.** Today
`ScheduledBlock.taskId` is unique — one task, one block — and the
slot-finder only ever looks for a single contiguous stretch of open time
long enough for a task's *entire* estimated duration. A task longer than
any one available window, or than a day's remaining open time, simply
fails to schedule, with no fallback. The fix: let a task's duration be
filled across successive open windows — same day or spanning several —
each chunk becoming its own `ScheduledBlock` against the same task (§3),
shown in the Schedule UI as visibly one task ("Part 1 of 3"), not
unrelated duplicates. Needs a sensible minimum chunk size so it doesn't
fragment into useless slivers — task-switching has a real cost, which is
exactly why the buffer-time concept (§7) exists in the first place. A
hard deadline's "at risk" check moves to the *last* chunk's end time
rather than the first. Heavy fragmentation into many small chunks is
itself worth a quiet flag — usually a sign the estimate was too big for
one sitting, or that the task should have been broken into real subtasks
instead.

**11.17 Deliberately excluded.** Comments/activity feeds, file
attachments, task dependencies/blocking-chains, multi-user permissions,
and a general-purpose automation-rule builder — the parts of
Monday/Asana that make them fit for teams — are left out on purpose.
There's no "who said what" audit trail need or blocked-by chain to
manage for solo work at this scale, and a user-configurable automation
builder is itself another system to learn and maintain, which is its own
kind of ADHD-hostile complexity. If a specific automation is worth having
later (Phase 9 already lists "auto-tag emails from known clients into
their Project"), it should be hardcoded behavior the app just does, not
a rules engine the user has to go build.

## 12. Suggested tech stack

- **Frontend:** Next.js (React) + Tailwind, single-user session (no
  multi-tenant complexity needed for a freelancer's own tool).
- **Backend:** Node.js API routes (or a small Express/Fastify service),
  Postgres via Prisma.
- **Mail:** `imapflow` + `nodemailer` if using a real mailbox provider
  (Migadu/Zoho); or Postmark/Resend SDKs + a Cloudflare Worker webhook if
  going API-first. Store raw MIME for audit/undo, parsed text/HTML for
  display.
- **Brief extraction:** Claude API (Messages API with a structured-output
  tool schema) for parsing source text into discrete deliverables, with a
  reference-vs-actionable section-classification pass ahead of it; a
  PDF/DOCX text-extraction step for attachments or direct uploads (the
  source doesn't have to be an email).
- **Calendar sync:** Google Calendar API or CalDAV for pulling in existing
  `CalendarEvent`s read-only; the auto-scheduler writes `ScheduledBlock`s
  back either to its own calendar view or (optionally) as events on the
  same synced calendar.
- **Scheduler:** a greedy constraint-based scheduling job (plain
  TypeScript logic is enough at single-person scale — no need for a full
  solver like OR-Tools unless the greedy approach proves insufficient).
- **Background jobs:** a queue (BullMQ + Redis, or a simple cron table) for
  IMAP polling, daily digest generation, stale-item resurfacing, and
  re-running the scheduler on trigger events.
- **Hosting:** Vercel/Fly.io/Railway for the app, Neon/Supabase for
  Postgres, Upstash for Redis if needed — all low-maintenance managed
  services, matching the "don't build yourself a second job" principle.
- **Auth:** since this is single-user, a simple session/password (or
  passkey) is enough — don't build multi-tenant auth for a tool only you
  will use.
- **Cross-device clients:** installable PWA (Workbox/next-pwa for offline
  caching + an IndexedDB write queue) as the default Mac + Android app
  shell; Capacitor (Android) and Tauri (Mac) as an optional later wrap for
  native push/share-sheet integration. A small WebSocket layer (or
  Supabase/Postgres LISTEN-NOTIFY if using Supabase) for live cross-device
  updates.
- **Visual design system:** Tailwind + a custom theme layer (light-theme
  tokens by default, a plain dark-theme token set), light micro-interaction
  motion for completion/capture acknowledgment, respecting
  `prefers-reduced-motion` at the animation-library level.

## 13. Phased build plan

1. **Foundation:** schema (Client/Project/Task/EmailAccount/EmailThread/
   EmailMessage/TaskEmailLink/CaptureItem), auth, manual task CRUD, IMAP
   read-only sync into an inbox view.
2. **Bridge:** email → task conversion, per-client unified workspace
   timeline, quick-capture bar.
3. **ADHD layer:** Focus/Today view, energy/context tagging, Waiting On
   list, non-shaming overdue handling.
4. **Send + automate:** SMTP/API sending from within the app, reply
   templates, Weekly Review screen, daily digest email/notification
   summarizing what's in Focus for tomorrow.
5. **Brief extraction:** Claude API integration for multi-task extraction
   from briefs, the preview/confirm UI, and `BriefExtraction` records.
6. **Auto-scheduling:** calendar sync (read-only first), `ScheduledBlock`/
   `UserScheduleProfile` schema, the greedy scheduler, and reflow-on-trigger
   logic — start with soft-deadline-only reflow before adding hard-deadline
   at-risk flagging.
7. **Cross-device:** PWA install support on Mac + Android, offline capture
   write-queue, and the WebSocket live-update channel between open devices.
8. **Visual identity:** the clean Monday.com-inspired theme layer (§9),
   the sidebar/slide-out navigation shell, and light/dark mode — layered
   on top of the plain, functional UI shipped in earlier phases rather
   than blocking on it.
9. **Polish:** duration calibration loop, native Capacitor/Tauri wrap if
   deeper platform integration is wanted, simple automations (e.g.
   auto-tag emails from known clients into their Project).
10. **Daily-driver completeness (§11):** direct create UI for
    Client/Project/Task, the quick-jump palette, the session timer + Time
    report surface, resizable schedule blocks, project templates, v0
    (in-tab) reminders, click-to-create on the calendar, a notes/brief
    click-through on tasks, a dedicated client view (scope TBD), live
    at-risk feedback while dragging a hard-deadline task, lightweight
    undo (a reversible toast) on complete/discard/delete/drag, pulling
    quick-capture out of the nav into a global floating button, a
    personal target date distinct from a real deadline, multiple working
    windows per day-of-week with per-date exceptions and deep-work
    preferences, and splitting a task across multiple slots or days.

Start at Phase 1 with the smallest possible slice: one EmailAccount synced
read-only, and manual tasks — prove the unified per-client timeline feels
better than separate Gmail + Notion tabs before building anything else.

**Where the actual build has gotten to:** Phases 1, 2 (partial — bridge
mechanics exist, but real IMAP/SMTP is still mocked pending a real
mailbox/API credential), 3, 6, and 8 are built and running against a real
Postgres database. Phase 5 (brief extraction) is designed (§6) but not
built — it needs a Claude API credential the project doesn't have yet.
Phases 4, 7, and 9 remain unbuilt. Phase 10 (§11) is underway: §11.1
(direct create for Client/Project/Task) is built — a "+ New" inline form
on the Workspace index, on each client page (for projects), and on each
project card (for tasks), all name/title-only with everything else
editable later. §11.2 (the quick-jump palette) is also built — Cmd+K or
a Search button opens fuzzy substring search across Clients/Projects/
Tasks/email threads, plus fixed nav shortcuts and a "mark next action
done" quick action. §11.3 (the session timer) is also built — an opt-in
full-screen countdown (`SessionOverlay.tsx`) started from the next-action
card on Focus, backed by `Task.startedAt`/`actualMinutes`, counting up
past zero with a dismissible nudge instead of a hard stop. §11.4
(resizable schedule blocks) is also built — a drag handle on each block's
bottom edge in both Day and Week views, writing the new duration back to
`Task.estimatedMinutes` so it survives the next Reflow rather than being
silently discarded. §11.5 (project templates) is also built — a
manually-invoked "Save as template" / "From template" pair on each
client's project list, backed by `ProjectTemplate`/`TemplateTask`; no
dates are ever templated, and tasks created from a template start in
`"later"` with no next action auto-pinned, same as any other project
creation. §11.6 (reminders v0) is also built — a dismissible in-tab
toast, polled every 30s, for a `ScheduledBlock`'s start time arriving or
a hard-deadline task crossing into overdue, with no push infrastructure
(v1's real Web Push still waits on a deployed HTTPS domain per §10).
§11.7 (client color tags) is also built — `Client.colorTag` now renders
as a small dot everywhere a client name appears (Focus, Weekly, Schedule,
Workspace), closing a gap between what §3 already decided and what had
actually been built. §11.8 (click-to-create on the calendar) is also
built — clicking an empty slot in Day or Week view opens the same
minimal "just a name" quick-add as §11.1, pre-filled with the clicked
time, instead of requiring a scroll down to the full "Add a fixed event"
form. The rest of §11 (§11.9 onward) is still queued.
