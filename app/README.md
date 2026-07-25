# Strobe — Phase 1–3 + 6

The foundation, ADHD layer, and auto-scheduler of the freelance console
described in [`/DESIGN.md`](../DESIGN.md): schema, single-user auth, manual
task/project CRUD, Focus (with energy-tag filtering), a per-client Workspace
timeline, Capture, Weekly Review (stuck / waiting / no-next-action), and a
real reflow scheduler (greedy slot-finder, fixed events, hard-deadline
priority, multi-day rollover) — all wired to a real Postgres database.
Email is seeded mock data for now (see DESIGN.md §4 for the real
IMAP/Migadu plan); brief extraction (Phase 5) is the one remaining piece
that genuinely needs an external connector (the Claude API), so it's not
built yet — everything else connector-free is done.

## Setup

```bash
# Postgres (local dev)
sudo -u postgres psql -c "CREATE ROLE strobe WITH LOGIN PASSWORD 'strobe_dev_password' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE strobe_dev OWNER strobe;"

npm install
npx prisma migrate dev   # applies schema, prompts to seed
# or, to seed separately:
npx tsx prisma/seed.ts

npm run dev
```

`.env` holds `DATABASE_URL` plus the single-operator dev credentials
(`AUTH_EMAIL` / `AUTH_PASSWORD`) — it's gitignored, see `.env` in this
directory for the actual dev values used locally.

## Stack notes (Next.js 16 / Prisma 7 — both moved recently)

- `middleware.ts` is now `proxy.ts`, and with a `src/` directory it must
  live at `src/proxy.ts`, not the project root — Next silently won't pick
  it up from the wrong location.
- Proxy is an **optimistic** redirect only. The real guard is
  `verifySession()` in `src/lib/dal.ts`, called from every page and Server
  Action — Next's own docs warn a Proxy matcher change can silently stop
  covering a route, so nothing relies on Proxy alone.
- Prisma 7 requires a driver adapter (`@prisma/adapter-pg` here) passed to
  `new PrismaClient({ adapter })` — `datasource.url` no longer works
  directly inside `schema.prisma`; it lives in `prisma.config.ts` instead.

## Structure

- `prisma/schema.prisma` — Client / Project / Task / EmailThread /
  EmailMessage / TaskEmailLink / CaptureItem (see DESIGN.md §3)
- `prisma/seed.ts` — the same Lumen Skincare / Nova Coffee Co. / Bramble &
  Co. / Kite Studio scenario used throughout the design mockups
- `src/lib/dal.ts`, `src/lib/session.ts` — auth
- `src/lib/focus.ts` — the Focus view's 3-slot selection logic (with
  optional energy filter)
- `src/lib/weekly.ts` — Weekly Review queries (stuck / waiting / projects
  with no next action)
- `src/lib/scheduler.ts` — the reflow algorithm: working-hours-aware slot
  finder, hard-deadline-first priority ordering, buffer time, at-risk
  flagging (computed at render time, not stored)
- `src/lib/schedule.ts` — Schedule screen queries: day (hour-grid + upcoming
  agenda), week (7-day hour-grid), and month (calendar grid) views, all
  driven off a shared `blocksAndEventsBetween` query
- `src/app/actions/*` — Server Actions (complete task w/ batch auto-advance,
  `markAsNext` w/ single-pinned-next-action enforcement, `touchTask` for
  snooze/still-waiting, archive/convert email, capture CRUD, `reflowSchedule`,
  fixed-event CRUD, `entities.ts`'s direct-create for Client/Project/Task —
  name/title only, everything else optional and editable later, `search.ts`'s
  `searchAll` for the quick-jump palette, `tasks.ts`'s `startSession`/
  `endSession` for the focus-session timer, `templates.ts`'s
  `saveProjectAsTemplate`/`createProjectFromTemplate`, `reminders.ts`'s
  read-only `getReminderCandidates` for the in-tab toast watcher)
