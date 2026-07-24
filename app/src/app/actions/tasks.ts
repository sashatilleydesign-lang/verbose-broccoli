"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export async function completeTask(taskId: string) {
  await verifySession();

  const task = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    include: { project: true },
  });

  await prisma.task.update({
    where: { id: taskId },
    data: { state: "done", completedAt: new Date() },
  });

  // A done task shouldn't keep occupying a slot on the calendar until the
  // next reflow happens to clear it out.
  await prisma.scheduledBlock.deleteMany({ where: { taskId } });

  // If this was its project's pinned next action, auto-advance the batch:
  // promote the next "later" task in line rather than leaving the project
  // with no next action set.
  if (task.projectId && task.project?.nextActionId === taskId) {
    const upNext = await prisma.task.findFirst({
      where: { projectId: task.projectId, state: "later" },
      orderBy: [{ batchIndex: "asc" }, { createdAt: "asc" }],
    });

    if (upNext) {
      await prisma.task.update({ where: { id: upNext.id }, data: { state: "next" } });
      await prisma.project.update({
        where: { id: task.projectId },
        data: { nextActionId: upNext.id },
      });
    } else {
      await prisma.project.update({
        where: { id: task.projectId },
        data: { nextActionId: null },
      });
    }
  }

  revalidatePath("/focus");
  revalidatePath("/clients");
  revalidatePath("/weekly");
  revalidatePath("/schedule");
  if (task.project?.clientId) revalidatePath(`/clients/${task.project.clientId}`);
}
