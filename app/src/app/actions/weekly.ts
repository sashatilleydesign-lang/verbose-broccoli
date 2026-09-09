"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

// Promotes a task to be its project's single pinned next action, demoting
// whichever task held that slot back to "later" so the invariant (one
// pinned next action per project) always holds.
export async function markAsNext(taskId: string) {
  await verifySession();

  const task = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    include: { project: true },
  });

  if (task.projectId && task.project) {
    if (task.project.nextActionId && task.project.nextActionId !== taskId) {
      await prisma.task.update({ where: { id: task.project.nextActionId }, data: { state: "later" } });
    }
    await prisma.project.update({ where: { id: task.projectId }, data: { nextActionId: taskId } });
  }

  await prisma.task.update({ where: { id: taskId }, data: { state: "next" } });

  revalidatePath("/weekly");
  revalidatePath("/focus");
  revalidatePath("/clients");
  if (task.project?.clientId) revalidatePath(`/clients/${task.project.clientId}`);
}

// A quiet acknowledgement — resets the "flagged/waiting N days" clock
// without demanding a decision right now. No shame, just deferred.
export async function touchTask(taskId: string) {
  await verifySession();
  await prisma.task.update({ where: { id: taskId }, data: { updatedAt: new Date() } });
  revalidatePath("/weekly");
}
