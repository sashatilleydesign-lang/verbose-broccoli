import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth } from "../_auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireMobileAuth(req);
    if (auth instanceof NextResponse) return auth;

    const include = { project: { include: { client: true } } } as const;

    const task = await prisma.task.findFirst({
      where: { state: "next" },
      orderBy: { createdAt: "asc" },
      include,
    });

    const upNext = await prisma.task.findMany({
      where: { state: "later" },
      orderBy: { createdAt: "asc" },
      take: 5,
      include,
    });

    const mapTask = (t: NonNullable<typeof task>) => ({
      id: t.id,
      title: t.title,
      state: t.state,
      energy: t.energy,
      context: t.context,
      pinned: t.state === "next",
      batchSize: t.batchTotal ?? undefined,
      batchDone: undefined as number | undefined,
      clientName: t.project?.client?.name ?? null,
      clientColor: t.project?.client?.colorTag ?? null,
      dueDate: t.dueDate?.toISOString() ?? null,
    });

    let batchDone: number | undefined;
    if (task?.projectId && task.batchTotal) {
      batchDone = await prisma.task.count({
        where: { projectId: task.projectId, state: "done" },
      });
    }

    const mappedTask = task ? mapTask(task) : null;
    if (mappedTask && batchDone !== undefined) mappedTask.batchDone = batchDone;

    return NextResponse.json({
      task: mappedTask,
      upNext: upNext.map(mapTask),
    });
  } catch (error) {
    console.error("[mobile/focus]", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