- `src/components/ReminderWatcher.tsx` — reminders v0 (§11.6): polls
  `getReminderCandidates` every 30s for `ScheduledBlock`s whose start
  time just arrived and hard-deadline tasks that just went overdue,
  surfacing each as a dismissible in-tab toast. No push infrastructure —
  v1 (real Web Push per §10) waits on a deployed HTTPS domain. Dedup
  state lives in `sessionStorage` rather than a plain in-memory ref,
  since `AppShell` (and this watcher with it) is mounted per-page rather
  than in the root layout — an in-memory set would reset, and re-nag
  with the same toast, on every navigation between pages in the same
  tab. The "starting" reminder is keyed on the `ScheduledBlock`'s own id
  rather than the task's, since `reflowSchedule()` deletes and recreates
  every block from scratch — keying on the task id would let a stale
  seen-entry permanently suppress the reminder for that task even after
  a reflow moved it to a genuinely new time.
- `src/components/QuickJump.tsx` — the Cmd+K palette (§11.2): fuzzy
  substring search across Clients/Projects/Tasks/email threads, plus fixed
  nav shortcuts and a "mark next action done" quick action. Open/close
  state lives in `quickJumpStore.ts` (same `useSyncExternalStore` pattern
  as `ModeToggle`) since the trigger buttons in `Sidebar`/`MobileNav` and
  the palette itself are separate components. Link clicks close the
  palette on a deferred tick (`setTimeout(fn, 0)`), not synchronously —
  closing immediately would unmount the very `<Link>` mid-click before
  Next's client-side navigation completes, silently aborting it.
- `src/components/SessionOverlay.tsx` — the focus-session timer (§11.3):
  idle state is a plain "Start focus session" button; active state is a
  full-screen countdown driven off `Task.startedAt` (set/cleared by
  `startSession`/`endSession`), counting up past zero once the estimate
  (or a 25-minute default) is used up, with a dismissible "time's up"
  nudge rather than a hard stop. Ending a session just clears `startedAt`
  with no partial-credit bookkeeping; completing one from inside the
  overlay records `Task.actualMinutes` from the elapsed time.
