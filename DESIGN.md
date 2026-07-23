# ADHD-Friendly Freelance Command Center

A unified project-management + email client for running freelance work on a
custom domain, designed around ADHD cognition rather than neurotypical
productivity conventions.

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
- **BriefExtraction** — record of an LLM extraction run against an
  EmailThread (+ attachments): stores the raw model output, which Tasks it
  produced, and whether it was accepted/edited/discarded, so a batch of
  generated tasks is always traceable back to the source brief and
  re-editable if the parse was off.
- **Task (extended fields)** — `estimatedDuration`, `actualDuration`
  (captured on completion, used to calibrate future estimates),
  `deadlineType: hard|soft` (hard = client-committed, soft = self-imposed —
  only soft deadlines get silently moved by the scheduler).
- **ScheduledBlock** — a specific instance of a Task placed on the
  calendar (`task_id`, `start`, `end`). Kept separate from the Task itself
  so a task can be rescheduled repeatedly without losing its identity or
  history.
- **CalendarEvent** — read-only synced copy of existing calendar
  commitments (meetings, personal events) from an external calendar, used
  as fixed obstacles the scheduler must route around.
- **UserScheduleProfile** — working hours, energy windows (e.g. "deep work
  9-11am", "low-energy after 3pm"), and default transition/buffer time
  between blocks — the personal constraints the auto-scheduler plans
  around.

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
("10 ads, here's the copy and specs for each") is really 1 email → 1
project + N related tasks, and needs its own path:

1. **Extract, don't auto-run.** An explicit "Extract tasks" action on the
   thread — not something that fires automatically on arrival — sends the
   email body plus any attachments (PDF/Word brief, spec sheet, image refs)
   to an LLM with a structured-output schema. Attachments are text-extracted
   first so the model sees the brief's actual content, not just the email
   chrome around it. The model returns a list of discrete deliverables, each
   with a title, any spec/copy/dimension notes, and a shared deadline if one
   is stated.
2. **Preview before commit.** Results land in an editable confirmation
   screen — "found 10 items, confirm/edit/merge/discard before adding" —
   never silently created. LLM extraction won't always split things exactly
   right, and a surprise pile of 10 new tasks appearing unannounced is a bad
   experience for exactly the brain this system is designed for.
3. **Group, don't scatter.** Accepted items become one Project ("10 ads —
   [Client]") with 10 child Tasks, each carrying its own spec as a note and
   a `TaskEmailLink` back to the source thread, so the original brief never
   needs to be re-opened and re-read to remember what "ad 7" was.
4. **Focus view stays calm.** Even though 10 tasks now exist, the
   Today/Focus view (§5) still only ever surfaces that project's single
   pinned `next` task. The batch is worked one item at a time; the other 9
   are one click away under the project, never the first thing seen.
5. **BriefExtraction record** keeps the raw model output and links to the
   generated tasks, so a bad parse can be reopened and re-edited rather
   than manually cleaned up task-by-task.

## 7. Auto-scheduling calendar (Motion-style time-blocking)

A scheduler that automatically places tasks into open calendar time and
reflows them when things change — with ADHD-specific behavior Motion
doesn't have (grace instead of guilt, transition buffers, estimate
calibration).

**Inputs the scheduler needs:**
- Task `estimatedDuration`, `deadlineType` (hard/soft), and existing
  energy/context tags (§5) — context maps to preferred time-of-day windows
  (e.g. `@deep-work` prefers morning blocks).
- `CalendarEvent`s synced read-only from an external calendar (Google
  Calendar/CalDAV) — real meetings and commitments are fixed obstacles, not
  something the scheduler can move.
- `UserScheduleProfile` — working hours, personal energy windows, and a
  default transition buffer between blocks (task-switching has a real cost
  for ADHD; back-to-back blocks with zero gap invite burnout and slippage).

**Scheduling algorithm:**
- A greedy constraint scheduler (sufficient at single-person scale — no
  need for a heavy solver): sort unscheduled tasks by deadline urgency,
  then place each into the next open slot that matches its duration,
  energy/context window, and required buffer, working forward from now.
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

## 9. Visual design language — "acid maximalism, calm structure"

