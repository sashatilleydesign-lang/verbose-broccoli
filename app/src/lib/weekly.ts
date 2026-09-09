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
      include: {
        client: true,
        // Only the row rendered ("Set next action" targets the first one).
        tasks: { where: { state: "later" }, orderBy: { createdAt: "asc" }, take: 1 },
      },
    }),
  ]);

  return { stuck, waiting, noNextAction };
}
