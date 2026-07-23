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

## 6. Unified UI surfaces

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

## 7. Suggested tech stack

- **Frontend:** Next.js (React) + Tailwind, single-user session (no
  multi-tenant complexity needed for a freelancer's own tool).
- **Backend:** Node.js API routes (or a small Express/Fastify service),
  Postgres via Prisma.
- **Mail:** `imapflow` + `nodemailer` if using a real mailbox provider
  (Migadu/Zoho); or Postmark/Resend SDKs + a Cloudflare Worker webhook if
  going API-first. Store raw MIME for audit/undo, parsed text/HTML for
  display.
- **Background jobs:** a queue (BullMQ + Redis, or a simple cron table) for
  IMAP polling, daily digest generation, and stale-item resurfacing.
- **Hosting:** Vercel/Fly.io/Railway for the app, Neon/Supabase for
  Postgres, Upstash for Redis if needed — all low-maintenance managed
  services, matching the "don't build yourself a second job" principle.
- **Auth:** since this is single-user, a simple session/password (or
  passkey) is enough — don't build multi-tenant auth for a tool only you
  will use.

## 8. Phased build plan

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
5. **Polish:** time-blocking calendar view, mobile quick-capture, simple
   automations (e.g. auto-tag emails from known clients into their
   Project).

Start at Phase 1 with the smallest possible slice: one EmailAccount synced
read-only, and manual tasks — prove the unified per-client timeline feels
better than separate Gmail + Notion tabs before building anything else.
