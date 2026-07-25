import "server-only";
import { prisma } from "@/lib/prisma";
import type { TaskContext } from "@/generated/prisma/enums";

export const BUFFER_MINUTES = 15;
const HORIZON_DAYS = 10;
const DEFAULT_TASK_MINUTES = 30;
const MAX_SLOT_ITERATIONS = 500;
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

export type ReflowResult = {
  scheduled: number;
  atRisk: number;
  unscheduled: number;
};

/** Recomputes every ScheduledBlock from scratch: fixed CalendarEvents are
 * untouchable obstacles; eligible tasks (next/later, not done) are placed
 * greedily — hard deadlines soonest first, then pinned "next" actions,
 * then creation order. A hard deadline that can't be met before its due
 * date is still scheduled (never silently dropped) and flagged at-risk
 * by the caller comparing block.end against the task's dueDate. A
 * task's preferred context (§11.15) is tried first but is only a soft
 * preference — falls back to any open window rather than going
 * unscheduled over a label mismatch. */
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
  const placements: { taskId: string; start: Date; end: Date }[] = [];
  let unscheduled = 0;
  let atRisk = 0;

  for (const task of sorted) {
    const durationMs = (task.estimatedMinutes ?? DEFAULT_TASK_MINUTES) * 60_000;
    const bufferMs = BUFFER_MINUTES * 60_000;
    const slot =
      (task.context && findSlot(now, durationMs, busy, bufferMs, profile, task.context)) ||
      findSlot(now, durationMs, busy, bufferMs, profile, null);
    if (!slot) {
      unscheduled++;
      continue;
    }
    busy.push(slot);
    placements.push({ taskId: task.id, start: slot.start, end: slot.end });
    if (task.deadlineType === "hard" && task.dueDate && slot.end > task.dueDate) atRisk++;
  }

  await prisma.$transaction([
    prisma.scheduledBlock.deleteMany({}),
    prisma.scheduledBlock.createMany({ data: placements }),
  ]);

  return { scheduled: placements.length, atRisk, unscheduled };
}
