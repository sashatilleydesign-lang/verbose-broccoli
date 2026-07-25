import "server-only";
import { prisma } from "@/lib/prisma";
import type { TaskContext } from "@/generated/prisma/enums";

export const BUFFER_MINUTES = 15;
const HORIZON_DAYS = 10;
const DEFAULT_TASK_MINUTES = 30;
const MAX_SLOT_ITERATIONS = 500;
// Splitting a task across multiple slots/days (§11.16) — a chunk shorter
// than this isn't worth the task-switching cost of resuming, so a gap
// that small is skipped rather than used, unless it's the task's last
// remaining chunk (which takes whatever's left no matter how short).
const MIN_CHUNK_MINUTES = 30;
// A generous ceiling on how many chunks one task can be split into before
// giving up — MAX_SLOT_ITERATIONS already bounds each individual chunk
// search, this just backstops the outer loop.
const MAX_CHUNKS_PER_TASK = 20;
// A task split into more chunks than this is flagged (ReflowResult.
// fragmented) rather than silently accepted — usually a sign the estimate
// was too big for one sitting, or it should've been broken into real
// subtasks instead (DESIGN.md §11.16).
const FRAGMENTATION_THRESHOLD = 3;
// Only used if the profile has zero windows at all (e.g. a fresh install
// before anyone's touched schedule settings) — the same Mon-Fri 8-6
// default this scheduler always used, so nothing breaks the first time
// reflow runs.
const FALLBACK_START_MINUTE = 8 * 60;
const FALLBACK_END_MINUTE = 18 * 60;

type Interval = { start: Date; end: Date };

type ProfileWindow = {
  dayOfWeek: number | null;
  date: Date | null;
  startMinute: number;
  endMinute: number;
  context: TaskContext | null;
};

type Profile = {
  windows: ProfileWindow[];
  daysOff: Set<string>;
};

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function addDays(d: Date, n: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
}

function atMinute(day: Date, minute: number): Date {
  const nd = new Date(day);
  nd.setHours(0, minute, 0, 0);
  return nd;
}

// UserScheduleProfile (§3/§11.15): a recurring weekly template of
// multiple labeled windows per day, not one start/end range, plus
// per-date exceptions — a day off overrides every window (recurring or
// one-off) that would otherwise apply to that date.
async function loadProfile(): Promise<Profile> {
  const [windows, daysOff] = await Promise.all([prisma.workWindow.findMany(), prisma.scheduleDayOff.findMany()]);
  return { windows, daysOff: new Set(daysOff.map((d) => dateKey(d.date))) };
}

/** The open windows for one calendar day, sorted by start time. Recurring
 * (dayOfWeek) and one-off (date) windows both apply unless the whole day
 * is marked off. */
