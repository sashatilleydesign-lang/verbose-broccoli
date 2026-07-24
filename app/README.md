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
- `src/lib/schedule.ts` — Schedule screen queries (today's hour-grid +
  upcoming days)
- `src/app/actions/*` — Server Actions (complete task w/ batch auto-advance,
  `markAsNext` w/ single-pinned-next-action enforcement, `touchTask` for
  snooze/still-waiting, archive/convert email, capture CRUD, `reflowSchedule`,
  fixed-event CRUD)

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