A boring, beige SaaS look under-stimulates ADHD brains and quietly hurts
whether the app is something you actually want to open. The visual
identity leans into a maximalist, acid-design aesthetic — but deliberately
kept separate from the information architecture in §1/§5/§8, which stays
sparse. **Maximalist skin, minimalist content** — the Focus view still
shows exactly 3 items; it just doesn't look like a corporate dashboard
while doing it. Piling high-intensity visuals onto an already-dense screen
stacks two kinds of cognitive load at once, so intensity is deliberately
uneven across the app rather than applied everywhere at full volume.

**The look:**
- Saturated, clashing gradient palettes (hot pink/lime/cyan/purple —
  acid-house/rave-flyer color logic) rather than a safe corporate blue.
- Chrome/bubble, warped, or sticker-style display type for headers,
  empty states, and badges; plain, high-legibility text everywhere actual
  reading happens (task titles, email bodies, spec notes).
- Grain/noise texture overlays and blobby, warped shapes instead of clean
  flat corporate iconography.
- Playful, bouncy micro-interaction motion (squish/pop on tap/complete)
  rather than corporate ease-in-out easing.

**Where the intensity is dialed up:**
- **Capture confirmation & task completion** — a celebratory acid burst
  animation on finishing something. This is the best possible use of the
  aesthetic: a reward hit at exactly the moment ADHD dopamine-seeking wants
  one, reinforcing the behavior loop.
- **Empty states & onboarding** — no competing density yet, so full
  personality here is free.
- **Global chrome** (nav, capture bar, section headers) — vibrant and
  characterful even on otherwise calm screens.

**Where intensity is dialed down:**
- **Dense/working screens** — Triage, full task lists, Weekly Review, the
  client workspace timeline, email reading. These already carry real
  cognitive load; the visual treatment here favors legibility and calm
  (muted accents, restrained gradients) over maximalism, so the aesthetic
  never fights the content.
- **Focus view** — vibrant shell, but the 3-item layout itself stays
  uncluttered; the acid treatment lives in the background/chrome, not in
  how many things are on screen.

**Two rules that keep this from becoming a liability:**
- Respect `prefers-reduced-motion` throughout — bounce/squish/gradient
  animation degrades to static on request.
- A user-facing **Calm Mode** toggle (theme-level, not per-task) dials the
  whole visual language down to a muted, low-stimulation version of the
  same layout for overstimulated days — the same "match the interface to
  current capacity" principle already applied to task energy tags (§5),
  applied to the theme itself.

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

## 11. Suggested tech stack

- **Frontend:** Next.js (React) + Tailwind, single-user session (no
  multi-tenant complexity needed for a freelancer's own tool).
- **Backend:** Node.js API routes (or a small Express/Fastify service),
  Postgres via Prisma.
- **Mail:** `imapflow` + `nodemailer` if using a real mailbox provider
  (Migadu/Zoho); or Postmark/Resend SDKs + a Cloudflare Worker webhook if
  going API-first. Store raw MIME for audit/undo, parsed text/HTML for
  display.
- **Brief extraction:** Claude API (Messages API with a structured-output
  tool schema) for parsing email + attachment text into discrete
  deliverables; a PDF/DOCX text-extraction step ahead of it for
  attachments.
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
- **Visual design system:** Tailwind + a custom theme layer (design tokens
  for the acid palette/gradients, a separate muted Calm Mode token set),
  Framer Motion for the bounce/squish micro-interactions, respecting
  `prefers-reduced-motion` at the animation-library level.

## 12. Phased build plan

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
8. **Visual identity:** acid-maximalist theme layer, completion/capture
   celebration animations, and the Calm Mode toggle — layered on top of the
   plain, functional UI shipped in earlier phases rather than blocking on
   it.
9. **Polish:** duration calibration loop, native Capacitor/Tauri wrap if
   deeper platform integration is wanted, simple automations (e.g.
   auto-tag emails from known clients into their Project).

Start at Phase 1 with the smallest possible slice: one EmailAccount synced
read-only, and manual tasks — prove the unified per-client timeline feels
better than separate Gmail + Notion tabs before building anything else.