function windowsForDay(day: Date, profile: Profile): { start: Date; end: Date; context: TaskContext | null }[] {
  const key = dateKey(day);
  if (profile.daysOff.has(key)) return [];
  if (profile.windows.length === 0) {
    const dow = day.getDay();
    if (dow === 0 || dow === 6) return [];
    return [{ start: atMinute(day, FALLBACK_START_MINUTE), end: atMinute(day, FALLBACK_END_MINUTE), context: null }];
  }

  const dow = day.getDay();
  return profile.windows
    .filter((w) => (w.date ? dateKey(w.date) === key : w.dayOfWeek === dow))
    .map((w) => ({ start: atMinute(day, w.startMinute), end: atMinute(day, w.endMinute), context: w.context }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Walks forward from `afterTime` across the horizon's open windows,
 * respecting a buffer after every busy interval, and returns the first
 * one long enough for `durationMs`. When `context` is set, only windows
 * tagged with that context are considered — the caller retries with
 * `context: null` as a fallback so a label mismatch never makes a task
 * unschedulable outright (see reflowSchedule). */
function findSlot(
  afterTime: Date,
  durationMs: number,
  busy: Interval[],
  bufferMs: number,
  profile: Profile,
  context: TaskContext | null,
): Interval | null {
  const padded = busy
    .map((b) => ({ start: b.start, end: new Date(b.end.getTime() + bufferMs) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  let dayCursor = new Date(afterTime);
  dayCursor.setHours(0, 0, 0, 0);
  let iterations = 0;

  for (let day = 0; day <= HORIZON_DAYS + 7 && iterations < MAX_SLOT_ITERATIONS; day++) {
    const windows = windowsForDay(dayCursor, profile).filter((w) => !context || w.context === context);

    for (const w of windows) {
      let cursor = w.start < afterTime ? afterTime : w.start;
      while (cursor < w.end && iterations < MAX_SLOT_ITERATIONS) {
        iterations++;
        const end = new Date(cursor.getTime() + durationMs);
        if (end > w.end) break;

        const conflict = padded.find((b) => cursor < b.end && b.start < end);
        if (!conflict) return { start: cursor, end };
        cursor = new Date(conflict.end.getTime());
      }
    }

    dayCursor = addDays(dayCursor, 1);
  }
  return null;
}

/** Like `findSlot`, but returns the largest contiguous free run starting
 * at or after `afterTime` (capped at `maxDurationMs`) instead of requiring
 * one run long enough for the whole thing — the building block for
 * splitting a task across multiple slots/days (§11.16) when no single
 * open window fits its entire estimated duration. Returns null if no run
 * of at least `minChunkMs` exists anywhere in the horizon. */
function findLargestChunk(
  afterTime: Date,
  maxDurationMs: number,
  minChunkMs: number,
  busy: Interval[],
  bufferMs: number,
  profile: Profile,
  context: TaskContext | null,
): Interval | null {
  const padded = busy
    .map((b) => ({ start: b.start, end: new Date(b.end.getTime() + bufferMs) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  let dayCursor = new Date(afterTime);
  dayCursor.setHours(0, 0, 0, 0);
  let iterations = 0;

  for (let day = 0; day <= HORIZON_DAYS + 7 && iterations < MAX_SLOT_ITERATIONS; day++) {
    const windows = windowsForDay(dayCursor, profile).filter((w) => !context || w.context === context);

    for (const w of windows) {
      let cursor = w.start < afterTime ? afterTime : w.start;
      while (cursor < w.end && iterations < MAX_SLOT_ITERATIONS) {
        iterations++;
        const conflict = padded.find((b) => cursor < b.end && b.start < w.end);
        const limit = conflict && conflict.start < w.end ? conflict.start : w.end;
        const available = limit.getTime() - cursor.getTime();
        if (available >= minChunkMs) {
          const take = Math.min(available, maxDurationMs);
          return { start: cursor, end: new Date(cursor.getTime() + take) };
        }
        if (!conflict) break;
        cursor = new Date(conflict.end.getTime());
      }
    }

    dayCursor = addDays(dayCursor, 1);
  }
  return null;
}

/** Fills a task's duration across successive open windows — same day or
 * spanning several — when no single window is long enough for the whole
 * thing (§11.16). Each returned interval becomes its own `ScheduledBlock`
 * against the same task. Returns null if the horizon runs out before the
 * full duration is placed (the task goes unscheduled, same as findSlot
 * failing — never a partial, silently-incomplete placement). */
function findSplitSlots(
  afterTime: Date,
  durationMs: number,
  busy: Interval[],
  bufferMs: number,
  profile: Profile,
  context: TaskContext | null,
): Interval[] | null {
  const minChunkMs = MIN_CHUNK_MINUTES * 60_000;
  const chunks: Interval[] = [];
  let localBusy = busy;
  let cursor = afterTime;
  let remaining = durationMs;

  for (let i = 0; i < MAX_CHUNKS_PER_TASK && remaining > 0; i++) {
    const chunk = findLargestChunk(cursor, remaining, minChunkMs, localBusy, bufferMs, profile, context);
    if (!chunk) return null;
    chunks.push(chunk);
    localBusy = [...localBusy, chunk];
    remaining -= chunk.end.getTime() - chunk.start.getTime();
    cursor = chunk.end;
  }
  return remaining <= 0 ? chunks : null;
}

export type ReflowResult = {
  scheduled: number;
  atRisk: number;
  unscheduled: number;
  fragmented: number;
};

/** Recomputes every ScheduledBlock from scratch: fixed CalendarEvents are
 * untouchable obstacles; eligible tasks (next/later, not done) are placed
 * greedily — hard deadlines soonest first, then pinned "next" actions,
 * then creation order. A hard deadline that can't be met before its due
 * date is still scheduled (never silently dropped) and flagged at-risk
 * against its last chunk's end time. A task's preferred context (§11.15)
 * is tried first but is only a soft preference — falls back to any open
 * window rather than going unscheduled over a label mismatch. Only once
 * no single open window fits a task's whole duration does it get split
 * across successive windows instead of failing outright (§11.16), with
 * heavy fragmentation (more than FRAGMENTATION_THRESHOLD chunks) flagged
 * back in the result rather than silently accepted. */
export async function reflowSchedule(): Promise<ReflowResult> {
  const now = new Date();
  const horizonEnd = addDays(now, HORIZON_DAYS);
  const profile = await loadProfile();

  const events = await prisma.calendarEvent.findMany({
    where: { end: { gte: now }, start: { lte: horizonEnd } },
  });

  const tasks = await prisma.task.findMany({
    where: { state: { in: ["next", "later"] } },
  });

  const sorted = [...tasks].sort((a, b) => {
    const aHard = a.deadlineType === "hard" && a.dueDate;
    const bHard = b.deadlineType === "hard" && b.dueDate;
    if (aHard && bHard) return a.dueDate!.getTime() - b.dueDate!.getTime();
    if (aHard) return -1;
    if (bHard) return 1;
    if (a.state !== b.state) return a.state === "next" ? -1 : 1;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const busy: Interval[] = events.map((e) => ({ start: e.start, end: e.end }));
  const placements: { taskId: string; start: Date; end: Date; partIndex: number | null; partTotal: number | null }[] = [];
  let scheduledTasks = 0;
  let unscheduled = 0;
  let atRisk = 0;
  let fragmented = 0;

  for (const task of sorted) {
    const durationMs = (task.estimatedMinutes ?? DEFAULT_TASK_MINUTES) * 60_000;
    const bufferMs = BUFFER_MINUTES * 60_000;

    // A single contiguous window is always preferred over splitting —
    // only fall back to dividing the task up (§11.16) once neither the
    // context-preferred nor the any-window single-slot search finds one
    // long enough for the whole duration.
    const slot =
      (task.context && findSlot(now, durationMs, busy, bufferMs, profile, task.context)) ||
      findSlot(now, durationMs, busy, bufferMs, profile, null);

    const chunks = slot
      ? [slot]
      : (task.context && findSplitSlots(now, durationMs, busy, bufferMs, profile, task.context)) ||
        findSplitSlots(now, durationMs, busy, bufferMs, profile, null);

    if (!chunks) {
      unscheduled++;
      continue;
    }
    for (const chunk of chunks) busy.push(chunk);
    scheduledTasks++;
    const isSplit = chunks.length > 1;
    chunks.forEach((chunk, i) => {
      placements.push({
        taskId: task.id,
        start: chunk.start,
        end: chunk.end,
        partIndex: isSplit ? i + 1 : null,
        partTotal: isSplit ? chunks.length : null,
      });
    });
    if (isSplit && chunks.length > FRAGMENTATION_THRESHOLD) fragmented++;

    // A hard deadline's at-risk check is against the *last* chunk's end
    // (§11.16) — for the common single-chunk case that's just its one
    // end time, same as before.
    const lastChunkEnd = chunks[chunks.length - 1].end;
    if (task.deadlineType === "hard" && task.dueDate && lastChunkEnd > task.dueDate) atRisk++;
  }

  await prisma.$transaction([
    prisma.scheduledBlock.deleteMany({}),
    prisma.scheduledBlock.createMany({ data: placements }),
  ]);

  return { scheduled: scheduledTasks, atRisk, unscheduled, fragmented };
}
