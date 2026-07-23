# Strobe — Phase 1–3

The foundation and ADHD layer of the freelance console described in
[`/DESIGN.md`](../DESIGN.md): schema, single-user auth, manual task/project
CRUD, Focus (with energy-tag filtering), a per-client Workspace timeline,
Capture, and Weekly Review (stuck / waiting / no-next-action) — all wired
to a real Postgres database. Email is seeded mock data for now (see
DESIGN.md §4 for the real IMAP/Migadu plan); no brief extraction,
scheduling, or send-mail yet — those are later phases.

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
- `src/app/actions/*` — Server Actions (complete task w/ batch auto-advance,
  `markAsNext` w/ single-pinned-next-action enforcement, `touchTask` for
  snooze/still-waiting, archive/convert email, capture CRUD)
