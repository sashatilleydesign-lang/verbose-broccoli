import "server-only";
import { prisma } from "@/lib/prisma";

export async function getWeeklyReviewData() {
  const [stuck, waiting, noNextAction] = await Promise.all([
    prisma.task.findMany({
      where: { state: "stuck" },
      orderBy: { updatedAt: "asc" },
      include: { project: { include: { client: true } } },
    }),
    prisma.task.findMany({
      where: { state: "waiting" },
      orderBy: { updatedAt: "asc" },
      include: { project: { include: { client: true } } },
    }),
    prisma.project.findMany({
      where: { status: "active", nextActionId: null },
      include: { client: true, tasks: { where: { state: "later" }, orderBy: { createdAt: "asc" } } },
    }),
  ]);

  return { stuck, waiting, noNextAction };
}
