import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth } from "../_auth";
import { prisma } from "@/lib/prisma";

function mapTask(t: {
  id: number;
  title: string;
  state: string;
  energy: string | null;
  context: string | null;
  dueDate: Date | null;
  project: { client: { name: string; color: string } | null } | null;
}) {
  return {
    id: t.id,
    title: t.title,
    state: t.state,
    energy: t.energy,
    context: t.context,
    pinned: t.state === "next",
    clientName: t.project?.client?.name ?? null,
    clientColor: t.project?.client?.color ?? null,
    dueDate: t.dueDate?.toISOString() ?? null,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;

  const include = { project: { include: { client: true } } } as const;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [pinnedTask, overdue, inFlight, upcoming, completedThisWeek] = await Promise.all([
    prisma.task.findFirst({ where: { state: "next" }, orderBy: { createdAt: "asc" }, include }),
    prisma.task.findMany({
      where: { state: { notIn: ["done"] }, dueDate: { lt: now } },
      orderBy: { dueDate: "asc" },
      take: 10,
      include,
    }),
    prisma.task.findMany({
      where: { state: { in: ["next", "waiting", "stuck"] } },
      orderBy: { updatedAt: "asc" },
      take: 20,
      include,
    }),
    prisma.task.findMany({
      where: { state: "later", dueDate: { gte: now, lte: weekAhead } },
      orderBy: { dueDate: "asc" },
      take: 10,
      include,
    }),
    prisma.task.findMany({
      where: { state: "done", updatedAt: { gte: weekAgo } },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include,
    }),
  ]);

  return NextResponse.json({
    pinnedTask: pinnedTask ? mapTask(pinnedTask) : null,
    overdue: overdue.map(mapTask),
    inFlight: inFlight.map(mapTask),
    upcoming: upcoming.map(mapTask),
    completedThisWeek: completedThisWeek.map(mapTask),
  });
}
