import "server-only";
import { prisma } from "@/lib/prisma";

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
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type ScheduleItem = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  kind: "movable" | "fixed" | "atRisk";
  clientName?: string;
  deadlineType?: string | null;
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
      title: b.task.title,
      start: b.start,
      end: b.end,
      kind: atRisk ? "atRisk" : "movable",
      clientName: b.task.project?.client?.name,
      deadlineType: b.task.deadlineType,
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