- `src/components/ScheduleDrag.tsx` — also home to the resize handle
  (§11.4): a thin `cursor-ns-resize` strip on the bottom edge of each
  movable/at-risk block (not on fixed events), wired through
  `resizeScheduledBlock` in `actions/schedule.ts`. Deliberately writes
  back to `Task.estimatedMinutes`, not just the one `ScheduledBlock` —
  a resize is correcting how long the task actually takes, so it needs
  to survive the next Reflow, unlike a plain drag-move. Floors at 15
  minutes. `useOverrideSync`'s stale-override cleanup had to compare
  both `start` and `end` against the server value (not `start` alone) —
  a resize deliberately holds `start` constant, so the old start-only
  check would clear a resize's optimistic override before its own
  action even committed, on every re-render that reconstructs the
  `items` array by reference (as `WeekDragGrid`'s `flatMap`-derived list
  does on every render, unlike `DayDragItems`' stable prop reference).
  Also home to `effectiveKind` (§11.11): since `item.end` already
  reflects the live drag/resize override, recomputing at-risk fresh on
  every render — rather than trusting the server-computed `item.kind`
  from before the drag started — is what makes a hard-deadline block
  flip to the at-risk treatment the instant a live position would land
  past its due date, not just after the drop and the next page load.
  Also home to click-to-create (§11.8): a background click-surface layer
  sits as a *sibling* of the item layer (not its ancestor), so a click
  landing on an item never bubbles into it — only a genuine click on
  empty grid space opens the "just a name" `QuickAddPopover`, wired
  through `createCalendarEventQuick` in `actions/schedule.ts`. Enter
  commits it; Escape or blurring away discards it, no half-created state
  left behind.
- `src/components/ClientBadge.tsx` — `ClientBadge` (the `[Client Name]`
  pill used on Focus/Weekly) and `ClientDot` (a bare colored dot for
  Workspace's client list, the client detail header, and Schedule) share
  one place to render `Client.colorTag` (§11.7) — it existed in the
  schema since day one but nothing in the UI drew it until now.
- `src/components/TaskNoteModal.tsx` / `TaskTitleButton.tsx` /
  `taskNoteStore.ts` — surfaces `Task.note` (§11.9), another field that's
  existed since the schema's first draft with no UI ever reading it.
  Same `useSyncExternalStore` open/close pattern as `QuickJump`, since
  the trigger (a task title, clicked from Focus/Weekly/Workspace/
  Schedule) and the modal are unrelated components. The modal's editor
  is keyed on the task id (`<NoteEditor key={active.id} .../>`) so
  switching between two tasks' notes remounts it with a fresh
  lazy-initialized draft, rather than needing an effect to re-seed state
  from a changing prop (the `set-state-in-effect` trap this project
  keeps running into). On Schedule specifically, the clickable title has
  to be `relative z-10` — the resize handle (§11.4) is `position:
  absolute`, which paints above normal-flow content regardless of DOM
  order, so a very short (15-min-floor) block's title and its handle's
  bottom 8px would otherwise visually overlap with the handle always
  winning the click.

## Scheduler notes

- Working hours (8am–6pm), 15-minute buffer between blocks, and the
  10-day scheduling horizon are hardcoded constants in `scheduler.ts`
  rather than a `UserScheduleProfile` table — single user, no settings UI
  yet to edit them. Straightforward to promote to a DB-backed profile later
  without touching the algorithm.
- Reflow is a full recompute triggered by an explicit "Reflow schedule"
  button, not an automatic trigger wired into every task/event mutation
  site. Simpler and safer for a first pass; revisit if the manual trigger
  ever feels like friction.
- `CalendarEvent`s are manually entered for now (no external calendar
  sync) — see DESIGN.md §7 for the phased plan to add that later.
- The Schedule page has Day / Week / Month tabs (`?view=` + `?date=` in the
  URL). Month cells link into that day's Day view instead of opening any
  kind of modal — keeps the day-detail rendering logic in one place.
- Task blocks in Day and Week view are drag-to-reschedule (pointer events,
  not native HTML5 drag-and-drop, so it works on touch too), snapping to
  15-minute increments. This is a same-session nudge, not a pin: the next
  "Reflow schedule" click still recomputes every block from scratch and
  will happily move it again. Fixed events aren't draggable — their time
  is edited by deleting and re-adding.
- `src/components/ScheduleDrag.tsx` renders every item in Week view as a
  flat, absolutely-positioned layer (not nested inside each day's column
  div) even though it's visually a 7-column grid. Nesting items inside
  per-day column divs seems more natural, but a cross-day drag would then
  move the dragged item's DOM node into a different column's React
  subtree mid-gesture — an unmount/remount that silently drops the
  browser's pointer capture partway through the drag. Keeping items in one
  flat layer, positioned with `calc()` against the column count, means the
  same DOM node handles pointerdown/move/up for the whole gesture no
  matter which day it visually lands over.

## Known bugs fixed in the last review pass

Worth knowing about since they touch cross-cutting behavior:

- Completing a task didn't clear its `ScheduledBlock` — a done task kept
  showing up on the Schedule page until the next Reflow. `completeTask`
  now deletes the block immediately.
- The client Workspace timeline silently dropped `stuck` and `waiting`
  tasks (only `done`/`next`/`later` were handled) — they now show up in
  the collapsed "not next yet" list with a state suffix.
- Several actions only revalidated the `/clients` index, not the specific
  `/clients/[clientId]` page — could show stale data if that workspace was
  already open. Actions that touch a task's client now revalidate that
  path directly.
- `ModeToggle` used a `setState`-in-`useEffect` pattern that reads external
  DOM/localStorage state — flagged by `eslint-config-next`'s stricter
  `react-hooks/set-state-in-effect` rule. Rewrote with
  `useSyncExternalStore`, which is the actual idiomatic fix for "read
  external state without a hydration mismatch," not just a lint
  workaround.

## `npm audit`

Shows 6 high-severity advisories, all transitive (inside Prisma's dev
tooling and Next's build pipeline — `find-my-way`, `postcss`, `sharp` —
nothing in `src/`). `npm audit fix --force` "fixes" them by downgrading to
`prisma@7.8.0` and `next@9.3.3` — i.e. actively breaking the app, not
fixing it. Left alone on purpose; revisit when upstream ships a real fix
at the current major versions.
