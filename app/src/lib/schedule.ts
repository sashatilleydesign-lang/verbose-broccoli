import "server-only";
import { prisma } from "@/lib/prisma";

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
  title: string;
  start: Date;
  end: Date;
  kind: "movable" | "fixed" | "atRisk" | "open";
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

export async function getTodaySchedule() {
  const from = startOfDay(new Date());
  const to = addDays(from, 1);
  return blocksAndEventsBetween(from, to);
}

export async function getUpcomingSchedule(days: number) {
  const from = addDays(startOfDay(new Date()), 1);
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
