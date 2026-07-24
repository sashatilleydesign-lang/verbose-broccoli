# Working Notes

A running scratch log for anything currently in-flight on this project —
raised but not yet resolved, or agreed in principle but not yet written
into [DESIGN.md](DESIGN.md). Exists specifically so a long session's
context summarization can't silently drop something the user raised.
See root `CLAUDE.md` for how this file is meant to be maintained.

**This is a staging area, not a permanent record.** Once something is
fully written into DESIGN.md (or built and committed), remove it from
here — don't let this file become a second copy of DESIGN.md that drifts
out of sync with it.

## Open threads (need the user's input to resolve)

- **"Flocus"** — the user referenced this as something "we talked about
  before" in relation to session-timer/Pomodoro-style focus features.
  That discussion happened earlier in this session but got trimmed by a
  context summary before it reached this file. Need the user to
  re-explain what Flocus is/was before it can be folded into the
  session-timer design below.

## Agreed in principle, not yet written into DESIGN.md

- **Personal target date** (resolves the "urgency/novelty" gap surfaced
  by evaluating the app against `adhd-productivity-research.md` on
  branch `claude/add-productivity-research-fjjpt9` — gamification/streaks
  were explicitly ruled out as too shame-prone): a self-imposed date on a
  soft task, distinct from a real `dueDate`, rendered visibly differently
  ("your target: Wed" vs. "due: Fri"), and explicitly excluded from the
  scheduler's at-risk logic so it can never trigger a false alarm.
- **Session timer, replacing the standalone §11.3 time-tracking item**:
  one "start a focus session" action in Focus, showing a visible
  countdown (defaulting to the task's `estimatedMinutes`), with a gentle,
  dismissible nudge on completion rather than a forced break — protects
  hyperfocus, keeps the "no shame states" principle intact. Records
  `actualMinutes`/`startedAt` either way, whether or not the nudge is
  dismissed. Blocked on the "Flocus" thread above before finalizing.
- **Multiple working windows, per day-of-week, with per-date
  exceptions**: a two-layer model — a recurring weekly template (multiple
  labeled windows per day, e.g. a morning window and an evening window)
  plus one-off overrides per specific date ("no work today" or "extra
  hours today"), covering cases like "I work some weekends but not all."
  Promotes the already-speced-but-never-built `UserScheduleProfile` (§3)
  from a single start/end range into this richer shape.
- **Deep-work / context preference per window**: each recurring window
  can optionally carry a preferred `context` tag (reusing the existing
  `TaskContext` enum) — a *soft* preference only, so a task never becomes
  unschedulable purely because the only open window happens to be
  labeled wrong.
- **Task splitting across multiple slots/days**: `ScheduledBlock` needs
  to move from one-per-task (`taskId` is currently `@unique`) to
  many-per-task. If a task's estimated duration doesn't fit in any single
  open window, the scheduler splits it into chunks across successive
  windows — same day or spanning several — each chunk shown in the
  Schedule UI as visibly the same task ("Part 1 of 3"), not an unrelated
  duplicate. Needs a minimum chunk size so it doesn't fragment into
  useless slivers. A hard deadline's "at risk" check moves to the *last*
  chunk's end time. Heavy fragmentation into many small chunks is itself
  worth a quiet flag — usually means the estimate was too big for one
  sitting, or the task should've been split by the user into real
  subtasks in the first place.
