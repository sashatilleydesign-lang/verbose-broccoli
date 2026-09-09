# Strobe — Session Handoff

A snapshot for picking up this project cold, without needing the raw
conversation history. This is a bridge document, not a permanent record —
the permanent records are [DESIGN.md](DESIGN.md) (settled design
decisions) and [app/README.md](app/README.md) (how the code is actually
built). Read those for depth; this file just orients you fast and flags
anything that isn't obvious from the code/docs alone.

## What Strobe is

A custom ADHD-friendly freelance project-management/email console,
described in full in DESIGN.md. Single user, single operator, running
against a real Postgres database via Prisma 7. Built incrementally across
many long sessions — DESIGN.md §13 tracks phase-by-phase build status.

## Where things stand right now

Branch: `claude/adhd-pm-email-system-l0nkof`, pushed to
`sashatilleydesign-lang/verbose-broccoli`. Latest commit at the time of
writing: `cf98111` ("Turn Working hours into a slideout, and fix client
colors all matching").

**DESIGN.md §11 (the "daily-driver completeness" backlog) is done**,
except:
- §11.10 (dedicated client view) — actually **also done**, scoped as a
  client profile (contact/rate/notes) merged into the Workspace page
  rather than a separate surface.
- §11.17 — a deliberate no-build (comments/dependencies/multi-user are
  explicitly out of scope for this single-user tool).

So §11.2 through §11.16 are all built. Everything else (Phases 4, 5, 7, 9
in DESIGN.md §13) is genuinely unbuilt and needs either credentials this
project doesn't have yet (Phase 5 needs a Claude API credential, Phase 4
needs a real mailbox/SMTP credential) or a much bigger separate scoping
pass (Phase 7's cross-device PWA work).

## What happened in the most recent stretch of work

In rough order:
1. **§11.15 — multiple working windows.** Replaced the scheduler's single
   hardcoded Mon–Fri 8am–6pm range with real `WorkWindow` (recurring or
   one-off, keyed by `dayOfWeek` or `date`) and `ScheduleDayOff` models.
   A task's `context` is a soft preference — the scheduler tries a
   matching window first, falls back to any open window, never leaves a
   task unscheduled purely over a label mismatch.
2. **§11.16 — splitting a task across multiple slots/days.**
   `ScheduledBlock.taskId` lost its `@unique` — a task too long for any
   one open window now splits across successive ones (`partIndex`/
   `partTotal`), shown as "Part 2 of 3" rather than duplicates. A single
   contiguous window is still always tried first.
3. **§11.10 — client profile.** Scoped (see above) and built:
   `Client.contactEmail/contactPhone/rate/notes`, editable inline via
   `ClientProfileCard` on the Workspace page.
4. **Sidebar made sticky** (`position: sticky` + `self-start` +
   `h-screen`) — it used to scroll away with tall pages.
5. **Working Hours turned into a slideout.** It was a collapsible
   `<details>` buried at the bottom of the Schedule page; now it's a
   right-anchored drawer (`SettingsDrawer.tsx`, a generic reusable
   component — same overlay pattern `MobileNav` already used) triggered
   from the page header.
6. **Client colors fixed.** Every client had been rendering the exact
   same orange dot — `colorTag` existed since the schema's first draft
   but nothing ever assigned a distinct value. `createClient` now
   auto-assigns from an 8-color palette (`lib/clientColors.ts`), and
   `ClientProfileCard` grew a swatch picker to recolor one later.
   `scripts/backfill-client-colors.ts` is a one-time fix for
   clients created before this existed — safe to re-run.

## Gotchas hit this session (worth knowing before you repeat them)

- **Postgres isn't always running in a fresh container/session.** Start
  it with `pg_ctlcluster 16 main start` if `npx prisma migrate dev` fails
  with `P1001: Can't reach database server`.
- **`npx prisma migrate dev` doesn't always auto-regenerate the client**
  in this environment — if you see `Cannot read properties of undefined
  (reading 'findMany')` on a model that should exist, just run
  `npx prisma generate` explicitly.
- **No `.prettierrc` in this repo.** Running `npx prettier --write` on a
  file reformats it with prettier's *defaults*, which don't match the
  codebase's actual manual style (mostly single-line JSX attributes) —
  causes large, unwanted diff noise. Don't run prettier on existing
  files; format by hand to match surrounding code.
- **Duplicate HTML `id`s are a real, easy-to-hit bug in this codebase.**
  Found once already (`WorkingHoursSettings.tsx` reused `startTime`/
  `endTime` ids already used by the Schedule page's "Add a fixed event"
  form) — Playwright's `page.fill`/`page.click` silently resolved to the
  first DOM match rather than throwing, so it went unnoticed until manual
  QA. Grep for an id before introducing a new form field.
- **The user tests changes on their own laptop**, not this sandboxed
  session — this session's `localhost:3000` is not reachable from their
  machine. After every push, they need to `git pull` on their end,
  possibly `npx prisma generate` / `npx prisma migrate dev` if the schema
  changed, then their own `npm run dev` (already running, hot-reloads
  most changes automatically). `git checkout <branch>` does **not**
  fetch — remind them to actually `git pull` if something looks stale.

## Immediate next step

Nothing is mid-flight — the last shipped commit (`cf98111`) is clean,
typechecked, linted, and QA'd. `WORKING-NOTES.md` is currently empty
(everything decided has been written into DESIGN.md already). The open
question for the user is which of Phases 4/5/7/9 to tackle next, and
whether they can supply the credentials Phase 4/5 need.
