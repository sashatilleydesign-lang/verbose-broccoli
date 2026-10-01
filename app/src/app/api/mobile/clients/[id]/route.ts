import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth } from "../../_auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireMobileAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        projects: {
          include: {
            tasks: {
              where: { state: { not: "done" } },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const allTasks = client.projects.flatMap((p) =>
      p.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        state: t.state,
        pinned: t.state === "next",
        energy: t.energy,
        context: t.context,
        clientName: client.name,
        clientColor: client.colorTag,
        dueDate: t.dueDate?.toISOString() ?? null,
      }))
    );

    const pinnedTask = allTasks.find((t) => t.pinned) ?? null;

    const completedRecently = await prisma.task.findMany({
      where: {
        projectId: { in: client.projects.map((p) => p.id) },
        state: "done",
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });

    const timeline = completedRecently.map((t) => ({
      title: t.title,
      date: t.updatedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      type: "completed",
    }));

    return NextResponse.json({
      id: client.id,
      name: client.name,
      color: client.colorTag,
      pinnedTask,
      tasks: allTasks,
      projects: client.projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: null,
        status: p.status,
      })),
      timeline,
    });
  } catch (error) {
    console.error("[mobile/clients/[id]]", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
