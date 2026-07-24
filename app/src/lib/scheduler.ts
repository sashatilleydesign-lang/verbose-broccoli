import "server-only";
import { prisma } from "@/lib/prisma";

// Hardcoded for now rather than a UserScheduleProfile table — single user,
// no settings UI yet to edit it. Straightforward to promote to a DB-backed
// profile later without touching the algorithm itself.
export const WORK_START_HOUR = 8;
export const WORK_END_HOUR = 18;
export const BUFFER_MINUTES = 15;
const HORIZON_DAYS = 10;
const DEFAULT_TASK_MINUTES = 30;
const MAX_SLOT_ITERATIONS = 500;

type Interval = { start: Date; end: Date };

function startOfWorkDay(d: Date): Date {
  const nd = new Date(d);
  nd.setHours(WORK_START_HOUR, 0, 0, 0);
  return nd;
}

function endOfWorkDay(d: Date): Date {
  const nd = new Date(d);
  nd.setHours(WORK_END_HOUR, 0, 0, 0);
  return nd;
}

function addDays(d: Date, n: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
}

function clampIntoWorkingHours(t: Date): Date {
  if (t < startOfWorkDay(t)) return startOfWorkDay(t);
  if (t >= endOfWorkDay(t)) return startOfWorkDay(addDays(t, 1));
  return t;
}

/** Walks forward from `afterTime` to the first open slot of `durationMs`,
 * within working hours, respecting a buffer after every busy interval. */
function findSlot(afterTime: Date, durationMs: number, busy: Interval[], bufferMs: number): Interval | null {
  const padded = busy
    .map((b) => ({ start: b.start, end: new Date(b.end.getTime() + bufferMs) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  let cursor = clampIntoWorkingHours(afterTime);

  for (let i = 0; i < MAX_SLOT_ITERATIONS; i++) {
    cursor = clampIntoWorkingHours(cursor);
    const end = new Date(cursor.getTime() + durationMs);

    if (end > endOfWorkDay(cursor)) {
      cursor = startOfWorkDay(addDays(cursor, 1));
      continue;
    }

    const conflict = padded.find((b) => cursor < b.end && b.start < end);
    if (!conflict) return { start: cursor, end };
    cursor = new Date(conflict.end.getTime());
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
 * by the caller comparing block.end against the task's dueDate. */
export async function reflowSchedule(): Promise<ReflowResult> {
  const now = new Date();
  const horizonEnd = addDays(now, HORIZON_DAYS);

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
    const slot = findSlot(now, durationMs, busy, BUFFER_MINUTES * 60_000);
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
