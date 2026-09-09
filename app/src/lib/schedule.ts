import "server-only";
import { prisma } from "@/lib/prisma";
import { dateKey } from "@/lib/scheduleFormat";

export { dateKey };

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  return nd;
}
function addDays(d: Date, n: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
}

export type ScheduleItem = {
  id: string;
  // Set only for movable/atRisk items — they're backed by a Task, whose
  // id differs from the ScheduledBlock's own `id` above. Undefined for
  // fixed items, which are CalendarEvents with no Task/note to open.
  taskId?: string;
  title: string;
  start: Date;
  end: Date;
  kind: "movable" | "fixed" | "atRisk";
  clientName?: string;
  clientColor?: string;
  note?: string | null;
  deadlineType?: string | null;
  dueDate?: Date | null;
  targetDate?: Date | null;
  // Splitting a task across multiple slots/days (§11.16) — both set
  // (1-based) when this block is one of several chunks for the same
  // task, undefined for the common single-block case.
  partIndex?: number;
  partTotal?: number;
};

async function blocksAndEventsBetween(from: Date, to: Date): Promise<ScheduleItem[]> {
  const [blocks, events] = await Promise.all([
    prisma.scheduledBlock.findMany({
      where: { start: { lt: to }, end: { gt: from } },
      include: { task: { include: { project: { include: { client: true } } } } },
    }),
    prisma.calendarEvent.findMany({
      where: { start: { lt: to }, end: { gt: from } },
    }),
  ]);

  const blockItems: ScheduleItem[] = blocks.map((b) => {
    const atRisk = b.task.deadlineType === "hard" && b.task.dueDate ? b.end > b.task.dueDate : false;
    return {
      id: b.id,
      taskId: b.taskId,
      title: b.task.title,
      start: b.start,
      end: b.end,
      kind: atRisk ? "atRisk" : "movable",
      clientName: b.task.project?.client?.name,
      clientColor: b.task.project?.client?.colorTag,
      note: b.task.note,
      deadlineType: b.task.deadlineType,
      dueDate: b.task.dueDate,
      targetDate: b.task.targetDate,
      partIndex: b.partIndex ?? undefined,
      partTotal: b.partTotal ?? undefined,
    };
  });

  const eventItems: ScheduleItem[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    kind: "fixed",
  }));

  return [...blockItems, ...eventItems].sort((a, b) => a.start.getTime() - b.start.getTime());
}

export async function getDaySchedule(date: Date) {
  const from = startOfDay(date);
  const to = addDays(from, 1);
  return blocksAndEventsBetween(from, to);
}

export async function getTodaySchedule() {
  return getDaySchedule(new Date());
}

export async function getUpcomingSchedule(days: number, fromDate: Date = new Date()) {
  const from = addDays(startOfDay(fromDate), 1);
  const to = addDays(from, days);
  const items = await blocksAndEventsBetween(from, to);

  const byDay = new Map<string, ScheduleItem[]>();
  for (const item of items) {
    const key = item.start.toDateString();
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(item);
  }
  return byDay;
}

// Sunday-start week containing `anyDayInWeek`.
export function startOfWeek(anyDayInWeek: Date): Date {
  return addDays(startOfDay(anyDayInWeek), -anyDayInWeek.getDay());
}

export async function getWeekSchedule(weekStart: Date) {
  const from = startOfDay(weekStart);
  const to = addDays(from, 7);
  const items = await blocksAndEventsBetween(from, to);

  const days: { date: Date; key: string; items: ScheduleItem[] }[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(from, i);
    days.push({ date, key: dateKey(date), items: [] });
  }
  const byKey = new Map(days.map((d) => [d.key, d]));
  for (const item of items) {
    const day = byKey.get(dateKey(startOfDay(item.start)));
    if (day) day.items.push(item);
  }
  return days;
}

export async function getMonthGrid(monthAnchor: Date) {
  const firstOfMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
  const firstOfNextMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1);
  const lastOfMonth = addDays(firstOfNextMonth, -1);

  const gridStart = addDays(firstOfMonth, -firstOfMonth.getDay());
  const gridEnd = addDays(lastOfMonth, 6 - lastOfMonth.getDay());
  const totalDays = Math.round((gridEnd.getTime() - gridStart.getTime()) / DAY_MS) + 1;

  const items = await blocksAndEventsBetween(gridStart, addDays(gridEnd, 1));

  const days: { date: Date; key: string; inMonth: boolean; items: ScheduleItem[] }[] = [];
  for (let i = 0; i < totalDays; i++) {
    const date = addDays(gridStart, i);
    days.push({ date, key: dateKey(date), inMonth: date.getMonth() === firstOfMonth.getMonth(), items: [] });
  }
  const byKey = new Map(days.map((d) => [d.key, d]));
  for (const item of items) {
    const day = byKey.get(dateKey(startOfDay(item.start)));
    if (day) day.items.push(item);
  }

  return { monthAnchor: firstOfMonth, days };
}

// UserScheduleProfile display data (§11.15) — recurring windows grouped
// by day-of-week, plus upcoming exceptions. Reads the same tables
// scheduler.ts's reflow does, just shaped for the settings UI rather
// than the slot-finding algorithm.
export async function getScheduleProfile() {
  const now = startOfDay(new Date());
  const [recurring, oneOff, daysOff] = await Promise.all([
    prisma.workWindow.findMany({ where: { dayOfWeek: { not: null } }, orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }] }),
    prisma.workWindow.findMany({ where: { date: { gte: now } }, orderBy: { date: "asc" } }),
    prisma.scheduleDayOff.findMany({ where: { date: { gte: now } }, orderBy: { date: "asc" } }),
  ]);
  return { recurring, oneOff, daysOff };
}
