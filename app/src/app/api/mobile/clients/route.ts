import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth } from "../_auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireMobileAuth(req);
    if (auth instanceof NextResponse) return auth;

    const clients = await prisma.client.findMany({
      orderBy: { name: "asc" },
      include: {
        projects: {
          include: {
            tasks: {
              where: { state: { not: "done" } },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });

    const data = clients.map((c) => {
      const allTasks = c.projects.flatMap((p) => p.tasks);
      const pinnedTask = allTasks.find((t) => t.state === "next");
      return {
        id: c.id,
        name: c.name,
        color: c.colorTag,
        taskCount: allTasks.length,
        projectCount: c.projects.length,
        pinnedTask: pinnedTask?.title ?? null,
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("[mobile/clients]", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
