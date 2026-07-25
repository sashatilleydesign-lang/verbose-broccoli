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

  const completedAt = new Date();
  // actualMinutes only gets a value if a focus session (§11.3) actually
  // ran — opt-in, never a retroactive "how long did this really take"
  // guess.
  const actualMinutes = task.startedAt
    ? Math.max(1, Math.round((completedAt.getTime() - task.startedAt.getTime()) / 60_000))
    : undefined;

  await prisma.task.update({
    where: { id: taskId },
    data: { state: "done", completedAt, actualMinutes, startedAt: null },
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

// Focus session (§11.3) — opt-in, visible countdown. Starting (re)arms
// the clock from now; there's no partial-session accumulation, so a
// forgotten session can never silently produce a nonsense multi-day
// actualMinutes on eventual completion.
export async function startSession(taskId: string) {
  await verifySession();
  await prisma.task.update({ where: { id: taskId }, data: { startedAt: new Date() } });
  revalidatePath("/focus");
}

// Abandons the current session without completing the task — no
// actualMinutes gets recorded for it. Always available as a quiet way
// out, no "are you sure" friction.
export async function endSession(taskId: string) {
  await verifySession();
  await prisma.task.update({ where: { id: taskId }, data: { startedAt: null } });
  revalidatePath("/focus");
}

// Task.note (§11.9) has existed since the schema's first draft, but
// nothing in the UI opened it for reading or editing until now.
export async function updateTaskNote(taskId: string, note: string) {
  await verifySession();
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { note: note.trim() || null },
    include: { project: true },
  });
  revalidatePath("/focus");
  revalidatePath("/weekly");
  revalidatePath("/clients");
  revalidatePath("/schedule");
  if (task.project?.clientId) revalidatePath(`/clients/${task.project.clientId}`);
}
