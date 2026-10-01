import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth } from "../_auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;

  const task = await prisma.task.findFirst({
    where: { state: "next" },
    orderBy: { createdAt: "asc" },
    include: { project: { include: { client: true } } },
  });

  const upNext = await prisma.task.findMany({
    where: { state: "later" },
    orderBy: { createdAt: "asc" },
    take: 5,
    include: { project: { include: { client: true } } },
  });

  const mapTask = (t: typeof task) => t ? {
    id: t.id,
    title: t.title,
    state: t.state,
    energy: t.energy,
    context: t.context,
    pinned: t.state === "next",
    batchSize: t.batchTotal ?? undefined,
    batchDone: undefined as number | undefined,
    clientName: t.project?.client?.name ?? null,
    clientColor: t.project?.client?.color ?? null,
    dueDate: t.dueDate?.toISOString() ?? null,
  } : null;

  let batchDone: number | undefined;
  if (task?.projectId && task.batchTotal) {
    batchDone = await prisma.task.count({
      where: { projectId: task.projectId, state: "done" },
    });
  }

  const mappedTask = mapTask(task);
  if (mappedTask && batchDone !== undefined) mappedTask.batchDone = batchDone;

  return NextResponse.json({
    task: mappedTask,
    upNext: upNext.map(mapTask).filter(Boolean),
  });
}
